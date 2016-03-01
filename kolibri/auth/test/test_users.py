from __future__ import absolute_import, print_function, unicode_literals

from django.db.utils import IntegrityError
from django.test import TestCase

from kolibri.auth.models import FacilityUser, DeviceOwner, BaseUser, KolibriValidationError, FacilityDataset


class IsDeviceOwnerTestCase(TestCase):

    def setUp(self):
        self.dataset = FacilityDataset.objects.create()

    def test_device_owner_is_device_owner(self):
        user = DeviceOwner.objects.create(username="foo")
        self.assertTrue(user.is_device_owner())

    def test_facility_user_is_not_device_owner(self):
        user = FacilityUser.objects.create(username="foo", dataset=self.dataset)
        self.assertFalse(user.is_device_owner())


class UserProxyManagerTestCase(TestCase):
    """
    Checks that the BaseUser proxy models' default manager returns appropriate instances.
    """
    def setUp(self):
        self.dataset = FacilityDataset.objects.create()
        self.fu_usernames = ["mike", "brian"]
        for username in self.fu_usernames:
            FacilityUser.objects.create(username=username, dataset=self.dataset)
        self.do_usernames = ["bar"]
        for username in self.do_usernames:
            DeviceOwner.objects.create(username=username)

    def test_facility_user_manager_returns_facility_users(self):
        facility_user = FacilityUser.objects.all()[0]
        self.assertIsInstance(facility_user, FacilityUser)

    def test_fu_set_correct(self):
        """ continuation of test_facility_user_manager_returns_facility_users """
        base_users = BaseUser.objects.filter(username__in=self.fu_usernames)
        facility_users = FacilityUser.objects.all()
        self.assertEqual(set([u.id for u in base_users]), set([u.id for u in facility_users]))

    def test_device_owner_manager_returns_device_owners(self):
        device_owner = DeviceOwner.objects.all()[0]
        self.assertIsInstance(device_owner, DeviceOwner)

    def test_do_set_correct(self):
        """ continuation of test_device_owner_manager_returns_device_owners """
        base_users = BaseUser.objects.filter(username__in=self.do_usernames)
        device_owners = DeviceOwner.objects.all()
        self.assertEqual(set([u.id for u in base_users]), set([u.id for u in device_owners]))


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

    def test_device_admin(self):
        self.assertTrue(self.do.is_device_owner())

    def test_short_name(self):
        self.assertEqual(self.user.get_short_name(), "Mike")

    def test_full_name(self):
        self.assertEqual(self.user.get_full_name(), "Mike Gallaspy")

    def test_cant_set_is_device_owner_for_facility_user(self):
        with self.assertRaises(KolibriValidationError):
            self.user._is_device_owner = True
            self.user.full_clean()

    def test_cant_set_is_device_owner_for_device_owner(self):
        with self.assertRaises(KolibriValidationError):
            self.do._is_device_owner = False
            self.do.full_clean()

    def test_cant_create_facility_user_with_is_device_owner_true(self):
        with self.assertRaises(IntegrityError):
            FacilityUser.objects.create(username="baz", _is_device_owner=True)

    def test_cant_create_device_owner_with_is_device_owner_false(self):
        do = DeviceOwner.objects.create(username="baz", _is_device_owner=False)
        self.assertTrue(do._is_device_owner)

    def test_not_changing_is_device_owner_ok(self):
        """
        We don't prevent someone from accessing the "private" _is_device_owner field, just saving it.
        This shouldn't raise any errors.
        """
        self.user._is_device_owner = False
        self.user.save()
        self.do._is_device_owner = True
        self.do.save()
