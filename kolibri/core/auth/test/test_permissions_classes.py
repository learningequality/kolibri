from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.test import TestCase
from mock import Mock

from ..api import KolibriAuthPermissions
from ..models import Facility
from ..models import FacilityUser
from ..models import KolibriAnonymousUser
from ..permissions.base import BasePermissions
from ..permissions.general import AllowAll
from ..permissions.general import DenyAll
from .helpers import create_superuser


class BasePermissionsThrowExceptionsTestCase(TestCase):
    def setUp(self):
        self.facility = Facility.objects.create()
        self.object = object()  # shouldn't matter what the object is, for these tests
        self.facility_user = FacilityUser.objects.create(
            username="qqq", facility=self.facility
        )
        self.superuser = create_superuser(self.facility)
        self.anon_user = KolibriAnonymousUser()
        self.permissions = BasePermissions()

    def test_user_cannot_create(self):
        with self.assertRaises(NotImplementedError):
            self.assertFalse(
                self.permissions.user_can_create_object(self.facility_user, self.object)
            )
        with self.assertRaises(NotImplementedError):
            self.assertFalse(
                self.permissions.user_can_create_object(self.superuser, self.object)
            )
        with self.assertRaises(NotImplementedError):
            self.assertFalse(
                self.permissions.user_can_create_object(self.anon_user, self.object)
            )

    def test_user_cannot_read(self):
        with self.assertRaises(NotImplementedError):
            self.assertFalse(
                self.permissions.user_can_read_object(self.facility_user, self.object)
            )
        with self.assertRaises(NotImplementedError):
            self.assertFalse(
                self.permissions.user_can_read_object(self.superuser, self.object)
            )
        with self.assertRaises(NotImplementedError):
            self.assertFalse(
                self.permissions.user_can_read_object(self.anon_user, self.object)
            )

    def test_user_cannot_update(self):
        with self.assertRaises(NotImplementedError):
            self.assertFalse(
                self.permissions.user_can_update_object(self.facility_user, self.object)
            )
        with self.assertRaises(NotImplementedError):
            self.assertFalse(
                self.permissions.user_can_update_object(self.superuser, self.object)
            )
        with self.assertRaises(NotImplementedError):
            self.assertFalse(
                self.permissions.user_can_update_object(self.anon_user, self.object)
            )

    def test_user_cannot_delete(self):
        with self.assertRaises(NotImplementedError):
            self.assertFalse(
                self.permissions.user_can_delete_object(self.facility_user, self.object)
            )
        with self.assertRaises(NotImplementedError):
            self.assertFalse(
                self.permissions.user_can_delete_object(self.superuser, self.object)
            )
        with self.assertRaises(NotImplementedError):
            self.assertFalse(
                self.permissions.user_can_delete_object(self.anon_user, self.object)
            )


class TestBooleanOperationsOnPermissionClassesTestCase(TestCase):
    def setUp(self):
        self.facility = Facility.objects.create()
        self.obj = object()
        self.user = FacilityUser.objects.create(
            username="dummyuser", facility=self.facility
        )
        self.queryset = FacilityUser.objects.all()

    def assertAllowAll(self, perms, test_filtering=True):
        self.assertTrue(perms.user_can_create_object(self.user, self.obj))
        self.assertTrue(perms.user_can_read_object(self.user, self.obj))
        self.assertTrue(perms.user_can_update_object(self.user, self.obj))
        self.assertTrue(perms.user_can_delete_object(self.user, self.obj))
        if test_filtering:
            self.assertSetEqual(
                set(self.queryset),
                set(perms.readable_by_user_filter(self.user, self.queryset)),
            )

    def assertDenyAll(self, perms, test_filtering=True):
        self.assertFalse(perms.user_can_create_object(self.user, self.obj))
        self.assertFalse(perms.user_can_read_object(self.user, self.obj))
        self.assertFalse(perms.user_can_update_object(self.user, self.obj))
        self.assertFalse(perms.user_can_delete_object(self.user, self.obj))
        if test_filtering:
            self.assertEqual(
                len(perms.readable_by_user_filter(self.user, self.queryset)), 0
            )

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
        self.assertAllowAll(AllowAll() | BasePermissions(), test_filtering=False)

    def test_and_is_shortcircuited_for_efficiency(self):
        self.assertDenyAll(DenyAll() & BasePermissions(), test_filtering=False)

    def test_or_is_not_shortcircuited_inappropriately(self):
        with self.assertRaises(NotImplementedError):
            self.assertAllowAll(BasePermissions() | AllowAll())

    def test_and_is_not_shortcircuited_inappropriately(self):
        with self.assertRaises(NotImplementedError):
            self.assertDenyAll(BasePermissions() & DenyAll())


class KolibriAuthPermissionsTestCase(TestCase):
    def test_bad_request_method(self):
        request = Mock(method="BADWOLF")
        view = Mock()
        obj = Mock()
        perm_obj = KolibriAuthPermissions()
        self.assertFalse(perm_obj.has_object_permission(request, view, obj))
