import time
from uuid import uuid4

import mock
from django.test import TestCase
from morango.models.core import InstanceIDModel

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import clear_process_cache
from kolibri.core.device.models import DeviceStatus
from kolibri.core.device.models import LearnerDeviceStatus
from kolibri.core.device.models import StatusSentiment
from kolibri.core.device.models import SyncQueue
from kolibri.core.device.models import SyncQueueStatus
from kolibri.core.public.constants.user_sync_options import STALE_QUEUE_TIME
from kolibri.utils.conf import OPTIONS


class SyncQueueTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        clear_process_cache()
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
        time_now = time.time()
        for i in range(5):
            if i == 0 or i == 1:
                # These two should be deleted as they are too stale.
                updated_time = time_now - 5 - STALE_QUEUE_TIME * (i + 1) - 1
            elif i == 2:
                # This one should be marked as stale, but not deleted yet.
                updated_time = (
                    time_now - 5 - OPTIONS["Deployment"]["SYNC_INTERVAL"] / 2 - 1
                )
            else:
                # These two are still queued.
                updated_time = time_now - 5
            SyncQueue.objects.create(
                user_id=FacilityUser.objects.create(
                    username="atest{}".format(i), facility=self.facility
                ).id,
                instance_id=uuid4(),
                status=SyncQueueStatus.Queued,
                keep_alive=5,
                updated=updated_time,
            )

        assert SyncQueue.objects.count() == 5
        SyncQueue.clean_stale()
        assert SyncQueue.objects.count() == 3
        assert SyncQueue.objects.filter(status=SyncQueueStatus.Queued).count() == 2
        assert SyncQueue.objects.filter(status=SyncQueueStatus.Stale).count() == 1


class LearnerDeviceStatusTestCase(TestCase):
    def setUp(self):
        self.facility = Facility.objects.create(name="Test")
        self.user = FacilityUser.objects.create(username="test", facility=self.facility)
        self.instance = InstanceIDModel.get_or_create_current_instance()[0]

    def test_save_learner_status(self):
        LearnerDeviceStatus.save_learner_status(
            self.user.id, DeviceStatus.InsufficientStorage
        )
        self.assertTrue(
            LearnerDeviceStatus.objects.filter(
                instance_id=self.instance.id,
                user=self.user,
                status=DeviceStatus.InsufficientStorage[0],
                status_sentiment=DeviceStatus.InsufficientStorage[1],
            ).exists()
        )

    def test_save_learner_status__updated(self):
        LearnerDeviceStatus.save_learner_status(
            self.user.id, DeviceStatus.InsufficientStorage
        )
        test_status = ("TestStatus", StatusSentiment.Positive)

        with mock.patch.object(DeviceStatus, "choices") as mock_choices:
            mock_choices.return_value = [(test_status, test_status[0])]
            LearnerDeviceStatus.save_learner_status(self.user.id, test_status)

        self.assertFalse(
            LearnerDeviceStatus.objects.filter(
                instance_id=self.instance.id,
                user=self.user,
                status=DeviceStatus.InsufficientStorage[0],
                status_sentiment=DeviceStatus.InsufficientStorage[1],
            ).exists()
        )

        self.assertTrue(
            LearnerDeviceStatus.objects.filter(
                instance_id=self.instance.id,
                user=self.user,
                status=test_status[0],
                status_sentiment=test_status[1],
            ).exists()
        )

    def test_save_learner_status__unknown_status(self):
        with self.assertRaises(ValueError):
            LearnerDeviceStatus.save_learner_status(
                self.user.id, ("UnknownStatus", StatusSentiment.Neutral)
            )

    def test_clear_learner_status(self):
        LearnerDeviceStatus.save_learner_status(
            self.user.id, DeviceStatus.InsufficientStorage
        )
        self.assertEqual(LearnerDeviceStatus.objects.count(), 1)
        LearnerDeviceStatus.clear_learner_status(self.user.id)
        self.assertEqual(LearnerDeviceStatus.objects.count(), 0)

    @mock.patch("kolibri.core.device.models.device_provisioned", return_value=True)
    def test_save_statuses__not_subset_of_users_device(self, _):
        LearnerDeviceStatus.save_statuses(DeviceStatus.InsufficientStorage)
        self.assertEqual(LearnerDeviceStatus.objects.count(), 0)

    @mock.patch("kolibri.core.device.models.get_device_setting", return_value=True)
    def test_save_statuses(self, mock_device_setting):
        LearnerDeviceStatus.save_statuses(DeviceStatus.InsufficientStorage)
        self.assertTrue(
            LearnerDeviceStatus.objects.filter(
                instance_id=self.instance.id,
                user=self.user,
                status=DeviceStatus.InsufficientStorage[0],
                status_sentiment=DeviceStatus.InsufficientStorage[1],
            ).exists()
        )

    def test_morango_fields(self):
        LearnerDeviceStatus.save_learner_status(
            self.user.id, DeviceStatus.InsufficientStorage
        )

        device_status = LearnerDeviceStatus.objects.get(user=self.user)
        # this is called after deserializing during a sync, so make sure that a model can be
        # successfully saved after deserializing
        device_status.full_clean()

        self.assertEqual(self.facility.dataset_id, device_status.dataset_id)
        self.assertEqual(
            "{}:{}".format(self.instance.id, self.user.id),
            device_status._morango_source_id,
        )
        self.assertEqual(
            "{}:user-rw:{}".format(self.facility.dataset_id, self.user.id),
            device_status._morango_partition,
        )
