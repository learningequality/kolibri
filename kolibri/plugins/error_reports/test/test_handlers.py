import json
import logging
import sys
from unittest.mock import MagicMock
from unittest.mock import patch
from unittest.mock import PropertyMock

from django.db import IntegrityError
from django.db import OperationalError
from django.http.request import RawPostDataException
from django.test import override_settings
from django.test import RequestFactory
from django.test import TestCase

from kolibri.core.tasks.job import State

from ..constants import BACKEND
from ..constants import TASK
from ..handlers import get_python_version
from ..handlers import get_request_time_to_error
from ..handlers import get_stack_frames
from ..handlers import handle_request_exception
from ..handlers import handle_task_failure
from ..handlers import mark_request_start
from ..handlers import MAX_STACK_FRAMES
from ..handlers import REQUEST_START_TIME_KEY
from ..kolibri_plugin import ErrorReportsPluginJobHook
from ..models import ErrorReport
from ..tasks import ping_error_reports
from ..utils.request import extract_request_info
from ..utils.request import get_request_body
from ..utils.scrubber import MAX_SCRUB_DEPTH
from ..utils.scrubber import scrub_data


class ErrorReportsSignalHandlersTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        self.factory = RequestFactory()

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_handle_request_exception(self):
        request = self.factory.get("/", HTTP_COOKIE="sessionid=secret")
        try:
            raise Exception("Test Exception")
        except Exception:
            handle_request_exception(sender=None, request=request)

        report = ErrorReport.objects.get()
        self.assertEqual(report.category, BACKEND)
        exception = report.context["exception"]["values"][0]
        self.assertEqual(exception["type"], "Exception")
        self.assertEqual(exception["value"], "Test Exception")
        self.assertIn("Test Exception", report.context["traceback"])

        request_info = report.context["request"]
        self.assertEqual(request_info["url"], "http://testserver/")
        self.assertEqual(request_info["method"], "GET")
        # Cookie value scrubbed by the real scrubber, not a mock
        self.assertEqual(request_info["headers"]["Cookie"], "[filtered for security]")
        # Real helpers ran - packages enumerated, version and stack frames real
        self.assertTrue(
            any(p.startswith("Django==") for p in report.context["packages"])
        )
        self.assertEqual(
            report.context["contexts"]["runtime"]["version"], get_python_version()
        )
        self.assertTrue(any(f["in_app"] for f in exception["stacktrace"]["frames"]))

    @patch.object(ErrorReport, "insert_or_update_error")
    @patch.object(logging.Logger, "error")
    def test_handle_request_exception_integrity_error(
        self, mock_logger_error, mock_insert_or_update_error
    ):
        request = self.factory.get("/")
        mock_insert_or_update_error.side_effect = IntegrityError("Some Integrity Error")
        try:
            raise Exception("Test Exception")
        except Exception:
            handle_request_exception(sender=None, request=request)

        mock_logger_error.assert_any_call(
            "Error occurred while saving error report to the database.", exc_info=True
        )

    @patch.object(ErrorReport, "insert_or_update_error")
    @patch.object(logging.Logger, "error")
    def test_handle_request_exception_never_propagates(
        self, mock_logger_error, mock_insert_or_update_error
    ):
        # Error capture must never break Django's exception handling -
        # got_request_exception receivers are dispatched without a guard,
        # so anything raised here would escape response_for_exception.
        request = self.factory.get("/")
        mock_insert_or_update_error.side_effect = OperationalError("database is locked")
        try:
            raise Exception("Test Exception")
        except Exception:
            handle_request_exception(sender=None, request=request)

        mock_logger_error.assert_any_call(
            "Error occurred while saving error report to the database.", exc_info=True
        )

    @patch("kolibri.plugins.error_reports.handlers.extract_request_info")
    @patch.object(logging.Logger, "error")
    def test_handle_request_exception_survives_context_build_failure(
        self, mock_logger_error, mock_extract_request_info
    ):
        # The context is built before the report is saved, so a failure there
        # must be caught too - otherwise it escapes the unguarded receiver and
        # replaces Django's 500 handling.
        request = self.factory.get("/")
        mock_extract_request_info.side_effect = ValueError("boom")
        try:
            raise Exception("Test Exception")
        except Exception:
            handle_request_exception(sender=None, request=request)

        mock_logger_error.assert_any_call(
            "Error occurred while saving error report to the database.", exc_info=True
        )
        self.assertEqual(ErrorReport.objects.count(), 0)

    @patch.object(ErrorReport, "insert_or_update_error")
    def test_handle_request_exception_no_exception(self, mock_insert_or_update_error):
        request = self.factory.get("/")
        handle_request_exception(sender=None, request=request)
        mock_insert_or_update_error.assert_not_called()

    def test_mark_request_start_records_time(self):
        environ = {}
        mark_request_start(sender=None, environ=environ)
        self.assertIn(REQUEST_START_TIME_KEY, environ)

    def test_get_request_time_to_error(self):
        request = self.factory.get("/")
        mark_request_start(sender=None, environ=request.environ)
        self.assertGreaterEqual(get_request_time_to_error(request), 0.0)

    def test_get_request_time_to_error_without_start_time(self):
        request = self.factory.get("/")
        self.assertIsNone(get_request_time_to_error(request))

    def test_get_stack_frames(self):
        try:
            raise ValueError("Test Exception")
        except ValueError:
            frames = get_stack_frames(sys.exc_info()[2])
        self.assertEqual(len(frames), 1)
        frame = frames[0]
        # This test file is part of the kolibri package, so the frame is
        # in_app, with a filename relative to the kolibri package parent
        self.assertTrue(frame["in_app"])
        self.assertEqual(
            frame["filename"],
            "kolibri/plugins/error_reports/test/test_handlers.py",
        )
        self.assertEqual(frame["function"], "test_get_stack_frames")
        self.assertIsInstance(frame["lineno"], int)

    def test_get_stack_frames_caps_deep_stacks(self):
        def recurse(n):
            if n == 0:
                raise ValueError("Test Exception")
            recurse(n - 1)

        try:
            recurse(MAX_STACK_FRAMES * 2)
        except ValueError:
            frames = get_stack_frames(sys.exc_info()[2])
        self.assertEqual(len(frames), MAX_STACK_FRAMES)

    def test_get_stack_frames_strips_non_kolibri_paths(self):
        # A real traceback passing through the standard library: its frames
        # must not leak the absolute install path off-device.
        import json

        try:
            json.loads("{not valid json")
        except ValueError:
            frames = get_stack_frames(sys.exc_info()[2])
        for frame in frames:
            self.assertFalse(frame["filename"].startswith("/"), frame["filename"])
        # The kolibri test frame is relativized and marked in_app.
        self.assertTrue(
            any(f["in_app"] and f["filename"].startswith("kolibri/") for f in frames)
        )
        # The standard-library frame is present but not in_app.
        self.assertTrue(any(not f["in_app"] for f in frames))

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_handle_request_exception_scrubs_traceback_paths(self):
        import json

        request = self.factory.get("/")
        try:
            json.loads("{not valid json")
        except ValueError:
            handle_request_exception(sender=None, request=request)

        report = ErrorReport.objects.get()
        # Neither the raw traceback nor the structured frames leak absolute paths.
        self.assertNotIn('File "/', report.context["traceback"])
        frames = report.context["exception"]["values"][0]["stacktrace"]["frames"]
        for frame in frames:
            self.assertFalse(frame["filename"].startswith("/"), frame["filename"])

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_handle_task_failure(self):
        job = MagicMock(
            exception="ValueError",
            traceback="Test Traceback",
            job_id="1",
            func="test_func",
            facility_id=None,
            args=["test"],
            kwargs={"test": "test"},
            progress=0,
            total_progress=0,
            extra_metadata={},
        )
        orm_job = MagicMock(
            worker_host="localhost",
            worker_process="1",
            worker_thread="1",
            worker_extra=None,
        )

        handle_task_failure(job, orm_job)

        report = ErrorReport.objects.get()
        self.assertEqual(report.category, TASK)
        exception = report.context["exception"]["values"][0]
        self.assertEqual(exception["type"], "ValueError")
        self.assertEqual(exception["value"], "ValueError")
        self.assertEqual(report.context["traceback"], "Test Traceback")
        self.assertEqual(report.context["job_info"]["func"], "test_func")
        self.assertEqual(report.context["worker_info"]["worker_host"], "localhost")
        # Real helpers ran rather than being mocked
        self.assertTrue(
            any(p.startswith("Django==") for p in report.context["packages"])
        )
        self.assertEqual(
            report.context["contexts"]["runtime"]["version"], get_python_version()
        )

    @patch.object(ErrorReport, "insert_or_update_error")
    @patch.object(logging.Logger, "error")
    def test_handle_task_failure_never_propagates(
        self, mock_logger_error, mock_insert_or_update_error
    ):
        # Error capture must never break task state management - the
        # JobHook is dispatched inside the jobs database transaction, so
        # anything raised here would roll back the job's state update.
        mock_insert_or_update_error.side_effect = OperationalError("database is locked")
        job = MagicMock(
            exception="ValueError",
            traceback="Test Traceback",
            job_id="1",
            func="test_func",
            facility_id=None,
            args=["test"],
            kwargs={"test": "test"},
            progress=0,
            total_progress=0,
            extra_metadata={},
        )
        orm_job = MagicMock(
            worker_host="localhost",
            worker_process="1",
            worker_thread="1",
            worker_extra=None,
        )

        handle_task_failure(job, orm_job)

        mock_logger_error.assert_any_call(
            "Error occurred while saving error report to the database.", exc_info=True
        )

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_handle_task_failure_scrubs_sensitive_data(self):
        # Task args/kwargs/metadata can carry credentials, and the report is
        # submitted off-device, so sensitive values must be scrubbed - just
        # as they are on the request path.
        job = MagicMock(
            exception="ValueError",
            traceback="Test Traceback",
            job_id="1",
            func="test_func",
            facility_id=None,
            args=["positional"],
            kwargs={"password": "secret", "baseurl": "https://example.com"},
            progress=0,
            total_progress=0,
            extra_metadata={"token": "abc", "facility_name": "School"},
        )
        orm_job = MagicMock(
            worker_host="localhost",
            worker_process="1",
            worker_thread="1",
            worker_extra=None,
        )

        handle_task_failure(job, orm_job)

        job_info = ErrorReport.objects.get().context["job_info"]
        self.assertEqual(job_info["kwargs"]["password"], "[filtered for security]")
        self.assertEqual(job_info["kwargs"]["baseurl"], "https://example.com")
        self.assertEqual(job_info["extra_metadata"]["token"], "[filtered for security]")
        self.assertEqual(job_info["extra_metadata"]["facility_name"], "School")
        # Scrubbing must operate on a copy - the live job object passed to the
        # hook must not be mutated.
        self.assertEqual(job.kwargs["password"], "secret")
        self.assertEqual(job.extra_metadata["token"], "abc")

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_job_hook_skips_submission_task_failures(self):
        # Capturing the submission task's own failure would create a task
        # error report that the next pingback tries to submit, looping if the
        # submission keeps failing.
        job = MagicMock(func=ping_error_reports.func_string)
        ErrorReportsPluginJobHook().update(job, MagicMock(), state=State.FAILED)
        self.assertEqual(ErrorReport.objects.count(), 0)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_job_hook_captures_other_task_failures(self):
        job = MagicMock(
            func="some.other.task",
            exception="ValueError",
            traceback="Test Traceback",
            job_id="1",
            facility_id=None,
            args=[],
            kwargs={},
            progress=0,
            total_progress=0,
            extra_metadata={},
        )
        orm_job = MagicMock(
            worker_host="localhost",
            worker_process="1",
            worker_thread="1",
            worker_extra=None,
        )
        ErrorReportsPluginJobHook().update(job, orm_job, state=State.FAILED)
        self.assertEqual(ErrorReport.objects.filter(category=TASK).count(), 1)


