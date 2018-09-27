import portend
from django.test import TestCase
from mock import patch

from kolibri.utils import cli
from kolibri.utils.server import NotRunning


class SanityCheckTestCase(TestCase):
    @patch('kolibri.utils.sanity_checks.logging.error')
    @patch('kolibri.utils.sanity_checks.get_status', return_value={1, 2, 3})
    def test_other_kolibri_running(self, status_mock, logging_mock):
        with self.assertRaises(SystemExit):
            cli.main({'start': True})
            logging_mock.assert_called()

    @patch('kolibri.utils.sanity_checks.logging.error')
    @patch('kolibri.utils.sanity_checks.portend.free')
    @patch('kolibri.utils.sanity_checks.get_status')
    def test_port_occupied(self, status_mock, portend_mock, logging_mock):
        status_mock.side_effect = NotRunning('Kolibri not running')
        portend_mock.side_effect = portend.Timeout
        with self.assertRaises(SystemExit):
            cli.main({'start': True})
            logging_mock.assert_called()

    @patch('kolibri.utils.sanity_checks.logging.error')
    @patch('kolibri.utils.sanity_checks.os.path.exists', return_value=False)
    def test_content_dir_dne(self, path_mock, logging_mock):
        with self.assertRaises(SystemExit):
            cli.main({'start': True})
            logging_mock.assert_called()

    @patch('kolibri.utils.sanity_checks.logging.error')
    @patch('kolibri.utils.sanity_checks.os.access', return_value=False)
    @patch('kolibri.utils.sanity_checks.os.path.exists', return_value=True)
    def test_content_dir_writable(self, path_exists_mock, access_mock, logging_mock):
        with self.assertRaises(SystemExit):
            cli.main({'start': True})
            logging_mock.assert_called
