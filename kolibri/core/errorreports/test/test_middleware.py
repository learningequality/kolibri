import logging
import traceback
from unittest.mock import patch

from django.db import IntegrityError
from django.test import TestCase

from ..constants import BACKEND
from ..middleware import ErrorReportingMiddleware
from ..models import ErrorReports


class ErrorReportingMiddlewareTestCase(TestCase):
    @patch.object(ErrorReports, "insert_or_update_error")
    @patch.object(logging.Logger, "error")
    def test_process_exception(self, mock_logger_error, mock_insert_or_update_error):
        middleware = ErrorReportingMiddleware(lambda r: None)
        request = self.client.request()
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
            BACKEND, str(exception), expected_traceback_info
        )

    @patch.object(ErrorReports, "insert_or_update_error")
    @patch.object(logging.Logger, "error")
    def test_process_exception_integrity_error(
        self, mock_logger_error, mock_insert_or_update_error
    ):
        middleware = ErrorReportingMiddleware(lambda r: None)
        request = self.client.request()
        exception = Exception("Test Exception")
        mock_insert_or_update_error.side_effect = IntegrityError("Some Integrity Error")
        middleware.process_exception(request, exception)

        mock_logger_error.assert_any_call(
            "Error occurred while saving error report to the database: %s",
            str(mock_insert_or_update_error.side_effect),
        )
