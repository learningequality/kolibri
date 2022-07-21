import csv
import tempfile

from django.test import override_settings
from django.test import TestCase

from .helpers import create_dummy_facility_data
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.constants.demographics import NOT_SPECIFIED
from kolibri.core.utils.csv import open_csv_for_reading

CLASSROOMS = 2


@override_settings(LANGUAGE_CODE="en")
class UserExportTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Import inside the settings decorator to ensure that the locale is controlled
        from ..management.commands import bulkexportusers as b

        cls.b = b
        cls.data = create_dummy_facility_data(
            classroom_count=CLASSROOMS, learnergroup_count=1
        )
        cls.facility = cls.data["facility"]

        _, cls.filepath = tempfile.mkstemp(suffix=".csv")

        cls.csv_rows = []
        for row in b.csv_file_generator(cls.facility, cls.filepath, True):
            cls.csv_rows.append(row)

    def test_not_specified(self):
        row = {
            "username": "Bob",
            "password": None,
            "birth_year": "1969",
            "gender": NOT_SPECIFIED,
        }
        assert self.b.not_specified("gender", row) is None
        assert self.b.not_specified("username", row) == "Bob"
        assert self.b.not_specified("password", row) is None

    def test_kind_of_roles(self):
        assert self.b.kind_of_roles("kind", {"kind": None}) == "LEARNER"
        assert self.b.kind_of_roles("kind", {"kind": "coACh"}) == "FACILITY_COACH"

    def test_map_output(self):
        row = {
            "username": "Bob",
            "password": None,
            "full_name": None,
            "kind": "COACH",
            "id_number": None,
            "birth_year": "1969",
            "gender": "MALE",
            "assigned": None,
            "enrolled": None,
        }
        mapped_obj = self.b.map_output(row)
        assert mapped_obj == {
            "Username (USERNAME)": "Bob",
            "Password (PASSWORD)": None,
            "Full name (FULL_NAME)": None,
            "User type (USER_TYPE)": "FACILITY_COACH",
            "Identifier (IDENTIFIER)": None,
            "Birth year (BIRTH_YEAR)": "1969",
            "Gender (GENDER)": "MALE",
            "Learner enrollment (ENROLLED_IN)": None,
            "Coach assignment (ASSIGNED_TO)": None,
        }

    def test_exported_rows(self):
        # total number of users created by create_dummy_facility_data:
        # superuser = 1 (not exported)
        # facility admin = 1
        # facility coach = 1
        # orphan_users = 3
        # classroom_coaches = CLASSROOMS
        # learners =  CLASSROOMS
        # 1 learner in all classrooms
        assert len(self.csv_rows) == 6 + CLASSROOMS * 2

    def test_roles(self):
        admin = self.data["facility_admin"].username
        coach = self.data["facility_coach"].username
        assignable_coaches = [u.username for u in self.data["classroom_coaches"]]
        for row in self.csv_rows:
            if row["username"] == admin:
                assert row["kind"] == role_kinds.ADMIN
            elif row["username"] == coach:
                assert row["kind"] == role_kinds.COACH
            elif row["username"] in assignable_coaches:
                assert row["kind"] == role_kinds.ASSIGNABLE_COACH

    def test_assigned(self):
        assignable_coaches = [u.username for u in self.data["classroom_coaches"]]
        coaches = [r for r in self.csv_rows if r["username"] in assignable_coaches]
        for coach in coaches:
            assert coach["assigned"] != ""
            assert coach["assigned"][-1] == coach["username"][-1]

    def test_enrolled(self):
        learner_all_groups = [r for r in self.csv_rows if r["username"] == "learnerag"]
        enrolled = learner_all_groups[0]["enrolled"].split(",")
        assert len(enrolled) == CLASSROOMS
        assert "classroom0" in enrolled
        assert "classroom1" in enrolled

        enrolled_learners = [
            r for r in self.csv_rows if r["username"][:12] == "learnerclass"
        ]
        for learner in enrolled_learners:
            class_number = learner["username"][12:13]
            assert learner["enrolled"] == "classroom{}".format(class_number)

    def test_passwords_as_asterisks(self):
        for row in self.csv_rows:
            assert row["password"] == "*"

    def get_data_from_csv_file(self):
        csv_file = open_csv_for_reading(self.filepath)
        with csv_file as f:
            results = [row for row in csv.DictReader(f)]
        return results

    def test_csv_file(self):
        results = self.get_data_from_csv_file()
        for i, row in enumerate(results):
            assert row[self.b.labels["username"]] == self.csv_rows[i]["username"]

    def test_coach_names_in_csv_file(self):
        results = self.get_data_from_csv_file()
        coach = self.data["facility_coach"].username
        assignable_coaches = [u.username for u in self.data["classroom_coaches"]]
        for row in results:
            if row[self.b.labels["username"]] == coach:
                assert row[self.b.labels["kind"]] == "FACILITY_COACH"
            elif row[self.b.labels["username"]] in assignable_coaches:
                assert row[self.b.labels["kind"]] == "CLASS_COACH"
