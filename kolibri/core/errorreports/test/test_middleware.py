from django.test import override_settings
from django.test import TestCase

from ..middleware import ErrorReportingMiddleware
from ..models import ErrorReports


class ErrorReportingMiddlewareTestCase(TestCase):
    databases = "__all__"

    @override_settings(DEVELOPER_MODE=False)
    def test_process_exception(self):
        middleware = ErrorReportingMiddleware(lambda r: None)
        request = self.client.request()
        exception = Exception("Test Exception")
        middleware.process_exception(request, exception=exception)
        self.assertTrue(
            ErrorReports.objects.filter(error_message="Test Exception").exists()
        )

    @override_settings(DEVELOPER_MODE=True)
    def test_process_exception_developer_mode_enabled(self):
        middleware = ErrorReportingMiddleware(lambda r: None)
        request = self.client.request()
        exception = Exception("Test Exception")
        middleware.process_exception(request, exception=exception)
        self.assertFalse(
            ErrorReports.objects.filter(error_message="Test Exception").exists()
        )
