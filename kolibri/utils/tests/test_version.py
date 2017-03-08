"""
Tests for `kolibri` module.
"""
from __future__ import absolute_import, print_function, unicode_literals

import kolibri
from kolibri.utils.version import get_version

from .base import KolibriTestBase


class TestKolibriVersion(KolibriTestBase):

    def test_version(self):
        """
        Test that the major version is set as expected
        """
        version_instance = get_version('kolibri', __file__)
        self.assertIn(version_instance.major_version, kolibri.__version__)
