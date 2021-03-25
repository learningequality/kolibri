from uuid import uuid4

from django.test import TestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.logger.models import UserSessionLog


class UserSessionLogDeviceInfoTestCase(TestCase):
    def test_device_info_can_be_null(self):
        facility = Facility.objects.create(name="Test")
        user = FacilityUser.objects.create(username="test", facility_id=facility.id)
        log = UserSessionLog.objects.create(
            id=uuid4(), user=user, dataset_id=user.dataset_id
        )
        self.assertEqual(log.device_info, None)
