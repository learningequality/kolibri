import mock

from django.test import TestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser

from kolibri.core.logger.task_validators import validate_startexportlogcsv
from kolibri.core.logger.task_validators import get_logs_dir_and_filepath
from kolibri.core.logger.tasks import startexportlogcsv
from django.http.response import Http404


class DummyRequest(object):
    user = None
    data = None


class StartExportLogCSVTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="pytest_facility")
        cls.facility_user = FacilityUser.objects.create(
            username="pytest_user", facility=cls.facility
        )

    def setUp(self):
        self.dummy_request = DummyRequest()
        self.dummy_request.user = self.facility_user

    def test_validator_raises_404_on_invalid_logtype(self):
        self.dummy_request.data = {"logtype": "invalid"}

        with self.assertRaises(Http404):
            validate_startexportlogcsv(self.dummy_request)

    def test_validator_sets_right_metadata(self):
        self.dummy_request.data = {"logtype": "summary"}
        validated_data = validate_startexportlogcsv(self.dummy_request)
        self.assertEqual(
            validated_data["extra_metadata"],
            {
                "type": "EXPORTSUMMARYLOGCSV",
                "started_by": self.dummy_request.user.pk,
                "facility": self.dummy_request.user.facility.id,
            },
        )

        self.dummy_request.data = {"logtype": "session"}
        validated_data = validate_startexportlogcsv(self.dummy_request)
        self.assertEqual(
            validated_data["extra_metadata"],
            {
                "type": "EXPORTSESSIONLOGCSV",
                "started_by": self.dummy_request.user.pk,
                "facility": self.dummy_request.user.facility.id,
            },
        )

    def test_validator_returns_right_data_on_summary_logtype(self):
        self.dummy_request.data = {"logtype": "summary"}
        validated_data = validate_startexportlogcsv(self.dummy_request)
        expected_extra_metadata = {
            "type": "EXPORTSUMMARYLOGCSV",
            "started_by": self.dummy_request.user.pk,
            "facility": self.dummy_request.user.facility.id,
        }
        _, expected_filepath = get_logs_dir_and_filepath(
            "summary", self.dummy_request.user.facility
        )

        self.assertEqual(
            validated_data,
            {
                "log_type": "summary",
                "filepath": expected_filepath,
                "facility": self.dummy_request.user.facility,
                "extra_metadata": expected_extra_metadata,
            },
        )

    def test_validator_returns_right_data_on_session_logtype(self):
        self.dummy_request.data = {"logtype": "session"}
        validated_data = validate_startexportlogcsv(self.dummy_request)
        expected_extra_metadata = {
            "type": "EXPORTSESSIONLOGCSV",
            "started_by": self.dummy_request.user.pk,
            "facility": self.dummy_request.user.facility.id,
        }
        _, expected_filepath = get_logs_dir_and_filepath(
            "session", self.dummy_request.user.facility
        )

        self.assertEqual(
            validated_data,
            {
                "log_type": "session",
                "filepath": expected_filepath,
                "facility": self.dummy_request.user.facility,
                "extra_metadata": expected_extra_metadata,
            },
        )

    @mock.patch("kolibri.core.logger.tasks.call_command")
    def test_startexportlogcsv(self, mock_call_command):
        self.dummy_request.data = {"logtype": "summary"}

        validated_data = validate_startexportlogcsv(self.dummy_request)
        startexportlogcsv(**validated_data)

        mock_call_command.assert_called_once_with(
            "exportlogs",
            log_type=validated_data["log_type"],
            output_file=validated_data["filepath"],
            facility=validated_data["facility"].id,
            overwrite="true",
        )
