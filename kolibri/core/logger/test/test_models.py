from uuid import uuid4

from django.test import TestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import UserSessionLog
from kolibri.utils.time_utils import local_now


class UserSessionLogDeviceInfoTestCase(TestCase):
    def test_device_info_can_be_null(self):
        facility = Facility.objects.create(name="Test")
        user = FacilityUser.objects.create(username="test", facility_id=facility.id)
        log = UserSessionLog.objects.create(
            id=uuid4(), user=user, dataset_id=user.dataset_id
        )
        self.assertEqual(log.device_info, None)


class ContentLogInstanceIdTestCase(TestCase):
    def setUp(self):
        self.facility = Facility.objects.create(name="Test")
        self.user = FacilityUser.objects.create(
            username="test", facility_id=self.facility.id
        )
        self.content_id = uuid4().hex

    def test_session_log_instance_id_defaults_to_none(self):
        log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            start_timestamp=local_now(),
            kind="exercise",
        )
        self.assertIsNone(log.instance_id)

    def test_session_log_instance_id_round_trips(self):
        instance_id = uuid4().hex
        log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            start_timestamp=local_now(),
            kind="exercise",
            instance_id=instance_id,
        )
        log.refresh_from_db()
        self.assertEqual(log.instance_id, instance_id)

    def test_summary_log_instance_id_defaults_to_none(self):
        log = ContentSummaryLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            start_timestamp=local_now(),
            kind="exercise",
        )
        self.assertIsNone(log.instance_id)

    def test_summary_log_instance_id_round_trips(self):
        instance_id = uuid4().hex
        log = ContentSummaryLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            start_timestamp=local_now(),
            kind="exercise",
            instance_id=instance_id,
        )
        log.refresh_from_db()
        self.assertEqual(log.instance_id, instance_id)
