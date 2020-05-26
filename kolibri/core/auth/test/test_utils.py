from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import uuid

import mock
from django.core.management.base import CommandError
from django.test import TestCase

from ..models import Facility
from kolibri.core.auth.management import utils


class GetFacilityTestCase(TestCase):
    """
    Tests getting facility or by ID.
    """

    def setUp(self):
        self.facility = Facility.objects.create(name="facility")

    def test_get_facility_with_id(self):
        self.assertEqual(
            self.facility, utils.get_facility(facility_id=self.facility.id)
        )

    def test_get_facility_with_non_existent_id(self):
        with self.assertRaisesRegexp(CommandError, "does not exist"):
            utils.get_facility(facility_id=uuid.uuid4().hex)

    def test_get_facility_with_no_id(self):
        self.assertEqual(self.facility, utils.get_facility())

    def test_get_facility_no_facilities(self):
        self.facility.delete()
        with self.assertRaisesRegexp(CommandError, "no facilities"):
            utils.get_facility()

    def test_get_facility_multiple_facilities_noninteractive(self):
        Facility.objects.create(name="facility2")
        with self.assertRaisesRegexp(CommandError, "multiple facilities"):
            utils.get_facility(noninteractive=True)

    @mock.patch("kolibri.core.auth.management.utils.input", return_value="3")
    def test_get_facility_multiple_facilities_interactive(self, input_mock):
        # Desired facility should be third item
        Facility.objects.create(name="a_facility")
        Facility.objects.create(name="b_facility")
        self.assertEqual(self.facility, utils.get_facility())


class BytesForHumans(TestCase):
    def test_bytes(self):
        self.assertEqual("132B", utils.bytes_for_humans(132))

    def test_kilobytes(self):
        self.assertEqual("242.10KB", utils.bytes_for_humans(242.1 * 1024))

    def test_megabytes(self):
        self.assertEqual("377.10MB", utils.bytes_for_humans(377.1 * 1024 * 1024))

    def test_gigabytes(self):
        self.assertEqual("421.50GB", utils.bytes_for_humans(421.5 * 1024 * 1024 * 1024))

    def test_terabytes(self):
        self.assertEqual(
            "555.00TB", utils.bytes_for_humans(555 * 1024 * 1024 * 1024 * 1024)
        )

    def test_petabytes(self):
        self.assertEqual(
            "611.77PB",
            utils.bytes_for_humans(611.77 * 1024 * 1024 * 1024 * 1024 * 1024),
        )
