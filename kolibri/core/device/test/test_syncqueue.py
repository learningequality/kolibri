import time

from django.test import TestCase

from kolibri.core.auth.models import Facility
from kolibri.core.device.models import SyncQueue


class SyncQueueTestBase(TestCase):
    def setUp(self):
        self.facility = Facility.objects.create(name="Test")

    def test_create_queue_element(self):
        previous_time = time.time()
        element, created = SyncQueue.objects.get_or_create(facility=self.facility)
        assert element.keep_alive == 5.0
        current_time = time.time()
        assert current_time > element.updated
        assert previous_time < element.updated

    def sstest_queue_cleaning(self):
        for i in range(3):
            SyncQueue.objects.create(facility=self.facility)
        for i in range(2):
            item = SyncQueue.objects.create(facility=self.facility)
            item.updated = item.updated - 200
            item.save()

        assert SyncQueue.objects.count() == 5
        SyncQueue.clean_stale()  # default expiry time = 180 seconds
        assert SyncQueue.objects.count() == 3
