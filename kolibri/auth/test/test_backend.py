from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

from kolibri.auth.models import FacilityUser, DeviceOwner, Facility
from kolibri.auth.backends import DeviceOwnerBackend, FacilityUserBackend


class DeviceOwnerBackendTestCase(TestCase):
    def setUp(self):
        self.facility = Facility.objects.create()
        user = self.user = FacilityUser(username="Mike", facility=self.facility)
        user.set_password("foo")
        user.save()

        do = self.do = DeviceOwner(username="Chuck")
        do.set_password("foobar")
        do.save()

    def test_facility_user_not_authenticated(self):
        self.assertIsNone(DeviceOwnerBackend().authenticate(username="Mike", password="foo"))

    def test_device_owner_authenticated(self):
        self.assertEqual(self.do, DeviceOwnerBackend().authenticate(username="Chuck", password="foobar"))

    def test_get_device_owner(self):
        self.assertEqual(self.do, DeviceOwnerBackend().get_user(self.do.id))

    def test_nonexistent_user_returns_none(self):
        self.assertIsNone(DeviceOwnerBackend().get_user(4756))

    def test_perms_sanity(self):
        """
        DeviceOwnerBackend has very simple permissions -- True for DeviceOwners, otherwise False!
        """
        db = DeviceOwnerBackend()
        self.assertTrue(db.has_perm(self.do, "foo"))
        self.assertTrue(db.has_module_perms(self.do, "foo"))
        self.assertFalse(db.has_perm(self.user, "foo"))
        self.assertFalse(db.has_module_perms(self.user, "foo"))

    def test_authenticate_nonexistent_user_returns_none(self):
        self.assertIsNone(DeviceOwnerBackend().authenticate("foo", "bar"))

    def test_authenticate_with_wrong_password_returns_none(self):
        self.assertIsNone(DeviceOwnerBackend().authenticate("Chuck", "goo"))


class FacilityUserBackendTestCase(TestCase):
    def setUp(self):
        self.facility = Facility.objects.create()
        user = self.user = FacilityUser(username="Mike", facility=self.facility)
        user.set_password("foo")
        user.save()

        do = self.do = DeviceOwner(username="Chuck")
        do.set_password("foobar")
        do.save()

    def test_facility_user_authenticated(self):
        self.assertEqual(self.user, FacilityUserBackend().authenticate(username="Mike", password="foo", facility=self.facility))

    def test_facility_user_authentication_requires_facility(self):
        self.assertIsNone(FacilityUserBackend().authenticate(username="Mike", password="foo"))

    def test_device_owner_not_authenticated(self):
        self.assertIsNone(FacilityUserBackend().authenticate(username="Chuck", password="foobar"))

    def test_get_facility_user(self):
        self.assertEqual(self.user, FacilityUserBackend().get_user(self.user.id))

    def test_nonexistent_user_returns_none(self):
        self.assertIsNone(FacilityUserBackend().get_user(4756))

    def test_authenticate_nonexistent_user_returns_none(self):
        self.assertIsNone(FacilityUserBackend().authenticate("foo", "bar"))

    def test_authenticate_with_wrong_password_returns_none(self):
        self.assertIsNone(FacilityUserBackend().authenticate("Mike", "goo"))
