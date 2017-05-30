"""
Tests for `kolibri` module.
"""
from __future__ import absolute_import, print_function, unicode_literals

import logging

from kolibri.utils.cli import main

from .base import KolibriTestBase

logger = logging.getLogger(__name__)


class TestKolibriCLI(KolibriTestBase):

    def test_cli(self):
        logger.debug("This is a unit test in the main Kolibri app space")
        # Test the -h
        with self.assertRaises(SystemExit):
            main("-h")
