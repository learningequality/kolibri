from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

# Importing user models here results in a circular import... you should use get_user_model, but then there's no
# way to get the proxy models as well. So just import at runtime.


class UserSanityTestCase(TestCase):
    """
    Sanity checks basic functionality of user models.
    """

    def test_facility_user(self):
        from kolibri.auth.models import BaseUser
        with self.assertRaises(NotImplementedError):
            BaseUser().is_device_owner()

    def test_base_user(self):
        from kolibri.auth.models import FacilityUser
        self.assertFalse(FacilityUser(username="foo").is_device_owner())

    def test_device_admin(self):
        from kolibri.auth.models import DeviceOwner
        self.assertTrue(DeviceOwner(username="bar").is_device_owner())

    def test_short_name(self):
        from kolibri.auth.models import FacilityUser
        self.assertEqual(FacilityUser(username="mike", first_name="Mike", last_name="Gallaspy").get_short_name(),
                         "Mike")

    def test_full_name(self):
        from kolibri.auth.models import FacilityUser
        self.assertEqual(FacilityUser(username="mike", first_name="Mike", last_name="Gallaspy").get_full_name(),
                         "Mike Gallaspy")
