from __future__ import absolute_import, print_function, unicode_literals

# from django.db.utils import IntegrityError
from django.test import TestCase

from ..models import DeviceOwner, Facility, FacilityUser


class UserSanityTestCase(TestCase):
    """
    Sanity checks basic functionality of user models.
    """
    def setUp(self):
        self.facility = Facility.objects.create()
        self.user = FacilityUser.objects.create(
            username="mike",
            full_name="Mike Gallaspy",
            password="###",
            facility=self.facility,
        )
        self.do = DeviceOwner.objects.create(
            username="bar",
            password="###",
        )

    def test_facility_user(self):
        self.assertFalse(self.user.is_superuser)

    def test_device_owner(self):
        self.assertTrue(self.do.is_superuser)

    def test_short_name(self):
        self.assertEqual(self.user.get_short_name(), "Mike")
