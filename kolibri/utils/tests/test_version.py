"""
Tests for `kolibri` module.
"""
from __future__ import absolute_import, print_function, unicode_literals

import kolibri

from .base import KolibriTestBase


class TestKolibriVersion(KolibriTestBase):

    def test_version(self):
        """
        Test that the major version is set as expected
        """
        major_version = ".".join(map(str, kolibri.VERSION[:2]))
        self.assertIn(major_version, kolibri.__version__)