class RequestBodyExtractionTestCase(TestCase):
    """Tests for request body extraction with RawPostDataException handling."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_get_request_body_json_post(self):
        """Test that JSON POST body is correctly extracted and parsed."""
        request = self.factory.post(
            "/",
            data=json.dumps({"key": "value"}),
            content_type="application/json",
        )
        body = get_request_body(request)
        self.assertEqual(body, {"key": "value"})

    def test_get_request_body_empty_get(self):
        """Test that GET requests return None for body."""
        request = self.factory.get("/")
        body = get_request_body(request)
        self.assertIsNone(body)

    def test_raw_post_data_exception_falls_back_to_data(self):
        """Test that RawPostDataException is caught and falls back to request.data."""
        request = self.factory.post(
            "/",
            data=json.dumps({"key": "value"}),
            content_type="application/json",
        )

        # Simulate body already consumed by patching request.body to raise exception
        original_body = request.body  # noqa: F841 - triggers the read

        with patch.object(
            type(request),
            "body",
            new_callable=PropertyMock,
            side_effect=RawPostDataException("You cannot access body after reading"),
        ):
            # Add DRF-style .data attribute
            request.data = {"key": "fallback_value"}

            body = get_request_body(request)
            self.assertEqual(body, {"key": "fallback_value"})

    def test_raw_post_data_exception_returns_none_without_data(self):
        """Test that body is None when RawPostDataException occurs and no .data exists."""
        request = self.factory.post(
            "/",
            data=json.dumps({"key": "value"}),
            content_type="application/json",
        )

        with patch.object(
            type(request),
            "body",
            new_callable=PropertyMock,
            side_effect=RawPostDataException("You cannot access body after reading"),
        ):
            # No .data attribute (not DRF)
            body = get_request_body(request)
            self.assertIsNone(body)

    def test_extract_request_info_with_json_body(self):
        """Test extract_request_info correctly extracts JSON body."""
        request = self.factory.post(
            "/api/test/",
            data=json.dumps({"username": "testuser", "password": "secret123"}),
            content_type="application/json",
        )

        info = extract_request_info(request)

        self.assertEqual(info["url"], "http://testserver/api/test/")
        self.assertEqual(info["method"], "POST")
        # Password should be scrubbed
        self.assertEqual(info["body"]["username"], "testuser")
        self.assertEqual(info["body"]["password"], "[filtered for security]")

    def test_extract_request_info_excludes_query_string_from_url(self):
        """
        The scrubber only filters dict keys, so the raw query string must
        not be embedded in the url - query params are captured (and
        scrubbed) separately.
        """
        request = self.factory.get("/api/test/", {"token": "secret", "page": "2"})

        info = extract_request_info(request)

        self.assertEqual(info["url"], "http://testserver/api/test/")
        self.assertEqual(info["query_params"]["token"], "[filtered for security]")
        self.assertEqual(info["query_params"]["page"], ["2"])

    def test_extract_request_info_scrubs_sensitive_headers(self):
        """Test that sensitive headers are scrubbed."""
        request = self.factory.post(
            "/",
            data="test",
            content_type="text/plain",
            HTTP_AUTHORIZATION="Bearer secret-token",
            HTTP_COOKIE="sessionid=abc123",
        )

        info = extract_request_info(request)

        # Authorization header should be scrubbed
        self.assertEqual(
            info["headers"].get("Authorization"), "[filtered for security]"
        )
        self.assertEqual(info["headers"].get("Cookie"), "[filtered for security]")

    def test_extract_request_info_scrubs_uppercase_and_dashed_keys(self):
        """
        Denylist keys are matched after normalizing case and dashes, so
        entries like XSRF-TOKEN and PHPSESSID must scrub regardless of the
        casing the value arrives under.
        """
        request = self.factory.post(
            "/api/test/",
            data=json.dumps({"XSRF-TOKEN": "abc", "PHPSESSID": "def", "page": "2"}),
            content_type="application/json",
        )

        info = extract_request_info(request)

        self.assertEqual(info["body"]["XSRF-TOKEN"], "[filtered for security]")
        self.assertEqual(info["body"]["PHPSESSID"], "[filtered for security]")
        self.assertEqual(info["body"]["page"], "2")

    def test_scrub_data_bounds_recursion_depth(self):
        # A pathologically nested structure must not blow the recursion
        # limit. Shallow secrets are still scrubbed; the guard only stops
        # descending past the depth cap.
        nested = current = {}
        for _ in range(MAX_SCRUB_DEPTH + 50):
            current["child"] = {"password": "secret"}
            current = current["child"]

        scrub_data(nested)  # must not raise RecursionError

        self.assertEqual(nested["child"]["password"], "[filtered for security]")
