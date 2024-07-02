from unittest.mock import patch

import pytest
from django.test import TestCase
from requests.exceptions import ConnectionError
from requests.exceptions import RequestException
from requests.exceptions import Timeout

from kolibri.core.errorreports.models import ErrorReports
from kolibri.core.errorreports.tasks import ping_error_reports


class TestPingErrorReports(TestCase):
    databases = "__all__"

    def setUp(self):
        ErrorReports.objects.create(
            category="frontend",
            error_message="Test Error",
            traceback="Test Traceback",
            context_frontend={
                "browser": "Chrome",
                "component": "HeaderComponent",
                "device": {
                    "type": "desktop",
                    "platform": "windows",
                    "screen": {"width": 1920, "height": 1080},
                },
            },
        )
        ErrorReports.objects.create(
            category="backend",
            error_message="Test Error",
            traceback="Test Traceback",
            context_backend={
                "request_info": {
                    "url": "/api/test",
                    "method": "GET",
                    "headers": {"User-Agent": "TestAgent"},
                    "body": "",
                },
                "server": {"host": "localhost", "port": 8000},
                "packages": {"django": "3.2", "kolibri": "0.15.8"},
                "python_version": "3.9.1",
            },
        )

    @patch("kolibri.core.errorreports.tasks.requests.post")
    @patch(
        "kolibri.core.errorreports.tasks.serialize_error_reports_to_json_response",
        return_value="[]",
    )
    def test_ping_error_reports(self, mock_serializer, mock_post):
        ping_error_reports("http://testserver")
        mock_post.assert_called_with(
            "http://testserver/api/v1/errors/",
            data="[]",
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(ErrorReports.objects.filter(reported=True).count(), 2)

    @patch("kolibri.core.errorreports.tasks.requests.post", side_effect=ConnectionError)
    def test_ping_error_reports_connection_error(self, mock_post):
        with pytest.raises(ConnectionError):
            ping_error_reports("http://testserver")
        self.assertEqual(ErrorReports.objects.filter(reported=True).count(), 0)

    @patch("kolibri.core.errorreports.tasks.requests.post", side_effect=Timeout)
    def test_ping_error_reports_timeout(self, mock_post):
        with pytest.raises(Timeout):
            ping_error_reports("http://testserver")
        self.assertEqual(ErrorReports.objects.filter(reported=True).count(), 0)

    @patch(
        "kolibri.core.errorreports.tasks.requests.post", side_effect=RequestException
    )
    def test_ping_error_reports_request_exception(self, mock_post):
        with pytest.raises(RequestException):
            ping_error_reports("http://testserver")
        self.assertEqual(ErrorReports.objects.filter(reported=True).count(), 0)
