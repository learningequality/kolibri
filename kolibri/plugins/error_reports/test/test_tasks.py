import json
from unittest.mock import MagicMock
from unittest.mock import patch

from django.test import override_settings
from django.test import TestCase

import kolibri
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseTimeout

from ..constants import BACKEND
from ..constants import FRONTEND
from ..models import ErrorReport
from ..tasks import ping_error_reports
from ..tasks import RETRY_INTERVAL
from ..tasks import serialize_error_reports_to_json_response


def frontend_context():
    return {
        "platform": "javascript",
        "level": "error",
        "exception": {
            "values": [
                {
                    "type": "TypeError",
                    "value": "Test Error",
                    "mechanism": {"type": "onerror", "handled": False},
                    "stacktrace": {"frames": []},
                }
            ]
        },
        "contexts": {
            "browser": {"name": "Chrome", "version": "1.2.3"},
            "os": {"name": "OS", "version": "1.2.3"},
        },
        "breadcrumbs": {"values": []},
    }


def backend_context():
    return {
        "platform": "python",
        "level": "error",
        "exception": {
            "values": [
                {
                    "type": "ValueError",
                    "value": "Test Error",
                    "mechanism": {"type": "django", "handled": False},
                    "stacktrace": {
                        "frames": [
                            {"filename": "kolibri/x.py", "function": "v", "lineno": 1}
                        ]
                    },
                }
            ]
        },
        "traceback": "Test Traceback",
        "contexts": {"runtime": {"name": "python", "version": "3.9.1"}},
        "avg_request_time_to_error": 0.0,
    }


