from unittest.mock import patch

from django.test import TestCase

from kolibri.core.discovery.utils.network.errors import NetworkLocationConnectionFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseTimeout


@patch("kolibri.core.errorreports.tasks.client.post")
@patch("kolibri.core.errorreports.tasks.ErrorReports.get_unsent_errors")
@patch("kolibri.core.errorreports.tasks.markErrorsAsSent")
class PingErrorReportsTestCase(TestCase):
    def test_ping_error_reports(self, markErrorsAsSent, get_unsent_errors, post):
        from kolibri.core.errorreports.tasks import ping_error_reports

        ping_error_reports()

        self.assertTrue(get_unsent_errors.called)
        self.assertTrue(post.called)
        self.assertTrue(markErrorsAsSent.called)

    def test_ping_error_reports_connection_error(
        self, markErrorsAsSent, get_unsent_errors, post
    ):
        from kolibri.core.errorreports.tasks import ping_error_reports

        get_unsent_errors.side_effect = NetworkLocationConnectionFailure

        with self.assertRaises(NetworkLocationConnectionFailure):
            ping_error_reports()

        self.assertTrue(get_unsent_errors.called)
        self.assertFalse(post.called)
        self.assertFalse(markErrorsAsSent.called)

    def test_ping_error_reports_timeout(
        self, markErrorsAsSent, get_unsent_errors, post
    ):
        from kolibri.core.errorreports.tasks import ping_error_reports

        get_unsent_errors.side_effect = NetworkLocationResponseTimeout

        with self.assertRaises(NetworkLocationResponseTimeout):
            ping_error_reports()

        self.assertTrue(get_unsent_errors.called)
        self.assertFalse(post.called)
        self.assertFalse(markErrorsAsSent.called)

    def test_ping_error_reports_response_failure(
        self, markErrorsAsSent, get_unsent_errors, post
    ):
        from kolibri.core.errorreports.tasks import ping_error_reports

        get_unsent_errors.side_effect = NetworkLocationResponseFailure

        with self.assertRaises(NetworkLocationResponseFailure):
            ping_error_reports()

        self.assertTrue(get_unsent_errors.called)
        self.assertFalse(post.called)
        self.assertFalse(markErrorsAsSent.called)
