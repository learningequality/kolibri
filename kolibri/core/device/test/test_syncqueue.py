import time
from uuid import uuid4

from django.test import TestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import SyncQueue


class SyncQueueTestBase(TestCase):
    multi_db = True

    def setUp(self):
        self.facility = Facility.objects.create(name="Test")

    def test_create_queue_element(self):
        previous_time = time.time()
        time.sleep(0.1)
        element, _ = SyncQueue.objects.get_or_create(
            user_id=FacilityUser.objects.create(
                username="test", facility=self.facility
            ).id,
            instance_id=uuid4(),
        )
        time.sleep(0.1)
        assert element.keep_alive == 5.0
        current_time = time.time()
        assert (
            current_time >= element.updated
        )  # = added because sometimes this is too quick
        assert previous_time < element.updated

    def test_queue_cleaning(self):
        for i in range(3):
            SyncQueue.objects.create(
                user_id=FacilityUser.objects.create(
                    username="test{}".format(i), facility=self.facility
                ).id,
                instance_id=uuid4(),
            )
        for i in range(3, 5):
            item = SyncQueue.objects.create(
                user_id=FacilityUser.objects.create(
                    username="test{}".format(i), facility=self.facility
                ).id,
                instance_id=uuid4(),
            )
            item.updated = item.updated - 200
            item.save()

        assert SyncQueue.objects.count() == 5
        SyncQueue.clean_stale()  # expiry time is 2 * keep_alive value
        assert SyncQueue.objects.count() == 3

    def test_dynamic_queue_cleaning(self):
        for i in range(5):
            item = SyncQueue.objects.create(
                user_id=FacilityUser.objects.create(
                    username="test{}".format(i), facility=self.facility
                ).id,
                instance_id=uuid4(),
            )
            item.updated = item.updated - 20
            if i % 2 == 0:
                item.keep_alive = 30
            item.save()

        assert SyncQueue.objects.count() == 5
        SyncQueue.clean_stale()  # expiry time is 2 * keep_alive value
        assert SyncQueue.objects.count() == 3
