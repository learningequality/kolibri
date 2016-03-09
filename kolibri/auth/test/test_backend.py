from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

from kolibri.auth.models import FacilityUser, DeviceOwner, FacilityDataset
from kolibri.auth.backends import DeviceBackend, FacilityBackend


class DeviceBackendTestCase(TestCase):
    def setUp(self):
        self.dataset = FacilityDataset.objects.create()
        user = self.user = FacilityUser(username="Mike", dataset=self.dataset)
        user.set_password("foo")
        user.save()

        do = self.do = DeviceOwner(username="Chuck")
        do.set_password("foobar")
        do.save()

    def test_facility_user_not_authenticated(self):
        self.assertIsNone(DeviceBackend().authenticate(username="Mike", password="foo"))

    def test_device_owner_authenticated(self):
        self.assertEqual(self.do, DeviceBackend().authenticate(username="Chuck", password="foobar"))

    def test_get_facility_user(self):
        self.assertIsNone(DeviceBackend().get_user(self.user.id))

    def test_get_device_owner(self):
        self.assertEqual(self.do, DeviceBackend().get_user(self.do.id))

    def test_nonexistent_user_returns_none(self):
        self.assertIsNone(DeviceBackend().get_user(4756))

    def test_perms_sanity(self):
        """
        DeviceBackend has very simple permissions -- True for DeviceOwners, otherwise False!
        """
        db = DeviceBackend()
        self.assertTrue(db.has_perm(self.do, "foo"))
        self.assertTrue(db.has_module_perms(self.do, "foo"))
        self.assertFalse(db.has_perm(self.user, "foo"))
        self.assertFalse(db.has_module_perms(self.user, "foo"))

    def test_authenticate_nonexistent_user_returns_none(self):
        self.assertIsNone(DeviceBackend().authenticate("foo", "bar"))

    def test_authenticate_with_wrong_password_returns_none(self):
        self.assertIsNone(DeviceBackend().authenticate("Chuck", "goo"))


class FacilityBackendTestCase(TestCase):
    def setUp(self):
        self.dataset = FacilityDataset.objects.create()
        user = self.user = FacilityUser(username="Mike", dataset=self.dataset)
        user.set_password("foo")
        user.save()

        do = self.do = DeviceOwner(username="Chuck")
        do.set_password("foobar")
        do.save()

    def test_facility_user_authenticated(self):
        self.assertEqual(self.user, FacilityBackend().authenticate(username="Mike", password="foo"))

    def test_device_owner_not_authenticated(self):
        self.assertIsNone(FacilityBackend().authenticate(username="Chuck", password="foobar"))

    def test_get_facility_user(self):
        self.assertEqual(self.user, FacilityBackend().get_user(self.user.id))

    def test_get_device_owner(self):
        self.assertIsNone(FacilityBackend().get_user(self.do.id))

    def test_nonexistent_user_returns_none(self):
        self.assertIsNone(FacilityBackend().get_user(4756))

    def test_authenticate_nonexistent_user_returns_none(self):
        self.assertIsNone(FacilityBackend().authenticate("foo", "bar"))

    def test_authenticate_with_wrong_password_returns_none(self):
        self.assertIsNone(FacilityBackend().authenticate("Mike", "goo"))
