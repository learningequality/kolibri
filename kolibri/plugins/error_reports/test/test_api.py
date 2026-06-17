import copy
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import override_settings
from django.test import TestCase
from django.urls import reverse
from rest_framework.status import HTTP_200_OK
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.test import APIClient

from ..models import ErrorReport


class FrontendReportTestCase(TestCase):
    databases = "__all__"
    # The frontend submits only a Sentry-event-shaped context; the exception
    # type, value and stack live inside it.
    data = {
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

    def setUp(self):
        self.client = APIClient()

    def test_frontend_report(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        response = self.client.post(url, self.data, format="json")
        self.assertEqual(response.status_code, HTTP_200_OK)

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

    def test_frontend_report_invalid_data(self):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = self.data.copy()
        invalid_data = data.pop("context")
        response = self.client.post(url, invalid_data, format="json")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)

    def test_frontend_report_oversized_context(self):
        # The endpoint is unauthenticated, and the model caps the message
        # and traceback but stores context as-is, so the API must bound it.
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        data = dict(self.data)
        data["context"] = dict(self.data["context"])
        data["context"]["breadcrumbs"] = {
            "values": [
                {
                    "category": "console",
                    "message": "x" * 1000,
                    "timestamp": 1.0,
                }
                for _ in range(100)
            ]
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
        self.assertIn("context", response.data)

    @patch(
        "kolibri.plugins.error_reports.models.ErrorReport.insert_or_update_error",
        side_effect=ValidationError("Mocked exception"),
    )
    def test_frontend_report_server_error_validation_error(
        self, mock_insert_or_update_error
    ):
        url = reverse("kolibri:kolibri.plugins.error_reports:report")
        response = self.client.post(url, self.data, format="json")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
