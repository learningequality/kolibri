import os
import unittest

from kolibri.core.auth.constants.role_kinds import ADMIN
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.migrationtestcase import TestMigrations


@unittest.skipIf(
    os.environ.get("TOX_ENV") == "postgres",
    "Skipping postgres due to unsupported upgrade",
)
class MultipleCollectionTestCase(TestMigrations):

    migrate_from = "0003_auto_20170621_0958"
    migrate_to = "0004_auto_20170816_1607"
    app = "kolibriauth"

    def setUp(self):
        self.facility = Facility.objects.create(name="Test")
        self.classroom = Classroom.objects.create(
            name="TestClass", parent=self.facility
        )
        # does the migration run successfully with 2 users having the same username?
        FacilityUser.objects.create(username="test", facility_id=self.facility.id)
        super(MultipleCollectionTestCase, self).setUp()

    def setUpBeforeMigration(self, apps):
        DeviceOwner = apps.get_model("kolibriauth", "DeviceOwner")
        deviceowner = DeviceOwner.objects.create(username="test")
        self.username = deviceowner.username
        # does the migration run successfully with 2 device owners?
        DeviceOwner.objects.create(username="test2")
        self.username2 = deviceowner.username

    def test_in_default_facility_migrated(self):
        self.assertEqual(
            self.facility, FacilityUser.objects.get(username=self.username).facility
        )

    def test_admin(self):
        self.assertEqual(
            FacilityUser.objects.get(username=self.username).roles.first().collection,
            self.facility,
        )
        self.assertEqual(
            FacilityUser.objects.get(username=self.username).roles.first().kind, ADMIN
        )

    def test_device_owners_created(self):
        self.assertTrue(FacilityUser.objects.filter(username=self.username).exists())
        self.assertTrue(FacilityUser.objects.filter(username=self.username2).exists())

    def test_facilityuser_deleted(self):
        self.assertTrue(FacilityUser.objects.get(username=self.username).is_superuser)
