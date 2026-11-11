import tempfile
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from kolibri.core.auth.models import Facility
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
