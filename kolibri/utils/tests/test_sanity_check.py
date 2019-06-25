import tempfile

import portend
from django.test import TestCase
from mock import patch

from kolibri.utils import cli
from kolibri.utils.server import NotRunning
from kolibri.utils.tests.helpers import override_option


class SanityCheckTestCase(TestCase):
    @patch("kolibri.utils.sanity_checks.logging.error")
    @patch("kolibri.utils.sanity_checks.get_status", return_value={1, 2, 3})
    def test_other_kolibri_running(self, status_mock, logging_mock):
        with self.assertRaises(SystemExit):
            cli.main(["start"])
            logging_mock.assert_called()

    @patch("kolibri.utils.sanity_checks.logging.error")
    @patch("kolibri.utils.sanity_checks.portend.free")
    @patch("kolibri.utils.sanity_checks.get_status")
    def test_port_occupied(self, status_mock, portend_mock, logging_mock):
        status_mock.side_effect = NotRunning("Kolibri not running")
        portend_mock.side_effect = portend.Timeout
        with self.assertRaises(SystemExit):
            cli.main(["start"])
            logging_mock.assert_called()

    @patch("kolibri.utils.sanity_checks.logging.error")
    @override_option("Paths", "CONTENT_DIR", "/dir_dne")
    def test_content_dir_dne(self, logging_mock):
        with self.assertRaises(SystemExit):
            cli.main({"start": True})
            logging_mock.assert_called()

    @patch("kolibri.utils.sanity_checks.logging.error")
    @patch("kolibri.utils.sanity_checks.os.access", return_value=False)
    @override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
    def test_content_dir_not_writable(self, access_mock, logging_mock):
        with self.assertRaises(SystemExit):
            cli.main(["start"])
            logging_mock.assert_called()

    @patch("kolibri.utils.cli.initialize")
    @patch("kolibri.utils.sanity_checks.shutil.move")
    @patch(
        "kolibri.utils.sanity_checks.os.path.exists", side_effect=[False, True, True]
    )
    def test_old_log_file_exists(self, path_exists_mock, move_mock, initialize_mock):
        cli.main(["language", "setdefault", "en"])
        # Check if the number of calls to shutil.move equals to the number of times
        # os.path.exists returns True
        self.assertEqual(move_mock.call_count, 2)
