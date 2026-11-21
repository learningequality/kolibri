import ast
import csv
import os
import tempfile
from contextlib import contextmanager
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
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
from kolibri.core.auth.utils.bulk_import import Validator
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import job_storage

HEADER = ",".join(fieldnames) + "\n"
VALID_ROW = ",valid,pass,Valid,LEARNER,,,,,\n"
NEW_CLASS_ROW = ",valid,pass,Valid,LEARNER,,,,New Class,\n"
EMPTY_MESSAGE = "The selected file is empty. Select a CSV file that contains users."


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

    def test_errorlines_path_from_cli(self):
        output = Path(self.directory.name) / "errors.txt"
        self.path.write_text(
            HEADER
            + "f" * 32
            + ",bob,pass,Bob,LEARNER,,,,,\n"
            + VALID_ROW
            + ",short,*,Short\n",
            encoding="utf-8",
        )
        call_command(
            "bulkimportusers",
            str(self.path),
            "--errorlines",
            str(output),
            facility=self.facility.id,
        )
        errors = [
            ast.literal_eval(line)
            for line in output.read_text(encoding="utf-8").splitlines()
        ]
        self.assertCountEqual(
            [(error["row"], error["field"]) for error in errors],
            [(1, "UUID")] + [(3, field) for field in fieldnames[4:]],
        )

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

    def test_errorlines_redacts_invalid_password(self):
        output = self.path.with_name("errors.txt")
        password = "secret-password" * 10
        self.path.write_text(
            HEADER + f",bob,{password},Bob,LEARNER,,,,,\n", encoding="utf-8"
        )
        call_command(
            "bulkimportusers",
            str(self.path),
            "--errorlines",
            str(output),
            facility=self.facility.id,
        )
        report = output.read_text(encoding="utf-8")
        self.assertNotIn(password, report)
        self.assertEqual(
            ast.literal_eval(report),
            {
                "row": 1,
                "field": "PASSWORD",
                "value": None,
                "message": "Value in column 'PASSWORD' has too many characters",
            },
        )

    def test_output_alias_preserves_input(self):
        content = ",".join(fieldnames) + "\n,valid,pass,Valid,LEARNER,,,,,\n"
        for kind in ("same", "symlink", "hardlink"):
            self.path.write_text(content, encoding="utf-8")
            output = self.path if kind == "same" else self.path.with_name(kind)
            if kind == "symlink":
                output.symlink_to(self.path)
            elif kind == "hardlink":
                os.link(str(self.path), str(output))
            with self.subTest(kind=kind), self.assertRaises(CommandError):
                call_command(
                    "bulkimportusers",
                    str(self.path),
                    facility=self.facility.id,
                    errorlines=str(output),
                )
            self.assertEqual(self.path.read_text(encoding="utf-8"), content)
            self.assertFalse(FacilityUser.objects.filter(username="valid").exists())

    def test_write_only_error_report_sink(self):
        lines = []

        class Report:
            write = staticmethod(lines.append)

        unknown = "f" * 32
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

    def test_storage_input_with_existing_error_output(self):
        unknown_user = "f" * 32
        content = HEADER + VALID_ROW + f"{unknown_user},bob,pass,Bob,LEARNER,,,,,\n"
        name = default_storage.save("review-storage.csv", ContentFile(content.encode()))
        self.addCleanup(default_storage.delete, name)
        output = self.path.with_name("errors.txt")
        output.write_text("Previous report\n", encoding="utf-8")
        call_command(
            "bulkimportusers",
            name,
            facility=self.facility.id,
            use_storage=True,
            errorlines=str(output),
        )
        error = ast.literal_eval(output.read_text(encoding="utf-8"))
        self.assertEqual((error["field"], error["value"]), ("UUID", unknown_user))
        self.assertTrue(FacilityUser.objects.filter(username="valid").exists())

    def test_error_report_linked_to_storage_input_during_read(self):
        content = (HEADER + VALID_ROW).encode()
        name = default_storage.save("review-storage.csv", ContentFile(content))
        self.addCleanup(default_storage.delete, name)
        report_name = default_storage.save("review-errors.txt", ContentFile(b""))
        self.addCleanup(default_storage.delete, report_name)
        output = Path(default_storage.path(report_name))
        storage_open = default_storage.open

        def open_input(*args, **kwargs):
            if not os.path.samefile(default_storage.path(name), output):
                output.unlink()
                os.link(default_storage.path(name), output)
            return storage_open(*args, **kwargs)

        with patch.object(default_storage, "open", side_effect=open_input):
            with self.assertRaisesRegex(CommandError, "output must differ"):
                call_command(
                    "bulkimportusers",
                    name,
                    "--use-django-storage",
                    "--dryrun",
                    "--errorlines",
                    str(output),
                    facility=self.facility.id,
                )
        with default_storage.open(name) as source:
            self.assertEqual(source.read(), content)

    def test_report_write_failure_leaves_users_and_classes_unchanged(self):
        output = self.path.with_name("errors.txt")
        output.write_text("previous report", encoding="utf-8")
        user = FacilityUser.objects.create(username="existing", facility=self.facility)
        classroom = Classroom.objects.create(name="Existing", parent=self.facility)
        classroom.add_member(user)

        @contextmanager
        def fail_on_close():
            with open(output, "a", encoding="utf-8") as report:
                yield report
            raise OSError("Could not flush error report")

        def open_file(path, *args, **kwargs):
            if path == str(output):
                return fail_on_close()
            return open(path, *args, **kwargs)

        unknown_user = "f" * 32
        with patch(
            "kolibri.core.auth.utils.bulk_import.open",
            side_effect=open_file,
            create=True,
        ), self.assertRaisesRegex(CommandError, "Could not flush error report"):
            self.run_import(
                HEADER + NEW_CLASS_ROW + f"{unknown_user},bob,pass,Bob,LEARNER,,,,,\n",
                errorlines=str(output),
                delete=True,
            )
        self.assertEqual(
            ast.literal_eval(output.read_text(encoding="utf-8"))["value"], unknown_user
        )
        self.assertEqual(
            list(FacilityUser.objects.filter(facility=self.facility)), [user]
        )
        self.assertEqual(
            list(Classroom.objects.filter(parent=self.facility)), [classroom]
        )
        self.assertTrue(user.is_member_of(classroom))

    def enqueue_csv_job(self, task, content=None, **kwargs):
        if content is not None:
            filepath = default_storage.save("temp/review.csv", ContentFile(content))
            self.addCleanup(default_storage.delete, filepath)
            kwargs["filepath"] = filepath
        job_id = job_storage.enqueue_job(
            Job(task, kwargs={"facility": self.facility.id, **kwargs})
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

    def test_export_storage_error_reports_original_failure(self):
        job = self.enqueue_csv_job(exportuserstocsv)
        with patch.object(default_storage, "exists", side_effect=OSError("Disk error")):
            with self.assertRaisesRegex(CommandError, "Disk error"):
                call_command(
                    "bulkexportusers", "--use-django-storage", facility=self.facility.id
                )
            job.execute()

        result = job_storage.get_job(job.job_id)
        self.assertEqual(result.state, State.FAILED)
        self.assertIn("Disk error", result.extra_metadata["overall_error"][0])

    def test_empty_file_job_translates_message_but_cli_does_not(self):
        job = self.enqueue_csv_job(importusersfromcsv, "\ufeff", locale="fr-fr")
        translated = "Le fichier sélectionné est vide."
        gettext = translation.gettext

        def translate(message):
            if message == EMPTY_MESSAGE and translation.get_language() == "fr-fr":
                return translated
            return gettext(message)

        with patch.object(translation, "gettext", side_effect=translate):
            job.execute()
            with self.assertRaisesMessage(CommandError, EMPTY_MESSAGE):
                self.run_import("\ufeff", locale="fr-fr")
        result = job_storage.get_job(job.job_id)
        self.assertEqual(result.state, State.FAILED)
        self.assertEqual(result.extra_metadata["overall_error"], [translated])

    def test_remote_storage_input_with_existing_error_output(self):
        output = self.path.with_name("errors.txt")
        output.write_text("Previous report\n", encoding="utf-8")
        unknown_user = "f" * 32
        content = (
            HEADER + VALID_ROW + f"{unknown_user},bob,pass,Bob,LEARNER,,,,,\n"
        ).encode()
        with patch(
            "django.core.files.storage.default_storage.path",
            side_effect=NotImplementedError,
        ):
            with patch(
                "django.core.files.storage.default_storage.open",
                side_effect=lambda *args, **kwargs: ContentFile(
                    content, name="review.csv"
                ),
            ):
                call_command(
                    "bulkimportusers",
                    "review.csv",
                    facility=self.facility.id,
                    use_storage=True,
                    errorlines=str(output),
                )
        error = ast.literal_eval(output.read_text(encoding="utf-8"))
        self.assertEqual((error["field"], error["value"]), ("UUID", unknown_user))
        self.assertTrue(FacilityUser.objects.filter(username="valid").exists())
