from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import csv
import tempfile
import os

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from ..csv_utils import infer_facility
from ..management.commands.importusers import create_user
from ..management.commands.importusers import infer_and_create_class
from ..management.commands.importusers import validate_username
from ..models import Classroom
from ..models import FacilityUser
from .helpers import setup_device
from kolibri.core.auth.constants.demographics import DEFERRED
from kolibri.core.auth.constants.demographics import FEMALE
from kolibri.core.auth.constants.demographics import MALE
from kolibri.core.auth.constants.demographics import NOT_SPECIFIED
from kolibri.core.auth.csv_utils import labels


class UserImportTestCase(TestCase):
    """
    Tests for functions used in userimport command.
    """

    def setUp(self):
        self.facility, self.superuser = setup_device()

    def test_validate_username_no_username(self):
        with self.assertRaises(CommandError):
            validate_username({})

    def test_validate_username_none_username(self):
        with self.assertRaises(CommandError):
            validate_username({"username": None})

    def test_infer_facility_none(self):
        default = {}
        self.assertEqual(infer_facility(None, default), default)

    def test_infer_facility_empty_string(self):
        default = {}
        self.assertEqual(infer_facility("", default), default)

    def test_infer_facility_by_id(self):
        default = {}
        self.assertEqual(infer_facility(self.facility.id, default), self.facility)

    def test_infer_facility_by_name(self):
        default = {}
        self.assertEqual(infer_facility(self.facility.name, default), self.facility)

    def test_infer_facility_fail(self):
        default = {}
        with self.assertRaises(ValueError):
            infer_facility("garbage", default)

    def test_infer_class_no_class_no_effect(self):
        infer_and_create_class(None, self.facility)
        self.assertEqual(Classroom.objects.count(), 0)

    def test_infer_class_falsy_class_no_effect(self):
        infer_and_create_class("", self.facility)
        self.assertEqual(Classroom.objects.count(), 0)

    def test_infer_class_by_id(self):
        classroom = Classroom.objects.create(name="testclass", parent=self.facility)
        self.assertEqual(infer_and_create_class(classroom.id, self.facility), classroom)

    def test_infer_class_by_name(self):
        classroom = Classroom.objects.create(name="testclass", parent=self.facility)
        self.assertEqual(
            infer_and_create_class(classroom.name, self.facility), classroom
        )

    def test_infer_class_create(self):
        self.assertEqual(
            infer_and_create_class("testclass", self.facility),
            Classroom.objects.get(name="testclass"),
        )

    def test_create_user_exists(self):
        user = {"username": self.superuser.username}
        self.assertFalse(create_user(user, default_facility=self.facility))

    def test_create_user_exists_add_classroom(self):
        user = {"username": self.superuser.username, "class": "testclass"}
        create_user(user, default_facility=self.facility)
        self.assertTrue(
            self.superuser.is_member_of(Classroom.objects.get(name="testclass"))
        )

    def test_create_user_not_exist(self):
        user = {"username": "testuser"}
        self.assertTrue(create_user(user, default_facility=self.facility))

    def test_create_user_not_exist_add_classroom(self):
        user = {"username": "testuser", "class": "testclass"}
        create_user(user, default_facility=self.facility)
        self.assertTrue(
            FacilityUser.objects.get(username="testuser").is_member_of(
                Classroom.objects.get(name="testclass")
            )
        )

    def test_create_user_not_exist_bad_username(self):
        user = {"username": "test$user"}
        self.assertFalse(create_user(user, default_facility=self.facility))


users = [
    {
        "username": "alice",
        "birth_year": "1990",
        "gender": FEMALE,
        "password": "password",
    },
    {"username": "bob", "birth_year": "1914", "gender": MALE, "password": "password"},
    {
        "username": "clara",
        "birth_year": "1900",
        "gender": NOT_SPECIFIED,
        "password": "password",
    },
    {
        "username": "devone",
        "birth_year": "2100",
        "gender": DEFERRED,
        "password": "password",
    },
]


class DeviceNotSetup(TestCase):
    def test_device_not_setup(self):
        csvfile, csvpath = tempfile.mkstemp(suffix="csv")
        with self.assertRaisesRegexp(CommandError, "No default facility exists"):
            call_command("importusers", csvpath)
        os.remove(csvpath)


