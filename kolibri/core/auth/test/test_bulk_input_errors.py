import ast
import csv
import errno
import os
import signal
import struct
import tempfile
from contextlib import suppress
from io import StringIO
from pathlib import Path
from unittest import skipUnless
from unittest.mock import patch
from uuid import uuid4

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.models import Value
from django.test import TestCase
from django.utils.functional import lazy

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
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


def csv_user_row(user_id="", password="pass"):
    return [user_id, "bob", password, "Bob", "LEARNER", "", "", "", "", ""]


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

    def write_csv(self, rows, raw=None):
        with self.path.open("w", newline="", encoding="utf-8") as csvfile:
            if raw is not None:
                csvfile.write(raw)
            else:
                writer = csv.writer(csvfile)
                writer.writerow(fieldnames)
                writer.writerows(rows)
        return str(self.path)

    def run_import_with_report(self, path):
        report = StringIO()
        call_command(
            "bulkimportusers", path, facility=self.facility.id, errorlines=report
        )
        return report.getvalue()

    def french_catalog(self, messages):
        entries = {"": "Content-Type: text/plain; charset=UTF-8\n", **messages}
        original, translated = zip(*sorted(entries.items()))
        count = len(entries)
        offset = 28 + count * 16
        tables = bytearray()
        strings = bytearray()
        for group in (original, translated):
            for text in group:
                encoded = text.encode("utf-8")
                tables.extend(struct.pack("<2I", len(encoded), offset + len(strings)))
                strings.extend(encoded + b"\0")
        locales = self.path.parent / "locale"
        catalog = locales / "fr_FR" / "LC_MESSAGES" / "django.mo"
        catalog.parent.mkdir(parents=True)
        header = struct.pack("<7I", 0x950412DE, 0, count, 28, 28 + count * 8, 0, 0)
        catalog.write_bytes(header + tables + strings)
        return self.settings(LOCALE_PATHS=[str(locales)])

    def test_empty_csv_reports_error(self):
        with self.assertRaisesRegex(CommandError, "file is empty"):
            self.run_import_with_report(self.write_csv([], raw=""))

    def test_unparseable_header_reports_error(self):
        with self.assertRaisesRegex(CommandError, "unexpected end of data"):
            self.run_import_with_report(self.write_csv([], raw='"UUID,USERNAME\n'))

    def check_facility_error(self, command, facility):
        provision_device(default_facility=self.facility)
        self.addCleanup(clear_process_cache)
        if command == "bulkimportusers":
            args = [self.write_csv([csv_user_row()])]
        else:
            args = ["--output-file", self.write_csv([]), "--overwrite"]
        with self.assertRaisesRegex(CommandError, f"Facility with ID '{facility}'"):
            call_command(command, *args, facility=facility)

    def test_unknown_facility_import_reports_error(self):
        self.check_facility_error("bulkimportusers", uuid4().hex)

    def test_malformed_facility_import_reports_error(self):
        self.check_facility_error("bulkimportusers", "notauuid")

    def test_unknown_facility_export_reports_error(self):
        self.check_facility_error("bulkexportusers", uuid4().hex)

    def test_malformed_facility_export_reports_error(self):
        self.check_facility_error("bulkexportusers", "notauuid")

    def test_empty_facility_does_not_fall_back_to_default(self):
        provision_device(default_facility=self.facility)
        self.addCleanup(clear_process_cache)
        self.path.write_text(HEADER + VALID_ROW, encoding="utf-8")
        output = self.path.with_name("export.csv")
        for command, args in (
            ("bulkimportusers", [str(self.path)]),
            ("bulkexportusers", ["--output-file", str(output)]),
        ):
            with self.subTest(command=command), self.assertRaisesRegex(
                CommandError, "Facility with ID ''"
            ):
                call_command(command, *args, "--facility", "")
        self.assertFalse(FacilityUser.objects.filter(username="valid").exists())
        self.assertFalse(output.exists())

    def test_facility_lookup_accepts_database_expressions_and_lazy_ids(self):
        self.path.write_text(HEADER + VALID_ROW, encoding="utf-8")
        output = self.path.with_name("export.csv")
        for facility in (
            Value(self.facility.id),
            lazy(lambda: self.facility.id, str)(),
        ):
            with self.subTest(facility=facility):
                call_command("bulkimportusers", str(self.path), facility=facility)
                self.assertTrue(
                    self.facility.facilityuser_set.filter(username="valid").exists()
                )
                call_command(
                    "bulkexportusers", "--output-file", str(output), facility=facility
                )
                self.assertTrue(output.is_file())
                output.unlink()
                self.facility.facilityuser_set.filter(username="valid").delete()

    def check_short_row(self, short, columns, message, header=HEADER):
        output = StringIO()
        self.run_import(header + short + "\n" + VALID_ROW, errorlines=output)
        errors = [ast.literal_eval(line) for line in output.getvalue().splitlines()]
        self.assertEqual(
            errors, [{"row": 1, "field": columns, "message": message, "value": None}]
        )
        self.assertSequenceEqual(
            self.facility.facilityuser_set.values_list("username", flat=True), ["valid"]
        )

    def test_row_without_username_cell_reports_row_error(self):
        self.assertIn(
            "row", self.run_import_with_report(self.write_csv([["only-uuid-cell"]]))
        )

    def test_short_row_with_valid_row_reports_missing_columns(self):
        columns = (
            "USERNAME, PASSWORD, FULL_NAME, USER_TYPE, IDENTIFIER, BIRTH_YEAR, GENDER"
        )
        self.check_short_row(
            '""', columns, f"This row is missing cells for these columns: {columns}"
        )

    def test_row_without_user_type_cell_reports_row_error(self):
        self.assertIn(
            "row",
            self.run_import_with_report(self.write_csv([["", "bob", "pass", "Bob"]])),
        )

    def test_partial_row_with_valid_row_reports_missing_columns(self):
        columns = "USER_TYPE, IDENTIFIER, BIRTH_YEAR, GENDER"
        self.check_short_row(
            ",bob,pass,Bob",
            columns,
            f"This row is missing cells for these columns: {columns}",
        )

    def test_row_missing_only_gender_reports_row_error(self):
        columns = [name for name in fieldnames if name != "GENDER"] + ["GENDER"]
        self.check_short_row(
            ",short,*,Short,LEARNER,,,,",
            "GENDER",
            "The column 'GENDER' is required",
            header=",".join(columns) + "\n",
        )

    def test_missing_optional_trailing_cell_creates_user(self):
        values = next(csv.reader([VALID_ROW]))
        for field in ("UUID", "ENROLLED_IN", "ASSIGNED_TO"):
            with self.subTest(field=field):
                columns = [name for name in fieldnames if name != field]
                row = [values[fieldnames.index(name)] for name in columns]
                row[columns.index("USERNAME")] = field.lower()
                report = StringIO()
                self.run_import(
                    ",".join([*columns, field]) + "\n" + ",".join(row) + "\n",
                    errorlines=report,
                )
                self.assertEqual(report.getvalue(), "")
                self.assertTrue(
                    FacilityUser.objects.filter(username=field.lower()).exists()
                )

    def test_delete_applies_row_missing_optional_trailing_cell(self):
        learner = FacilityUser.objects.create_user(
            username="learner", password="test", facility=self.facility
        )
        absent = FacilityUser.objects.create(username="absent", facility=self.facility)
        classroom = Classroom.objects.create(name="Room", parent=self.facility)
        classroom.add_member(learner)
        classroom.add_member(absent)
        report = StringIO()

        self.run_import(
            HEADER + f"{learner.id},learner,*,Updated,LEARNER,,,,Room\n" + VALID_ROW,
            delete=True,
            errorlines=report,
        )

        self.assertEqual(report.getvalue(), "")
        learner.refresh_from_db()
        self.assertEqual(learner.full_name, "Updated")
        self.assertTrue(learner.is_member_of(classroom))
        self.assertFalse(FacilityUser.all_objects.filter(id=absent.id).exists())
        self.assertTrue(FacilityUser.objects.filter(username="valid").exists())

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

    def test_unexpected_password_validation_error_redacts_input(self):
        validator = Validator({name: name for name in fieldnames}, self.facility)
        candidate = "private-test-value"

        def broken_check(value):
            raise TypeError(value)

        validator.add_check("PASSWORD", broken_check, "Invalid password")
        row = dict.fromkeys(fieldnames, "")
        row.update(USERNAME="bob", PASSWORD=candidate)
        (error,) = validator.validate([row])
        self.assertNotIn(candidate, error["message"])
        self.assertEqual(error["field"], "PASSWORD")

    def test_invalid_csv_preserves_existing_report(self):
        output = self.path.with_name("errors.txt")
        output.write_text("previous report", encoding="utf-8")
        for content in ('"UUID,USERNAME', HEADER + '"unclosed'):
            with self.subTest(content=content), self.assertRaisesRegex(
                CommandError, "unexpected end of data"
            ):
                self.run_import(content, errorlines=str(output))
            self.assertEqual(output.read_text(encoding="utf-8"), "previous report")

    def test_errorlines_path_from_cli(self):
        output = self.path.with_name("errors.txt")
        output.touch()
        call_command(
            "bulkimportusers",
            self.write_csv([csv_user_row(user_id=uuid4().hex, password="*")]),
            facility=self.facility.id,
            errorlines=str(output),
        )
        self.assertTrue(output.read_text(encoding="utf-8"))

    def test_errorlines_reports_each_rejected_row(self):
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
            [(1, "UUID"), (3, "USER_TYPE, IDENTIFIER, BIRTH_YEAR, GENDER")],
        )

    def test_empty_errorlines_path_does_not_prevent_import(self):
        self.path.write_text(HEADER + VALID_ROW, encoding="utf-8")
        call_command(
            "bulkimportusers",
            str(self.path),
            "--errorlines",
            "",
            facility=self.facility.id,
        )
        self.assertTrue(
            self.facility.facilityuser_set.filter(username="valid").exists()
        )

    def test_errorlines_accepts_null_device(self):
        self.run_import(HEADER + ",short,*,Short\n" + VALID_ROW, errorlines=os.devnull)
        self.assertSequenceEqual(
            self.facility.facilityuser_set.values_list("username", flat=True), ["valid"]
        )

    @skipUnless(hasattr(os, "mkfifo"), "requires a named pipe")
    def test_errorlines_rejects_named_pipe_without_reader(self):
        output = str(self.path.with_name("errors.fifo"))
        os.mkfifo(output)

        def fail_on_timeout(*args):
            self.fail("The import waited for a named pipe reader")

        previous_handler = signal.signal(signal.SIGALRM, fail_on_timeout)
        signal.alarm(3)
        try:
            with self.assertRaises(CommandError) as error:
                self.run_import(HEADER + VALID_ROW, errorlines=output)
        finally:
            signal.alarm(0)
            signal.signal(signal.SIGALRM, previous_handler)
        self.assertEqual(error.exception.__cause__.errno, errno.ENXIO)
        self.assertFalse(self.facility.facilityuser_set.exists())

    def test_output_alias_preserves_input(self):
        content = HEADER + VALID_ROW
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
        error = ast.literal_eval("".join(lines))
        self.assertEqual((error["field"], error["value"]), ("UUID", unknown))
        self.assertTrue(FacilityUser.objects.filter(username="valid").exists())

    def test_falsy_non_path_error_report_sink_does_not_prevent_import(self):
        for output in (False, 0):
            with self.subTest(output=output):
                self.run_import(
                    HEADER + ",invalid,,Invalid,LEARNER,,,,,\n" + VALID_ROW,
                    errorlines=output,
                )
                self.assertQuerysetEqual(
                    self.facility.facilityuser_set.values_list("username", flat=True),
                    ["valid"],
                )
                self.facility.facilityuser_set.filter(username="valid").delete()

    def test_output_filesystem_errors(self):
        for output in (
            self.directory.name,
            str(self.path.parent / "missing" / "errors.txt"),
        ):
            with self.subTest(output=output):
                with self.assertRaises(CommandError) as error:
                    self.run_import(HEADER + VALID_ROW, errorlines=output)
                cause = error.exception.__cause__
                self.assertIsInstance(cause, OSError)
                self.assertEqual(cause.filename, output)

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
        output = Path("/dev/full")
        if not output.exists():
            self.skipTest("/dev/full is unavailable")
        user = FacilityUser.objects.create(username="existing", facility=self.facility)
        classroom = Classroom.objects.create(name="Existing", parent=self.facility)
        classroom.add_member(user)

        with self.assertRaisesRegex(CommandError, "No space left on device"):
            self.run_import(
                HEADER + NEW_CLASS_ROW + ",short,*,Short\n",
                errorlines=str(output),
                delete=True,
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

    def test_unparseable_header_is_reported_in_queued_import(self):
        job = self.enqueue_csv_job(importusersfromcsv, '"UUID,USERNAME')
        job.execute()

        result = job_storage.get_job(job.job_id)
        self.assertEqual(result.state, State.FAILED)
        self.assertIn(
            "unexpected end of data", result.extra_metadata["overall_error"][0]
        )

    def test_empty_file_job_translates_message_but_cli_does_not(self):
        job = self.enqueue_csv_job(importusersfromcsv, "﻿", locale="fr-fr")
        translated = "Le fichier sélectionné est vide."
        with self.french_catalog({EMPTY_MESSAGE: translated}):
            job.execute()
            with self.assertRaisesMessage(CommandError, EMPTY_MESSAGE):
                self.run_import("﻿", locale="fr-fr")
        result = job_storage.get_job(job.job_id)
        self.assertEqual(result.state, State.FAILED)
        self.assertEqual(result.extra_metadata["overall_error"], [translated])

    def test_roster_uses_the_same_read_as_the_validated_header(self):
        user = FacilityUser.objects.create(username="existing", facility=self.facility)
        classroom = Classroom.objects.create(name="Existing", parent=self.facility)
        classroom.add_member(user)
        content = HEADER + f"{user.id},existing,*,Existing,LEARNER,,,,Existing,\n"
        job = self.enqueue_csv_job(importusersfromcsv, content, delete=True)
        source = Path(default_storage.path(job.kwargs["filepath"]))
        replacement = source.with_suffix(".replacement")
        replacement.write_text(HEADER + VALID_ROW, encoding="utf-8")

        def remove_replacement():
            with suppress(FileNotFoundError):
                replacement.unlink()

        self.addCleanup(remove_replacement)
        csv_reader = csv.reader

        class ReplacingReader:
            def __init__(self, *args, **kwargs):
                self.reader = csv_reader(*args, **kwargs)

            @property
            def line_num(self):
                return self.reader.line_num

            def __iter__(self):
                return self

            def __next__(self):
                row = next(self.reader)
                if (
                    self.line_num == 1
                    and tuple(row) == fieldnames
                    and replacement.exists()
                ):
                    replacement.replace(source)
                return row

        with patch.object(csv, "reader", ReplacingReader):
            job.execute()

        self.assertFalse(replacement.exists())
        result = job_storage.get_job(job.job_id)
        self.assertEqual(result.state, State.COMPLETED)
        self.assertFalse(
            self.facility.facilityuser_set.filter(username="valid").exists()
        )
        user.refresh_from_db()
        self.assertTrue(user.is_member_of(classroom))

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
