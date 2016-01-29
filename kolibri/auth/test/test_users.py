from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

# Importing user models here results in a circular import... you should use get_user_model, but then there's no
# way to get the proxy models as well. So just import at runtime.


class UserSanityTestCase(TestCase):
    """
    Sanity checks basic functionality of user models.
    """
    def setUp(self):
        from kolibri.auth.models import FacilityUser, DeviceOwner
        self.user = FacilityUser.objects.create(username="mike", first_name="Mike", last_name="Gallaspy")
        self.do = DeviceOwner.objects.create(username="bar")

    def test_base_user(self):
        from kolibri.auth.models import BaseUser
        with self.assertRaises(NotImplementedError):
            BaseUser().is_device_owner()

    def test_facility_user(self):
        self.assertFalse(self.user.is_device_owner())

    def test_device_admin(self):
        self.assertTrue(self.do.is_device_owner())

    def test_short_name(self):
        self.assertEqual(self.user.get_short_name(), "Mike")

    def test_full_name(self):
        self.assertEqual(self.user.get_full_name(), "Mike Gallaspy")

    def test_cant_set_is_device_owner_for_facility_user(self):
        from kolibri.auth.models import KolibriValidationError
        with self.assertRaises(KolibriValidationError):
            self.user._is_device_owner = True
            self.user.save()

    def test_cant_set_is_device_owner_for_device_owner(self):
        from kolibri.auth.models import KolibriValidationError
        with self.assertRaises(KolibriValidationError):
            self.do._is_device_owner = False
            self.do.save()

    def test_cant_create_facility_user_with_is_device_owner_true(self):
        from kolibri.auth.models import FacilityUser, KolibriValidationError
        with self.assertRaises(KolibriValidationError):
            FacilityUser.objects.create(username="baz", _is_device_owner=True)

    def test_cant_create_device_owner_with_is_device_owner_false(self):
        from kolibri.auth.models import DeviceOwner, KolibriValidationError
        with self.assertRaises(KolibriValidationError):
            DeviceOwner.objects.create(username="baz", _is_device_owner=False)
