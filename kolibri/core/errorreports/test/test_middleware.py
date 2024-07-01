import logging
import traceback
from unittest.mock import patch

from django.db import IntegrityError
from django.test import RequestFactory
from django.test import TestCase

from ..constants import BACKEND
from ..middleware import ErrorReportingMiddleware
from ..models import ErrorReports


class ErrorReportingMiddlewareTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @patch(
        "kolibri.core.errorreports.middleware.get_python_version", return_value="3.9.9"
    )
    @patch(
        "kolibri.core.errorreports.middleware.get_packages",
        return_value={"Django": "3.2.25"},
    )
    @patch.object(ErrorReports, "insert_or_update_error")
    @patch.object(logging.Logger, "error")
    def test_process_exception(
        self,
        mock_logger_error,
        mock_insert_or_update_error,
        mock_get_packages,
        mock_get_python_version,
    ):
        middleware = ErrorReportingMiddleware(lambda r: None)
        request = self.factory.get("/")
        exception = Exception("Test Exception")
        try:
            raise exception
        except Exception as e:
            middleware.process_exception(request, exception=e)
        # I am just coverting exception.__traceback__ to string
        expected_traceback_info = "".join(
            traceback.format_exception(
                type(exception), exception, exception.__traceback__
            )
        )

        mock_insert_or_update_error.assert_called_once_with(
            BACKEND,
            str(exception),
            expected_traceback_info,
            context_backend={
                "request_info": {
                    "url": "http://testserver/",
                    "method": "GET",
                    "headers": dict(request.headers),
                    "body": "",
                },
                "server": {"host": "testserver", "port": "80"},
                "packages": {"Django": 1.1},
                "python_version": "1.1.1",
            },
        )

    @patch.object(ErrorReports, "insert_or_update_error")
    @patch.object(logging.Logger, "error")
    def test_process_exception_integrity_error(
        self, mock_logger_error, mock_insert_or_update_error
    ):
        middleware = ErrorReportingMiddleware(lambda r: None)
        request = self.factory.get("/")
        exception = Exception("Test Exception")
        mock_insert_or_update_error.side_effect = IntegrityError("Some Integrity Error")
        middleware.process_exception(request, exception)

        mock_logger_error.assert_any_call(
            "Error occurred while saving error report to the database: %s",
            str(mock_insert_or_update_error.side_effect),
        )
