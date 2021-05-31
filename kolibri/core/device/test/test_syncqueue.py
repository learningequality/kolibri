import time
from uuid import uuid4

import mock
from django.core.urlresolvers import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from kolibri.core.auth.models import Facility
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
            facility=self.facility, instance_id=uuid4()
        )
        assert element.keep_alive == 5.0
        current_time = time.time()
        assert current_time > element.updated
        assert previous_time < element.updated

    def sstest_queue_cleaning(self):
        for i in range(3):
            SyncQueue.objects.create(facility=self.facility, instance_id=uuid4())
        for i in range(2):
            item = SyncQueue.objects.create(facility=self.facility, instance_id=uuid4())
            item.updated = item.updated - 200
            item.save()

        assert SyncQueue.objects.count() == 5
        SyncQueue.clean_stale()  # default expiry time = 180 seconds
        assert SyncQueue.objects.count() == 3


class SyncQueueViewSetAPITestCase(APITestCase):
    def setUp(self):
        self.default_facility = Facility.objects.create(name="Test")
        Facility.objects.create(name="Test2")

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
                facility=self.default_facility, instance_id=uuid4()
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
            reverse("kolibri:core:syncqueue-list"), {"facility": uuid4()}, format="json"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "I'm a Subset of users device" in response.data

    def test_needed_parameters(self):
        response = self.client.post(
            reverse("kolibri:core:syncqueue-list"), {"facility": "1"}, format="json"
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        response = self.client.post(
            reverse("kolibri:core:syncqueue-list"), {"instance_id": "1"}, format="json"
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_existing_facility(self):
        response = self.client.post(
            reverse("kolibri:core:syncqueue-list"),
            {"instance_id": "1", "facility": uuid4()},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_allow_sync(self):
        response = self.client.post(
            reverse("kolibri:core:syncqueue-list"),
            {"instance_id": "1", "facility": self.default_facility.id},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["action"] == SYNC

    @mock.patch("kolibri.core.public.api.TransferSession.objects.filter")
    def test_enqueued(self, _filter):
        _filter().count.return_value = MAX_CONCURRENT_SYNCS + 1
        response = self.client.post(
            reverse("kolibri:core:syncqueue-list"),
            {"instance_id": uuid4(), "facility": self.default_facility.id},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["action"] == QUEUED
        assert "key" in response.data
        assert response.data["keep_alive"] == MAX_CONCURRENT_SYNCS + 1
