import json
from unittest.mock import MagicMock
from unittest.mock import patch

from django.db.models import F
from django.test import override_settings
from django.test import TestCase
from django.urls import reverse
from rest_framework.status import HTTP_403_FORBIDDEN
from rest_framework.test import APITestCase

import kolibri
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseTimeout
from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import job_storage
from kolibri.core.tasks.registry import TaskRegistry

from ..constants import BACKEND
from ..constants import FRONTEND
from ..kolibri_plugin import ErrorReportsPingbackHook
from ..models import ErrorReport
from ..tasks import ERROR_REPORTS_SUBMISSION_JOB_ID
from ..tasks import MAX_SUBMISSION_RETRIES
from ..tasks import ping_error_reports
from ..tasks import RETRY_INTERVAL
from ..tasks import serialize_submission


def running_job():
    job = MagicMock(extra_metadata={})
    job.update_metadata.side_effect = job.extra_metadata.update
    return job


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
    def test_ping_error_reports_sends_errors_recorded_during_submission_separately(
        self, mock_client_class
    ):
        def create_error_during_post(*args, **kwargs):
            if ErrorReport.objects.filter(category="task").exists():
                return
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
        # The error recorded while the first submission was in flight is not
        # marked by it, but sent in the next batch.
        batches = [
            [error["category"] for error in json.loads(kwargs["data"])["errors"]]
            for _, kwargs in mock_client_class.return_value.post.call_args_list
        ]
        self.assertEqual(batches, [[FRONTEND, BACKEND], ["task"]])
        self.assertEqual(ErrorReport.objects.filter(reported=True).count(), 3)

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
        mock_get_current_job.return_value = running_job()
        with self.assertLogs(
            "kolibri.plugins.error_reports.tasks", level="WARNING"
        ) as logs:
            ping_error_reports("http://testserver", "test-pingback-id")
        self.assertIsNone(logs.records[0].exc_info)
        mock_get_current_job.return_value.retry_in.assert_called_once_with(
            RETRY_INTERVAL
        )
        self.assertEqual(ErrorReport.objects.filter(reported=True).count(), 0)

    @patch("kolibri.plugins.error_reports.tasks.get_current_job")
    @patch(
        "kolibri.plugins.error_reports.tasks.NetworkClient",
        side_effect=NetworkLocationResponseTimeout,
    )
    def test_ping_error_reports_stops_retrying_after_max_retries(
        self, mock_client_class, mock_get_current_job
    ):
        job = running_job()
        mock_get_current_job.return_value = job
        for _ in range(MAX_SUBMISSION_RETRIES + 1):
            ping_error_reports("http://testserver", "test-pingback-id")
        self.assertEqual(job.retry_in.call_count, MAX_SUBMISSION_RETRIES)
        self.assertEqual(ErrorReport.objects.filter(reported=True).count(), 0)

    @patch("kolibri.plugins.error_reports.tasks.get_current_job")
    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports_drops_batch_on_client_rejection(
        self, mock_client_class, mock_get_current_job
    ):
        # A 400, 413 or 422 means the server rejected the payload itself -
        # retrying would resend and re-reject it forever, so the batch is
        # dropped, not retried.
        for status_code in (400, 413, 422):
            with self.subTest(status_code=status_code):
                ErrorReport.objects.update(reported=False, events_since_reported=1)
                mock_client_class.return_value.post.side_effect = (
                    NetworkLocationResponseFailure(
                        "rejected", response=MagicMock(status_code=status_code)
                    )
                )
                ping_error_reports("http://testserver", "test-pingback-id")
                mock_get_current_job.return_value.retry_in.assert_not_called()
                self.assertEqual(ErrorReport.objects.filter(reported=True).count(), 2)

    @patch("kolibri.plugins.error_reports.tasks.get_current_job")
    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports_keeps_batch_when_endpoint_unavailable(
        self, mock_client_class, mock_get_current_job
    ):
        for status_code in (401, 403, 404, 405):
            with self.subTest(status_code=status_code):
                mock_client_class.return_value.post.side_effect = (
                    NetworkLocationResponseFailure(
                        "unavailable", response=MagicMock(status_code=status_code)
                    )
                )
                ping_error_reports("http://testserver", "test-pingback-id")
                mock_get_current_job.return_value.retry_in.assert_not_called()
                self.assertEqual(ErrorReport.objects.filter(reported=True).count(), 0)

    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports_rejection_keeps_occurrences_during_submission(
        self, mock_client_class
    ):
        recurring = ErrorReport.objects.get(category=BACKEND)

        def recur_then_reject(*args, **kwargs):
            with override_settings(DEVELOPER_MODE=False, TESTING=False):
                ErrorReport.insert_or_update_error(
                    recurring.category, backend_context()
                )
            raise NetworkLocationResponseFailure(
                "rejected", response=MagicMock(status_code=400)
            )

        mock_client_class.return_value.post.side_effect = recur_then_reject
        ping_error_reports("http://testserver", "test-pingback-id")

        recurring.refresh_from_db()
        self.assertFalse(recurring.reported)
        self.assertEqual(recurring.events_since_reported, 1)
        self.assertTrue(ErrorReport.objects.get(category=FRONTEND).reported)

    @patch("kolibri.plugins.error_reports.tasks.get_current_job")
    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports_retries_on_server_error(
        self, mock_client_class, mock_get_current_job
    ):
        # A 5xx is transient - retry with the batch left unreported.
        mock_get_current_job.return_value = running_job()
        response = MagicMock(status_code=500)
        mock_client_class.return_value.post.side_effect = (
            NetworkLocationResponseFailure("server error", response=response)
        )
        with self.assertLogs(
            "kolibri.plugins.error_reports.tasks", level="WARNING"
        ) as logs:
            ping_error_reports("http://testserver", "test-pingback-id")
        self.assertIsNone(logs.records[0].exc_info)
        mock_get_current_job.return_value.retry_in.assert_called_once_with(
            RETRY_INTERVAL
        )
        self.assertEqual(ErrorReport.objects.filter(reported=True).count(), 0)

    def _create_extra_reports(self, count):
        for i in range(count):
            ErrorReport.objects.create(
                category=BACKEND,
                fingerprint=f"extra-{i}",
                kolibri_version=kolibri.__version__,
                context=backend_context(),
            )

    def _posted_batch_sizes(self, mock_client_class):
        return [
            len(json.loads(kwargs["data"])["errors"])
            for _, kwargs in mock_client_class.return_value.post.call_args_list
        ]

    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports_sends_all_reports_in_capped_batches(
        self, mock_client_class
    ):
        # Each POST carries at most MAX_REPORTS_PER_SUBMISSION reports, bounding
        # the payload size; further batches follow while the server accepts.
        self._create_extra_reports(3)
        with patch("kolibri.plugins.error_reports.tasks.MAX_REPORTS_PER_SUBMISSION", 2):
            ping_error_reports("http://testserver", "test-pingback-id")
        self.assertEqual(self._posted_batch_sizes(mock_client_class), [2, 2, 1])
        self.assertEqual(ErrorReport.objects.filter(reported=False).count(), 0)

    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports_caps_batch_encoded_size(self, mock_client_class):
        with patch("kolibri.plugins.error_reports.tasks.MAX_SUBMISSION_SIZE", 1):
            ping_error_reports("http://testserver", "test-pingback-id")
        self.assertEqual(self._posted_batch_sizes(mock_client_class), [1, 1])
        self.assertEqual(ErrorReport.objects.filter(reported=False).count(), 0)

    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports_stops_batches_after_a_failure(self, mock_client_class):
        self._create_extra_reports(3)
        mock_client_class.return_value.post.side_effect = [
            None,
            NetworkLocationResponseFailure(
                "server error", response=MagicMock(status_code=500)
            ),
        ]
        with patch("kolibri.plugins.error_reports.tasks.MAX_REPORTS_PER_SUBMISSION", 2):
            ping_error_reports("http://testserver", "test-pingback-id")
        self.assertEqual(mock_client_class.return_value.post.call_count, 2)
        self.assertEqual(ErrorReport.objects.filter(reported=True).count(), 2)

    @patch("kolibri.plugins.error_reports.tasks.NetworkClient")
    def test_ping_error_reports_recurring_reports_do_not_starve_others(
        self, mock_client_class
    ):
        recurring = ErrorReport.objects.order_by("id").first()

        def recur_during_post(*args, **kwargs):
            ErrorReport.objects.filter(id=recurring.id).update(
                events_since_reported=F("events_since_reported") + 1
            )

        self._create_extra_reports(3)
        mock_client_class.return_value.post.side_effect = recur_during_post
        with patch("kolibri.plugins.error_reports.tasks.MAX_REPORTS_PER_SUBMISSION", 1):
            ping_error_reports("http://testserver", "test-pingback-id")
        self.assertEqual(mock_client_class.return_value.post.call_count, 5)
        self.assertEqual(
            list(
                ErrorReport.objects.filter(reported=False).values_list("id", flat=True)
            ),
            [recurring.id],
        )

    def test_serialize_error_reports_envelope(self):
        errors = ErrorReport.get_unreported_errors()
        payload = json.loads(serialize_submission(errors, "test-pingback-id"))
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


