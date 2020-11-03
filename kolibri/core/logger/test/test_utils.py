from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.test import TestCase

from ..utils.data import bytes_for_humans


class BytesForHumans(TestCase):
    def test_bytes(self):
        self.assertEqual("132B", bytes_for_humans(132))

    def test_kilobytes(self):
        self.assertEqual("242.10KB", bytes_for_humans(242.1 * 1024))

    def test_megabytes(self):
        self.assertEqual("377.10MB", bytes_for_humans(377.1 * 1024 * 1024))

    def test_gigabytes(self):
        self.assertEqual("421.50GB", bytes_for_humans(421.5 * 1024 * 1024 * 1024))

    def test_terabytes(self):
        self.assertEqual("555.00TB", bytes_for_humans(555 * 1024 * 1024 * 1024 * 1024))

    def test_petabytes(self):
        self.assertEqual(
            "611.77PB", bytes_for_humans(611.77 * 1024 * 1024 * 1024 * 1024 * 1024)
        )
