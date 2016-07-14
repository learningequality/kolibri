"""
Tests for `kolibri` module.
"""
from __future__ import absolute_import, print_function, unicode_literals

import logging
import os
import shutil
import tempfile

from kolibri.utils.cli import main

from .base import KolibriTestBase

logger = logging.getLogger(__name__)


class TestKolibriCLI(KolibriTestBase):

    @classmethod
    def setup_class(cls):
        os.environ["KOLIBRI_HOME"] = tempfile.mkdtemp()

    def test_cli(self):
        logger.debug("This is a unit test in the main Kolibri app space")
        # Test the -h
        with self.assertRaises(SystemExit):
            main("-h")

    @classmethod
    def teardown_class(cls):
        try:
            shutil.rmtree(os.environ["KOLIBRI_HOME"])
        except WindowsError as e:
            logger.debug("Couldn't delete temporary file because\n\t" + str(e))
