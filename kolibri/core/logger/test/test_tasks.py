import os

import mock
from django.test import TestCase
from rest_framework import serializers

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.logger.csv_export import CSV_EXPORT_FILENAMES
from kolibri.core.logger.tasks import ExportLogCSVValidator
from kolibri.utils import conf


@mock.patch.object(os, "mkdir")
class StartExportLogCSVTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="pytest_facility")
        cls.facility_user = FacilityUser.objects.create(
            username="pytest_user", facility=cls.facility
        )

    def test_validator_raises_validation_error_on_invalid_logtype(self, mock_os_mkdir):
        with self.assertRaises(serializers.ValidationError):
            ExportLogCSVValidator(
                data={
                    "type": "kolibri.core.logger.tasks.exportlogcsv",
                    "log_type": "invalid",
                },
                context={"user": self.facility_user},
            ).is_valid(raise_exception=True)

    def test_validator_sets_right_metadata_summary(self, mock_os_mkdir):
        validator = ExportLogCSVValidator(
            data={
                "type": "kolibri.core.logger.tasks.exportlogcsv",
                "log_type": "summary",
            },
            context={"user": self.facility_user},
        )
        validator.is_valid(raise_exception=True)
        filepath = os.path.join(
            conf.KOLIBRI_HOME,
            "log_export",
            CSV_EXPORT_FILENAMES["summary"].format(
                self.facility.name, self.facility.id[:4]
            ),
        )
        self.assertEqual(
            validator.validated_data,
            {
                "facility_id": self.facility.id,
                "args": ["summary", filepath, self.facility.id],
                "extra_metadata": {
                    "started_by": self.facility_user.id,
                    "started_by_username": self.facility_user.username,
                },
            },
        )

    def test_validator_sets_right_metadata_session(self, mock_os_mkdir):
        validator = ExportLogCSVValidator(
            data={
                "type": "kolibri.core.logger.tasks.exportlogcsv",
                "log_type": "session",
            },
            context={"user": self.facility_user},
        )
        validator.is_valid(raise_exception=True)
        filepath = os.path.join(
            conf.KOLIBRI_HOME,
            "log_export",
            CSV_EXPORT_FILENAMES["session"].format(
                self.facility.name, self.facility.id[:4]
            ),
        )
        self.assertEqual(
            validator.validated_data,
            {
                "facility_id": self.facility.id,
                "args": ["session", filepath, self.facility.id],
                "extra_metadata": {
                    "started_by": self.facility_user.id,
                    "started_by_username": self.facility_user.username,
                },
            },
        )
