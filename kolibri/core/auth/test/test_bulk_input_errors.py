import ast
import csv
import tempfile
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.auth.models import Role
from kolibri.core.auth.utils.bulk_import import fieldnames
from kolibri.core.auth.utils.bulk_import import Validator


class BulkInputErrorsTest(TestCase):
    databases = "__all__"

    def setUp(self):
        self.facility = Facility.objects.create(name="Import")
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "users.csv"

    def run_import(self, content, **options):
        self.path.write_text(content, encoding="utf-8")
        call_command(
            "bulkimportusers", str(self.path), facility=self.facility.id, **options
        )

    def test_empty_csv_reports_error(self):
        with self.assertRaisesRegex(CommandError, "file is empty"):
            self.run_import("")

    def test_unparseable_header_reports_error(self):
        with self.assertRaisesRegex(CommandError, "unexpected end of data"):
            self.run_import('"UUID,USERNAME')

    def check_facility_error(self, command, facility):
        self.path.write_text(",".join(fieldnames), encoding="utf-8")
        args = [str(self.path)] if command == "bulkimportusers" else []
        with self.assertRaises(CommandError):
            call_command(command, *args, facility=facility)

    def test_unknown_facility_import_reports_error(self):
        self.check_facility_error("bulkimportusers", "f" * 32)

    def test_malformed_facility_import_reports_error(self):
        self.check_facility_error("bulkimportusers", "notauuid")

    def test_unknown_facility_export_reports_error(self):
        self.check_facility_error("bulkexportusers", "f" * 32)

    def test_malformed_facility_export_reports_error(self):
        self.check_facility_error("bulkexportusers", "notauuid")

    def check_short_row(self, short):
        output = StringIO()
        self.run_import(
            ",".join(fieldnames) + "\n" + short + "\n,valid,pass,Valid,LEARNER,,,,,\n",
            errorlines=output,
        )
        errors = [ast.literal_eval(line) for line in output.getvalue().splitlines()]
        missing = set(fieldnames[len(next(csv.reader([short]))) :])
        self.assertEqual({error["field"] for error in errors}, missing)
        self.assertIn("'row': 1", output.getvalue())
        self.assertTrue(FacilityUser.objects.filter(username="valid").exists())

    def test_row_without_username_cell_reports_row_error(self):
        self.check_short_row('""')

    def test_row_without_user_type_cell_reports_row_error(self):
        self.check_short_row(",bob,pass,Bob")

    def test_missing_optional_trailing_cell_reports_row_error(self):
        self.check_short_row(",bob,pass,Bob,LEARNER,,,,")

    def test_unexpected_validator_error(self):
        validator = Validator({name: name for name in fieldnames}, self.facility)

        def fail(value):
            raise TypeError("broken check")

        validator.add_check("USERNAME", fail, "invalid")
        row = dict.fromkeys(fieldnames, "")
        row["USERNAME"] = "bob"
        errors = list(validator.validate([row]))
        self.assertEqual(
            errors[0]["message"], "Unexpected error [TypeError]: broken check"
        )

    def test_rejected_user_survives_delete(self):
        user = FacilityUser.objects.create(username="victim", facility=self.facility)
        self.run_import(
            ",".join(fieldnames)
            + "\n"
            + user.id
            + ",victim,*,Victim\n"
            + ",valid,pass,Valid,LEARNER,,,,,\n",
            delete=True,
        )
        self.assertTrue(FacilityUser.objects.filter(id=user.id).exists())
        self.assertTrue(FacilityUser.objects.filter(username="valid").exists())

    def test_rejected_user_keeps_relationships(self):
        user = FacilityUser.objects.create(username="victim", facility=self.facility)
        classroom = Classroom.objects.create(name="Class", parent=self.facility)
        membership = Membership.objects.create(user=user, collection=classroom)
        role = Role.objects.create(user=user, collection=classroom, kind="coach")
        self.run_import(
            ",".join(fieldnames)
            + "\n"
            + user.id
            + ",victim,*,Victim,LEARNER,,,,Class\n"
            + ",valid,pass,Valid,LEARNER,,,,,\n",
            delete=True,
        )
        self.assertTrue(Membership.objects.filter(id=membership.id).exists())
        self.assertTrue(Role.objects.filter(id=role.id).exists())

    def test_rejected_username_survives_while_unrelated_user_is_deleted(self):
        victim = FacilityUser.objects.create(username="victim", facility=self.facility)
        unrelated = FacilityUser.objects.create(
            username="unrelated", facility=self.facility
        )
        self.run_import(
            ",".join(fieldnames) + "\n,victim\n,valid,pass,Valid,LEARNER,,,,,\n",
            delete=True,
        )
        self.assertTrue(FacilityUser.objects.filter(id=victim.id).exists())
        self.assertFalse(FacilityUser.objects.filter(id=unrelated.id).exists())
