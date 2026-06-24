import copy
import time
from unittest.mock import patch

from django.test import override_settings
from django.test import TestCase
from django.utils import timezone

import kolibri

from ..constants import BACKEND
from ..constants import FRONTEND
from ..constants import TASK
from ..models import ErrorReport
from ..models import ServerRun


class ErrorReportTestCase(TestCase):
    databases = "__all__"

    def frontend_context(self, value="Boom"):
        return {
            "platform": "javascript",
            "level": "error",
            "exception": {
                "values": [
                    {
                        "type": "TypeError",
                        "value": value,
                        "mechanism": {"type": "onerror", "handled": False},
                        "stacktrace": {
                            "frames": [
                                {
                                    "filename": "app.js",
                                    "function": "f",
                                    "lineno": 1,
                                    "in_app": True,
                                }
                            ]
                        },
                    }
                ]
            },
            "contexts": {
                "browser": {"name": "Chrome", "version": "1"},
                "os": {"name": "OS", "version": "1"},
                "device": {"is_touch_device": True, "screen_breakpoint": 4},
            },
            "breadcrumbs": {"values": []},
        }

    def backend_context(self, value="Boom", avg=None, request=None):
        context = {
            "platform": "python",
            "level": "error",
            "exception": {
                "values": [
                    {
                        "type": "ValueError",
                        "value": value,
                        "mechanism": {"type": "django", "handled": False},
                        "stacktrace": {
                            "frames": [
                                {
                                    "filename": "kolibri/x.py",
                                    "function": "view",
                                    "lineno": 10,
                                    "in_app": True,
                                }
                            ]
                        },
                    }
                ]
            },
            "traceback": "Traceback (most recent call last): ...",
            "contexts": {"runtime": {"name": "python", "version": "3.9"}},
            "request": {
                "url": "/api/test",
                "method": "GET",
                "headers": {},
                "query_params": {},
                "body": "",
            },
            "server": {"host": "localhost", "port": "8000"},
            "packages": ["Django==3.2"],
        }
        if avg is not None:
            context["avg_request_time_to_error"] = avg
        if request is not None:
            context["request"] = request
        return context

    def task_context(self, exception="ValueError", traceback="Task traceback ..."):
        return {
            "platform": "python",
            "level": "error",
            "exception": {
                "values": [
                    {
                        "type": exception,
                        "value": exception,
                        "mechanism": {"type": "task", "handled": False},
                        "stacktrace": {"frames": []},
                    }
                ]
            },
            "traceback": traceback,
            "contexts": {"runtime": {"name": "python", "version": "3.9"}},
            "job_info": {"job_id": "1", "func": "f"},
            "worker_info": {"worker_host": "localhost"},
        }

    def create_error(self, fingerprint, category=BACKEND, reported=False, context=None):
        return ErrorReport.objects.create(
            category=category,
            fingerprint=fingerprint,
            kolibri_version=kolibri.__version__,
            context=context if context is not None else self.backend_context(),
            reported=reported,
        )

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_insert_or_update_frontend_error_prod_mode(self):
        context = self.frontend_context()
        error = ErrorReport.insert_or_update_error(FRONTEND, context)
        self.assertEqual(error.category, FRONTEND)
        self.assertEqual(error.context, context)
        self.assertEqual(error.events, 1)
        self.assertFalse(error.reported)
        self.assertEqual(error.kolibri_version, kolibri.__version__)
        self.assertTrue(error.fingerprint)
        # No ServerRun has been recorded, so no anchors
        self.assertIsNone(error.first_occurred_run)
        self.assertIsNone(error.first_occurred_uptime)
        self.assertLess(
            timezone.now() - error.first_occurred, timezone.timedelta(seconds=1)
        )

        # The same error again updates rather than creating a second row.
        error = ErrorReport.insert_or_update_error(FRONTEND, self.frontend_context())
        self.assertEqual(error.events, 2)
        self.assertEqual(ErrorReport.objects.count(), 1)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_insert_or_update_backend_error_prod_mode(self):
        error = ErrorReport.insert_or_update_error(BACKEND, self.backend_context())
        self.assertEqual(error.category, BACKEND)
        self.assertEqual(error.events, 1)
        self.assertFalse(error.reported)

        error = ErrorReport.insert_or_update_error(BACKEND, self.backend_context())
        self.assertEqual(error.events, 2)
        self.assertEqual(ErrorReport.objects.count(), 1)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_insert_or_update_task_error_prod_mode(self):
        error = ErrorReport.insert_or_update_error(TASK, self.task_context())
        self.assertEqual(error.category, TASK)
        self.assertEqual(error.events, 1)

        error = ErrorReport.insert_or_update_error(TASK, self.task_context())
        self.assertEqual(error.events, 2)
        self.assertEqual(ErrorReport.objects.count(), 1)

    @override_settings(DEVELOPER_MODE=True)
    def test_insert_or_update_error_dev_mode(self):
        error = ErrorReport.insert_or_update_error(BACKEND, self.backend_context())
        self.assertIsNone(error)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_distinct_errors_are_not_merged(self):
        first = ErrorReport.insert_or_update_error(
            BACKEND, self.backend_context(value="first")
        )
        second = ErrorReport.insert_or_update_error(
            BACKEND, self.backend_context(value="second")
        )
        self.assertNotEqual(first.id, second.id)
        self.assertNotEqual(first.fingerprint, second.fingerprint)
        self.assertEqual(second.events, 1)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_fingerprint_is_version_specific(self):
        # The same error before and after an upgrade is a distinct identity.
        context = self.backend_context()
        first = ErrorReport.fingerprint_for(BACKEND, context)
        with patch_version("0.0.0-after-upgrade"):
            second = ErrorReport.fingerprint_for(BACKEND, context)
        self.assertNotEqual(first, second)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_insert_or_update_error_anchors_occurrences_to_server_run(self):
        run = ServerRun.start_new_run()
        error = ErrorReport.insert_or_update_error(BACKEND, self.backend_context())
        self.assertEqual(error.first_occurred_run, run.id)
        self.assertGreaterEqual(error.first_occurred_uptime, 0)
        self.assertEqual(error.last_occurred_run, run.id)

        error = ErrorReport.insert_or_update_error(BACKEND, self.backend_context())
        self.assertEqual(error.events, 2)
        self.assertEqual(error.last_occurred_run, run.id)
        self.assertGreaterEqual(error.last_occurred_uptime, error.first_occurred_uptime)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_insert_or_update_error_averages_request_time(self):
        ErrorReport.insert_or_update_error(BACKEND, self.backend_context(avg=1.0))
        error = ErrorReport.insert_or_update_error(
            BACKEND, self.backend_context(avg=3.0)
        )
        self.assertEqual(error.events, 2)
        self.assertEqual(error.context["avg_request_time_to_error"], 2.0)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_insert_or_update_error_records_request_time_when_first_lacked_it(self):
        ErrorReport.insert_or_update_error(BACKEND, self.backend_context())
        error = ErrorReport.insert_or_update_error(
            BACKEND, self.backend_context(avg=3.0)
        )
        self.assertEqual(error.events, 2)
        self.assertEqual(error.context["avg_request_time_to_error"], 3.0)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_insert_or_update_error_handles_occurrence_without_request_time(self):
        ErrorReport.insert_or_update_error(BACKEND, self.backend_context(avg=1.0))
        error = ErrorReport.insert_or_update_error(BACKEND, self.backend_context())
        self.assertEqual(error.events, 2)
        self.assertEqual(error.context["avg_request_time_to_error"], 1.0)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_insert_or_update_error_averages_zero_request_time(self):
        ErrorReport.insert_or_update_error(BACKEND, self.backend_context(avg=0.0))
        error = ErrorReport.insert_or_update_error(
            BACKEND, self.backend_context(avg=1.0)
        )
        self.assertEqual(error.events, 2)
        self.assertEqual(error.context["avg_request_time_to_error"], 0.5)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_insert_or_update_error_averages_only_timed_occurrences(self):
        # The running average is a mean over the occurrences that carried a
        # request time, not over all events - an occurrence without a time
        # must not inflate the divisor.
        ErrorReport.insert_or_update_error(BACKEND, self.backend_context(avg=1.0))
        # An occurrence with no request time - leaves the average untouched
        ErrorReport.insert_or_update_error(BACKEND, self.backend_context())
        error = ErrorReport.insert_or_update_error(
            BACKEND, self.backend_context(avg=3.0)
        )
        self.assertEqual(error.events, 3)
        # Mean of the two timed occurrences (1.0, 3.0), not (1.0 * 2 + 3.0) / 3
        self.assertEqual(error.context["avg_request_time_to_error"], 2.0)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_insert_or_update_error_does_not_mutate_caller_context(self):
        # The context dict belongs to the caller and must not be mutated -
        # neither when creating the report nor when folding a new occurrence
        # into the running average.
        create_context = self.backend_context(avg=1.0)
        create_snapshot = copy.deepcopy(create_context)
        ErrorReport.insert_or_update_error(BACKEND, create_context)
        self.assertEqual(create_context, create_snapshot)

        update_context = self.backend_context(avg=3.0)
        update_snapshot = copy.deepcopy(update_context)
        ErrorReport.insert_or_update_error(BACKEND, update_context)
        self.assertEqual(update_context, update_snapshot)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_insert_or_update_error_tracks_events_since_reported(self):
        error = ErrorReport.insert_or_update_error(BACKEND, self.backend_context())
        self.assertEqual(error.events_since_reported, 1)

        error = ErrorReport.insert_or_update_error(BACKEND, self.backend_context())
        self.assertEqual(error.events_since_reported, 2)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_insert_or_update_error_reopens_reported_errors(self):
        # A recurrence of an already-reported error must become visible to
        # the next submission, with the delta of unsubmitted occurrences.
        error = ErrorReport.insert_or_update_error(BACKEND, self.backend_context())
        ErrorReport.objects.filter(id=error.id).update(
            reported=True, events_since_reported=0
        )

        error = ErrorReport.insert_or_update_error(BACKEND, self.backend_context())
        self.assertFalse(error.reported)
        self.assertEqual(error.events, 2)
        self.assertEqual(error.events_since_reported, 1)
        self.assertEqual(ErrorReport.get_unreported_errors().count(), 1)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_insert_or_update_error_accepts_json_array_body(self):
        # Request body extraction can return a list for JSON array bodies,
        # which must not fail context validation and lose the report.
        request = {
            "url": "/api/test",
            "method": "POST",
            "headers": {},
            "query_params": {},
            "body": [{"id": 1}, {"id": 2}],
        }
        error = ErrorReport.insert_or_update_error(
            BACKEND, self.backend_context(request=request)
        )
        self.assertEqual(error.context["request"]["body"], [{"id": 1}, {"id": 2}])

    def test_prune_removes_oldest_reported_first(self):
        pruned = self.create_error("fp1", reported=True)
        self.create_error("fp2")
        self.create_error("fp3")

        with patch_max_stored_reports(2):
            ErrorReport.prune()

        self.assertEqual(ErrorReport.objects.count(), 2)
        self.assertFalse(ErrorReport.objects.filter(id=pruned.id).exists())

    def test_prune_keeps_unreported_over_older_reported(self):
        # Unreported reports are kept ahead of reported ones regardless of
        # age - they have not yet been submitted.
        reported = self.create_error("fp-reported", reported=True)
        unreported = self.create_error("fp-unreported")
        ErrorReport.objects.filter(id=unreported.id).update(
            last_occurred=timezone.now() - timezone.timedelta(hours=1)
        )

        with patch_max_stored_reports(1):
            ErrorReport.prune()

        self.assertTrue(ErrorReport.objects.filter(id=unreported.id).exists())
        self.assertFalse(ErrorReport.objects.filter(id=reported.id).exists())

    def test_prune_keeps_most_recent_among_reported(self):
        older = self.create_error("fp-older", reported=True)
        ErrorReport.objects.filter(id=older.id).update(
            last_occurred=timezone.now() - timezone.timedelta(hours=1)
        )
        newer = self.create_error("fp-newer", reported=True)

        with patch_max_stored_reports(1):
            ErrorReport.prune()

        self.assertTrue(ErrorReport.objects.filter(id=newer.id).exists())
        self.assertFalse(ErrorReport.objects.filter(id=older.id).exists())

    def test_get_unreported_errors(self):
        self.create_error("fp1", reported=False)
        self.create_error("fp2", reported=False)
        self.create_error("fp3", reported=True)

        unreported_errors = ErrorReport.get_unreported_errors()
        self.assertEqual(unreported_errors.count(), 2)
        self.assertFalse(unreported_errors[0].reported)
        self.assertFalse(unreported_errors[1].reported)


