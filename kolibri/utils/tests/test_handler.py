import os
from time import sleep

from django.conf import settings
from django.test import TestCase

from kolibri.utils import cli


class KolibriTimedRotatingFileHandlerTestCase(TestCase):
    def test_do_rollover(self):
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
