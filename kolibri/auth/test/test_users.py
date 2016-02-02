from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

# Importing user models here results in a circular import... you should use get_user_model, but then there's no
# way to get the proxy models as well. So just import at runtime.


class UserProxyManagerTestCase(TestCase):
    """
    Checks that the BaseUser proxy models' default manager returns appropriate instances.
    """
    def setUp(self):
        from kolibri.auth.models import FacilityUser, DeviceOwner
        self.user = FacilityUser.objects.create(username="mike", first_name="Mike", last_name="Gallaspy")
        self.user = FacilityUser.objects.create(username="brian", first_name="Brian", last_name="Gallaspy")
        self.fu_usernames = ["mike", "brian"]
        self.do = DeviceOwner.objects.create(username="bar")
        self.do_usernames = ["bar"]

    def test_facility_user_manager_returns_facility_users(self):
        from kolibri.auth.models import FacilityUser, BaseUser
        base_users = BaseUser.objects.filter(username__in=self.fu_usernames)
        facility_users = FacilityUser.objects.all()
        self.assertEqual(len(base_users), len(facility_users))

    def test_fu_set_correct(self):
        """ continuation of test_facility_user_manager_returns_facility_users """
        from kolibri.auth.models import FacilityUser, BaseUser
        base_users = BaseUser.objects.filter(username__in=self.fu_usernames)
        facility_users = FacilityUser.objects.all()
        self.assertListEqual(sorted([u.id for u in base_users]), sorted([u.id for u in facility_users]))

    def test_device_owner_manager_returns_device_owners(self):
        from kolibri.auth.models import DeviceOwner, BaseUser
        base_users = BaseUser.objects.filter(username__in=self.do_usernames)
        device_owners = DeviceOwner.objects.all()
        self.assertEqual(len(base_users), len(device_owners))

    def test_do_set_correct(self):
        """ continuation of test_device_owner_manager_returns_device_owners """
        from kolibri.auth.models import DeviceOwner, BaseUser
        base_users = BaseUser.objects.filter(username__in=self.do_usernames)
        device_owners = DeviceOwner.objects.all()
        self.assertListEqual(sorted([u.id for u in base_users]), sorted([u.id for u in device_owners]))


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

    def test_cant_change_is_device_owner_for_do(self):
        from kolibri.auth.models import KolibriValidationError
        with self.assertRaises(KolibriValidationError):
            self.do._is_device_owner = False
            self.do.save()

    def test_cant_change_is_device_owner_for_fu(self):
        from kolibri.auth.models import KolibriValidationError
        with self.assertRaises(KolibriValidationError):
            self.user._is_device_owner = True
            self.user.save()

    def test_not_changing_is_device_owner_ok(self):
        """
        We don't prevent someone from accessing the "private" _is_device_owner field, just saving it.
        This shouldn't raise any errors.
        """
        self.user._is_device_owner = False
        self.user.save()
        self.do._is_device_owner = True
        self.do.save()