def patch_version(version):
    return patch("kolibri.__version__", version)


def patch_max_stored_reports(value):
    return patch("kolibri.plugins.error_reports.models.MAX_STORED_REPORTS", value)


class ServerRunTestCase(TestCase):
    databases = "__all__"

    def test_no_runs_recorded(self):
        self.assertEqual(ServerRun.get_current_anchor(), (None, None))

    def test_current_run(self):
        run = ServerRun.start_new_run()
        run_counter, run_uptime = ServerRun.get_current_anchor()
        self.assertEqual(run_counter, run.id)
        self.assertGreaterEqual(run_uptime, 0)

    def test_run_from_previous_boot(self):
        # A monotonic clock value ahead of the current one can only have
        # been recorded in a different boot of the system.
        ServerRun.objects.create(start_monotonic=time.monotonic() + 10000)
        self.assertEqual(ServerRun.get_current_anchor(), (None, None))

    def test_start_new_run_prunes_older_runs(self):
        ServerRun.start_new_run()
        ServerRun.start_new_run()
        run = ServerRun.start_new_run()
        self.assertQuerysetEqual(ServerRun.objects.all(), [run])

    def test_run_counter_monotonic_across_pruning(self):
        first = ServerRun.start_new_run()
        second = ServerRun.start_new_run()
        self.assertGreater(second.id, first.id)
