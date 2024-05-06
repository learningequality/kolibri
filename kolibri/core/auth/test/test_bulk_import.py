import csv
import tempfile
from io import StringIO
from uuid import uuid4

import pytest
from django.core.management import call_command
from django.test import override_settings
from django.test import TestCase

from ..management.commands import bulkimportusers as b
from ..management.commands.bulkexportusers import labels
from .helpers import create_dummy_facility_data
from kolibri.core.auth.constants import demographics
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import FacilityUser
from kolibri.core.utils.csv import open_csv_for_reading
from kolibri.core.utils.csv import open_csv_for_writing


CLASSROOMS = 2

# validators


def test_number_range_validator():
    check = b.number_range(1900, 2050, allow_null=False)
    with pytest.raises(ValueError):
        check(3)
    with pytest.raises(ValueError):
        check(None)
    with pytest.raises(ValueError):
        check(2051)

    check = b.number_range(1900, 2050, allow_null=True)
    assert check("1969") is None
    assert check("2050") is None
    assert check(None) is None


def test_value_length_validator():
    check = b.value_length(4, allow_null=False)
    with pytest.raises(ValueError):
        assert check(None)

    check = b.value_length(4, allow_null=True)
    with pytest.raises(ValueError):
        check("Learning")
    assert check(None) is None
    assert check("ok") is None
    assert check("") is None

    with pytest.raises(ValueError):
        check("a,b,c,d,e,f")
    check = b.value_length(4, allow_null=False, multiple=True)
    with pytest.raises(ValueError):
        check("a,bbbbb,c,d")
    assert check("a,b,c,d,e,f,") is None


def test_enumeration_validator():
    check = b.enumeration("LEARNER", "ADMIN", "COACH")
    assert check("aDMin") is None
    with pytest.raises(ValueError):
        check("other")
    check = b.enumeration("kolibri")
    assert check("b") is None


def test_valid_name_validator():
    check = b.valid_name()
    assert check("bob123") is None
    with pytest.raises(ValueError):
        check("bob 123")

    check = b.valid_name(username=False)
    check("bob 123") is None
    with pytest.raises(ValueError):
        check("bob123-..")
    with pytest.raises(ValueError):
        check(None)

    check = b.valid_name(allow_null=True)
    check(None) is None


def test_not_empty():
    check = b.not_empty()
    assert check("hello") is None
    with pytest.raises(ValueError):
        check(None)
    with pytest.raises(ValueError):
        check("")


