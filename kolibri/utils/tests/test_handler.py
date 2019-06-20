import os
from time import sleep

from django.conf import settings
from django.test import TestCase
from mock import patch

from kolibri.utils import cli


class KolibriTimedRotatingFileHandlerTestCase(TestCase):
    def test_do_rollover(self):
        archive_dir = os.path.join(os.environ["KOLIBRI_HOME"], "logs", "archive")
        orig_value = settings.LOGGING["handlers"]["file"]["when"]

        # Temporarily set the rotation time of the log file to be every second
        settings.LOGGING["handlers"]["file"]["when"] = "s"
        # make sure that kolibri will be running for more than one second
        with patch("kolibri.utils.cli.apply_settings"):
            cli.main(["--skipupdate", "manage", "help"])
            sleep(1)
            cli.main(["--skipupdate", "manage", "help"])
        # change back to the original rotation time
        settings.LOGGING["handlers"]["file"]["when"] = orig_value

        self.assertNotEqual(os.listdir(archive_dir), [])
