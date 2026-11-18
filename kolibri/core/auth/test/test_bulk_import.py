import ast
import csv
import tempfile
from io import StringIO
from uuid import UUID
from uuid import uuid4

import pytest
from django.contrib.auth.hashers import make_password
from django.core.management import call_command
from django.test import override_settings
from django.test import TestCase
from django.utils import timezone
from django.utils import translation

from kolibri.core.auth.constants import demographics
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.errors import BulkUserImportError
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import DevicePermissions
from kolibri.core.utils.csv import open_csv_for_reading
from kolibri.core.utils.csv import open_csv_for_writing

from ..utils import bulk_import as b
from ..utils.bulk_export import labels
from .helpers import create_dummy_facility_data
from .helpers import enable_picture_password

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
    assert check("bob 123") is None
    with pytest.raises(ValueError):
        check("bob123-..")
    with pytest.raises(ValueError):
        check(None)

    check = b.valid_name(allow_null=True)
    check(None)


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

        _, self.filename = tempfile.mkstemp(suffix=".csv")

        call_command(
            "bulkexportusers",
            output_file=self.filename,
            overwrite=True,
            facility=self.facility.id,
        )

        FacilityUser.objects.all().delete()
        Classroom.objects.all().delete()

    def create_csv(self, filename, rows, remove_uuid=False):
        header_labels = list(labels.values())

        with open_csv_for_writing(local_filepath=filename) as f:
            writer = csv.writer(f)
            writer.writerow(header_labels)
            for item in rows:
                if remove_uuid:
                    rows[0] = None
                writer.writerow(item)

    def import_exported_csv(self):
        # Replace asterisk in passwords to be able to import it
        # Remove UUID so new users are created
        _, new_filename = tempfile.mkstemp(suffix=".csv")
        rows = []
        with open_csv_for_reading(local_filepath=self.filename) as source:
            reader = csv.reader(source, strict=True)
            for row in reader:
                row[0] = None
                if row[2] == "*":
                    row[2] = "temp_password"
                rows.append(row)
        self.create_csv(new_filename, rows[1:])  # remove header
        # import exported csv
        call_command("bulkimportusers", new_filename, facility=self.facility.id)
        current_classes = Classroom.objects.filter(parent_id=self.facility).all()
        for classroom in current_classes:
            assert len(classroom.get_members()) == CLASSROOMS
            assert len(classroom.get_coaches()) == 1

    def test_dryrun_from_export_csv(self):
        with open_csv_for_reading(local_filepath=self.filename) as source:
            header = next(csv.reader(source, strict=True))
        header_translation = {
            lbl.partition("(")[2].partition(")")[0]: lbl for lbl in header
        }

        with open_csv_for_reading(local_filepath=self.filename) as source:
            reader = csv.DictReader(source, strict=True)
            per_line_errors, classes, users, roles = b.csv_values_validation(
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
        _, new_filename = tempfile.mkstemp(suffix=".csv")
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
        self.create_csv(new_filename, rows)

        with open_csv_for_reading(local_filepath=new_filename) as source:
            header = next(csv.reader(source, strict=True))
        header_translation = {
            lbl.partition("(")[2].partition(")")[0]: lbl for lbl in header
        }

        with open_csv_for_reading(local_filepath=new_filename) as source:
            reader = csv.DictReader(source, strict=True)
            per_line_errors, _classes, _users, _roles = b.csv_values_validation(
                reader, header_translation, self.facility
            )
        assert len(per_line_errors) == 1
        assert (
            per_line_errors[0]["message"]
            == "The password field is required. To leave the password unchanged in existing users, insert an asterisk (*)"
        )
        out_log = StringIO()
        call_command(
            "bulkimportusers",
            new_filename,
            facility=self.facility.id,
            errorlines=out_log,
        )
        result = out_log.getvalue().split("\n")
        # validation when checking db content should trigger an error for '*'  password for a non-existing user:
        assert "'value': '*'" in result[1]
        assert "new_coach" in result[1]
        assert "'row': 2" in result[1]

    def test_case_insensitive_usernames(self):
        _, first_filename = tempfile.mkstemp(suffix=".csv")
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
        self.create_csv(first_filename, rows)
        call_command("bulkimportusers", first_filename, facility=self.facility.id)

        # Retrieve the user(s)
        users = FacilityUser.objects.filter(username__iexact="peter")

        # Ensure that only one user is created, and it has the latest password
        assert users.count() == 1

    def test_username_already_exists(self):
        _, first_filename = tempfile.mkstemp(suffix=".csv")
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
        self.create_csv(first_filename, rows)

        call_command("bulkimportusers", first_filename, facility=self.facility.id)

        # Get the initial count of users with the username "peter"
        initial_peter_count = FacilityUser.all_objects.filter(username="peter").count()
        peter1 = FacilityUser.all_objects.get(username="peter")
        passwd1 = peter1.password
        # Check that the count of users with the username "peter" is one
        assert initial_peter_count == 1

        # Attempt to add another user with the same username "peter"
        _, second_filename = tempfile.mkstemp(suffix=".csv")
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
        self.create_csv(second_filename, rows)

        # Check that the command raises an IntegrityError when trying to add a user with an existing username
        call_command("bulkimportusers", second_filename, facility=self.facility.id)

        # Check that the count of users with the username "peter" is still one
        assert FacilityUser.all_objects.filter(username="peter").count() == 1
        peter2 = FacilityUser.all_objects.get(username="peter")
        passwd2 = peter2.password
        # Check that the password of the existing user remains unchanged
        assert passwd2 == passwd1

    def test_username_already_exists_on_different_facility(self):
        _, first_filename = tempfile.mkstemp(suffix=".csv")
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
        self.create_csv(first_filename, rows)

        data = create_dummy_facility_data(
            classroom_count=CLASSROOMS, learnergroup_count=1
        )

        facility2 = data["facility"]

        # First import this user into a different facility
        call_command("bulkimportusers", first_filename, facility=facility2.id)

        # Then import into the main facility and confirm that it works!
        call_command("bulkimportusers", first_filename, facility=self.facility.id)

        # Assert that we have created a user like this in both facilities.
        assert FacilityUser.all_objects.filter(
            username="peter", facility=facility2
        ).exists()
        assert FacilityUser.all_objects.filter(
            username="peter", facility=self.facility
        ).exists()

    def test_asterisk_in_password(self):
        _, first_filename = tempfile.mkstemp(suffix=".csv")
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
        self.create_csv(first_filename, rows)
        call_command("bulkimportusers", first_filename, facility=self.facility.id)
        user1 = FacilityUser.all_objects.get(username="new_learner")
        passwd1 = user1.password
        uid1 = user1.id
        user2 = FacilityUser.all_objects.get(username="new_coach")
        passwd2 = user2.password
        uid2 = user2.id

        # let's edit the users with a new import
        _, second_filename = tempfile.mkstemp(suffix=".csv")
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
        self.create_csv(second_filename, rows)
        call_command("bulkimportusers", second_filename, facility=self.facility.id)
        assert passwd1 != FacilityUser.all_objects.get(username="new_learner").password
        # When updating, an asterisk should keep the previous password:
        assert passwd2 == FacilityUser.all_objects.get(username="new_coach").password

    def test_delete_users_and_classes(self):
        self.import_exported_csv()

        # new csv to import and clear classes and delete non-admin users:
        _, new_filename = tempfile.mkstemp(suffix=".csv")
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
        self.create_csv(new_filename, rows)
        call_command(
            "bulkimportusers", new_filename, "--delete", facility=self.facility.id
        )

        # Previous users have been deleted, excepting the existing admin:
        learners = FacilityUser.all_objects.filter(
            facility=self.facility, roles__kind=None
        ).all()
        assert len(learners) == 1
        coaches = FacilityUser.all_objects.filter(
            facility=self.facility,
            roles__collection_id=self.facility,
            roles__kind=role_kinds.COACH,
        ).all()
        assert len(coaches) == 1
        admins = FacilityUser.all_objects.filter(
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
        old_users = FacilityUser.all_objects.count()
        # new csv to import and update classes, adding users and keeping previous not been in the csv:
        _, new_filename = tempfile.mkstemp(suffix=".csv")
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
        self.create_csv(new_filename, rows)
        call_command("bulkimportusers", new_filename, facility=self.facility.id)
        assert FacilityUser.all_objects.count() == old_users + 2
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
        new_learner = FacilityUser.all_objects.get(username="new_learner")
        assert new_learner.gender == demographics.FEMALE
        assert new_learner.birth_year == "2001"
        assert new_learner.id_number == "KALITE"
        new_coach = FacilityUser.all_objects.get(username="new_coach")
        assert new_coach.gender == demographics.MALE

    def test_classes_names_case_insensitive(self):
        _, new_filename = tempfile.mkstemp(suffix=".csv")
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
        self.create_csv(new_filename, rows)
        call_command("bulkimportusers", new_filename, facility=self.facility.id)
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
        _, new_new_filename = tempfile.mkstemp(suffix=".csv")
        self.create_csv(new_new_filename, rows)
        call_command("bulkimportusers", new_new_filename, facility=self.facility.id)
        classrooms = Classroom.objects.all()
        assert len(classrooms) == 4

    def test_non_existing_uuid(self):
        self.import_exported_csv()
        _, new_filename = tempfile.mkstemp(suffix=".csv")
        rows = []
        with open_csv_for_reading(local_filepath=self.filename) as source:
            reader = csv.reader(source, strict=True)
            for row in reader:
                row[0] = uuid4()
                row[2] = "*"
                rows.append(row)
        self.create_csv(new_filename, rows[1:])  # remove header
        number_of_rows = len(rows) - 1  # exclude header
        # import exported csv
        out_log = StringIO()
        call_command(
            "bulkimportusers",
            new_filename,
            facility=self.facility.id,
            errorlines=out_log,
        )
        result = out_log.getvalue().strip().split("\n")

        assert len(result) == number_of_rows

    def test_import_undeletes_soft_deleted_user(self):
        """Test that importing a soft-deleted user with matching UUID un-deletes them"""
        # Create a user and soft-delete them
        user = FacilityUser.objects.create(
            username="testuser",
            password=make_password("password"),
            facility=self.facility,
        )
        user.date_deleted = timezone.now()
        user.save()

        self.assertIsNotNone(FacilityUser.all_objects.get(id=user.id).date_deleted)
        self.assertFalse(FacilityUser.objects.filter(id=user.id).exists())

        _, csv_filename = tempfile.mkstemp(suffix=".csv")
        rows = [
            [
                str(user.id),
                "testuser",
                "newpassword",
                "Test User",
                "LEARNER",
                "",
                "",
                "",
                "",
                "",
            ]
        ]
        self.create_csv(csv_filename, rows)

        call_command("bulkimportusers", csv_filename, facility=self.facility.id)

        imported_user = FacilityUser.objects.get(id=user.id)
        self.assertIsNone(imported_user.date_deleted)
        self.assertEqual(imported_user.username, "testuser")
        self.assertTrue(imported_user.check_password("newpassword"))

    def _import_row(
        self,
        username,
        uuid_cell,
        full_name,
        *args,
        user_type="LEARNER",
        assigned_to="",
        **kwargs,
    ):
        _, csv_filename = tempfile.mkstemp(suffix=".csv")
        row = [
            uuid_cell,
            username,
            "*",
            full_name,
            user_type,
            "",
            "",
            "",
            "",
            assigned_to,
        ]
        self.create_csv(csv_filename, [row])
        call_command(
            "bulkimportusers", csv_filename, *args, facility=self.facility.id, **kwargs
        )

    def test_dashed_uuid_matches_existing_user_with_delete(self):
        user = FacilityUser.objects.create(
            username="bob",
            full_name="Bob",
            password=make_password("password"),
            facility=self.facility,
        )

        self._import_row("bob", str(UUID(user.id)), "Robert", "--delete")

        self.assertEqual(FacilityUser.objects.get(id=user.id).full_name, "Robert")

    def test_uuid_in_any_valid_form_updates_existing_user(self):
        user = FacilityUser.objects.create(
            username="bob",
            full_name="Bob",
            password=make_password("password"),
            facility=self.facility,
        )
        user_uuid = UUID(user.id)
        forms = {
            "uppercase": user_uuid.hex.upper(),
            "braced": f"{{{user_uuid}}}",
            "urn": user_uuid.urn,
        }
        for form, uuid_cell in forms.items():
            with self.subTest(form=form):
                full_name = f"Bob {form}"

                self._import_row("bob", uuid_cell, full_name)

                self.assertEqual(
                    FacilityUser.objects.get(id=user.id).full_name, full_name
                )

    def _create_user(self, username, role_kind=None):
        user = FacilityUser.objects.create(
            username=username,
            full_name=username,
            password=make_password("password"),
            facility=self.facility,
        )
        if role_kind:
            self.facility.add_role(user, role_kind)
        return user

    def _import_user_type(self, user, user_type, *args, **kwargs):
        self._import_row(
            user.username,
            user.id,
            user.full_name,
            *args,
            user_type=user_type,
            **kwargs,
        )

    def _users_updated_count(self, user, user_type, *args, **kwargs):
        with self.assertLogs(
            "kolibri.core.auth.utils.bulk_import", level="INFO"
        ) as logs:
            self._import_user_type(user, user_type, *args, **kwargs)
        users_report = next(
            record.args for record in logs.records if record.msg == "Users report: %s"
        )
        return users_report["updated"]

    def _facility_role_kinds(self, user):
        return sorted(
            user.roles.filter(collection=self.facility).values_list("kind", flat=True)
        )

    def test_learner_user_type_removes_facility_role(self):
        for role_kind in (role_kinds.COACH, role_kinds.ADMIN):
            for name_suffix in ("", " renamed"):
                with self.subTest(role_kind=role_kind, name_suffix=name_suffix):
                    user = self._create_user(
                        f"user_{role_kind}_{len(name_suffix)}", role_kind
                    )

                    self._import_row(
                        user.username, user.id, user.full_name + name_suffix
                    )

                    self.assertEqual(self._facility_role_kinds(user), [])

    def test_admin_user_type_replaces_coach_role(self):
        user = self._create_user("bob", role_kinds.COACH)

        self._import_user_type(user, "ADMIN")

        self.assertEqual(self._facility_role_kinds(user), [role_kinds.ADMIN])

    def test_coach_user_type_alone_gives_learner_coach_role(self):
        user = self._create_user("bob")

        self._import_user_type(user, "FACILITY_COACH")

        self.assertEqual(self._facility_role_kinds(user), [role_kinds.COACH])

    def test_class_coach_keeps_class_whatever_coaching_user_type(self):
        classroom = Classroom.objects.create(name="Class A", parent=self.facility)
        for user_type, role_kind in (
            ("FACILITY_COACH", role_kinds.COACH),
            ("CLASS_COACH", role_kinds.ASSIGNABLE_COACH),
            ("ADMIN", role_kinds.ADMIN),
        ):
            with self.subTest(user_type=user_type):
                user = self._create_user(f"user_{user_type}")
                classroom.add_coach(user)

                self._import_user_type(user, user_type, assigned_to=classroom.name)

                self.assertEqual(self._facility_role_kinds(user), [role_kind])
                self.assertIn(user, classroom.get_coaches())

    def test_class_coach_made_learner_coaches_no_class(self):
        user = self._create_user("bob")
        classroom = Classroom.objects.create(name="Class A", parent=self.facility)
        classroom.add_coach(user)

        self._import_user_type(user, "LEARNER", assigned_to=classroom.name)

        self.assertFalse(user.roles.exists())

    def test_user_left_without_role_gets_picture_password(self):
        enable_picture_password(self.facility)
        classroom = Classroom.objects.create(name="Class A", parent=self.facility)
        class_coach = self._create_user("class_coach")
        classroom.add_coach(class_coach)
        for user in (self._create_user("coach", role_kinds.COACH), class_coach):
            with self.subTest(username=user.username):
                self._import_user_type(user, "LEARNER")

                user.refresh_from_db()
                self.assertIsNotNone(user.picture_password)

    def test_new_learner_gets_picture_password(self):
        enable_picture_password(self.facility)

        _, csv_filename = tempfile.mkstemp(suffix=".csv")
        row = ["", "newlearner", "password", "New Learner", "LEARNER"] + [""] * 5
        self.create_csv(csv_filename, [row])
        call_command("bulkimportusers", csv_filename, facility=self.facility.id)

        self.assertIsNotNone(
            FacilityUser.objects.get(username="newlearner").picture_password
        )

    def test_rename_rejected_as_duplicate_changes_no_role(self):
        renamed = self._create_user("bob", role_kinds.COACH)
        name_owner = self._create_user("alice", role_kinds.ADMIN)

        self._import_row(name_owner.username, renamed.id, renamed.full_name)

        self.assertEqual(self._facility_role_kinds(renamed), [role_kinds.COACH])
        self.assertEqual(self._facility_role_kinds(name_owner), [role_kinds.ADMIN])

    def test_importing_user_keeps_own_facility_role(self):
        admin = self._create_user("boss", role_kinds.ADMIN)

        for userid in (admin.id, str(UUID(admin.id))):
            with self.subTest(userid=userid):
                updated = self._users_updated_count(
                    admin, "FACILITY_COACH", userid=userid
                )

                self.assertEqual(updated, 0)
                self.assertEqual(self._facility_role_kinds(admin), [role_kinds.ADMIN])

    def test_superuser_keeps_facility_role_and_survives_delete(self):
        admin = self._create_user("boss", role_kinds.ADMIN)
        superuser = self._create_user("su", role_kinds.ADMIN)
        DevicePermissions.objects.create(user=superuser, is_superuser=True)

        self._import_user_type(superuser, "LEARNER", userid=admin.id)
        self._import_user_type(admin, "ADMIN", "--delete", userid=admin.id)

        self.assertEqual(self._facility_role_kinds(superuser), [role_kinds.ADMIN])
        self.assertTrue(FacilityUser.objects.filter(id=superuser.id).exists())

    def test_role_only_change_counts_user_as_updated(self):
        user = self._create_user("bob", role_kinds.COACH)
        for args in (("--dryrun",), ()):
            with self.subTest(args=args):
                self.assertEqual(self._users_updated_count(user, "LEARNER", *args), 1)

    def test_unchanged_role_counts_no_user_as_updated(self):
        user = self._create_user("bob", role_kinds.COACH)
        self.assertEqual(self._users_updated_count(user, "FACILITY_COACH"), 0)

    def test_dryrun_changes_no_role(self):
        user = self._create_user("bob", role_kinds.COACH)

        self._import_user_type(user, "LEARNER", "--dryrun")

        self.assertEqual(self._facility_role_kinds(user), [role_kinds.COACH])

    def test_row_shorter_than_header_creates_user(self):
        _, csv_filename = tempfile.mkstemp(suffix=".csv")
        header = list(labels.values())
        header.append(header.pop(0))
        with open_csv_for_writing(local_filepath=csv_filename) as f:
            writer = csv.writer(f)
            writer.writerow(header)
            writer.writerow(["alice", "pw", "Alice", "LEARNER", "", "", "", "", ""])

        call_command("bulkimportusers", csv_filename, facility=self.facility.id)

        self.assertTrue(FacilityUser.objects.filter(username="alice").exists())

    def test_unknown_uuid_error_names_uuid(self):
        unknown_uuid = str(uuid4())
        errorlines = StringIO()

        self._import_row("bob", unknown_uuid, "Bob", errorlines=errorlines)

        error = ast.literal_eval(errorlines.getvalue().strip())
        self.assertEqual(error["field"], "UUID")
        self.assertEqual(error["value"], unknown_uuid)
        self.assertIn(unknown_uuid, error["message"])

    def test_failed_import_restores_language(self):
        manager = b.BulkUserImportManager(
            "nonexistent.csv", facility_id=self.facility.id, locale="fr-fr"
        )
        with translation.override("en"):
            with self.assertRaises(BulkUserImportError):
                manager.run()
            self.assertEqual(translation.get_language(), "en")
