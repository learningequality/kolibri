"""
Tests that ensure the correct items are returned from api calls.
Also tests whether the users with permissions can create logs.
"""
import csv
import tempfile

from django.core.management import call_command
from django.test import TestCase
from six.moves import filter

from .helpers import setup_device
from kolibri.core.auth.constants.demographics import DEFERRED
from kolibri.core.auth.constants.demographics import DEMO_FIELDS
from kolibri.core.auth.constants.demographics import FEMALE
from kolibri.core.auth.constants.demographics import MALE
from kolibri.core.auth.constants.demographics import NOT_SPECIFIED
from kolibri.core.auth.csv_utils import labels
from kolibri.core.auth.csv_utils import transform_choices
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.utils.csv import open_csv_for_reading


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


class UserCSVExportTestCase(TestCase):
    def test_csv_export_with_demographics(self):
        facility, superuser = setup_device()
        for user in users:
            FacilityUser.objects.create(facility=facility, **user)
        expected_count = FacilityUser.objects.count()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportusers", output_file=filepath, overwrite=True, demographic=True
        )
        csv_file = open_csv_for_reading(filepath)
        with csv_file as f:
            results = [row for row in csv.DictReader(f)]

        for row in results:
            user = next(
                filter(lambda x: x["username"] == row[labels["username"]], users), None
            )
            if user:
                self.assertEqual(row[labels["birth_year"]], user["birth_year"])
                self.assertEqual(
                    row[labels["gender"]], transform_choices("gender", user)
                )
                self.assertEqual(row[labels["facility__name"]], facility.name)
                self.assertEqual(row[labels["facility__id"]], facility.id)
                self.assertEqual(row[labels["memberships__collection__name"]], "")
                self.assertEqual(row[labels["memberships__collection__id"]], "")

        self.assertEqual(len(results), expected_count)
        for demo_field in DEMO_FIELDS:
            label = labels[demo_field]
            self.assertTrue(label in results[0])

    def test_csv_export_no_demographics(self):
        facility, superuser = setup_device()
        for user in users:
            FacilityUser.objects.create(facility=facility, **user)
        expected_count = FacilityUser.objects.count()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportusers", output_file=filepath, overwrite=True, demographic=False
        )
        csv_file = open_csv_for_reading(filepath)
        with csv_file as f:
            results = [row for row in csv.DictReader(f)]

        self.assertEqual(len(results), expected_count)
        for demo_field in DEMO_FIELDS:
            label = labels[demo_field]
            self.assertFalse(label in results[0])

    def test_csv_export_user_in_multiple_classes(self):
        facility, superuser = setup_device()
        classroom1 = Classroom.objects.create(name="testclass1", parent=facility)
        classroom2 = Classroom.objects.create(name="testclass2", parent=facility)
        user = users[0]
        user_obj = FacilityUser.objects.create(facility=facility, **user)
        classroom1.add_member(user_obj)
        classroom2.add_member(user_obj)
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportusers", output_file=filepath, overwrite=True, demographic=True
        )
        csv_file = open_csv_for_reading(filepath)
        with csv_file as f:
            results = [row for row in csv.DictReader(f)]

        self.assertEqual(len(results), 2)

    def test_csv_export_user_in_one_class_one_group(self):
        facility, superuser = setup_device()
        classroom = Classroom.objects.create(name="testclass", parent=facility)
        group = LearnerGroup.objects.create(name="testgroup", parent=classroom)
        user = users[0]
        user_obj = FacilityUser.objects.create(facility=facility, **user)
        classroom.add_member(user_obj)
        group.add_member(user_obj)
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportusers", output_file=filepath, overwrite=True, demographic=True
        )
        csv_file = open_csv_for_reading(filepath)
        with csv_file as f:
            results = [row for row in csv.DictReader(f)]

        self.assertEqual(len(results), 2)

        for row in results:
            user = next(
                filter(lambda x: x["username"] == row[labels["username"]], users), None
            )
            if user:
                self.assertEqual(
                    row[labels["memberships__collection__name"]], classroom.name
                )
                self.assertEqual(
                    row[labels["memberships__collection__id"]], classroom.id
                )
