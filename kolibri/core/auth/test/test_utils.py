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

    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="facility")

    def test_get_facility_with_id(self):
        self.assertEqual(
            self.facility, utils.get_facility(facility_id=self.facility.id)
        )

    def test_get_facility_with_non_existent_id(self):
        with self.assertRaisesRegexp(CommandError, "does not exist"):
            utils.get_facility(facility_id=uuid.uuid4().hex)

    def test_get_facility_with_no_id(self):
        self.assertEqual(self.facility, utils.get_facility())

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


class GetFacilityFailureTestCase(TestCase):
    def test_get_facility_no_facilities(self):
        with self.assertRaisesRegexp(CommandError, "no facilities"):
            utils.get_facility()
