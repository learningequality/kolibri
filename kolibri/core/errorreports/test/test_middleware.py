from unittest.mock import patch

from django.test import TestCase

from ..middleware import ErrorReportingMiddleware
from ..models import ErrorReports


class ErrorReportingMiddlewareTestCase(TestCase):
    @patch.object(ErrorReports, "insert_or_update_error")
    def test_process_exception(self, mock_insert_or_update_error):
        middleware = ErrorReportingMiddleware(lambda r: None)
        request = self.client.request()
        exception = Exception("Test Exception")
        middleware.process_exception(request, exception=exception)
        mock_insert_or_update_error.assert_called_once()
