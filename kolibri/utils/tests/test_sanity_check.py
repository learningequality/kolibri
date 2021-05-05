import sys
import tempfile

from django.db.utils import OperationalError
from django.test import TestCase
from mock import patch

from kolibri.utils import sanity_checks
from kolibri.utils.sanity_checks import DatabaseNotMigrated
from kolibri.utils.tests.helpers import override_option


class SanityCheckTestCase(TestCase):
    @patch("kolibri.utils.sanity_checks.logging.error")
    @override_option(
        "Paths", "CONTENT_DIR", "Z:\\NOTREAL" if sys.platform == "win32" else "/dir_dne"
    )
    def test_content_dir_dne(self, logging_mock):
        with self.assertRaises(SystemExit):
            sanity_checks.check_content_directory_exists_and_writable()
            logging_mock.assert_called()

    @patch("kolibri.utils.sanity_checks.logging.error")
    @patch("kolibri.utils.sanity_checks.os.access", return_value=False)
    @override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
    def test_content_dir_not_writable(self, access_mock, logging_mock):
        with self.assertRaises(SystemExit):
            sanity_checks.check_content_directory_exists_and_writable()
            logging_mock.assert_called()

    @patch("kolibri.utils.sanity_checks.shutil.move")
    @patch(
        "kolibri.utils.sanity_checks.os.path.exists",
        # This requires an additional return value at the end
        # to prevent a StopIteration exception during test
        # execution, but the first three values are the ones
        # that make the difference to the assert count below.
        side_effect=[True, False, True, False],
    )
    def test_old_log_file_exists(self, path_exists_mock, move_mock):
        sanity_checks.check_log_file_location()
        # Check if the number of calls to shutil.move equals to the number of times
        # os.path.exists returns True
        self.assertEqual(move_mock.call_count, 2)

    def test_check_database_is_migrated(self):
        from morango.models import InstanceIDModel

        with patch.object(
            InstanceIDModel, "get_or_create_current_instance"
        ) as get_or_create_current_instance:
            get_or_create_current_instance.side_effect = OperationalError("Test")
            with self.assertRaises(DatabaseNotMigrated):
                sanity_checks.check_database_is_migrated()
