import json
import time
from uuid import uuid4

import mock
import pytest
from django.core.urlresolvers import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import SyncQueue
from kolibri.core.public.api import HANDSHAKING_TIME
from kolibri.core.public.api import MAX_CONCURRENT_SYNCS
from kolibri.core.public.api import position_in_queue
from kolibri.core.public.constants.user_sync_statuses import QUEUED
from kolibri.core.public.constants.user_sync_statuses import SYNC
from kolibri.core.public.utils import begin_request_soud_sync
from kolibri.core.public.utils import request_soud_sync


class SyncQueueTestBase(TestCase):
    def setUp(self):
        self.facility = Facility.objects.create(name="Test")

    def test_create_queue_element(self):
        previous_time = time.time()
        element, _ = SyncQueue.objects.get_or_create(
            user=FacilityUser.objects.create(username="test", facility=self.facility)
        )
        assert element.keep_alive == 5.0
        current_time = time.time()
        assert (
            current_time >= element.updated
        )  # = added because sometimes this is too quick
        assert previous_time < element.updated

    def test_queue_cleaning(self):
        for i in range(3):
            SyncQueue.objects.create(
                user=FacilityUser.objects.create(
                    username="test{}".format(i), facility=self.facility
                )
            )
        for i in range(3, 5):
            item = SyncQueue.objects.create(
                user=FacilityUser.objects.create(
                    username="test{}".format(i), facility=self.facility
                )
            )
            item.updated = item.updated - 200
            item.save()

        assert SyncQueue.objects.count() == 5
        SyncQueue.clean_stale()  # default expiry time = 180 seconds
        assert SyncQueue.objects.count() == 3