class TestPingErrorReports(TestCase):
    databases = "__all__"

    def setUp(self):
        with override_settings(DEVELOPER_MODE=False, TESTING=False):
            ErrorReport.insert_or_update_error(FRONTEND, frontend_context())
            ErrorReport.insert_or_update_error(BACKEND, backend_context())

    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports(self, mock_client_class):
        # Let the real serializer run - only the network client is mocked, so
        # the posted payload is the actual JSON the telemetry server receives.
        ping_error_reports("http://testserver", "test-pingback-id")
        args, kwargs = mock_client_class.return_value.post.call_args
        # The path alone is passed - NetworkClient joins it onto its base_url.
        self.assertEqual(args[0], "/api/v1/errors/report/")
        self.assertEqual(kwargs["headers"], {"Content-Type": "application/json"})
        payload = json.loads(kwargs["data"])
        self.assertEqual(payload["pingback_id"], "test-pingback-id")
        self.assertEqual(len(payload["errors"]), 2)
        self.assertEqual(ErrorReport.objects.filter(reported=True).count(), 2)

    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports_zeroes_the_submitted_delta(self, mock_client_class):
        ping_error_reports("http://testserver", "test-pingback-id")
        for error in ErrorReport.objects.all():
            self.assertTrue(error.reported)
            self.assertEqual(error.events_since_reported, 0)

    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports_keeps_delta_for_occurrences_during_submission(
        self, mock_client_class
    ):
        # An occurrence of a submitted error that lands while the submission
        # is in flight was not part of the payload - the report must stay
        # unreported with the delta of unsubmitted occurrences.
        recurring = ErrorReport.objects.get(category=BACKEND)

        def recur_during_post(*args, **kwargs):
            with override_settings(DEVELOPER_MODE=False, TESTING=False):
                ErrorReport.insert_or_update_error(
                    recurring.category, backend_context()
                )

        mock_client_class.return_value.post.side_effect = recur_during_post
        ping_error_reports("http://testserver", "test-pingback-id")

        recurring.refresh_from_db()
        self.assertFalse(recurring.reported)
        self.assertEqual(recurring.events_since_reported, 1)
        other = ErrorReport.objects.get(category=FRONTEND)
        self.assertTrue(other.reported)
        self.assertEqual(other.events_since_reported, 0)

    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports_skips_errors_recorded_during_submission(
        self, mock_client_class
    ):
        def create_error_during_post(*args, **kwargs):
            ErrorReport.objects.create(
                category="task",
                fingerprint="recorded-during-submission",
                kolibri_version=kolibri.__version__,
                context={
                    "exception": {
                        "values": [
                            {
                                "type": "X",
                                "value": "X",
                                "stacktrace": {"frames": []},
                            }
                        ]
                    },
                    "traceback": "tb",
                    "job_info": {},
                    "worker_info": {},
                },
            )

        mock_client_class.return_value.post.side_effect = create_error_during_post
        ping_error_reports("http://testserver", "test-pingback-id")
        # The two errors that existed at submission time are reported, but
        # the error recorded while the submission was in flight is not.
        self.assertEqual(ErrorReport.objects.filter(reported=True).count(), 2)
        self.assertFalse(ErrorReport.objects.get(category="task").reported)

    @patch("kolibri.plugins.error_reports.tasks.get_current_job")
    @patch(
        "kolibri.plugins.error_reports.tasks.NetworkClient",
        side_effect=NetworkLocationResponseTimeout,
    )
    def test_ping_error_reports_unreachable_retries_without_failing(
        self, mock_client_class, mock_get_current_job
    ):
        # A failed submission must not raise: a failed job would itself be
        # captured as a task error report. It retries and reports nothing.
        ping_error_reports("http://testserver", "test-pingback-id")
        mock_get_current_job.return_value.retry_in.assert_called_once_with(
            RETRY_INTERVAL
        )
        self.assertEqual(ErrorReport.objects.filter(reported=True).count(), 0)

    @patch("kolibri.plugins.error_reports.tasks.get_current_job")
    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports_drops_batch_on_client_rejection(
        self, mock_client_class, mock_get_current_job
    ):
        # A 4xx means the server rejected the payload itself - retrying would
        # resend and re-reject it forever, so the batch is dropped, not retried.
        response = MagicMock(status_code=400)
        mock_client_class.return_value.post.side_effect = (
            NetworkLocationResponseFailure("rejected", response=response)
        )
        ping_error_reports("http://testserver", "test-pingback-id")
        mock_get_current_job.return_value.retry_in.assert_not_called()
        self.assertEqual(ErrorReport.objects.filter(reported=True).count(), 2)

    @patch("kolibri.plugins.error_reports.tasks.get_current_job")
    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports_retries_on_server_error(
        self, mock_client_class, mock_get_current_job
    ):
        # A 5xx is transient - retry with the batch left unreported.
        response = MagicMock(status_code=500)
        mock_client_class.return_value.post.side_effect = (
            NetworkLocationResponseFailure("server error", response=response)
        )
        ping_error_reports("http://testserver", "test-pingback-id")
        mock_get_current_job.return_value.retry_in.assert_called_once_with(
            RETRY_INTERVAL
        )
        self.assertEqual(ErrorReport.objects.filter(reported=True).count(), 0)

    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports_caps_batch_size(self, mock_client_class):
        # Only MAX_REPORTS_PER_SUBMISSION reports are submitted per pingback;
        # the rest stay unreported for the next one, bounding the payload size.
        with override_settings(DEVELOPER_MODE=False, TESTING=False):
            for i in range(3):
                ErrorReport.objects.create(
                    category=BACKEND,
                    fingerprint="extra-{}".format(i),
                    kolibri_version=kolibri.__version__,
                    context=backend_context(),
                )
        with patch("kolibri.plugins.error_reports.tasks.MAX_REPORTS_PER_SUBMISSION", 2):
            ping_error_reports("http://testserver", "test-pingback-id")
        args, kwargs = mock_client_class.return_value.post.call_args
        payload = json.loads(kwargs["data"])
        self.assertEqual(len(payload["errors"]), 2)
        self.assertEqual(ErrorReport.objects.filter(reported=True).count(), 2)

    def test_serialize_error_reports_envelope(self):
        errors = ErrorReport.get_unreported_errors()
        payload = json.loads(
            serialize_error_reports_to_json_response(errors, "test-pingback-id")
        )
        self.assertEqual(payload["version"], 1)
        self.assertEqual(payload["pingback_id"], "test-pingback-id")
        self.assertEqual(len(payload["errors"]), 2)
        # No ServerRun has been recorded, so the snapshot has no anchor
        self.assertIsNone(payload["snapshot"]["run_counter"])
        self.assertIsNone(payload["snapshot"]["run_uptime"])
        self.assertIn("device_time", payload["snapshot"])
        for error in payload["errors"]:
            for key in (
                "category",
                "kolibri_version",
                "fingerprint",
                "first_occurred",
                "last_occurred",
                "first_occurred_run",
                "first_occurred_uptime",
                "last_occurred_run",
                "last_occurred_uptime",
                "events",
                "events_since_reported",
                "context",
            ):
                self.assertIn(key, error)
            self.assertEqual(error["kolibri_version"], kolibri.__version__)
