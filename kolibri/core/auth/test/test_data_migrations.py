from .migrationtestcase import TestMigrations
from kolibri.core.auth.constants.role_kinds import ADMIN
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser


class MultipleCollectionTestCase(TestMigrations):

    migrate_from = '0003_auto_20170621_0958'
    migrate_to = '0004_auto_20170816_1607'
    app = 'kolibriauth'

    def setUp(self):
        self.facility = Facility.objects.create(name='Test')
        self.classroom = Classroom.objects.create(name='TestClass', parent=self.facility)
        super(MultipleCollectionTestCase, self).setUp()

    def setUpBeforeMigration(self, apps):
        DeviceOwner = apps.get_model('kolibriauth', 'DeviceOwner')
        deviceowner = DeviceOwner.objects.create(
            username="test",
        )
        self.username = deviceowner.username

    def test_username_migrated(self):
        self.assertEqual(self.username, FacilityUser.objects.get().username)

    def test_in_default_facility_migrated(self):
        self.assertEqual(self.facility, FacilityUser.objects.get().facility)

    def test_admin(self):
        self.assertEqual(FacilityUser.objects.get().roles.first().collection, self.facility)
        self.assertEqual(FacilityUser.objects.get().roles.first().kind, ADMIN)
