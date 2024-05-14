import datetime
from uuid import uuid4

import mock
from django.test import TestCase
from django.utils.timezone import now
from morango.models.core import InstanceIDModel
from morango.sync.context import LocalSessionContext

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.kolibri_plugin import LearnerDeviceStatusOperation
from kolibri.core.device.models import DeviceStatus
from kolibri.core.device.models import LearnerDeviceStatus


class LearnerDeviceStatusOperationTestCase(TestCase):
    def setUp(self):
        super(LearnerDeviceStatusOperationTestCase, self).setUp()
        self.facility = Facility.objects.create(name="Test")
        self.user = FacilityUser.objects.create(username="test", facility=self.facility)
        self.instance = InstanceIDModel.get_or_create_current_instance()[0]
        self.other_instance_id = uuid4().hex
        LearnerDeviceStatus.save_learner_status(
            self.user.id, DeviceStatus.InsufficientStorage
        )
        other_instance_status = LearnerDeviceStatus.objects.create(
            user=self.user,
            instance_id=self.other_instance_id,
            status=DeviceStatus.InsufficientStorage[0],
            status_sentiment=DeviceStatus.InsufficientStorage[1],
        )
        # Do this to bypass the auto_now behaviour
        LearnerDeviceStatus.objects.filter(id=other_instance_status.id).update(
            updated_at=now() - datetime.timedelta(days=1)
        )
        self.operation = LearnerDeviceStatusOperation()
        self.context = mock.Mock(spec_set=LocalSessionContext)()
        self.context.is_server = False

    def _setup_other_user(self):
        other_user = FacilityUser.objects.create(
            username="other", facility=self.facility
        )
        LearnerDeviceStatus.save_learner_status(
            other_user.id, DeviceStatus.InsufficientStorage
        )
        other_instance_status = LearnerDeviceStatus.objects.create(
            user=other_user,
            instance_id=self.other_instance_id,
            status=DeviceStatus.InsufficientStorage[0],
            status_sentiment=DeviceStatus.InsufficientStorage[1],
        )
        # Do this to bypass the auto_now behaviour
        LearnerDeviceStatus.objects.filter(id=other_instance_status.id).update(
            updated_at=now() - datetime.timedelta(days=1)
        )

    def test_handle__single_user_sync_server__downgrade(self):
        self.context.is_server = True
        self.context.sync_session.client_instance_id = self.other_instance_id
        with mock.patch(
            "kolibri.core.device.kolibri_plugin.get_user_id_for_single_user_sync",
            return_value=self.user.id,
        ):
            self.operation.downgrade(self.context)
        self.assertEqual(LearnerDeviceStatus.objects.count(), 1)
        self.assertTrue(
            LearnerDeviceStatus.objects.filter(
                instance_id=self.other_instance_id
            ).exists()
        )

    def test_handle__single_user_sync_server__downgrade_other_user(self):
        self._setup_other_user()
        self.context.is_server = True
        self.context.sync_session.client_instance_id = self.other_instance_id
        with mock.patch(
            "kolibri.core.device.kolibri_plugin.get_user_id_for_single_user_sync",
            return_value=self.user.id,
        ):
            self.operation.downgrade(self.context)
        self.assertEqual(LearnerDeviceStatus.objects.count(), 3)
        self.assertEqual(LearnerDeviceStatus.objects.exclude(user=self.user).count(), 2)
        self.assertTrue(
            LearnerDeviceStatus.objects.filter(
                user=self.user, instance_id=self.other_instance_id
            ).exists()
        )

    def test_handle__single_user_sync_client__downgrade(self):
        self.context.is_server = False
        self.context.sync_session.client_instance_id = self.other_instance_id
        with mock.patch(
            "kolibri.core.device.kolibri_plugin.get_user_id_for_single_user_sync",
            return_value=self.user.id,
        ):
            self.operation.downgrade(self.context)
        self.assertEqual(LearnerDeviceStatus.objects.count(), 1)
        self.assertTrue(
            LearnerDeviceStatus.objects.filter(
                instance_id=self.other_instance_id
            ).exists()
        )

    def test_handle__single_user_sync_client__downgrade_other_user(self):
        self._setup_other_user()
        self.context.is_server = False
        self.context.sync_session.client_instance_id = self.other_instance_id
        with mock.patch(
            "kolibri.core.device.kolibri_plugin.get_user_id_for_single_user_sync",
            return_value=self.user.id,
        ):
            self.operation.downgrade(self.context)
        self.assertEqual(LearnerDeviceStatus.objects.count(), 3)
        self.assertEqual(LearnerDeviceStatus.objects.exclude(user=self.user).count(), 2)
        self.assertTrue(
            LearnerDeviceStatus.objects.filter(
                user=self.user, instance_id=self.other_instance_id
            ).exists()
        )

    def test_handle__full_facility_sync_server__downgrade(self):
        self.context.is_server = True
        self.context.sync_session.client_instance_id = self.other_instance_id
        with mock.patch(
            "kolibri.core.device.kolibri_plugin.get_user_id_for_single_user_sync",
            return_value=None,
        ), mock.patch(
            "kolibri.core.device.kolibri_plugin.get_dataset_id",
            return_value=self.facility.dataset_id,
        ):
            self.operation.downgrade(self.context)
        self.assertEqual(LearnerDeviceStatus.objects.count(), 1)
        self.assertTrue(
            LearnerDeviceStatus.objects.filter(instance_id=self.instance.id).exists()
        )

    def test_handle__full_facility_sync_server__downgrade_other_user(self):
        self._setup_other_user()
        self.context.is_server = True
        self.context.sync_session.client_instance_id = self.other_instance_id
        with mock.patch(
            "kolibri.core.device.kolibri_plugin.get_user_id_for_single_user_sync",
            return_value=None,
        ), mock.patch(
            "kolibri.core.device.kolibri_plugin.get_dataset_id",
            return_value=self.facility.dataset_id,
        ):
            self.operation.downgrade(self.context)
        self.assertEqual(LearnerDeviceStatus.objects.count(), 2)
        self.assertTrue(
            LearnerDeviceStatus.objects.filter(
                user=self.user, instance_id=self.instance.id
            ).exists()
        )
        self.assertTrue(
            LearnerDeviceStatus.objects.exclude(user=self.user)
            .filter(instance_id=self.instance.id)
            .exists()
        )

    def test_handle__full_facility_sync_client__downgrade(self):
        self.context.is_server = False
        self.context.sync_session.client_instance_id = self.other_instance_id
        with mock.patch(
            "kolibri.core.device.kolibri_plugin.get_user_id_for_single_user_sync",
            return_value=None,
        ), mock.patch(
            "kolibri.core.device.kolibri_plugin.get_dataset_id",
            return_value=self.facility.dataset_id,
        ):
            self.operation.downgrade(self.context)
        self.assertEqual(LearnerDeviceStatus.objects.count(), 1)
        self.assertTrue(
            LearnerDeviceStatus.objects.filter(instance_id=self.instance.id).exists()
        )

    def test_handle__full_facility_sync_client__downgrade_other_user(self):
        self._setup_other_user()
        self.context.is_server = False
        self.context.sync_session.client_instance_id = self.other_instance_id
        with mock.patch(
            "kolibri.core.device.kolibri_plugin.get_user_id_for_single_user_sync",
            return_value=None,
        ), mock.patch(
            "kolibri.core.device.kolibri_plugin.get_dataset_id",
            return_value=self.facility.dataset_id,
        ):
            self.operation.downgrade(self.context)
        self.assertEqual(LearnerDeviceStatus.objects.count(), 2)
        self.assertTrue(
            LearnerDeviceStatus.objects.filter(
                user=self.user, instance_id=self.instance.id
            ).exists()
        )
        self.assertTrue(
            LearnerDeviceStatus.objects.exclude(user=self.user)
            .filter(instance_id=self.instance.id)
            .exists()
        )
