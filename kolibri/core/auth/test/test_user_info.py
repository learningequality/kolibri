import json
import os
import tempfile
from uuid import UUID

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser


class UserInfoTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="first")
        cls.facility_2 = Facility.objects.create(name="second")
        cls.user = FacilityUser.objects.create(username="user", facility=cls.facility)

    def setUp(self):
        cwd = os.getcwd()
        self.addCleanup(os.chdir, cwd)
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        os.chdir(tmpdir.name)

    def _read_user_id(self, username):
        with open(os.path.join(username, f"{username}.txt")) as f:
            return UUID(json.load(f)["id"]).hex

    def test_writes_user_data_file(self):
        call_command("user_info", "user")
        self.assertEqual(self._read_user_id("user"), self.user.id)

    def test_does_not_exist(self):
        with self.assertRaisesRegex(CommandError, "does not exist"):
            call_command("user_info", "kolibri")

    def test_same_username_in_two_facilities_asks_for_facility(self):
        FacilityUser.objects.create(username="user", facility=self.facility_2)
        with self.assertRaisesRegex(CommandError, "--facility"):
            call_command("user_info", "user")

    def test_facility_option_selects_user(self):
        user_2 = FacilityUser.objects.create(username="user", facility=self.facility_2)
        call_command("user_info", "user", facility=self.facility_2.id)
        self.assertEqual(self._read_user_id("user"), user_2.id)


class RemovedUserCommandsTestCase(TestCase):
    def test_importusers_points_to_bulkimportusers(self):
        with self.assertRaisesRegex(CommandError, "bulkimportusers"):
            call_command("importusers", "users.csv")

    def test_exportusers_points_to_bulkexportusers(self):
        with self.assertRaisesRegex(CommandError, "bulkexportusers"):
            call_command("exportusers")
