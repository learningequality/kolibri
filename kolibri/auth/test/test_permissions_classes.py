from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

from .dummy_permissions_classes import ThrowExceptions

from ..models import FacilityUser, DeviceOwner, Facility
from ..permissions.base import BasePermissions
from ..permissions.general import AllowAll, DenyAll

class BasePermissionsThrowExceptionsTestCase(TestCase):

    def setUp(self):
        self.facility = Facility.objects.create()
        self.object = object()  # shouldn't matter what the object is, for these tests
        self.facility_user = FacilityUser.objects.create(username="qqq", facility=self.facility)
        self.device_owner = DeviceOwner.objects.create(username="zzz")
        self.permissions = BasePermissions()

    def test_user_cannot_create(self):
        with self.assertRaises(NotImplementedError):
            self.assertFalse(self.permissions.user_can_create_object(self.facility_user, self.object))
        with self.assertRaises(NotImplementedError):
            self.assertFalse(self.permissions.user_can_create_object(self.device_owner, self.object))

    def test_user_cannot_read(self):
        with self.assertRaises(NotImplementedError):
            self.assertFalse(self.permissions.user_can_read_object(self.facility_user, self.object))
        with self.assertRaises(NotImplementedError):
            self.assertFalse(self.permissions.user_can_read_object(self.device_owner, self.object))

    def test_user_cannot_update(self):
        with self.assertRaises(NotImplementedError):
            self.assertFalse(self.permissions.user_can_update_object(self.facility_user, self.object))
        with self.assertRaises(NotImplementedError):
            self.assertFalse(self.permissions.user_can_update_object(self.device_owner, self.object))

    def test_user_cannot_delete(self):
        with self.assertRaises(NotImplementedError):
            self.assertFalse(self.permissions.user_can_delete_object(self.facility_user, self.object))
        with self.assertRaises(NotImplementedError):
            self.assertFalse(self.permissions.user_can_delete_object(self.device_owner, self.object))


class TestBooleanOperationsOnPermissionClassesTestCase(TestCase):

    def setUp(self):
        self.facility = Facility.objects.create()
        self.obj = object()
        self.user = FacilityUser.objects.create(username='dummyuser', facility=self.facility)
        self.queryset = FacilityUser.objects.all()

    def assertAllowAll(self, perms, test_filtering=True):
        self.assertTrue(perms.user_can_create_object(self.user, self.obj))
        self.assertTrue(perms.user_can_read_object(self.user, self.obj))
        self.assertTrue(perms.user_can_update_object(self.user, self.obj))
        self.assertTrue(perms.user_can_delete_object(self.user, self.obj))
        if test_filtering:
            self.assertSetEqual(set(self.queryset), set(perms.readable_by_user_filter(self.user, self.queryset)))

    def assertDenyAll(self, perms, test_filtering=True):
        self.assertFalse(perms.user_can_create_object(self.user, self.obj))
        self.assertFalse(perms.user_can_read_object(self.user, self.obj))
        self.assertFalse(perms.user_can_update_object(self.user, self.obj))
        self.assertFalse(perms.user_can_delete_object(self.user, self.obj))
        if test_filtering:
            self.assertEqual(len(perms.readable_by_user_filter(self.user, self.queryset)), 0)

    def test_allow_or_allow(self):
        self.assertAllowAll(AllowAll() | AllowAll())

    def test_allow_or_deny(self):
        self.assertAllowAll(AllowAll() | DenyAll())

    def test_deny_or_allow(self):
        self.assertAllowAll(DenyAll() | AllowAll())

    def test_deny_or_deny(self):
        self.assertDenyAll(DenyAll() | DenyAll())

    def test_allow_and_allow(self):
        self.assertAllowAll(AllowAll() & AllowAll())

    def test_allow_and_deny(self):
        self.assertDenyAll(AllowAll() & DenyAll())

    def test_deny_and_allow(self):
        self.assertDenyAll(DenyAll() & AllowAll())

    def test_deny_and_deny(self):
        self.assertDenyAll(DenyAll() & DenyAll())

    def test_or_is_shortcircuited_for_efficiency(self):
        self.assertAllowAll(AllowAll() | ThrowExceptions(), test_filtering=False)

    def test_and_is_shortcircuited_for_efficiency(self):
        self.assertDenyAll(DenyAll() & ThrowExceptions(), test_filtering=False)

    def test_or_is_not_shortcircuited_inappropriately(self):
        with self.assertRaises(Exception):
            self.assertAllowAll(ThrowExceptions() | AllowAll())

    def test_and_is_not_shortcircuited_inappropriately(self):
        with self.assertRaises(Exception):
            self.assertDenyAll(ThrowExceptions() & DenyAll())