@override_settings(LANGUAGE_CODE="en")
class ImportTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        self.data = create_dummy_facility_data(
            classroom_count=CLASSROOMS, learnergroup_count=1
        )
        self.facility = self.data["facility"]

        _, self.filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "bulkexportusers",
            output_file=self.filepath,
            overwrite=True,
            facility=self.facility.id,
        )

        FacilityUser.objects.all().delete()
        Classroom.objects.all().delete()

    def create_csv(self, filepath, rows, remove_uuid=False):
        header_labels = list(labels.values())

        csv_file = open_csv_for_writing(filepath)

        with csv_file as f:
            writer = csv.writer(f)
            writer.writerow(header_labels)
            for item in rows:
                if remove_uuid:
                    rows[0] = None
                writer.writerow(item)

    def import_exported_csv(self):
        # Replace asterisk in passwords to be able to import it
        # Remove UUID so new users are created
        _, new_filepath = tempfile.mkstemp(suffix=".csv")
        rows = []
        with open_csv_for_reading(self.filepath) as source:
            reader = csv.reader(source, strict=True)
            for row in reader:
                row[0] = None
                if row[2] == "*":
                    row[2] = "temp_password"
                rows.append(row)
        self.create_csv(new_filepath, rows[1:])  # remove header
        self.filepath = new_filepath
        # import exported csv
        call_command("bulkimportusers", self.filepath, facility=self.facility.id)
        current_classes = Classroom.objects.filter(parent_id=self.facility).all()
        for classroom in current_classes:
            assert len(classroom.get_members()) == CLASSROOMS
            assert len(classroom.get_coaches()) == 1

    def test_dryrun_from_export_csv(self):
        with open_csv_for_reading(self.filepath) as source:
            header = next(csv.reader(source, strict=True))
        header_translation = {
            lbl.partition("(")[2].partition(")")[0]: lbl for lbl in header
        }
        cmd = b.Command()

        with open_csv_for_reading(self.filepath) as source:
            reader = csv.DictReader(source, strict=True)
            per_line_errors, classes, users, roles = cmd.csv_values_validation(
                reader, header_translation, self.facility
            )

        assert len(users) == 10  # admins have not been exported
        # assert roles[role_kinds.ADMIN] == ["facadmin"]
        assert per_line_errors == []
        assert roles[role_kinds.COACH] == ["faccoach"]
        assert "classcoach0" in roles[role_kinds.ASSIGNABLE_COACH]
        assert "classcoach1" in roles[role_kinds.ASSIGNABLE_COACH]
        enrolled_classes = classes[0]
        assert "learnerag" in enrolled_classes["classroom0"]
        assert "learnerclass0group0" in enrolled_classes["classroom0"]
        assert "learnerag" in enrolled_classes["classroom1"]
        assert "learnerclass1group0" in enrolled_classes["classroom1"]
        assigned_classes = classes[1]
        assert assigned_classes["classroom0"] == ["classcoach0"]
        assert assigned_classes["classroom1"] == ["classcoach1"]

    def test_password_is_required(self):
        _, new_filepath = tempfile.mkstemp(suffix=".csv")
        rows = [
            [
                None,
                "new_learner",
                None,
                None,
                "LEARNER",
                None,
                "2001",
                "FEMALE",
                "new_class",
                None,
            ],
            [
                None,
                "new_coach",
                "*",
                None,
                "FACILITY_COACH",
                None,
                "1969",
                "MALE",
                None,
                "new_class",
            ],
            [
                None,
                "another_new_coach",
                "passwd1",
                None,
                "FACILITY_COACH",
                None,
                "1969",
                "MALE",
                None,
                "new_class",
            ],
        ]
        self.create_csv(new_filepath, rows)

        with open_csv_for_reading(new_filepath) as source:
            header = next(csv.reader(source, strict=True))
        header_translation = {
            lbl.partition("(")[2].partition(")")[0]: lbl for lbl in header
        }
        cmd = b.Command()

        with open_csv_for_reading(new_filepath) as source:
            reader = csv.DictReader(source, strict=True)
            per_line_errors, classes, users, roles = cmd.csv_values_validation(
                reader, header_translation, self.facility
            )
        assert len(per_line_errors) == 1
        assert (
            per_line_errors[0]["message"]
            == "The password field is required. To leave the password unchanged in existing users, insert an asterisk (*)"  # noqa: W503
        )
        out_log = StringIO()
        call_command(
            "bulkimportusers",
            new_filepath,
            facility=self.facility.id,
            errorlines=out_log,
        )
        result = out_log.getvalue().split("\n")
        # validation when checking db content should trigger an error for '*'  password for a non-existing user:
        assert "'value': '*'" in result[1]
        assert "new_coach" in result[1]
        assert "'row': 2" in result[1]

    def test_case_insensitive_usernames(self):
        _, first_filepath = tempfile.mkstemp(suffix=".csv")
        rows = [
            [
                None,
                "peter",
                "password1",
                None,
                "LEARNER",
                None,
                "2001",
                "FEMALE",
                "new_class",
                None,
            ],
            [
                None,
                "PETER",
                "password2",
                None,
                "FACILITY_COACH",
                None,
                "1969",
                "MALE",
                None,
                "new_class",
            ],
        ]
        self.create_csv(first_filepath, rows)
        call_command("bulkimportusers", first_filepath, facility=self.facility.id)

        # Retrieve the user(s)
        users = FacilityUser.objects.filter(username__iexact="peter")

        # Ensure that only one user is created, and it has the latest password
        assert users.count() == 1

    def test_username_already_exists(self):
        _, first_filepath = tempfile.mkstemp(suffix=".csv")
        rows = [
            [
                None,
                "peter",  # Adding the first user with the username "peter"
                "passwd1",
                None,
                "LEARNER",
                None,
                "2001",
                "FEMALE",
                "new_class",
                None,
            ],
        ]
        self.create_csv(first_filepath, rows)

        call_command("bulkimportusers", first_filepath, facility=self.facility.id)

        # Get the initial count of users with the username "peter"
        initial_peter_count = FacilityUser.objects.filter(username="peter").count()
        peter1 = FacilityUser.objects.get(username="peter")
        passwd1 = peter1.password
        # Check that the count of users with the username "peter" is one
        assert initial_peter_count == 1

        # Attempt to add another user with the same username "peter"
        _, second_filepath = tempfile.mkstemp(suffix=".csv")
        rows = [
            [
                None,
                "peter",  # Attempting to add another user with the same username "peter"
                "another_password",
                None,
                "LEARNER",
                None,
                "2001",
                "FEMALE",
                "new_class",
                None,
            ],
        ]
        self.create_csv(second_filepath, rows)

        # Check that the command raises an IntegrityError when trying to add a user with an existing username
        call_command("bulkimportusers", second_filepath, facility=self.facility.id)

        # Check that the count of users with the username "peter" is still one
        assert FacilityUser.objects.filter(username="peter").count() == 1
        peter2 = FacilityUser.objects.get(username="peter")
        passwd2 = peter2.password
        # Check that the password of the existing user remains unchanged
        assert passwd2 == passwd1

    def test_username_already_exists_on_different_facility(self):
        _, first_filepath = tempfile.mkstemp(suffix=".csv")
        rows = [
            [
                None,
                "peter",  # Adding the first user with the username "peter"
                "passwd1",
                None,
                "LEARNER",
                None,
                "2001",
                "FEMALE",
                "new_class",
                None,
            ],
        ]
        self.create_csv(first_filepath, rows)

        data = create_dummy_facility_data(
            classroom_count=CLASSROOMS, learnergroup_count=1
        )

        facility2 = data["facility"]

        # First import this user into a different facility
        call_command("bulkimportusers", first_filepath, facility=facility2.id)

        # Then import into the main facility and confirm that it works!
        call_command("bulkimportusers", first_filepath, facility=self.facility.id)

        # Assert that we have created a user like this in both facilities.
        assert FacilityUser.objects.filter(
            username="peter", facility=facility2
        ).exists()
        assert FacilityUser.objects.filter(
            username="peter", facility=self.facility
        ).exists()

    def test_asterisk_in_password(self):
        _, first_filepath = tempfile.mkstemp(suffix=".csv")
        rows = [
            [
                None,
                "new_learner",
                "passwd1",
                None,
                "LEARNER",
                None,
                "2001",
                "FEMALE",
                "new_class",
                None,
            ],
            [
                None,
                "new_coach",
                "passwd2",
                None,
                "FACILITY_COACH",
                None,
                "1969",
                "MALE",
                None,
                "new_class",
            ],
        ]
        self.create_csv(first_filepath, rows)
        call_command("bulkimportusers", first_filepath, facility=self.facility.id)
        user1 = FacilityUser.objects.get(username="new_learner")
        passwd1 = user1.password
        uid1 = user1.id
        user2 = FacilityUser.objects.get(username="new_coach")
        passwd2 = user2.password
        uid2 = user2.id

        # let's edit the users with a new import
        _, second_filepath = tempfile.mkstemp(suffix=".csv")
        rows = [
            [
                uid1,
                "new_learner",
                "passwd3",
                None,
                "LEARNER",
                None,
                "2001",
                "FEMALE",
                "new_class",
                None,
            ],
            [
                uid2,
                "new_coach",
                "*",
                None,
                "FACILITY_COACH",
                None,
                "1969",
                "MALE",
                None,
                "new_class",
            ],
        ]
        self.create_csv(second_filepath, rows)
        call_command("bulkimportusers", second_filepath, facility=self.facility.id)
        assert passwd1 != FacilityUser.objects.get(username="new_learner").password
        # When updating, an asterisk should keep the previous password:
        assert passwd2 == FacilityUser.objects.get(username="new_coach").password

    def test_delete_users_and_classes(self):
        self.import_exported_csv()

        # new csv to import and clear classes and delete non-admin users:
        _, new_filepath = tempfile.mkstemp(suffix=".csv")
        rows = [
            [
                None,
                "new_learner",
                "passwd1",
                None,
                "LEARNER",
                None,
                "2001",
                "FEMALE",
                "new_class",
                None,
            ],
            [
                None,
                "new_coach",
                "passwd2",
                None,
                "FACILITY_COACH",
                None,
                "1969",
                "MALE",
                None,
                "new_class",
            ],
        ]
        self.create_csv(new_filepath, rows)
        call_command(
            "bulkimportusers", new_filepath, "--delete", facility=self.facility.id
        )

        # Previous users have been deleted, excepting the existing admin:
        learners = FacilityUser.objects.filter(
            facility=self.facility, roles__kind=None
        ).all()
        assert len(learners) == 1
        coaches = FacilityUser.objects.filter(
            facility=self.facility,
            roles__collection_id=self.facility,
            roles__kind=role_kinds.COACH,
        ).all()
        assert len(coaches) == 1
        admins = FacilityUser.objects.filter(
            facility=self.facility,
            roles__collection_id=self.facility,
            roles__kind=role_kinds.ADMIN,
        ).all()
        assert len(admins) == 0  # admins have not been exported

        new_current_classes = Classroom.objects.filter(parent_id=self.facility).all()
        for classroom in new_current_classes:
            if classroom.name != "new_class":
                # classes have been cleared:
                assert len(classroom.get_members()) == 0
                assert len(classroom.get_coaches()) == 0
            else:
                # new class has been created with one coach and learner
                assert len(classroom.get_members()) == 1
                assert len(classroom.get_coaches()) == 1

    def test_add_users_and_classes(self):
        self.import_exported_csv()
        old_users = FacilityUser.objects.count()
        # new csv to import and update classes, adding users and keeping previous not been in the csv:
        _, new_filepath = tempfile.mkstemp(suffix=".csv")
        rows = [
            [
                None,
                "new_learner",
                "passwd1",
                None,
                "LEARNER",
                "kalite",
                "2001",
                "FEMALE",
                "classroom1,classroom0",
            ],
            [
                None,
                "new_coach",
                "passwd2",
                None,
                "FACILITY_COACH",
                None,
                "1969",
                "MALE",
                None,
                "classroom0",
            ],
        ]
        self.create_csv(new_filepath, rows)
        call_command("bulkimportusers", new_filepath, facility=self.facility.id)
        assert FacilityUser.objects.count() == old_users + 2
        current_classes = Classroom.objects.filter(parent_id=self.facility).all()
        for classroom in current_classes:
            if classroom.name == "classroom0":
                assert len(classroom.get_coaches()) == 2
            else:
                assert len(classroom.get_coaches()) == 1
            assert (
                len(classroom.get_members()) == 3
            )  # ['learnerag', 'learnerclassXgroup0', 'new_learner']

        # check demographics import:
        new_learner = FacilityUser.objects.get(username="new_learner")
        assert new_learner.gender == demographics.FEMALE
        assert new_learner.birth_year == "2001"
        assert new_learner.id_number == "KALITE"
        new_coach = FacilityUser.objects.get(username="new_coach")
        assert new_coach.gender == demographics.MALE

    def test_classes_names_case_insensitive(self):
        _, new_filepath = tempfile.mkstemp(suffix=".csv")
        # first inside the same csv file
        rows = [
            [
                None,
                "learner1",
                "passwd1",
                None,
                "LEARNER",
                "kalite",
                "2001",
                "FEMALE",
                " My class,another class ",
            ],
            [
                None,
                "coach1",
                "passwd2",
                None,
                "FACILITY_COACH",
                None,
                "1969",
                "MALE",
                "My Class",
                "My other class,  AnotheR ClasS",
            ],
        ]
        self.create_csv(new_filepath, rows)
        call_command("bulkimportusers", new_filepath, facility=self.facility.id)
        classrooms = Classroom.objects.all()
        assert len(classrooms) == 3

        # now, testing it's insensitive with database names:
        rows = [
            [
                None,
                "learner2",
                "passwd2",
                None,
                "LEARNER",
                "kolibri",
                "2001",
                "FEMALE",
                " My CLASS, Just another class ",
                "Another CLASS ",
            ]
        ]
        self.create_csv(new_filepath, rows)
        call_command("bulkimportusers", new_filepath, facility=self.facility.id)
        classrooms = Classroom.objects.all()
        assert len(classrooms) == 4

    def test_non_existing_uuid(self):
        self.import_exported_csv()
        _, new_filepath = tempfile.mkstemp(suffix=".csv")
        rows = []
        with open_csv_for_reading(self.filepath) as source:
            reader = csv.reader(source, strict=True)
            for row in reader:
                row[0] = uuid4()
                row[2] = "*"
                rows.append(row)
        self.create_csv(new_filepath, rows[1:])  # remove header
        number_of_rows = len(rows) - 1  # exclude header
        # import exported csv
        out_log = StringIO()
        call_command(
            "bulkimportusers",
            new_filepath,
            facility=self.facility.id,
            errorlines=out_log,
        )
        result = out_log.getvalue().strip().split("\n")

        assert len(result) == number_of_rows
