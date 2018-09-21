import os
import unittest

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase

from kolibri.auth.constants.role_kinds import ADMIN
from kolibri.auth.models import Classroom
from kolibri.auth.models import Facility
from kolibri.auth.models import FacilityUser

# Modified from https://www.caktusgroup.com/blog/2016/02/02/writing-unit-tests-django-migrations/

class TestMigrations(TestCase):

    migrate_from = None
    migrate_to = None
    app = 'kolibriauth'

    def setUp(self):
        assert self.migrate_from and self.migrate_to, \
            "TestCase '{}' must define migrate_from and migrate_to properties".format(type(self).__name__)

        migrate_from = [(self.app, self.migrate_from)]
        migrate_to = [(self.app, self.migrate_to)]
        executor = MigrationExecutor(connection)
        old_apps = executor.loader.project_state(migrate_from).apps

        # Reverse to the original migration
        executor.migrate(migrate_from)

        self.setUpBeforeMigration(old_apps)

        # Run the migration to test
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()  # reload.
        executor.migrate(migrate_to)

        self.apps = executor.loader.project_state(migrate_to).apps

    def setUpBeforeMigration(self, apps):
        pass


@unittest.skipIf(os.environ.get('TOX_ENV') == 'postgres', "Skipping postgres due to unsupported upgrade")
class MultipleCollectionTestCase(TestMigrations):

    migrate_from = '0003_auto_20170621_0958'
    migrate_to = '0004_auto_20170816_1607'

    def setUp(self):
        self.facility = Facility.objects.create(name='Test')
        self.classroom = Classroom.objects.create(name='TestClass', parent=self.facility)
        # does the migration run successfully with 2 users having the same username?
        FacilityUser.objects.create(
            username="test",
            facility_id=self.facility.id
        )
        super(MultipleCollectionTestCase, self).setUp()

    def setUpBeforeMigration(self, apps):
        DeviceOwner = apps.get_model('kolibriauth', 'DeviceOwner')
        deviceowner = DeviceOwner.objects.create(
            username="test",
        )
        self.username = deviceowner.username
        # does the migration run successfully with 2 device owners?
        DeviceOwner.objects.create(
            username="test2",
        )
        self.username2 = deviceowner.username

    def test_in_default_facility_migrated(self):
        self.assertEqual(self.facility, FacilityUser.objects.get(username=self.username).facility)

    def test_admin(self):
        self.assertEqual(FacilityUser.objects.get(username=self.username).roles.first().collection, self.facility)
        self.assertEqual(FacilityUser.objects.get(username=self.username).roles.first().kind, ADMIN)

    def test_device_owners_created(self):
        self.assertTrue(FacilityUser.objects.filter(username=self.username).exists())
        self.assertTrue(FacilityUser.objects.filter(username=self.username2).exists())

    def test_facilityuser_deleted(self):
        self.assertTrue(FacilityUser.objects.get(username=self.username).is_superuser)