class SyncQueueViewSetAPITestCase(APITestCase):
    def setUp(self):
        self.default_facility = Facility.objects.create(name="Test")
        Facility.objects.create(name="Test2")
        self.test_user = FacilityUser.objects.create(
            username="test", facility=self.default_facility
        )

    def test_list(self):
        response = self.client.get(
            reverse("kolibri:core:syncqueue-list"), format="json"
        )
        assert len(response.data) == Facility.objects.count()
        assert response.status_code == status.HTTP_200_OK

    def test_list_queue_length(self):
        queue_length = 3
        for i in range(queue_length):
            SyncQueue.objects.create(
                user=FacilityUser.objects.create(
                    username="test{}".format(i), facility=self.default_facility
                )
            )
        response = self.client.get(
            reverse("kolibri:core:syncqueue-list"), format="json"
        )
        assert response.data[self.default_facility.id] == queue_length

    @mock.patch(
        "kolibri.core.public.api.get_device_setting",
        return_value=True,
    )
    def test_soud(self, mock_device_setting):
        response = self.client.post(
            reverse("kolibri:core:syncqueue-list"), {"user": uuid4()}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "I'm a Subset of users device" in response.data

    def test_user_needed(self):
        response = self.client.post(reverse("kolibri:core:syncqueue-list"))
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_existing_user(self):
        response = self.client.post(
            reverse("kolibri:core:syncqueue-list"),
            {"user": uuid4()},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_allow_sync(self):
        response = self.client.post(
            reverse("kolibri:core:syncqueue-list"),
            {
                "user": self.test_user.id,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["action"] == SYNC

    @mock.patch("kolibri.core.public.api.TransferSession.objects.filter")
    def test_enqueued(self, _filter):
        _filter().count.return_value = MAX_CONCURRENT_SYNCS + 1
        response = self.client.post(
            reverse("kolibri:core:syncqueue-list"),
            {"user": self.test_user.id},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["action"] == QUEUED
        assert "id" in response.data
        assert response.data["keep_alive"] == MAX_CONCURRENT_SYNCS * HANDSHAKING_TIME

    def test_update(self):
        response = self.client.put(
            reverse("kolibri:core:syncqueue-detail", kwargs={"pk": uuid4()})
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["action"] == SYNC

    @mock.patch("kolibri.core.public.api.TransferSession.objects.filter")
    def test_not_in_queue(self, _filter):
        _filter().count.return_value = MAX_CONCURRENT_SYNCS + 1
        response = self.client.put(
            reverse("kolibri:core:syncqueue-detail", kwargs={"pk": uuid4()})
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Missing element" in response.data

    @mock.patch("kolibri.core.public.api.TransferSession.objects.filter")
    def test_updated_enqueued(self, _filter):
        _filter().count.return_value = MAX_CONCURRENT_SYNCS + 1
        element = SyncQueue.objects.create(user=self.test_user)
        previous_time = element.updated
        response = self.client.put(
            reverse("kolibri:core:syncqueue-detail", kwargs={"pk": element.id})
        )
        element = SyncQueue.objects.get(id=element.id)
        assert element.updated >= previous_time
        assert response.status_code == status.HTTP_200_OK
        assert response.data["action"] == QUEUED
        assert response.data["id"] == element.id
        assert (
            response.data["keep_alive"] == MAX_CONCURRENT_SYNCS * HANDSHAKING_TIME
        )  # first in queue, position does not change

    @mock.patch("kolibri.core.public.api.TransferSession.objects.filter")
    def test_position_in_queue(self, _filter):
        _filter().count.return_value = MAX_CONCURRENT_SYNCS + 1
        for n in range(10):
            user = FacilityUser.objects.create(
                username="test{}".format(n), facility=self.default_facility
            )
            element = SyncQueue.objects.create(user=user)
            if n == 5:
                pk = element.id
        response = self.client.put(
            reverse("kolibri:core:syncqueue-detail", kwargs={"pk": pk})
        )
        assert position_in_queue(pk) == 5
        assert response.data["keep_alive"] == HANDSHAKING_TIME * 6
        SyncQueue.objects.all().order_by("datetime").first().delete()
        SyncQueue.objects.all().order_by("datetime").first().delete()
        assert position_in_queue(pk) == 3
        response = self.client.put(
            reverse("kolibri:core:syncqueue-detail", kwargs={"pk": pk})
        )
        assert response.data["keep_alive"] == HANDSHAKING_TIME * 4


@pytest.mark.django_db
class TestRequestSoUDSync(object):
    @pytest.fixture()
    def setUp(self):
        self.facility = Facility.objects.create(name="Test")
        self.test_user = FacilityUser.objects.create(
            username="test", facility=self.facility
        )

    @mock.patch("kolibri.core.public.utils.queue")
    @mock.patch(
        "kolibri.core.public.utils.get_device_setting",
        return_value=True,
    )
    def test_begin_request_soud_sync(self, mock_device_info, queue, setUp):
        begin_request_soud_sync("whatever_server", self.test_user.id)
        queue.enqueue.assert_called_with(
            request_soud_sync, "whatever_server", self.test_user.id
        )

    @mock.patch("kolibri.core.public.utils.scheduler")
    @mock.patch("kolibri.core.public.utils.requests")
    @mock.patch("kolibri.core.tasks.api.MorangoProfileController")
    @mock.patch("kolibri.core.tasks.api.get_client_and_server_certs")
    @mock.patch("kolibri.core.tasks.api.get_dataset_id")
    def test_request_soud_sync(
        self,
        get_dataset_id,
        get_client_and_server_certs,
        MorangoProfileController,
        requests_mock,
        scheduler,
        setUp,
    ):

        get_client_and_server_certs.return_value = None
        get_dataset_id.return_value = self.facility.dataset_id

        requests_mock.post.return_value.status_code = 200
        requests_mock.post.return_value.content = json.dumps({"action": SYNC})

        network_connection = mock.Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        request_soud_sync("http://whatever:8000", self.test_user.id)
        scheduler.enqueue_in.call_count == 0

        requests_mock.post.return_value.status_code = 200
        requests_mock.post.return_value.content = json.dumps(
            {"action": QUEUED, "keep_alive": "5", "id": str(uuid4())}
        )
        request_soud_sync("whatever_server", self.test_user.id)
        scheduler.enqueue_in.call_count == 1
