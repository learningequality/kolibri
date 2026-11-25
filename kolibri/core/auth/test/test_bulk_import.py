import ast
import csv
import sqlite3
import sys
import tempfile
from contextlib import contextmanager
from io import StringIO
from pathlib import Path
from unittest.mock import patch
from uuid import UUID
from uuid import uuid4

import pytest
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import get_hasher
from django.contrib.auth.hashers import make_password
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection
from django.db import DatabaseError
from django.test import override_settings
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from django.utils import translation
from django.utils.functional import cached_property

from kolibri.core.auth.constants import demographics
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.errors import BulkUserImportError
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Role
from kolibri.core.auth.viewsets.facility_user import FacilityUserSerializer
from kolibri.core.utils.csv import open_csv_for_reading
from kolibri.core.utils.csv import open_csv_for_writing

from ..utils import bulk_import as b
from ..utils.bulk_export import labels
from .helpers import create_dummy_facility_data

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
    with pytest.raises(ValueError):
        check("bob\0tail")

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
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.csv_dir = Path(directory.name)

    @cached_property
    def facility(self):
        return Facility.objects.create()

    def csv_path(self, name):
        return str(self.csv_dir / name)

    def create_csv(self, filename, rows, headers=None):
        header_labels = list(labels.values()) if headers is None else headers

        with open_csv_for_writing(local_filepath=filename) as csv_file:
            writer = csv.writer(csv_file)
            writer.writerow(header_labels)
            writer.writerows(rows)

    def import_exported_csv(self):
        self.facility = create_dummy_facility_data(
            classroom_count=CLASSROOMS, learnergroup_count=1
        )["facility"]
        exported_csv = self.csv_path("exported.csv")

        call_command(
            "bulkexportusers",
            output_file=exported_csv,
            facility=self.facility.id,
        )

        self.facility.get_members().delete()
        self.facility.get_classrooms().delete()

        # Replace asterisk in passwords to be able to import it
        # Remove UUID so new users are created
        new_filename = self.csv_path("reimport.csv")
        rows = []
        with open_csv_for_reading(local_filepath=exported_csv) as source:
            reader = csv.reader(source, strict=True)
            next(reader)
            for row in reader:
                row[0] = None
                if row[2] == "*":
                    row[2] = "temp_password"
                rows.append(row)
        self.create_csv(new_filename, rows)
        # import exported csv
        call_command("bulkimportusers", new_filename, facility=self.facility.id)
        self.assertCountEqual(
            FacilityUser.objects.filter(facility=self.facility).values_list(
                "username", flat=True
            ),
            [
                "faccoach",
                "classcoach0",
                "classcoach1",
                "learnerag",
                "learnerclass0group0",
                "learnerclass1group0",
                "orphan0",
                "orphan1",
                "orphan2",
                "superuser",
            ],
        )
        classrooms = Classroom.objects.filter(parent=self.facility).order_by("name")
        self.assertEqual(
            [classroom.name for classroom in classrooms], ["classroom0", "classroom1"]
        )
        for index, classroom in enumerate(classrooms):
            self.assertCountEqual(
                classroom.get_members().values_list("username", flat=True),
                ["learnerag", f"learnerclass{index}group0"],
            )
            self.assertCountEqual(
                classroom.get_coaches().values_list("username", flat=True),
                [f"classcoach{index}"],
            )
        self.assertCountEqual(
            Role.objects.filter(collection=self.facility).values_list(
                "user__username", "kind"
            ),
            [
                ("faccoach", role_kinds.COACH),
                ("classcoach0", role_kinds.ASSIGNABLE_COACH),
                ("classcoach1", role_kinds.ASSIGNABLE_COACH),
            ],
        )
        return exported_csv

    def test_dryrun_from_export_csv(self):
        facility = create_dummy_facility_data(
            classroom_count=CLASSROOMS, learnergroup_count=1
        )["facility"]
        errorlines = StringIO()
        filename = self.csv_path("exported.csv")
        call_command("bulkexportusers", output_file=filename, facility=facility.id)
        with self.assertLogs(b.logger) as logs:
            call_command(
                "bulkimportusers",
                filename,
                "--dryrun",
                facility=facility.id,
                errorlines=errorlines,
            )

        self.assertEqual(errorlines.getvalue(), "")
        messages = [record.getMessage() for record in logs.records]
        self.assertIn(
            "Classes report: {'created': 0, 'updated': 2, 'cleared': 0}", messages
        )
        self.assertIn(
            "Users report: {'created': 0, 'updated': 0, 'deleted': 0}", messages
        )

    def test_password_is_required(self):
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
        errors = self._import_rows(rows)

        self.assertEqual(
            [(error["row"], error["field"], error["value"]) for error in errors],
            [(1, "PASSWORD", ""), (2, "PASSWORD", "*")],
        )
        for error in errors:
            self.assertEqual(
                error["message"],
                "The password field is required. To leave the password unchanged in existing users, insert an asterisk (*)",
            )

    def test_dryrun_with_password_does_not_hash_or_save_it(self):
        user = self._create_bob()
        stored_password = user.password
        row = self._learner_row(user.id, user.username, user.full_name)
        row[2] = "new-password"

        hasher = get_hasher()
        with patch.object(hasher, "encode", wraps=hasher.encode) as encode:
            with self.assertLogs(b.logger) as logs:
                errors = self._import_rows([row], "--dryrun")

        self.assertEqual(errors, [])
        self.assertIn(
            "Users report: {'created': 0, 'updated': 1, 'deleted': 0}",
            [record.getMessage() for record in logs.records],
        )
        encode.assert_not_called()
        user.refresh_from_db()
        self.assertEqual(user.password, stored_password)

    def test_malformed_csv_does_not_hash_passwords(self):
        csv_filename = self.csv_path("users.csv")
        rows = [
            self._learner_row("", f"new_user{index}", "New User")
            for index in range(b.LOOKUP_BATCH_SIZE)
        ]
        for row in rows:
            row[2] = "password"
        self.create_csv(csv_filename, rows)
        with open(csv_filename, "a", encoding="utf-8") as csv_file:
            csv_file.write('"unterminated\n')

        hasher = get_hasher()
        with patch.object(hasher, "encode", wraps=hasher.encode) as encode:
            with self.assertRaisesRegex(CommandError, "unexpected end of data"):
                call_command("bulkimportusers", csv_filename, facility=self.facility.id)

        encode.assert_not_called()
        self.assertFalse(self.facility.get_members().exists())

    def test_case_insensitive_usernames(self):
        first_filename = self.csv_path("first.csv")
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
        first_filename = self.csv_path("first.csv")
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
        second_filename = self.csv_path("second.csv")
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
        first_filename = self.csv_path("first.csv")
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
        first_filename = self.csv_path("first.csv")
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
        second_filename = self.csv_path("second.csv")
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
        new_filename = self.csv_path("users.csv")
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
        new_filename = self.csv_path("users.csv")
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
        new_filename = self.csv_path("users.csv")
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
        new_new_filename = self.csv_path("second.csv")
        self.create_csv(new_new_filename, rows)
        call_command("bulkimportusers", new_new_filename, facility=self.facility.id)
        classrooms = Classroom.objects.all()
        assert len(classrooms) == 4

    def test_non_existing_uuid(self):
        exported_csv = self.import_exported_csv()
        new_filename = self.csv_path("users.csv")
        rows = []
        with open_csv_for_reading(local_filepath=exported_csv) as source:
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

        csv_filename = self.csv_path("users.csv")
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

    def _learner_row(self, uuid_cell, username, full_name):
        return [uuid_cell, username, "*", full_name, "LEARNER", "", "", "", "", ""]

    def _import_rows(self, rows, *args, headers=None):
        errorlines = StringIO()
        csv_filename = self.csv_path("users.csv")
        self.create_csv(csv_filename, rows, headers=headers)
        call_command(
            "bulkimportusers",
            csv_filename,
            *args,
            facility=self.facility.id,
            errorlines=errorlines,
        )
        return [ast.literal_eval(line) for line in errorlines.getvalue().splitlines()]

    def _create_bob(self, **kwargs):
        return FacilityUser.objects.create(
            username="bob",
            full_name="Bob",
            password=make_password("password"),
            facility=self.facility,
            **kwargs,
        )

    def test_rename_does_not_overwrite_account_edits_after_snapshot(self):
        bob = self._create_bob()
        validate_rows = b.BulkUserImportManager._validate_rows

        def validate_then_edit(importer, reader):
            result = validate_rows(importer, reader)
            serializer = FacilityUserSerializer(
                FacilityUser.objects.get(pk=bob.pk),
                data={"password": "new password", "id_number": "new identifier"},
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return result

        with patch.object(
            b.BulkUserImportManager, "_validate_rows", validate_then_edit
        ):
            errors = self._import_rows([self._learner_row(bob.id, "robert", "Robert")])

        self.assertEqual(errors, [])
        bob.refresh_from_db()
        self.assertEqual(bob.username, "robert")
        self.assertEqual(bob.full_name, "Robert")
        self.assertTrue(bob.check_password("new password"))
        self.assertEqual(bob.id_number, "new identifier")

    def test_delete_import_rolls_back_when_user_disappears_before_update(self):
        bob = self._create_bob()
        bob_id = bob.id
        ann = FacilityUser.objects.create(username="ann", facility=self.facility)
        classroom = Classroom.objects.create(name="North", parent=self.facility)
        classroom.add_member(ann)
        carol = self._learner_row("", "carol", "Carol")
        carol[2] = "password"
        validate_rows = b.BulkUserImportManager._validate_rows

        def validate_then_delete(importer, reader):
            result = validate_rows(importer, reader)
            bob.delete(hard_delete=True)
            return result

        with patch.object(
            b.BulkUserImportManager, "_validate_rows", validate_then_delete
        ):
            with self.assertRaisesRegex(DatabaseError, "update_fields did not affect"):
                self._import_rows(
                    [self._learner_row(bob_id, "robert", "Robert"), carol], "--delete"
                )

        self.assertCountEqual(self.facility.get_members(), [ann])
        self.assertCountEqual(classroom.get_members(), [ann])

    def _assert_facility_user_read_budget(self, queries, budget):
        table = connection.ops.quote_name(FacilityUser._meta.db_table)
        reads = [
            query["sql"]
            for query in queries
            if query["sql"].startswith(("SELECT ", "DECLARE "))
            and f"FROM {table}" in query["sql"]
        ]
        self.assertLessEqual(len(reads), budget, reads)

    @contextmanager
    def _capture_facility_user_row_reads(self):
        table = connection.ops.quote_name(FacilityUser._meta.db_table)
        reads = []

        def track_fetch(fetch, count):
            def fetch_and_count(*args, **kwargs):
                result = fetch(*args, **kwargs)
                reads.append(count(result))
                return result

            return fetch_and_count

        def track_reads(execute, sql, params, many, context):
            result = execute(sql, params, many, context)
            if sql.startswith("SELECT ") and f"FROM {table}" in sql:
                cursor = context["cursor"]
                cursor.fetchone = track_fetch(cursor.cursor.fetchone, bool)
                cursor.fetchmany = track_fetch(cursor.cursor.fetchmany, len)
                cursor.fetchall = track_fetch(cursor.cursor.fetchall, len)
            return result

        with connection.execute_wrapper(track_reads):
            yield reads

    def test_rename_to_unused_username_saves_it(self):
        user = self._create_bob()

        errors = self._import_rows(
            [self._learner_row(user.id, "robert", user.full_name)]
        )

        self.assertEqual(errors, [])
        user.refresh_from_db()
        self.assertEqual(user.username, "robert")
        self.assertEqual(
            authenticate(
                username="robert", password="password", facility=self.facility
            ),
            user,
        )

    def test_pending_renames_respect_database_username_comparison(self):
        bob = self._create_bob()
        carol = FacilityUser.objects.create(
            username="carol", password=bob.password, facility=self.facility
        )
        first_username = "user\N{GREEK SMALL LETTER SIGMA}"
        second_username = "user\N{GREEK SMALL LETTER FINAL SIGMA}"

        errors = self._import_rows(
            [
                self._learner_row(bob.id, first_username, bob.full_name),
                self._learner_row(carol.id, second_username, "Carol"),
            ]
        )

        bob.refresh_from_db()
        carol.refresh_from_db()
        self.assertEqual(bob.username, first_username)
        login_matches = FacilityUser.objects.filter(
            facility=self.facility, username__iexact=second_username
        )
        if login_matches.filter(pk=bob.pk).exists():
            self.assertEqual(
                [(error["row"], error["message"]) for error in errors],
                [(2, "Username is duplicated")],
            )
            self.assertEqual(carol.username, "carol")
            self.assertEqual(login_matches.get(), bob)
        else:
            self.assertEqual(errors, [])
            self.assertEqual(carol.username, second_username)
            self.assertEqual(login_matches.get(), carol)

    def test_invalid_new_row_does_not_reserve_rename_username(self):
        for invalid_row, field in (
            (self._learner_row(str(uuid4()), "robert_uuid", "Invalid"), "UUID"),
            (
                ["", "robert", "password", "Robert", "LEARNER", "", "3001", "", "", ""],
                "birth_year",
            ),
        ):
            with self.subTest(field=field):
                user = self._create_bob()
                requested_username = invalid_row[1]

                errors = self._import_rows(
                    [
                        invalid_row,
                        self._learner_row(user.id, requested_username, "Bob"),
                    ]
                )

                self.assertEqual(
                    [(error["row"], error["field"]) for error in errors], [(1, field)]
                )
                user.refresh_from_db()
                self.assertEqual(user.username, requested_username)

    def test_new_rows_with_invalid_passwords_do_not_reserve_rename_username(self):
        bob = self._create_bob()
        rejected = [self._learner_row("", "robert", "Robert")]
        expected_errors = [(1, "PASSWORD", "*")]
        if sys.version_info >= (3, 11):
            invalid_password = self._learner_row("", "robert", "Robert")
            invalid_password[2] = "pass\0word"
            rejected.append(invalid_password)
            expected_errors.append((2, "PASSWORD", None))
        rename = self._learner_row(bob.id, "robert", bob.full_name)

        for options in (("--dryrun",), ()):
            with self.subTest(options=options):
                errors = self._import_rows([*rejected, rename], *options)

                self.assertEqual(
                    [
                        (error["row"], error["field"], error["value"])
                        for error in errors
                    ],
                    expected_errors,
                )
                bob.refresh_from_db()
                self.assertEqual(bob.username, "bob" if options else "robert")
                self.assertCountEqual(
                    FacilityUser.objects.filter(
                        facility=self.facility, username="robert"
                    ),
                    [] if options else [bob],
                )

    def test_database_rename_collision_stays_within_user_read_budget(self):
        user = self._create_bob()
        FacilityUser.objects.create(username="Robert", facility=self.facility)
        for index in range(20):
            FacilityUser.objects.create(
                username=f"unrelated{index}", facility=self.facility
            )
        for requested_username in (
            "robert",
            "\N{FULLWIDTH LATIN SMALL LETTER R}obert",
        ):
            with self.subTest(requested_username=requested_username):
                with CaptureQueriesContext(connection) as queries:
                    with self._capture_facility_user_row_reads() as reads:
                        errors = self._import_rows(
                            [self._learner_row(user.id, requested_username, "Bob")],
                            "--dryrun",
                        )

                self.assertEqual(
                    [error["message"] for error in errors], ["Username is duplicated"]
                )
                self._assert_facility_user_read_budget(queries, 2)
                self.assertLessEqual(sum(reads), 2)

    def test_uuidless_name_matches_lowercased_raw_spelling(self):
        stored_username = "\N{FULLWIDTH LATIN SMALL LETTER R}obert"
        requested_username = "\N{FULLWIDTH LATIN CAPITAL LETTER R}obert"
        holder = FacilityUser.objects.create(
            username=stored_username, facility=self.facility
        )
        row = self._learner_row("", requested_username, "Bob")
        row[2] = "fresh"

        for options in (("--dryrun",), ("--dryrun", "--delete"), (), ("--delete",)):
            with self.subTest(options=options):
                errors = self._import_rows([row], *options)
                self.assertEqual(
                    [(error["message"], error["value"]) for error in errors],
                    [("Username is duplicated", requested_username)],
                )
                holder.refresh_from_db()
                self.assertEqual(holder.username, stored_username)
                self.assertFalse(
                    FacilityUser.objects.filter(
                        username="Robert", facility=self.facility
                    ).exists()
                )

    def test_taken_rename_reports_duplicate_before_model_errors(self):
        bob = self._create_bob()
        FacilityUser.objects.create(username="ann", facility=self.facility)

        with CaptureQueriesContext(connection) as queries:
            errors = self._import_rows([self._learner_row(bob.id, "ANN", "A" * 121)])

        self.assertEqual(
            [(error["field"], error["message"]) for error in errors],
            [("USERNAME", "Username is duplicated")],
        )
        self._assert_facility_user_read_budget(queries, 2)
        bob.refresh_from_db()
        self.assertEqual(bob.username, "bob")

    def test_case_only_rename_saves_it(self):
        user = self._create_bob()

        errors = self._import_rows([self._learner_row(user.id, "Bob", user.full_name)])

        self.assertEqual(errors, [])
        user.refresh_from_db()
        self.assertEqual(user.username, "Bob")

    @pytest.mark.skipif(
        sys.version_info < (3, 11), reason="Requires a CSV reader that accepts NUL"
    )
    def test_username_with_nul_is_rejected_without_blocking_other_rows(self):
        bob = self._create_bob()
        ann = FacilityUser.objects.create(
            username="ann", password=bob.password, facility=self.facility
        )
        invalid_username = "shared\0tail"

        errors = self._import_rows(
            [
                self._learner_row(bob.id, invalid_username, "Bob"),
                self._learner_row(ann.id, "shared", "Ann"),
            ]
        )

        self.assertEqual(
            [(error["row"], error["field"], error["value"]) for error in errors],
            [(1, "USERNAME", invalid_username)],
        )
        bob.refresh_from_db()
        self.assertEqual(bob.username, "bob")
        self.assertEqual(
            FacilityUser.objects.get(username__iexact="shared", facility=self.facility),
            ann,
        )

    def test_case_only_rename_past_soft_deleted_namesake_saves_it(self):
        user = self._create_bob()
        self._create_bob(date_deleted=timezone.now())

        errors = self._import_rows([self._learner_row(user.id, "Bob", user.full_name)])

        self.assertEqual(errors, [])
        user.refresh_from_db()
        self.assertEqual(user.username, "Bob")

    def test_database_case_only_rename_past_soft_deleted_namesake_saves_it(self):
        user = FacilityUser.objects.create(
            username="\N{LATIN SMALL LETTER DOTLESS I}",
            password=make_password(None),
            facility=self.facility,
        )
        if not FacilityUser.objects.filter(pk=user.pk, username__iexact="I").exists():
            self.skipTest("Database does not compare dotless i and I as equivalent")
        FacilityUser.objects.create(
            username="I",
            password=make_password(None),
            facility=self.facility,
            date_deleted=timezone.now(),
        )

        errors = self._import_rows([self._learner_row(user.id, "I", "")])

        self.assertEqual(errors, [])
        user.refresh_from_db()
        self.assertEqual(user.username, "I")

    def test_invalid_rename_still_reports_duplicate_of_accepted_username(self):
        bob = self._create_bob()
        ann = FacilityUser.objects.create(username="ann", facility=self.facility)
        errors = self._import_rows(
            [
                self._learner_row(ann.id, "ann", ""),
                self._learner_row(bob.id, "Ann", "x" * 126),
            ],
            "--dryrun",
        )

        self.assertEqual(
            [(error["row"], error["field"]) for error in errors],
            [(2, "USERNAME"), (2, "FULL_NAME")],
        )
        self.assertEqual(errors[0]["message"], "Username is duplicated")

    def test_unicode_username_fallback_stays_within_user_read_budget(self):
        bob = self._create_bob(date_deleted=timezone.now())
        ann = FacilityUser.objects.create(
            username="ann",
            password=bob.password,
            facility=self.facility,
            date_deleted=timezone.now(),
        )
        with CaptureQueriesContext(connection) as queries:
            errors = self._import_rows(
                [
                    self._learner_row(user.id, user.username, user.full_name)
                    for user in (bob, ann)
                ]
            )

        self.assertEqual(errors, [])
        self._assert_facility_user_read_budget(queries, 5)
        self.assertEqual(
            FacilityUser.objects.filter(pk__in=[bob.id, ann.id]).count(), 2
        )

    def test_rename_rejects_punctuation_in_normalized_username(self):
        bob = self._create_bob()
        requested = "bob\N{FULLWIDTH COMMERCIAL AT}example\N{FULLWIDTH FULL STOP}org"

        errors = self._import_rows(
            [self._learner_row(bob.id, requested, bob.full_name)]
        )

        self.assertEqual(
            [(error["field"], error["value"]) for error in errors],
            [("USERNAME", requested)],
        )
        bob.refresh_from_db()
        self.assertEqual(bob.username, "bob")

    def test_uuid_less_create_accepts_valid_normalized_email_username(self):
        username = "alice\N{FULLWIDTH COMMERCIAL AT}example\N{FULLWIDTH FULL STOP}org"
        row = self._learner_row("", username, "Alice")
        row[2] = "password"

        self.assertEqual(self._import_rows([row]), [])
        self.assertTrue(
            FacilityUser.objects.filter(
                facility=self.facility, username="alice@example.org"
            ).exists()
        )

    def test_uuid_less_create_rejects_invalid_normalized_email_username(self):
        username = "alice\N{FULLWIDTH COMMERCIAL AT}example"
        row = self._learner_row("", username, "Alice")
        row[2] = "password"

        errors = self._import_rows([row])

        self.assertEqual([error["field"].lower() for error in errors], ["username"])
        self.assertFalse(self.facility.get_members().exists())

    def test_import_preserves_password_whitespace_on_create_update_and_rename(self):
        bob = self._create_bob()
        cases = ((bob.id, "bob"), (bob.id, "robert"), ("", "ann"))
        for user_id, username in cases:
            with self.subTest(username=username):
                password = f" {username}-password "
                row = self._learner_row(user_id, username, username)
                row[2] = password

                self.assertEqual(self._import_rows([row], "--dryrun"), [])
                self.assertIsNone(
                    authenticate(
                        username=username, password=password, facility=self.facility
                    )
                )
                self.assertEqual(self._import_rows([row]), [])
                user = FacilityUser.objects.get(
                    facility=self.facility, username=username
                )
                self.assertEqual(
                    authenticate(
                        username=username, password=password, facility=self.facility
                    ),
                    user,
                )
                if user_id:
                    self.assertEqual(user.id, user_id)

    def test_update_uses_comma_separated_classroom_names(self):
        bob = self._create_bob()
        math = Classroom.objects.create(name="Math", parent=self.facility)
        row = self._learner_row(bob.id, bob.username, "Bobby")
        row[4] = "CLASS_COACH"
        row[8:] = ["Math, Grade 7", "Math, Grade 7"]

        for full_name in ("Bobby", "Robert"):
            with self.subTest(full_name=full_name):
                row[3] = full_name
                self.assertEqual(self._import_rows([row]), [])
                bob.refresh_from_db()
                self.assertEqual(bob.full_name, full_name)
                grade = self.facility.get_classrooms().get(name="Grade 7")
                for classroom in (math, grade):
                    self.assertCountEqual(classroom.get_members(), [bob])
                    self.assertCountEqual(classroom.get_coaches(), [bob])

    def test_new_classroom_prefers_enrollment_spelling(self):
        coach = self._learner_row("", "coach", "Coach")
        coach[2] = "password"
        coach[4] = "CLASS_COACH"
        coach[9] = "NORTH"
        learner = self._learner_row("", "learner", "Learner")
        learner[2] = "password"
        learner[8] = "North"

        self.assertEqual(self._import_rows([coach, learner]), [])

        classroom = self.facility.get_classrooms().get()
        self.assertEqual(classroom.name, "North")
        self.assertCountEqual(
            classroom.get_coaches().values_list("username", flat=True), ["coach"]
        )
        self.assertCountEqual(
            classroom.get_members().values_list("username", flat=True), ["learner"]
        )

    def test_renames_preserve_exact_classroom_and_coach_assignments(self):
        bob = self._create_bob()
        ann = FacilityUser.objects.create(
            username="ann", password=bob.password, facility=self.facility
        )
        north = Classroom.objects.create(name="North", parent=self.facility)
        other_north = Classroom.objects.create(name="north", parent=self.facility)
        rows = []
        for user, classroom, username in (
            (bob, north, "robert"),
            (ann, other_north, "anna"),
        ):
            classroom.add_member(user)
            classroom.add_coach(user)
            row = self._learner_row(user.id, username, user.full_name)
            row[4] = "CLASS_COACH"
            row[8:] = [classroom.name, classroom.name]
            rows.append(row)

        errors = self._import_rows(rows)

        self.assertEqual(errors, [])
        bob.refresh_from_db()
        ann.refresh_from_db()
        self.assertEqual((bob.username, ann.username), ("robert", "anna"))
        self.assertCountEqual(north.get_members(), [bob])
        self.assertCountEqual(other_north.get_members(), [ann])
        self.assertCountEqual(north.get_coaches(), [bob])
        self.assertCountEqual(other_north.get_coaches(), [ann])

    def test_ambiguous_classroom_reference_rejects_rename_without_changes(self):
        bob = self._create_bob()
        north = Classroom.objects.create(name="North", parent=self.facility)
        Classroom.objects.create(name="north", parent=self.facility)
        north.add_member(bob)
        row = self._learner_row(bob.id, "robert", bob.full_name)
        row[8] = "NORTH, New Class"

        errors = self._import_rows([row])

        self.assertEqual(
            [(error["field"], error["value"]) for error in errors],
            [("ENROLLED_IN", "NORTH")],
        )
        bob.refresh_from_db()
        self.assertEqual(bob.username, "bob")
        self.assertCountEqual(north.get_members(), [bob])
        self.assertFalse(Classroom.objects.filter(name="New Class").exists())

    def test_taken_rename_reports_duplicate_before_ambiguous_classroom(self):
        bob = self._create_bob()
        FacilityUser.objects.create(username="ann", facility=self.facility)
        north = Classroom.objects.create(name="North", parent=self.facility)
        Classroom.objects.create(name="north", parent=self.facility)
        north.add_member(bob)
        row = self._learner_row(bob.id, "ann", bob.full_name)
        row[8] = "NORTH"

        errors = self._import_rows([row])

        self.assertEqual(
            [(error["field"], error["value"], error["message"]) for error in errors],
            [("USERNAME", "ann", "Username is duplicated")],
        )
        bob.refresh_from_db()
        self.assertEqual(bob.username, "bob")
        self.assertCountEqual(north.get_members(), [bob])

    def test_duplicate_classroom_names_reject_coach_renames_without_changes(self):
        bob = self._create_bob()
        ann = FacilityUser.objects.create(
            username="ann", password=bob.password, facility=self.facility
        )
        north = Classroom.objects.create(name="North", parent=self.facility)
        other_north = Classroom.objects.create(name="North", parent=self.facility)
        for classroom, user in ((north, bob), (other_north, ann)):
            classroom.add_member(user)
            classroom.add_coach(user)

        for name in ("North", "NORTH"):
            with self.subTest(name=name):
                rows = []
                for user, username in ((bob, "robert"), (ann, "anna")):
                    row = self._learner_row(user.id, username, user.full_name)
                    row[4] = "CLASS_COACH"
                    row[8:] = [name, name]
                    rows.append(row)

                errors = self._import_rows(rows)

                self.assertEqual(
                    [
                        (error["row"], error["field"], error["value"], error["message"])
                        for error in errors
                    ],
                    [
                        (position, field, name, "Class name is ambiguous")
                        for position in (1, 2)
                        for field in ("ENROLLED_IN", "ASSIGNED_TO")
                    ],
                )
                bob.refresh_from_db()
                ann.refresh_from_db()
                self.assertEqual((bob.username, ann.username), ("bob", "ann"))
                self.assertCountEqual(north.get_members(), [bob])
                self.assertCountEqual(other_north.get_members(), [ann])
                self.assertCountEqual(north.get_coaches(), [bob])
                self.assertCountEqual(other_north.get_coaches(), [ann])

    @pytest.mark.skipif(
        sys.version_info < (3, 11), reason="Requires a CSV reader that accepts NUL"
    )
    def test_nul_in_rename_fields_is_rejected_in_preview_and_import(self):
        bob = self._create_bob()
        for column in (
            "PASSWORD",
            "FULL_NAME",
            "IDENTIFIER",
            "ENROLLED_IN",
            "ASSIGNED_TO",
        ):
            new_username = f"learner_{column.lower()}"
            new_row = self._learner_row("", new_username, "New Learner")
            new_row[2] = "password"
            rename_row = self._learner_row(bob.id, "robert", "Bob")
            rename_row[4] = "CLASS_COACH"
            rename_row[b.fieldnames.index(column)] = "invalid\0value"
            for options in (("--dryrun",), ()):
                with self.subTest(column=column, options=options):
                    errors = self._import_rows([new_row, rename_row], *options)

                    self.assertEqual(
                        [
                            (error["row"], error["field"], error["value"])
                            for error in errors
                        ],
                        [
                            (
                                2,
                                column,
                                None if column == "PASSWORD" else "invalid\0value",
                            )
                        ],
                    )
                    bob.refresh_from_db()
                    self.assertEqual(bob.username, "bob")
                    self.assertEqual(
                        FacilityUser.objects.filter(
                            facility=self.facility, username=new_username
                        ).exists(),
                        not options,
                    )

    def test_invalid_rows_add_at_most_one_lookup_each(self):
        bob = self._create_bob()
        accepted = self._learner_row(bob.id, bob.username, bob.full_name)
        invalid = self._learner_row("", "ann", "A" * 126)
        invalid[2] = "password"
        unknown = self._learner_row(str(uuid4()), "unknown", "Unknown")

        with CaptureQueriesContext(connection) as baseline:
            self.assertEqual(self._import_rows([accepted], "--dryrun"), [])

        with CaptureQueriesContext(connection) as queries:
            errors = self._import_rows([accepted, invalid, unknown], "--dryrun")

        self.assertEqual(
            [(error["row"], error["field"]) for error in errors],
            [(2, "FULL_NAME"), (3, "UUID")],
        )
        self.assertLessEqual(len(queries) - len(baseline), 2)

    def test_taken_renames_have_bounded_preview_queries(self):
        bob = self._create_bob()
        FacilityUser.objects.create(facility=self.facility, username="taken")
        accepted = self._learner_row(bob.id, bob.username, bob.full_name)
        rejected = []
        for index in range(5):
            user = FacilityUser.objects.create(
                facility=self.facility, username=f"learner{index}"
            )
            rejected.append(self._learner_row(user.id, "TaKeN", user.full_name))

        with CaptureQueriesContext(connection) as baseline:
            self.assertEqual(self._import_rows([accepted], "--dryrun"), [])
        with patch.object(b, "LOOKUP_BATCH_SIZE", 3):
            with CaptureQueriesContext(connection) as queries:
                errors = self._import_rows([accepted, *rejected], "--dryrun")

        self.assertEqual(
            [(error["row"], error["message"]) for error in errors],
            [(index, "Username is duplicated") for index in range(2, 7)],
        )
        self.assertLessEqual(len(queries) - len(baseline), 1 + len(rejected))

    def test_case_only_rename_to_live_users_username_is_rejected(self):
        user = self._create_bob()
        FacilityUser.objects.create(username="BOB", facility=self.facility)

        errors = self._import_rows([self._learner_row(user.id, "BOB", user.full_name)])

        self.assertEqual(
            [(e["field"], e["message"]) for e in errors],
            [("USERNAME", "Username is duplicated")],
        )
        user.refresh_from_db()
        self.assertEqual(user.username, "bob")

    def test_rename_to_soft_deleted_users_username_is_rejected(self):
        user = self._create_bob()
        FacilityUser.objects.create(
            username="robert", facility=self.facility, date_deleted=timezone.now()
        )

        errors = self._import_rows(
            [self._learner_row(user.id, "robert", user.full_name)]
        )

        self.assertEqual(
            [(e["field"], e["message"]) for e in errors],
            [("USERNAME", "Username is duplicated")],
        )
        user.refresh_from_db()
        self.assertEqual(user.username, "bob")

    def test_rename_to_another_users_username_is_rejected(self):
        user = self._create_bob()
        FacilityUser.objects.create(username="ROBERT", facility=self.facility)
        FacilityUser.objects.create(
            username="robert", facility=self.facility, date_deleted=timezone.now()
        )

        errors = self._import_rows(
            [self._learner_row(user.id, "robert", user.full_name)]
        )

        self.assertEqual(
            [(e["field"], e["message"]) for e in errors],
            [("USERNAME", "Username is duplicated")],
        )
        user.refresh_from_db()
        self.assertEqual(user.username, "bob")

    def test_restoring_user_whose_username_is_now_taken_is_rejected(self):
        user = self._create_bob(date_deleted=timezone.now())
        live_user = FacilityUser.objects.create(username="Bob", facility=self.facility)

        errors = self._import_rows([self._learner_row(user.id, "bob", "Bobby")])

        self.assertEqual(
            [(e["field"], e["message"]) for e in errors],
            [("USERNAME", "Username is duplicated")],
        )
        self.assertEqual(
            FacilityUser.objects.get(username__iexact="bob", facility=self.facility),
            live_user,
        )
        self.assertIsNotNone(FacilityUser.all_objects.get(id=user.id).date_deleted)

    def test_restoring_user_past_soft_deleted_namesake_saves_it(self):
        user = self._create_bob(date_deleted=timezone.now())
        self._create_bob(date_deleted=timezone.now())

        errors = self._import_rows([self._learner_row(user.id, "bob", user.full_name)])

        self.assertEqual(errors, [])
        user.refresh_from_db()
        self.assertIsNone(user.date_deleted)

    def test_rename_preserves_current_enrollment(self):
        user = self._create_bob()
        classroom = Classroom.objects.create(name="Bobs class", parent=self.facility)
        classroom.add_member(user)

        errors = self._import_rows(
            [
                [
                    user.id,
                    "robert",
                    "*",
                    user.full_name,
                    "LEARNER",
                    "",
                    "",
                    "",
                    classroom.name,
                    "",
                ]
            ]
        )

        self.assertEqual(errors, [])
        user.refresh_from_db()
        self.assertEqual(user.username, "robert")
        self.assertIn(user, classroom.get_members())

    def test_unchanged_username_keeps_its_stored_unicode_spelling(self):
        username = "\N{FULLWIDTH LATIN SMALL LETTER B}ob"
        user = FacilityUser.objects.create(
            username=username,
            full_name="Bob",
            password=make_password("password"),
            facility=self.facility,
        )

        for full_name in ("Bob", "Robert"):
            with self.subTest(full_name=full_name):
                errors = self._import_rows(
                    [self._learner_row(user.id, username, full_name)]
                )

                self.assertEqual(errors, [])
                user.refresh_from_db()
                self.assertEqual(user.username, username)
                self.assertEqual(user.full_name, full_name)

    def test_normalized_rename_to_another_users_username_is_rejected(self):
        user = self._create_bob()
        FacilityUser.objects.create(username="robert", facility=self.facility)
        requested_username = "\N{FULLWIDTH LATIN SMALL LETTER R}obert"

        errors = self._import_rows(
            [self._learner_row(user.id, requested_username, "Bob")]
        )

        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["message"], "Username is duplicated")
        self.assertEqual(errors[0]["value"], requested_username)
        user.refresh_from_db()
        self.assertEqual(user.username, "bob")

    def test_rejected_rename_does_not_reserve_normalized_username_with_delete(self):
        bob = self._create_bob()
        classroom = Classroom.objects.create(name="North", parent=self.facility)
        classroom.add_member(bob)
        alice = FacilityUser.objects.create(username="Alice", facility=self.facility)
        legacy_username = "\N{FULLWIDTH LATIN CAPITAL LETTER A}lice"
        legacy_user = FacilityUser.objects.create(
            username=legacy_username, facility=self.facility
        )

        errors = self._import_rows(
            [
                self._learner_row(bob.id, legacy_username, "Bob"),
                [
                    alice.id,
                    "Alice",
                    "testpass",
                    "Alice Updated",
                    "LEARNER",
                    "",
                    "",
                    "",
                    "",
                    "",
                ],
            ],
            "--delete",
        )

        self.assertEqual(
            [(error["row"], error["field"], error["message"]) for error in errors],
            [(1, "USERNAME", "Username is duplicated")],
        )
        bob.refresh_from_db()
        alice.refresh_from_db()
        self.assertEqual(bob.username, "bob")
        self.assertIn(bob, classroom.get_members())
        self.assertEqual(alice.username, "Alice")
        self.assertEqual(alice.full_name, "Alice Updated")
        self.assertFalse(FacilityUser.all_objects.filter(id=legacy_user.id).exists())

    def test_rename_to_stored_unicode_spelling_is_rejected(self):
        user = self._create_bob()
        requested_username = "\N{FULLWIDTH LATIN SMALL LETTER R}obert"
        FacilityUser.objects.create(username=requested_username, facility=self.facility)

        errors = self._import_rows(
            [self._learner_row(user.id, requested_username, "Bob")]
        )

        self.assertEqual(
            [error["message"] for error in errors], ["Username is duplicated"]
        )
        self.assertEqual(errors[0]["value"], requested_username)
        user.refresh_from_db()
        self.assertEqual(user.username, "bob")

    def test_new_user_with_stored_unicode_spelling_is_rejected(self):
        requested_username = "\N{FULLWIDTH LATIN SMALL LETTER R}obert"
        FacilityUser.objects.create(username=requested_username, facility=self.facility)

        errors = self._import_rows(
            [
                [
                    "",
                    requested_username,
                    "password",
                    "Robert",
                    "LEARNER",
                    "",
                    "",
                    "",
                    "",
                    "",
                ]
            ]
        )

        self.assertEqual(
            [error["message"] for error in errors], ["Username is duplicated"]
        )
        self.assertEqual(errors[0]["value"], requested_username)
        self.assertFalse(FacilityUser.objects.filter(username="robert").exists())

    def test_rename_to_another_users_unicode_case_variant_is_rejected(self):
        user = self._create_bob()
        for stored, requested in (("åsa", "Åsa"), ("Öla", "öla")):
            with self.subTest(stored=stored, requested=requested):
                FacilityUser.objects.create(username=stored, facility=self.facility)

                errors = self._import_rows(
                    [self._learner_row(user.id, requested, "Bob")]
                )

                self.assertEqual(
                    [error["message"] for error in errors], ["Username is duplicated"]
                )
                user.refresh_from_db()
                self.assertEqual(user.username, "bob")

    def test_case_only_unicode_rename_rejects_another_live_user_with_same_spelling(
        self,
    ):
        user = self._create_bob()
        user.username = "Åsa"
        user.save()
        FacilityUser.objects.create(username=user.username, facility=self.facility)

        errors = self._import_rows([self._learner_row(user.id, "åsa", "Bob")])

        self.assertEqual(
            [error["message"] for error in errors], ["Username is duplicated"]
        )
        user.refresh_from_db()
        self.assertEqual(user.username, "Åsa")

    def test_new_user_with_overlong_normalized_username_is_not_created(self):
        requested_username = "\N{LATIN SMALL LIGATURE FFI}" * 11

        errors = self._import_rows(
            [
                [
                    "",
                    requested_username,
                    "password",
                    "Invalid",
                    "LEARNER",
                    "",
                    "",
                    "",
                    "",
                    "",
                ],
                ["", "valid", "password", "Valid", "LEARNER", "", "", "", "", ""],
            ]
        )

        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["field"].lower(), "username")
        self.assertIn("30 characters or fewer", errors[0]["message"])
        self.assertFalse(FacilityUser.objects.filter(username="ffi" * 11).exists())
        self.assertTrue(FacilityUser.objects.filter(username="valid").exists())

    def test_normalized_rename_preserves_current_enrollment(self):
        user = self._create_bob()
        classroom = Classroom.objects.create(name="Bobs class", parent=self.facility)
        classroom.add_member(user)

        errors = self._import_rows(
            [
                [
                    user.id,
                    "\N{FULLWIDTH LATIN SMALL LETTER R}obert",
                    "*",
                    "Bob",
                    "LEARNER",
                    "",
                    "",
                    "",
                    classroom.name,
                    "",
                ]
            ]
        )

        self.assertEqual(errors, [])
        user.refresh_from_db()
        self.assertEqual(user.username, "robert")
        self.assertIn(user, classroom.get_members())

    def test_rename_normalizing_to_stored_username_moves_enrollment(self):
        bob = self._create_bob()
        east = Classroom.objects.create(name="East", parent=self.facility)
        east.add_member(bob)
        row = self._learner_row(
            bob.id, "\N{FULLWIDTH LATIN SMALL LETTER B}ob", bob.full_name
        )
        row[8] = "West"

        with self.assertLogs(b.logger) as logs:
            errors = self._import_rows([row])

        self.assertEqual(errors, [])
        self.assertIn(
            "Users report: {'created': 0, 'updated': 0, 'deleted': 0}",
            [record.getMessage() for record in logs.records],
        )
        self.assertFalse(east.get_members().exists())
        west = Classroom.objects.get(name="West", parent=self.facility)
        self.assertCountEqual(west.get_members(), [bob])

    def test_normalized_rename_reports_enrollment_removal(self):
        bob = self._create_bob()
        classroom = Classroom.objects.create(name="North", parent=self.facility)
        classroom.add_member(bob)
        row = self._learner_row(
            bob.id, "\N{FULLWIDTH LATIN SMALL LETTER B}ob", bob.full_name
        )

        for options in (("--dryrun",), ()):
            with self.subTest(options=options):
                with self.assertLogs(b.logger) as logs:
                    errors = self._import_rows([row], *options)

                self.assertEqual(errors, [])
                self.assertEqual(
                    classroom.get_members().filter(pk=bob.pk).exists(), bool(options)
                )
                self.assertIn(
                    "Classes report: {'created': 0, 'updated': 1, 'cleared': 0}",
                    [record.getMessage() for record in logs.records],
                )

    def test_normalized_rename_reports_coach_removal(self):
        bob = self._create_bob()
        classroom = Classroom.objects.create(name="North", parent=self.facility)
        row = self._learner_row(
            bob.id, "\N{FULLWIDTH LATIN SMALL LETTER B}ob", bob.full_name
        )
        row[4] = "CLASS_COACH"

        for flags, enrolled in (((), False), (("--delete",), False), ((), True)):
            classroom.add_coach(bob)
            if enrolled:
                classroom.add_member(bob)
            for dryrun in (True, False):
                options = flags + (("--dryrun",) if dryrun else ())
                with self.subTest(options=options, enrolled=enrolled):
                    with self.assertLogs(b.logger) as logs:
                        errors = self._import_rows([row], *options)

                    self.assertEqual(errors, [])
                    self.assertEqual(
                        classroom.get_coaches().filter(pk=bob.pk).exists(), dryrun
                    )
                    self.assertIn(
                        "Classes report: {'created': 0, 'updated': 1, 'cleared': 0}",
                        [record.getMessage() for record in logs.records],
                    )

    def test_rename_preserves_class_coach_assignment(self):
        user = self._create_bob()
        classroom = Classroom.objects.create(name="Bobs class", parent=self.facility)
        classroom.add_coach(user)
        row = self._learner_row(user.id, "robert", user.full_name)
        row[4] = "CLASS_COACH"
        row[9] = classroom.name

        errors = self._import_rows([row])

        self.assertEqual(errors, [])
        user.refresh_from_db()
        self.assertEqual(user.username, "robert")
        self.assertIn(user, classroom.get_coaches())

    def test_rejected_rename_keeps_classes(self):
        user = self._create_bob()
        FacilityUser.objects.create(username="robert", facility=self.facility)
        enrolled_class = Classroom.objects.create(
            name="Bobs class", parent=self.facility
        )
        enrolled_class.add_member(user)
        coached_class = Classroom.objects.create(
            name="Bobs coached class", parent=self.facility
        )
        coached_class.add_coach(user)
        row = self._learner_row(user.id, "robert", user.full_name)
        row[4] = "CLASS_COACH"
        row[8:] = [f"{enrolled_class.name},South", f"{coached_class.name},East"]

        errors = self._import_rows([row])

        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["message"], "Username is duplicated")
        self.assertIn(user, enrolled_class.get_members())
        self.assertIn(user, coached_class.get_coaches())
        self.assertFalse(
            Classroom.objects.filter(
                parent=self.facility, name__in=("South", "East")
            ).exists()
        )

    def test_delete_keeps_user_matched_by_rejected_uuidless_row(self):
        bob = self._create_bob()
        ann = FacilityUser.objects.create(
            username="ann", password=bob.password, facility=self.facility
        )
        omitted = FacilityUser.objects.create(
            username="carol", password=bob.password, facility=self.facility
        )
        rejected = self._learner_row("", "bob", bob.full_name)
        rejected[2] = "password"
        admin = FacilityUser.objects.create(username="admin", facility=self.facility)
        self.facility.add_admin(admin)
        east = Classroom.objects.create(name="East", parent=self.facility)
        east.add_member(admin)
        rejected[8] = east.name

        errors = self._import_rows(
            [rejected, self._learner_row(ann.id, "alice", "Ann")], "--delete"
        )

        self.assertEqual(
            [(error["row"], error["message"]) for error in errors],
            [(1, "Username is duplicated")],
        )
        ann.refresh_from_db()
        self.assertEqual(ann.username, "alice")
        self.assertTrue(FacilityUser.objects.filter(pk=bob.pk).exists())
        self.assertFalse(FacilityUser.all_objects.filter(pk=omitted.pk).exists())
        self.assertCountEqual(east.get_members(), [admin])

    def test_delete_does_not_clear_classes_named_by_a_rejected_rename(self):
        bob = self._create_bob()
        ann = FacilityUser.objects.create(username="ann", facility=self.facility)
        self.facility.add_admin(ann)
        north = Classroom.objects.create(name="North", parent=self.facility)
        south = Classroom.objects.create(name="South", parent=self.facility)
        unlisted = Classroom.objects.create(name="Unlisted", parent=self.facility)
        for classroom in (north, south, unlisted):
            classroom.add_member(ann)
        north.add_member(bob)
        row = self._learner_row(bob.id, "ann", bob.full_name)
        row[4] = "CLASS_COACH"
        row[8] = "north, Missing"
        row[9] = "south, Also missing"

        errors = self._import_rows([row], "--delete")

        self.assertEqual(
            [error["message"] for error in errors], ["Username is duplicated"]
        )
        self.assertCountEqual(north.get_members(), [ann, bob])
        self.assertCountEqual(south.get_members(), [ann])
        self.assertFalse(unlisted.get_members().exists())
        self.assertCountEqual(
            self.facility.get_classrooms().values_list("name", flat=True),
            ["North", "South", "Unlisted"],
        )

    def test_delete_clears_classrooms_named_only_by_unmatched_rejected_rows(self):
        bob = self._create_bob()
        admin = FacilityUser.objects.create(username="ann", facility=self.facility)
        self.facility.add_admin(admin)
        east = Classroom.objects.create(name="East", parent=self.facility)
        west = Classroom.objects.create(name="West", parent=self.facility)
        for uuid, username, role, field in (
            ("!!!", "missing", "CLASS_COACH", "UUID"),
            (uuid4().hex, admin.username, "CLASS_COACH", "UUID"),
            ("", "missing", "INVALID", "USER_TYPE"),
        ):
            with self.subTest(uuid=uuid):
                for classroom in (east, west):
                    classroom.add_member(admin)
                rejected = self._learner_row(uuid, username, "Missing")
                rejected[2] = "password"
                rejected[4] = role
                rejected[8:] = [east.name, west.name]
                accepted = self._learner_row(bob.id, bob.username, bob.full_name)

                errors = self._import_rows([rejected, accepted], "--delete")

                self.assertEqual(
                    [
                        (error["row"], error["field"], error["value"])
                        for error in errors
                    ],
                    [(1, field, uuid if field == "UUID" else role)],
                )
                self.assertTrue(FacilityUser.objects.filter(pk=admin.pk).exists())
                for classroom in (east, west):
                    self.assertFalse(classroom.get_members().exists())

    def test_repeated_uuid_is_a_row_error(self):
        user = self._create_bob()
        ann = FacilityUser.objects.create(
            username="ann", facility=self.facility, password=user.password
        )
        north = Classroom.objects.create(name="North", parent=self.facility)
        north.add_member(ann)
        south = Classroom.objects.create(name="South", parent=self.facility)
        south.add_member(user)
        dashed_uuid = str(UUID(user.id))
        errors = self._import_rows(
            [
                [user.id, "robert", "*", "Robert", "LEARNER", "", "", "", "North", ""],
                [
                    dashed_uuid,
                    "bob2",
                    "*",
                    "Bob",
                    "LEARNER",
                    "",
                    "",
                    "",
                    "Rejected",
                    "",
                ],
                [ann.id, "ann", "*", "Ann", "LEARNER", "", "", "", "South", ""],
                ["", "carol", "passwd", "Carol", "LEARNER", "", "", "", "", ""],
            ]
        )

        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["row"], 2)
        self.assertEqual(errors[0]["field"], "UUID")
        self.assertEqual(errors[0]["message"], "Database ID is duplicated")
        self.assertEqual(errors[0]["value"], dashed_uuid)
        user.refresh_from_db()
        self.assertEqual(user.username, "robert")
        self.assertEqual(user.full_name, "Robert")
        self.assertTrue(FacilityUser.objects.filter(username="carol").exists())
        ann.refresh_from_db()
        self.assertEqual(ann.full_name, "Ann")
        self.assertCountEqual(north.get_members(), [user])
        self.assertCountEqual(south.get_members(), [ann])
        self.assertFalse(
            Classroom.objects.filter(parent=self.facility, name="Rejected").exists()
        )

    def test_invalid_user_type_after_rejected_row_does_not_stop_import(self):
        errors = self._import_rows(
            [
                self._learner_row("", "ann", "Ann"),
                ["", "ann", "password", "Ann", "DEFERRED", "", "", "", "", ""],
                ["", "sue", "password", "Sue", "LEARNER", "", "", "", "", ""],
            ]
        )

        self.assertEqual(
            [(error["row"], error["field"], error["value"]) for error in errors],
            [(1, "PASSWORD", "*"), (2, "USER_TYPE", "DEFERRED")],
        )
        self.assertCountEqual(
            FacilityUser.objects.filter(facility=self.facility).values_list(
                "username", flat=True
            ),
            ["sue"],
        )

    def test_invalid_csv_uuid_does_not_stop_import(self):
        errors = self._import_rows(
            [
                self._learner_row("not-a-uuid", "bob", "Bob"),
                ["", "carol", "password", "Carol", "LEARNER", "", "", "", "", ""],
            ]
        )

        self.assertEqual(
            [(error["row"], error["field"], error["message"]) for error in errors],
            [(1, "UUID", "Database ID is not valid")],
        )
        self.assertTrue(FacilityUser.objects.filter(username="carol").exists())

    def test_delete_preserves_omitted_operator_with_alternate_uuid_spellings(self):
        operator = self._create_bob()
        omitted_user = FacilityUser.objects.create(
            facility=self.facility, username="alice"
        )

        for userid, username in (
            (str(UUID(operator.id)), "carol"),
            (operator.id.upper(), "dave"),
        ):
            with self.subTest(userid=userid):
                row = [
                    "",
                    username,
                    "password",
                    username,
                    "LEARNER",
                    "",
                    "",
                    "",
                    "",
                    "",
                ]
                errors = self._import_rows([row], "--delete", "--userid", userid)

                self.assertEqual(errors, [])
                self.assertCountEqual(
                    FacilityUser.objects.filter(facility=self.facility).values_list(
                        "username", flat=True
                    ),
                    [operator.username, username],
                )
        self.assertFalse(FacilityUser.all_objects.filter(pk=omitted_user.pk).exists())

    def test_repeated_uuid_after_invalid_row_keeps_user_and_enrollment_with_delete(
        self,
    ):
        user = self._create_bob()
        admin = FacilityUser.objects.create(username="ann", facility=self.facility)
        self.facility.add_admin(admin)
        absent_user = FacilityUser.objects.create(
            username="carol", facility=self.facility
        )
        classroom = Classroom.objects.create(name="North", parent=self.facility)
        classroom.add_member(user)
        classroom.add_member(admin)

        errors = self._import_rows(
            [
                self._learner_row(user.id, user.username, "B" * 126),
                [
                    str(UUID(user.id)),
                    "bobby",
                    "*",
                    "Robert",
                    "LEARNER",
                    "",
                    "",
                    "",
                    "North",
                    "",
                ],
            ],
            "--delete",
        )

        self.assertEqual(
            [(error["row"], error["field"]) for error in errors],
            [(1, "FULL_NAME"), (2, "UUID")],
        )
        self.assertEqual(errors[1]["message"], "Database ID is duplicated")
        user.refresh_from_db()
        self.assertEqual(user.username, "bob")
        self.assertIsNone(user.date_deleted)
        self.assertEqual(user.full_name, "Bob")
        self.assertCountEqual(classroom.get_members(), [user])
        self.assertTrue(self.facility.get_admins().filter(pk=admin.pk).exists())
        self.assertFalse(FacilityUser.all_objects.filter(id=absent_user.id).exists())

    def test_invalid_row_keeps_user_and_enrollment_with_delete(self):
        user = self._create_bob()
        classroom = Classroom.objects.create(name="North", parent=self.facility)
        classroom.add_member(user)

        errors = self._import_rows(
            [
                [user.id, "bob", "*", "B" * 126, "LEARNER", "", "", "", "", ""],
                ["", "carol", "password", "Carol", "LEARNER", "", "", "", "", ""],
            ],
            "--delete",
        )

        self.assertEqual([error["field"] for error in errors], ["FULL_NAME"])
        user = FacilityUser.objects.get(id=user.id)
        self.assertEqual(user.full_name, "Bob")
        self.assertIn(user, classroom.get_members())

    def test_repeated_uuid_does_not_keep_other_users_in_unlisted_classroom(self):
        bob = self._create_bob()
        ann = FacilityUser.objects.create(username="ann", facility=self.facility)
        self.facility.add_admin(ann)
        north = Classroom.objects.create(name="North", parent=self.facility)
        accepted = self._learner_row(bob.id, bob.username, bob.full_name)
        for column, role in ((8, "LEARNER"), (9, "CLASS_COACH")):
            with self.subTest(role=role):
                north.add_member(ann)
                repeated = accepted.copy()
                repeated[4] = role
                repeated[column] = north.name

                errors = self._import_rows([accepted, repeated], "--delete")

                self.assertIn(
                    (2, "UUID", "Database ID is duplicated"),
                    [
                        (error["row"], error["field"], error["message"])
                        for error in errors
                    ],
                )
                self.assertTrue(self.facility.get_admins().filter(pk=ann.pk).exists())
                self.assertFalse(north.get_members().exists())

    def test_normalized_username_collision_keeps_user_with_delete(self):
        user = self._create_bob()
        classroom = Classroom.objects.create(name="North", parent=self.facility)
        classroom.add_member(user)
        username = (
            "\N{FULLWIDTH LATIN SMALL LETTER B}\N{FULLWIDTH LATIN SMALL LETTER O}b"
        )

        errors = self._import_rows(
            [["", username, "password", "Bob", "LEARNER", "", "", "", "", ""]],
            "--delete",
        )

        self.assertEqual(
            [error["message"] for error in errors], ["Username is duplicated"]
        )
        user.refresh_from_db()
        self.assertIn(user, classroom.get_members())

    def test_delete_report_counts_only_classrooms_that_lose_members(self):
        bob = self._create_bob()
        ann = FacilityUser.objects.create(username="ann", facility=self.facility)
        self.facility.add_admin(ann)
        north = Classroom.objects.create(name="North", parent=self.facility)
        south = Classroom.objects.create(name="South", parent=self.facility)
        east = Classroom.objects.create(name="East", parent=self.facility)
        north.add_member(bob)
        south.add_member(bob)
        south.add_member(ann)
        east.add_member(ann)

        for options in (("--dryrun", "--delete"), ("--delete",)):
            with self.subTest(options=options), self.assertLogs(b.logger) as logs:
                errors = self._import_rows(
                    [self._learner_row(bob.id, "ann", "Bob")], *options
                )
                self.assertEqual(
                    [error["message"] for error in errors], ["Username is duplicated"]
                )
                self.assertIn(
                    "Classes report: {'created': 0, 'updated': 1, 'cleared': 1}",
                    [record.getMessage() for record in logs.records],
                )
        self.assertCountEqual(north.get_members(), [bob])
        self.assertCountEqual(south.get_members(), [bob])
        self.assertFalse(east.get_members().exists())

    def test_delete_preview_has_bounded_queries_for_covered_classes(self):
        bob = self._create_bob()
        row = self._learner_row(bob.id, bob.username, bob.full_name)
        names = [f"Classroom {index}" for index in range(12)]
        for name in names:
            Classroom.objects.create(name=name, parent=self.facility).add_member(bob)
        row[8] = ", ".join(names)

        with CaptureQueriesContext(connection) as queries:
            errors = self._import_rows([row], "--dryrun", "--delete")

        self.assertEqual(errors, [])
        self.assertLessEqual(len(queries), 10 + 2 * len(names))

    def test_delete_reports_omitted_users_removed_from_rejected_rows_classrooms(self):
        bob = self._create_bob()
        omitted = FacilityUser.objects.create(username="ann", facility=self.facility)
        classroom = Classroom.objects.create(name="North", parent=self.facility)
        coaching = Classroom.objects.create(name="East", parent=self.facility)
        classroom.add_member(omitted)
        classroom.add_member(bob)
        coaching.add_coach(omitted)
        row = self._learner_row(bob.id, omitted.username, bob.full_name)
        row[4] = "CLASS_COACH"
        row[8:] = [classroom.name, coaching.name]

        for options in (("--delete", "--dryrun"), ("--delete",)):
            with self.subTest(options=options), self.assertLogs(b.logger) as logs:
                errors = self._import_rows([row], *options)
                self.assertEqual(
                    [error["message"] for error in errors], ["Username is duplicated"]
                )
                self.assertIn(
                    "Classes report: {'created': 0, 'updated': 2, 'cleared': 0}",
                    [record.getMessage() for record in logs.records],
                )
                if "--dryrun" in options:
                    self.assertCountEqual(classroom.get_members(), [bob, omitted])
                    self.assertCountEqual(coaching.get_coaches(), [omitted])

        self.assertCountEqual(classroom.get_members(), [bob])
        self.assertFalse(coaching.get_coaches().exists())

    @pytest.mark.skipif(
        connection.vendor != "sqlite" or not hasattr(sqlite3.Connection, "setlimit"),
        reason="Requires SQLite with runtime limit support",
    )
    def test_delete_with_many_rejected_rows_preserves_their_memberships(self):
        classroom = Classroom.objects.create(name="North", parent=self.facility)
        protected = [
            FacilityUser.objects.create(
                username=f"admin{index}", facility=self.facility
            )
            for index in range(998)
        ]
        omitted = self._create_bob()
        classroom.add_member(omitted)
        for user in protected:
            self.facility.add_admin(user)
            classroom.add_member(user)
        rows = [
            self._learner_row(user.id, user.username, "x" * 126) for user in protected
        ]

        database = connection.connection
        previous_limit = database.setlimit(sqlite3.SQLITE_LIMIT_VARIABLE_NUMBER, 999)
        try:
            for options in (("--dryrun", "--delete"), ("--delete",)):
                with self.subTest(options=options), self.assertLogs(b.logger) as logs:
                    errors = self._import_rows(rows, *options)
                    self.assertEqual(
                        [(error["row"], error["field"]) for error in errors],
                        [(row, "FULL_NAME") for row in range(1, len(rows) + 1)],
                    )
                    self.assertIn(
                        "Classes report: {'created': 0, 'updated': 1, 'cleared': 0}",
                        [record.getMessage() for record in logs.records],
                    )
                    if "--dryrun" in options:
                        self.assertCountEqual(
                            classroom.get_members(), [*protected, omitted]
                        )
        finally:
            database.setlimit(sqlite3.SQLITE_LIMIT_VARIABLE_NUMBER, previous_limit)

        self.assertCountEqual(classroom.get_members(), protected)
        self.assertFalse(FacilityUser.all_objects.filter(id=omitted.id).exists())

    def test_model_invalid_rename_does_not_set_classroom_spelling(self):
        bob = self._create_bob()
        ann = FacilityUser.objects.create(
            username="ann", password=bob.password, facility=self.facility
        )

        errors = self._import_rows(
            [
                [bob.id, "robert", "*", "Bob", "LEARNER", "", "3001", "", "SOUTH", ""],
                [ann.id, "anne", "*", "Ann", "CLASS_COACH", "", "", "", "", "South"],
                self._learner_row(bob.id, "bobby", "Bob"),
            ]
        )

        self.assertEqual(
            [(error["row"], error["field"]) for error in errors],
            [(1, "birth_year"), (3, "UUID")],
        )
        self.assertEqual(Classroom.objects.get(parent=self.facility).name, "South")
        bob.refresh_from_db()
        ann.refresh_from_db()
        self.assertEqual(bob.username, "bob")
        self.assertEqual(ann.username, "anne")

    def test_model_invalid_rename_does_not_save_or_change_enrollment(self):
        user = self._create_bob()
        north = Classroom.objects.create(name="North", parent=self.facility)
        south = Classroom.objects.create(name="South", parent=self.facility)
        north.add_member(user)
        invalid_username = "r" * 31

        errors = self._import_rows(
            [
                [
                    user.id,
                    invalid_username,
                    "*",
                    "Bob",
                    "LEARNER",
                    "",
                    "",
                    "",
                    "South",
                    "",
                ],
                ["", "carol", "password", "Carol", "LEARNER", "", "", "", "South", ""],
            ],
            "--delete",
        )

        self.assertEqual(
            [(error["field"], error["value"]) for error in errors],
            [("username", invalid_username)],
        )
        user.refresh_from_db()
        self.assertEqual(user.username, "bob")
        self.assertIn(user, north.get_members())
        self.assertNotIn(user, south.get_members())
        self.assertIn(
            FacilityUser.objects.get(username="carol", facility=self.facility),
            south.get_members(),
        )

    def test_model_invalid_rename_stays_within_user_read_budget(self):
        bob = self._create_bob()

        with CaptureQueriesContext(connection) as queries:
            errors = self._import_rows([self._learner_row(bob.id, "r" * 31, "Bob")])

        self._assert_facility_user_read_budget(queries, 2)
        self.assertEqual(
            [(error["row"], error["field"]) for error in errors], [(1, "username")]
        )

    def test_model_errors_identify_each_csv_row(self):
        bob = self._create_bob()
        carol = FacilityUser.objects.create(
            username="carol",
            full_name=bob.full_name,
            facility=self.facility,
            password=bob.password,
        )

        errors = self._import_rows(
            [
                self._learner_row(bob.id, "r" * 31, bob.full_name),
                self._learner_row(carol.id, "c" * 31, carol.full_name),
            ]
        )

        self.assertEqual(
            [(error["row"], error["field"]) for error in errors],
            [(1, "username"), (2, "username")],
        )

    def test_model_invalid_rename_does_not_create_classes(self):
        user = self._create_bob()

        errors = self._import_rows(
            [
                [
                    user.id,
                    "r" * 31,
                    "*",
                    "Bob",
                    "CLASS_COACH",
                    "",
                    "",
                    "",
                    "South",
                    "East",
                ]
            ]
        )

        self.assertEqual([error["field"] for error in errors], ["username"])
        self.assertFalse(
            Classroom.objects.filter(
                parent=self.facility, name__in=("South", "East")
            ).exists()
        )

    def test_dashed_uuid_matches_existing_user_with_delete(self):
        user = FacilityUser.objects.create(
            username="bob",
            full_name="Bob",
            password=make_password("password"),
            facility=self.facility,
        )

        errors = self._import_rows(
            [self._learner_row(str(UUID(user.id)), "bob", "Robert")], "--delete"
        )

        self.assertEqual(errors, [])
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

                errors = self._import_rows(
                    [self._learner_row(uuid_cell, "bob", full_name)]
                )

                self.assertEqual(errors, [])
                self.assertEqual(
                    FacilityUser.objects.get(id=user.id).full_name, full_name
                )

    def test_row_shorter_than_header_creates_user(self):
        headers = list(labels.values())
        headers.append(headers.pop(0))

        errors = self._import_rows(
            [["alice", "pw", "Alice", "LEARNER", "", "", "", "", ""]], headers=headers
        )

        self.assertEqual(errors, [])
        self.assertTrue(FacilityUser.objects.filter(username="alice").exists())

    def test_unknown_uuid_error_names_uuid(self):
        unknown_uuid = str(uuid4())
        errors = self._import_rows([self._learner_row(unknown_uuid, "bob", "Bob")])

        self.assertEqual(
            [(error["field"], error["value"]) for error in errors],
            [("UUID", unknown_uuid)],
        )
        self.assertIn(unknown_uuid, errors[0]["message"])

    def test_failed_import_restores_language(self):
        manager = b.BulkUserImportManager(
            "nonexistent.csv", facility_id=self.facility.id, locale="fr-fr"
        )
        with translation.override("en"):
            with self.assertRaises(BulkUserImportError):
                manager.run()
            self.assertEqual(translation.get_language(), "en")
