"""
Tests for `kolibri` module.
"""
import os
import shutil
import tempfile
import unittest

from kolibri.logger import test_logger

logger = test_logger


from kolibri.utils.cli import main


class TestKolibriCLI(unittest.TestCase):

    @classmethod
    def setup_class(cls):
        os.environ["KOLIBRI_HOME"] = tempfile.mkdtemp()

    def test_cli(self):
        logger.debug("This is a unit test in the main Kolibri app space")
        # Test the -h
        with self.assertRaises(SystemExit):
            main("-h")

    def test_plugin_cli(self):
        main(("plugin", "kolibri.plugins.example_plugin", "enable"))
        main(("plugin", "kolibri.plugins.example_plugin", "disable"))

    @classmethod
    def teardown_class(cls):
        shutil.rmtree(os.environ["KOLIBRI_HOME"])
