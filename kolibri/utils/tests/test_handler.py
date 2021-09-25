import os
import shutil
import tempfile
from time import sleep

from django.conf import settings
from django.test import TestCase
from mock import patch

from kolibri.utils import cli
from kolibri.utils.logger import KolibriTimedRotatingFileHandler


class KolibriTimedRotatingFileHandlerTestCase(TestCase):
    # Mock this function to avoid calling the logger in a way that prevents the archive
    @patch("kolibri.utils.main._upgrades_before_django_setup")
    def test_do_rollover(self, upgrades_mock):
        archive_dir = os.path.join(os.environ["KOLIBRI_HOME"], "logs", "archive")
        orig_value = settings.LOGGING["handlers"]["file"]["when"]

        # Temporarily set the rotation time of the log file to be every second
        settings.LOGGING["handlers"]["file"]["when"] = "s"
        # make sure that kolibri will be running for more than one second
        try:
            cli.main(["manage", "--skip-update", "help"])
        except SystemExit:
            pass
        sleep(1)
        try:
            cli.main(["manage", "--skip-update", "help"])
        except SystemExit:
            pass
        # change back to the original rotation time
        settings.LOGGING["handlers"]["file"]["when"] = orig_value

        self.assertNotEqual(os.listdir(archive_dir), [])

    def test_getFilesToDelete(self):
        temp_dir = tempfile.mkdtemp()
        file_handle, log_file = tempfile.mkstemp(suffix=".txt", dir=temp_dir)
        os.close(file_handle)
        handler = KolibriTimedRotatingFileHandler(log_file, backupCount=3, when="s")
        sleep(1)
        handler.doRollover()
        sleep(1)
        handler.doRollover()
        sleep(1)
        handler.doRollover()
        sleep(1)
        handler.doRollover()
        self.assertEqual(len(handler.getFilesToDelete()), 1)
        try:
            os.remove(log_file)
        except OSError:
            pass
        shutil.rmtree(temp_dir, ignore_errors=True)
