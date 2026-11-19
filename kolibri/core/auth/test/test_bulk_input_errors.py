import ast
import csv
import tempfile
from contextlib import contextmanager
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import translation

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.tasks import exportuserstocsv
from kolibri.core.auth.tasks import importusersfromcsv
from kolibri.core.auth.test.helpers import clear_process_cache
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.utils.bulk_import import fieldnames


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

    def test_invalid_csv_preserves_existing_report(self):
        output = self.path.with_name("errors.txt")
        output.write_text("previous report", encoding="utf-8")
        for content in ('"UUID,USERNAME', HEADER + '"unclosed'):
            with self.subTest(content=content), self.assertRaisesRegex(
                CommandError, "unexpected end of data"
            ):
                self.run_import(content, errorlines=str(output))
            self.assertEqual(output.read_text(encoding="utf-8"), "previous report")

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

    def test_empty_facility_does_not_fall_back_to_default(self):
        provision_device(default_facility=self.facility)
        self.addCleanup(clear_process_cache)
        self.path.write_text(HEADER + VALID_ROW, encoding="utf-8")
        output = self.path.with_name("export.csv")
        for command, args in (
            ("bulkimportusers", [str(self.path)]),
            (
                "bulkexportusers",
                ["--output-file", str(output)],
            ),
        ):
            with self.subTest(command=command), self.assertRaisesRegex(
                CommandError, "Facility with ID"
            ):
                call_command(command, *args, "--facility", "")
        self.assertFalse(FacilityUser.objects.filter(username="valid").exists())
        self.assertFalse(output.exists())

    def test_malformed_user_id_leaves_users_and_classes_unchanged(self):
        user = FacilityUser.objects.create(username="existing", facility=self.facility)
        classroom = Classroom.objects.create(name="Existing", parent=self.facility)
        classroom.add_member(user)
        self.path.write_text(HEADER + NEW_CLASS_ROW, encoding="utf-8")
        for flags in ([], ["--delete"]):
            with self.subTest(flags=flags), self.assertRaisesRegex(
                CommandError, "notauuid"
            ):
                call_command(
                    "bulkimportusers",
                    str(self.path),
                    "--userid",
                    "notauuid",
                    *flags,
                    facility=self.facility.id,
                )
            self.assertEqual(
                list(self.facility.facilityuser_set.values_list("id", flat=True)),
                [user.id],
            )
            self.assertEqual(
                list(Classroom.objects.filter(parent=self.facility)), [classroom]
            )
            self.assertTrue(user.is_member_of(classroom))

    def check_short_row(self, short):
        output = StringIO()
        self.run_import(HEADER + short + "\n" + VALID_ROW, errorlines=output)
        errors = [ast.literal_eval(line) for line in output.getvalue().splitlines()]
        missing = set(fieldnames[len(next(csv.reader([short]))) :])
        self.assertCountEqual(
            [(error["row"], error["field"]) for error in errors],
            [(1, field) for field in missing],
        )
        self.assertTrue(FacilityUser.objects.filter(username="valid").exists())

    def test_row_without_username_cell_reports_row_error(self):
        self.check_short_row('""')

    def test_row_without_user_type_cell_reports_row_error(self):
        self.check_short_row(",bob,pass,Bob")

    def test_missing_optional_trailing_cell_reports_row_error(self):
        self.check_short_row(",bob,pass,Bob,LEARNER,,,,")

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
            HEADER + f"{unknown},unknown,*,Unknown,LEARNER,,,,,\n" + VALID_ROW,
            errorlines=Report(),
        )
        self.assertEqual(len(lines), 1)
        self.assertIn(unknown, lines[0])
        self.assertTrue(FacilityUser.objects.filter(username="valid").exists())

    def test_output_filesystem_errors(self):
        for output in ("", self.directory.name, str(self.path / "errors.txt")):
            with self.subTest(output=output), self.assertRaises(CommandError):
                self.run_import(",".join(fieldnames), errorlines=output)

    def test_rejected_username_survives_while_unrelated_user_is_deleted(self):
        victim = FacilityUser.objects.create(username="victim", facility=self.facility)
        unrelated = FacilityUser.objects.create(
            username="unrelated", facility=self.facility
        )
        return job_storage.get_job(job_id)

    def test_deleted_facility_is_reported_in_queued_jobs(self):
        import_job = self.enqueue_csv_job(importusersfromcsv, HEADER + VALID_ROW)
        export_job = self.enqueue_csv_job(exportuserstocsv)
        facility_id = self.facility.id
        self.facility.delete()
        for job in (import_job, export_job):
            with self.subTest(task=job.func):
                job.execute()
                result = job_storage.get_job(job.job_id)
                self.assertEqual(result.state, State.FAILED)
                self.assertIn(facility_id, result.extra_metadata["overall_error"][0])
        self.assertFalse(default_storage.exists(import_job.kwargs["filepath"]))

    def test_unparseable_header_is_reported_in_queued_import(self):
        job = self.enqueue_csv_job(importusersfromcsv, '"UUID,USERNAME')
        job.execute()

        result = job_storage.get_job(job.job_id)
        self.assertEqual(result.state, State.FAILED)
        self.assertIn(
            "unexpected end of data", result.extra_metadata["overall_error"][0]
        )
        self.assertTrue(FacilityUser.objects.filter(id=victim.id).exists())
        self.assertFalse(FacilityUser.objects.filter(id=unrelated.id).exists())
