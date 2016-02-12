from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

from kolibri.auth.models import FacilityUser, DeviceOwner, BaseUser, KolibriValidationError, Facility


class IsFacilityAdminTestCase(TestCase):
    def test_facility_admin_is_facility_admin(self):
        user = FacilityUser.objects.create(username="foo")
        facility = Facility.objects.create()
        facility.add_admin(user)
        self.assertTrue(user.is_facility_admin())

    def test_other_is_not_facility_admin(self):
        user = FacilityUser.objects.create(username="foo")
        self.assertFalse(user.is_facility_admin())

    def test_device_owner_is_not_facility_admin(self):
        user = DeviceOwner.objects.create(username='do')
        self.assertFalse(user.is_facility_admin())


class UserProxyManagerTestCase(TestCase):
    """
    Checks that the BaseUser proxy models' default manager returns appropriate instances.
    """
    def setUp(self):
        self.user = FacilityUser.objects.create(username="mike", first_name="Mike", last_name="Gallaspy")
        self.user = FacilityUser.objects.create(username="brian", first_name="Brian", last_name="Gallaspy")
        self.fu_usernames = ["mike", "brian"]
        self.do = DeviceOwner.objects.create(username="bar")
        self.do_usernames = ["bar"]

    def test_facility_user_manager_returns_facility_users(self):
        base_users = BaseUser.objects.filter(username__in=self.fu_usernames)
        facility_users = FacilityUser.objects.all()
        self.assertEqual(len(base_users), len(facility_users))

    def test_fu_set_correct(self):
        """ continuation of test_facility_user_manager_returns_facility_users """
        base_users = BaseUser.objects.filter(username__in=self.fu_usernames)
        facility_users = FacilityUser.objects.all()
        self.assertListEqual(sorted([u.id for u in base_users]), sorted([u.id for u in facility_users]))

    def test_device_owner_manager_returns_device_owners(self):
        base_users = BaseUser.objects.filter(username__in=self.do_usernames)
        device_owners = DeviceOwner.objects.all()
        self.assertEqual(len(base_users), len(device_owners))

    def test_do_set_correct(self):
        """ continuation of test_device_owner_manager_returns_device_owners """
        base_users = BaseUser.objects.filter(username__in=self.do_usernames)
        device_owners = DeviceOwner.objects.all()
        self.assertListEqual(sorted([u.id for u in base_users]), sorted([u.id for u in device_owners]))


class UserSanityTestCase(TestCase):
    """
    Sanity checks basic functionality of user models.
    """
    def setUp(self):
        self.user = FacilityUser.objects.create(username="mike", first_name="Mike", last_name="Gallaspy")
        self.do = DeviceOwner.objects.create(username="bar")

    def test_base_user(self):
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
        with self.assertRaises(KolibriValidationError):
            self.user._is_device_owner = True
            self.user.save()

    def test_cant_set_is_device_owner_for_device_owner(self):
        with self.assertRaises(KolibriValidationError):
            self.do._is_device_owner = False
            self.do.save()

    def test_cant_create_facility_user_with_is_device_owner_true(self):
        with self.assertRaises(KolibriValidationError):
            FacilityUser.objects.create(username="baz", _is_device_owner=True)

    def test_cant_create_device_owner_with_is_device_owner_false(self):
        with self.assertRaises(KolibriValidationError):
            DeviceOwner.objects.create(username="baz", _is_device_owner=False)

    def test_cant_change_is_device_owner_for_do(self):
        with self.assertRaises(KolibriValidationError):
            self.do._is_device_owner = False
            self.do.save()

    def test_cant_change_is_device_owner_for_fu(self):
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
