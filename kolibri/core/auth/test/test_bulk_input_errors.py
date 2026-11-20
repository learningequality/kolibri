import csv
import struct
import tempfile
from contextlib import suppress
from io import StringIO
from pathlib import Path
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
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import job_storage

HEADER = ",".join(fieldnames) + "\n"
VALID_ROW = ",valid,pass,Valid,LEARNER,,,,,\n"
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
