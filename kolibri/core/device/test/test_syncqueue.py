import time
from uuid import uuid4

import mock
from django.core.urlresolvers import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import SyncQueue
from kolibri.core.public.api import MAX_CONCURRENT_SYNCS
from kolibri.core.public.api import QUEUED
from kolibri.core.public.api import SYNC


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
        "kolibri.core.public.api.get_device_info",
        return_value={"subset_of_users_device": True},
    )
    def test_soud(self, mock_device_info):
        response = self.client.post(
            reverse("kolibri:core:syncqueue-list"), {"user": uuid4()}, format="json"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
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
        assert response.data["keep_alive"] == MAX_CONCURRENT_SYNCS + 1

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
        assert element.updated > previous_time
        assert response.status_code == status.HTTP_200_OK
        assert response.data["action"] == QUEUED
        assert response.data["id"] == element.id
        assert response.data["keep_alive"] == MAX_CONCURRENT_SYNCS + 2