class UserImportCommandTestCase(TestCase):
    """
    Tests for 'kolibri manage importusers' command.
    """

    @classmethod
    def setUpClass(self):
        super(UserImportCommandTestCase, self).setUpClass()
        self.facility, self.superuser = setup_device()

    def setUp(self):
        self.csvfile, self.csvpath = tempfile.mkstemp(suffix="csv")

    def tearDown(self):
        FacilityUser.objects.exclude(username=self.superuser.username).delete()
        os.remove(self.csvpath)

    def importFromRows(self, *args):
        with open(self.csvpath, "w") as f:
            writer = csv.writer(f)
            writer.writerows([a for a in args])

        call_command("importusers", self.csvpath)

    def test_setup_headers_no_username(self):
        with self.assertRaisesRegexp(CommandError, "No usernames specified"):
            self.importFromRows(["class", "facility"])
            call_command("importusers", self.csvpath)

    def test_setup_headers_invalid_header(self):
        with self.assertRaisesRegexp(CommandError, "Mix of valid and invalid header"):
            self.importFromRows(["class", "facility", "dogfood"])
            call_command("importusers", self.csvpath)

    def test_setup_headers_make_user(self):
        self.importFromRows(["username"], ["testuser"])
        call_command("importusers", self.csvpath)
        self.assertTrue(FacilityUser.objects.filter(username="testuser").exists())

    def test_setup_no_headers_make_user(self):
        self.importFromRows(["Test user", "testuser"])
        self.assertTrue(FacilityUser.objects.filter(username="testuser").exists())

    def test_setup_no_headers_bad_user_good_user(self):
        self.importFromRows(["Test user", "testuser"], ["Other user", "te$tuser"])
        self.assertTrue(FacilityUser.objects.filter(username="testuser").exists())
        self.assertFalse(FacilityUser.objects.filter(username="te$tuser").exists())

    def test_empty_fullname_defaults_to_username(self):
        self.importFromRows(["full_name", "username"], ["", "bob123"])
        self.assertEqual(
            FacilityUser.objects.get(username="bob123").full_name, "bob123"
        )

    def test_missing_fullname_defaults_to_username(self):
        self.importFromRows(["username"], ["bob123"])
        self.assertEqual(
            FacilityUser.objects.get(username="bob123").full_name, "bob123"
        )

    def test_update_valid_demographic_info_succeeds(self):
        FacilityUser.objects.create(
            username="alice",
            birth_year="1990",
            gender="FEMALE",
            password="password",
            facility=self.facility,
        )
        self.importFromRows(
            ["username", "birth_year", "gender"],
            ["alice", "", "NOT_SPECIFIED"],
            ["bob", "1970", "MALE"],
        )
        alice = FacilityUser.objects.get(username="alice")
        bob = FacilityUser.objects.get(username="bob")
        self.assertEqual(alice.birth_year, "")
        self.assertEqual(alice.gender, "NOT_SPECIFIED")
        self.assertEqual(bob.birth_year, "1970")
        self.assertEqual(bob.gender, "MALE")

    def test_update_with_invalid_demographic_info_fails(self):
        FacilityUser.objects.create(
            username="alice",
            birth_year="NOT_SPECIFIED",
            password="password",
            facility=self.facility,
        )
        self.importFromRows(
            ["username", "birth_year", "gender"],
            ["alice", "BLAH", "FEMALE"],
            ["bob", "1970", "man"],
        )

        # Alice and Bob's demographic data aren't updated
        alice = FacilityUser.objects.get(username="alice")
        bob = FacilityUser.objects.get(username="bob")
        self.assertEqual(alice.birth_year, "NOT_SPECIFIED")
        self.assertEqual(alice.gender, "")
        self.assertEqual(bob.birth_year, "")
        self.assertEqual(bob.gender, "")

    def test_update_with_missing_columns(self):
        FacilityUser.objects.create(
            username="alice",
            birth_year="1990",
            gender="FEMALE",
            id_number="ALICE",
            password="password",
            facility=self.facility,
        )
        # CSV is missing column for gender, so it should not be updated
        self.importFromRows(
            ["username", "birth_year", "id_number"], ["alice", "2000", ""]
        )
        alice = FacilityUser.objects.get(username="alice")
        self.assertEqual(alice.gender, "FEMALE")
        self.assertEqual(alice.birth_year, "2000")
        self.assertEqual(alice.id_number, "")

    def test_import_from_export_csv(self):
        for user in users:
            FacilityUser.objects.create(facility=self.facility, **user)
        call_command(
            "exportusers", output_file=self.csvpath, overwrite=True, demographic=True
        )
        FacilityUser.objects.all().delete()
        call_command("importusers", self.csvpath)
        for user in users:
            user_model = FacilityUser.objects.get(username=user["username"])
            self.assertEqual(user_model.gender, user["gender"])
            self.assertEqual(user_model.birth_year, user["birth_year"])
            self.assertEqual(user_model.id_number, "")

    def test_import_from_export_missing_headers(self):
        for user in users:
            FacilityUser.objects.create(facility=self.facility, **user)
        call_command(
            "exportusers", output_file=self.csvpath, overwrite=True, demographic=True
        )
        cols_to_remove = ["Facility id", "Gender"]
        with open(self.csvpath, "r") as source:
            reader = csv.DictReader(source)
            rows = list(row for row in reader)
        with open(self.csvpath, "w") as result:
            writer = csv.DictWriter(
                result,
                tuple(
                    label for label in labels.values() if label not in cols_to_remove
                ),
            )
            writer.writeheader()
            for row in rows:
                for col in cols_to_remove:
                    del row[col]
                writer.writerow(row)
        FacilityUser.objects.all().delete()
        call_command("importusers", self.csvpath)
        for user in users:
            user_model = FacilityUser.objects.get(username=user["username"])
            self.assertEqual(user_model.birth_year, user["birth_year"])
            self.assertEqual(user_model.id_number, "")

    def test_import_from_export_mixed_headers(self):
        for user in users:
            FacilityUser.objects.create(facility=self.facility, **user)
        call_command(
            "exportusers", output_file=self.csvpath, overwrite=True, demographic=True
        )
        cols_to_replace = {"Facility id": "facility", "Gender": "gender"}
        with open(self.csvpath, "r") as source:
            reader = csv.DictReader(source)
            rows = list(row for row in reader)
        with open(self.csvpath, "w") as result:
            writer = csv.DictWriter(
                result,
                tuple(
                    cols_to_replace[label] if label in cols_to_replace else label
                    for label in labels.values()
                ),
            )
            writer.writeheader()
            for row in rows:
                for col in cols_to_replace:
                    row[cols_to_replace[col]] = row[col]
                    del row[col]
                writer.writerow(row)
        FacilityUser.objects.all().delete()
        call_command("importusers", self.csvpath)
        for user in users:
            user_model = FacilityUser.objects.get(username=user["username"])
            self.assertEqual(user_model.birth_year, user["birth_year"])
            self.assertEqual(user_model.id_number, "")
