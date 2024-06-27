from unittest.mock import patch

from django.test import TestCase
from requests.exceptions import ConnectionError
from requests.exceptions import RequestException
from requests.exceptions import Timeout


@patch("kolibri.core.errorreports.tasks.requests.post")
@patch("kolibri.core.errorreports.tasks.ErrorReports.get_unsent_errors")
@patch("kolibri.core.errorreports.tasks.mark_errors_as_sent")
class PingErrorReportsTestCase(TestCase):
    def setUp(self):
        self.server = "http://iamtest.in"

    def test_ping_error_reports(self, mark_errors_as_sent, get_unsent_errors, post):
        from kolibri.core.errorreports.tasks import ping_error_reports

        ping_error_reports(self.server)

        self.assertTrue(get_unsent_errors.called)
        self.assertTrue(post.called)
        self.assertTrue(mark_errors_as_sent.called)

    def test_ping_error_reports_connection_error(
        self, mark_errors_as_sent, get_unsent_errors, post
    ):
        from kolibri.core.errorreports.tasks import ping_error_reports

        get_unsent_errors.side_effect = ConnectionError

        with self.assertRaises(ConnectionError):
            ping_error_reports(self.server)

        self.assertTrue(get_unsent_errors.called)
        self.assertFalse(post.called)
        self.assertFalse(mark_errors_as_sent.called)

    def test_ping_error_reports_timeout(
        self, mark_errors_as_sent, get_unsent_errors, post
    ):
        from kolibri.core.errorreports.tasks import ping_error_reports

        get_unsent_errors.side_effect = Timeout

        with self.assertRaises(Timeout):
            ping_error_reports(self.server)

        self.assertTrue(get_unsent_errors.called)
        self.assertFalse(post.called)
        self.assertFalse(mark_errors_as_sent.called)

    def test_ping_error_reports_response_failure(
        self, mark_errors_as_sent, get_unsent_errors, post
    ):
        from kolibri.core.errorreports.tasks import ping_error_reports

        get_unsent_errors.side_effect = RequestException

        with self.assertRaises(RequestException):
            ping_error_reports(self.server)

        self.assertTrue(get_unsent_errors.called)
        self.assertFalse(post.called)
        self.assertFalse(mark_errors_as_sent.called)
