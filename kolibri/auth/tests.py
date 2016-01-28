from django.test import TestCase

from kolibri.auth.models import BaseUser, FacilityUser, DeviceOwner


class UserSanityTestCase(TestCase):
    """
    Sanity checks basic functionality of user models.
    """

    def test_facility_user(self):
        with self.assertRaises(NotImplementedError):
            BaseUser().is_device_owner()

    def test_base_user(self):
        self.assertFalse(FacilityUser(username="foo").is_device_owner())

    def test_device_admin(self):
        self.assertTrue(DeviceOwner(username="bar").is_device_owner())

    def test_short_name(self):
        self.assertEqual(FacilityUser(username="mike", first_name="Mike", last_name="Gallaspy").get_short_name(),
                         "Mike")

    def test_full_name(self):
        self.assertEqual(FacilityUser(username="mike", first_name="Mike", last_name="Gallaspy").get_full_name(),
                         "Mike Gallaspy")