class ErrorReportsPingbackHookTestCase(TestCase):
    databases = "__all__"

    def tearDown(self):
        job_storage.clear(force=True)

    def test_repeated_pingbacks_share_one_submission_job(self):
        hook = ErrorReportsPingbackHook()
        hook.pingback("http://testserver", "first-id")
        hook.pingback("http://testserver", "second-id")

        jobs = job_storage.filter_jobs(func=ping_error_reports.func_string)
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0].job_id, ERROR_REPORTS_SUBMISSION_JOB_ID)
        self.assertEqual(list(jobs[0].args), ["http://testserver", "second-id"])

    @patch(
        "kolibri.plugins.error_reports.tasks.NetworkClient",
        side_effect=NetworkLocationResponseTimeout,
    )
    def test_next_pingback_resets_the_retry_count(self, mock_client_class):
        with override_settings(DEVELOPER_MODE=False, TESTING=False):
            ErrorReport.insert_or_update_error(FRONTEND, frontend_context())
        hook = ErrorReportsPingbackHook()
        hook.pingback("http://testserver", "first-id")

        job_storage.get_job(ERROR_REPORTS_SUBMISSION_JOB_ID).execute()
        retried = job_storage.get_job(ERROR_REPORTS_SUBMISSION_JOB_ID)
        self.assertEqual(retried.state, State.QUEUED)
        self.assertEqual(retried.extra_metadata["retries"], 1)

        hook.pingback("http://testserver", "second-id")
        fresh = job_storage.get_job(ERROR_REPORTS_SUBMISSION_JOB_ID)
        self.assertNotIn("retries", fresh.extra_metadata)
        self.assertEqual(list(fresh.args), ["http://testserver", "second-id"])


class SubmissionTaskAPITestCase(APITestCase):
    databases = "__all__"

    def setUp(self):
        TaskRegistry[ping_error_reports.func_string] = ping_error_reports

    def tearDown(self):
        job_storage.clear(force=True)

    def test_anonymous_users_cannot_enqueue_the_submission_task(self):
        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {"type": ping_error_reports.func_string},
            format="json",
        )
        self.assertEqual(response.status_code, HTTP_403_FORBIDDEN)
        self.assertEqual(
            job_storage.filter_jobs(func=ping_error_reports.func_string), []
        )

    def test_anonymous_users_cannot_list_the_submission_task(self):
        ErrorReportsPingbackHook().pingback("http://testserver", "pingback-id")
        response = self.client.get(reverse("kolibri:core:task-list"))
        self.assertNotIn(
            ping_error_reports.func_string, [job["type"] for job in response.data]
        )
