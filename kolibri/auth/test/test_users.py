from __future__ import absolute_import, print_function, unicode_literals

# from django.db.utils import IntegrityError
from django.test import TestCase

from kolibri.auth.models import DeviceOwner, FacilityDataset, FacilityUser  # , KolibriValidationError


class UserSanityTestCase(TestCase):
    """
    Sanity checks basic functionality of user models.
    """
    def setUp(self):
        self.dataset = FacilityDataset.objects.create()
        self.user = FacilityUser.objects.create(
            username="mike",
            first_name="Mike",
            last_name="Gallaspy",
            password="###",
            dataset=self.dataset
        )
        self.do = DeviceOwner.objects.create(
            username="bar",
            password="###",
        )

    def test_facility_user(self):
        self.assertFalse(self.user.is_device_owner())

    def test_device_owner(self):
        self.assertTrue(self.do.is_device_owner())

    def test_short_name(self):
        self.assertEqual(self.user.get_short_name(), "Mike")

    def test_full_name(self):
        self.assertEqual(self.user.get_full_name(), "Mike Gallaspy")
