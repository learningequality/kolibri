import copy
import json
import uuid
from typing import ClassVar
from unittest.mock import patch
from unittest.mock import PropertyMock

from django.core.cache.backends.locmem import LocMemCache
from django.test import override_settings
from django.urls import reverse
from rest_framework.status import HTTP_200_OK
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.status import HTTP_413_REQUEST_ENTITY_TOO_LARGE
from rest_framework.status import HTTP_429_TOO_MANY_REQUESTS
from rest_framework.test import APITestCase

from kolibri.utils.tests.helpers import override_option

from ..api import ErrorReportThrottle
from ..api import MAX_CONTEXT_SIZE
from ..api import MAX_OCCURRENCES_PER_REPORT
from ..api import MAX_REQUEST_BODY_SIZE
from ..constants import FRONTEND
from ..models import ErrorReport
from ..serializers import MAX_JSON_DEPTH


def nested(levels, leaf):
    for _ in range(levels):
        leaf = {"a": leaf}
    return leaf


class FrontendReportTestCase(APITestCase):
    databases = "__all__"
    # The frontend submits only a Sentry-event-shaped context; the exception
    # type, value and stack live inside it.
    data: ClassVar[dict] = {
        "context": {
            "platform": "javascript",
            "level": "error",
            "exception": {
                "values": [
                    {
                        "type": "TypeError",
                        "value": "Something went wrong",
                        "mechanism": {"type": "onerror", "handled": False},
                        "stacktrace": {
                            "frames": [
                                {
                                    "filename": "https://host/app.js",
                                    "abs_path": "https://host/app.js",
                                    "function": "f",
                                    "lineno": 1,
                                    "colno": 2,
                                    "in_app": True,
                                }
                            ]
                        },
                    }
                ]
            },
            "contexts": {
                "browser": {"name": "Chrome", "version": "1.2.3"},
                "os": {"name": "OS", "version": "1.2.3"},
                "device": {
                    "model": "",
                    "type": "desktop",
                    "vendor": "vendor",
                    "is_touch_device": True,
                    "screen_breakpoint": 2,
                },
                "route": {"name": "HOME", "path": "/home", "params": {}},
                "app": {"visibility_state": "visible"},
            },
            "breadcrumbs": {
                "values": [
                    {
                        "category": "console",
                        "level": "info",
                        "message": "hello",
                        "data": {"logger": "console"},
                        "timestamp": 1.0,
                    }
                ]
            },
            "request": {"url": "https://host/#/home"},
        },
    }

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        response = self.client.post(url, self.data, format="json")
        self.assertEqual(response.status_code, HTTP_200_OK)
        report = ErrorReport.objects.get(id=response.data["error_id"])
        self.assertEqual(report.category, FRONTEND)
        self.assertEqual(report.events, 1)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    @override_option("ErrorReports", "SUBMISSION_RATE", "1/min")
    def _statuses_for(self, remote_addr, *forwarded_fors):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        cache = LocMemCache(str(uuid.uuid4()), {})
        with patch.object(ErrorReportThrottle, "cache", cache):
            return [
                self.client.post(
                    url,
                    self.data,
                    format="json",
                    REMOTE_ADDR=remote_addr,
                    HTTP_X_FORWARDED_FOR=forwarded_for,
                ).status_code
                for forwarded_for in forwarded_fors
            ]

    def test_frontend_report_throttle_ignores_forwarded_for_from_direct_client(self):
        self.assertEqual(
            self._statuses_for("192.0.2.10", "10.0.0.1", "10.0.0.2"),
            [HTTP_200_OK, HTTP_429_TOO_MANY_REQUESTS],
        )

    def test_frontend_report_throttle_separates_clients_behind_local_proxy(self):
        self.assertEqual(
            self._statuses_for("127.0.0.1", "10.0.0.1", "10.0.0.2"),
            [HTTP_200_OK, HTTP_200_OK],
        )

    def test_frontend_report_throttle_keys_on_address_appended_by_local_proxy(self):
        self.assertEqual(
            self._statuses_for("::1", "1.1.1.1, 10.0.0.1", "2.2.2.2, 10.0.0.1"),
            [HTTP_200_OK, HTTP_429_TOO_MANY_REQUESTS],
        )

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_counts_deduplicated_occurrences(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["deduplication"] = {"count": 5}
        response = self.client.post(url, data, format="json")
        self.client.post(url, data, format="json")
        report = ErrorReport.objects.get(id=response.data["error_id"])
        self.assertEqual(report.events, 10)
        self.assertEqual(report.events_since_reported, 10)
        self.assertNotIn("deduplication", report.context)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_ignores_repeated_submission(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["deduplication"] = {"count": 3}
        data["submission_id"] = str(uuid.uuid4())
        first = self.client.post(url, data, format="json")
        repeat = self.client.post(url, data, format="json")
        data["submission_id"] = str(uuid.uuid4())
        self.client.post(url, data, format="json")

        self.assertEqual(repeat.status_code, HTTP_200_OK)
        report = ErrorReport.objects.get(id=first.data["error_id"])
        self.assertEqual(report.events, 6)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_retry_counts_recurrences_since_lost_response(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["submission_id"] = str(uuid.uuid4())
        first = self.client.post(url, data, format="json")
        data["context"]["deduplication"] = {"count": 2}
        self.client.post(url, data, format="json")

        report = ErrorReport.objects.get(id=first.data["error_id"])
        self.assertEqual(report.events, 2)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_rejected_submission_can_be_resent(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["submission_id"] = str(uuid.uuid4())
        data["context"]["breadcrumbs"]["values"] = [{"category": "console"}]
        rejected = self.client.post(url, data, format="json")
        data["context"]["breadcrumbs"] = copy.deepcopy(
            self.data["context"]["breadcrumbs"]
        )
        accepted = self.client.post(url, data, format="json")

        self.assertEqual(rejected.status_code, HTTP_400_BAD_REQUEST)
        self.assertEqual(accepted.status_code, HTTP_200_OK)
        self.assertEqual(ErrorReport.objects.get().events, 1)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_caps_deduplicated_occurrences(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["deduplication"] = {"count": 10**9}
        response = self.client.post(url, data, format="json")
        report = ErrorReport.objects.get(id=response.data["error_id"])
        self.assertEqual(report.events, MAX_OCCURRENCES_PER_REPORT)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_strips_breadcrumb_url_query_strings(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["breadcrumbs"]["values"] = [
            {
                "category": "fetch",
                "data": {"url": "/api/content/?search=learner", "method": "GET"},
                "timestamp": 1.0,
            },
            {
                "category": "navigation",
                "data": {"from": "/home?search=a", "to": "/topics/x?search=b"},
                "timestamp": 2.0,
            },
        ]
        response = self.client.post(url, data, format="json")
        report = ErrorReport.objects.get(id=response.data["error_id"])
        fetch, navigation = report.context["breadcrumbs"]["values"]
        self.assertEqual(fetch["data"]["url"], "/api/content/")
        self.assertEqual(navigation["data"]["from"], "/home")
        self.assertEqual(navigation["data"]["to"], "/topics/x")

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_strips_url_credentials(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["breadcrumbs"]["values"] = [
            {
                "category": "fetch",
                "data": {"url": "http://user:secret@[::1]:8080/api/", "method": "GET"},
                "timestamp": 1.0,
            },
        ]
        response = self.client.post(url, data, format="json")
        report = ErrorReport.objects.get(id=response.data["error_id"])
        (fetch,) = report.context["breadcrumbs"]["values"]
        self.assertEqual(fetch["data"]["url"], "http://[::1]:8080/api/")

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_malformed_frames(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["exception"]["values"][0]["stacktrace"]["frames"] = ["x"]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
        self.assertEqual(ErrorReport.objects.count(), 0)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_unparseable_urls(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        frame = data["context"]["exception"]["values"][0]["stacktrace"]["frames"][0]
        frame["filename"] = "http://[x/app.js"
        data["context"]["request"]["url"] = "http://[x/#/home?token=secret"
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_200_OK)
        report = ErrorReport.objects.get(id=response.data["error_id"])
        self.assertEqual(report.context["request"]["url"], "")

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_drops_undeclared_fields(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["avg_request_time_to_error"] = "x"
        data["context"]["extra"] = nested(450, {})
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_200_OK)
        report = ErrorReport.objects.get()
        self.assertNotIn("avg_request_time_to_error", report.context)
        self.assertNotIn("extra", report.context)

    def test_frontend_report_invalid_value_under_surrogate_key(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["contexts"]["route"]["params"] = {"\ud800": {"x": 1}}
        response = self.client.post(
            url, json.dumps(data), content_type="application/json"
        )
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_non_finite_timestamp(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["breadcrumbs"]["values"][0]["timestamp"] = 12345.678
        for timestamp in ("1e400", "1" + "0" * 400):
            body = json.dumps(data).replace("12345.678", timestamp)
            response = self.client.post(url, body, content_type="application/json")
            self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
        self.assertEqual(ErrorReport.objects.count(), 0)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_replaces_lone_surrogates(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        context = data["context"]
        context["exception"]["values"][0]["value"] = "boom\ud800"
        context["breadcrumbs"]["values"][0]["message"] = "x\ud83d"
        context["breadcrumbs"]["values"][0]["data"] = {"\ud800": "\x00"}
        context["contexts"]["route"]["params"] = {"\ud800": "x"}
        response = self.client.post(
            url, json.dumps(data), content_type="application/json"
        )
        self.assertEqual(response.status_code, HTTP_200_OK)

        stored = ErrorReport.objects.get().context
        replaced = "\N{REPLACEMENT CHARACTER}"
        self.assertEqual(stored["exception"]["values"][0]["value"], f"boom{replaced}")
        crumb = stored["breadcrumbs"]["values"][0]
        self.assertEqual(crumb["message"], f"x{replaced}")
        self.assertEqual(crumb["data"], {replaced: replaced})
        self.assertEqual(stored["contexts"]["route"]["params"], {replaced: "x"})

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_scrubs_at_maximum_depth(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        crumb = data["context"]["breadcrumbs"]["values"][0]
        crumb["data"] = nested(MAX_JSON_DEPTH - 1, {"password": "x"})
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_200_OK)
        deepest = ErrorReport.objects.get().context["breadcrumbs"]["values"][0]["data"]
        for _ in range(MAX_JSON_DEPTH - 1):
            deepest = deepest["a"]
        self.assertEqual(deepest["password"], "[filtered for security]")

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_too_deeply_nested(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        for levels in (MAX_JSON_DEPTH, 450):
            data = copy.deepcopy(self.data)
            data["context"]["breadcrumbs"]["values"][0]["data"] = nested(levels, {})
            response = self.client.post(url, data, format="json")
            self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
        self.assertEqual(ErrorReport.objects.count(), 0)

    def test_frontend_report_non_object_context(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        response = self.client.post(url, {"context": ["x"]}, format="json")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
        self.assertIn("context", response.data)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_strips_url_query_string(self):
        # Frontend reports do not pass through the backend request scrubbing,
        # so the endpoint must drop the query string and fragment, where a
        # token could otherwise be captured and stored.
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["request"]["url"] = "https://host/path?token=secret#/home"
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_200_OK)
        report = ErrorReport.objects.get(id=response.data["error_id"])
        self.assertEqual(report.context["request"]["url"], "https://host/path")

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_scrubs_sensitive_keys(self):
        # Denylisted keys anywhere in the frontend context (e.g. component
        # props) are scrubbed server-side before storage.
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["contexts"]["vue"] = {
            "component_name": "Login",
            "props": {"authorization": "Bearer secret"},
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_200_OK)
        report = ErrorReport.objects.get(id=response.data["error_id"])
        self.assertEqual(
            report.context["contexts"]["vue"]["props"]["authorization"],
            "[filtered for security]",
        )

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_stores_vue_lifecycle_hook(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["contexts"]["vue"] = {
            "component_name": "Login",
            "lifecycle_hook": "v-on handler",
        }
        response = self.client.post(url, data, format="json")
        report = ErrorReport.objects.get(id=response.data["error_id"])
        self.assertEqual(
            report.context["contexts"]["vue"]["lifecycle_hook"], "v-on handler"
        )

    def test_frontend_report_invalid_data(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = self.data.copy()
        invalid_data = data.pop("context")
        response = self.client.post(url, invalid_data, format="json")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)

    def test_frontend_report_oversized_context(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["contexts"]["vue"] = {"props": {"p": "x" * MAX_CONTEXT_SIZE}}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["metadata"]["field"], "context")

    def test_frontend_report_rejects_oversized_body_before_parsing(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        body = json.dumps({"context": {"padding": "x" * MAX_REQUEST_BODY_SIZE}})
        with patch(
            "rest_framework.request.Request.data", new_callable=PropertyMock
        ) as data:
            response = self.client.post(url, body, content_type="application/json")
        self.assertEqual(response.status_code, HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        data.assert_not_called()

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_drops_oldest_breadcrumbs_when_oversized(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["breadcrumbs"]["values"] = [
            {"category": "console", "message": f"{i}:" + "x" * 1000, "timestamp": i}
            for i in range(100)
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_200_OK)
        stored = ErrorReport.objects.get().context["breadcrumbs"]["values"]
        self.assertLess(len(stored), 100)
        self.assertTrue(stored[-1]["message"].startswith("99:"))

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_measures_non_ascii_as_utf8(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["breadcrumbs"]["values"] = [
            {
                "category": "console",
                "message": "\N{DEVANAGARI LETTER KA}" * 400,
                "timestamp": i,
            }
            for i in range(30)
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_200_OK)
        stored = ErrorReport.objects.get().context["breadcrumbs"]["values"]
        self.assertEqual(len(stored), 30)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_invalid_context(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = copy.deepcopy(self.data)
        data["context"]["breadcrumbs"]["values"] = [{"category": "console"}]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
        self.assertIn("context", response.data)
        self.assertEqual(ErrorReport.objects.count(), 0)

    @override_settings(DEVELOPER_MODE=False, TESTING=False)
    def test_frontend_report_invalid_recurrence(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        response = self.client.post(url, self.data, format="json")
        data = copy.deepcopy(self.data)
        data["context"]["breadcrumbs"]["values"] = [{"category": "console"}]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
        report = ErrorReport.objects.get()
        self.assertEqual(report.events, 1)
        self.assertEqual(
            report.context["breadcrumbs"], self.data["context"]["breadcrumbs"]
        )
