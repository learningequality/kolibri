from uuid import uuid4

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.migrationtestcase import TestMigrations
from kolibri.core.logger.models import UserSessionLog


class DeviceInfoAddTestCase(TestMigrations):

    migrate_from = "0007_contentsessionlog_visitor_id"
    migrate_to = "0008_usersessionlog_device_info"
    app = "logger"

    def setUp(self):
        facility = Facility.objects.create(name="Test")
        FacilityUser.objects.create(username="test", facility_id=facility.id)
        super(DeviceInfoAddTestCase, self).setUp()

    def setUpBeforeMigration(self, apps):
        UserSessionLog = apps.get_model("logger", "UserSessionLog")
        FacilityUser = apps.get_model("kolibriauth", "FacilityUser")
        user = FacilityUser.objects.defer("date_joined").get()
        UserSessionLog.objects.create(id=uuid4(), user=user, dataset_id=user.dataset_id)

    def test_migrated_device_info(self):
        log = UserSessionLog.objects.get()
        self.assertEqual(log.device_info, None)
