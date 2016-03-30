from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

from .dummy_permissions_classes import ThrowExceptions
from .dummy_test_models import DummyUserLogModel, DummyFacilitySettingModel

from ..models import FacilityUser, DeviceOwner, Facility
from ..base_permissions import BasePermissions, AllowAll, DenyAll


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
        self.obj = object()
        self.user = FacilityUser.objects.create(username='dummyuser')
        self.queryset = FacilityUser.objects.all()

    def assertAllowAll(self, perms):
        self.assertTrue(perms.user_can_create_object(self.user, self.obj))
        self.assertTrue(perms.user_can_read_object(self.user, self.obj))
        self.assertTrue(perms.user_can_update_object(self.user, self.obj))
        self.assertTrue(perms.user_can_delete_object(self.user, self.obj))
        self.assertSetEqual(self.queryset, perms.readable_by_user_filter(self.user, self.queryset))

    def assertDenyAll(self, perms):
        self.assertTrue(perms.user_can_create_object(self.user, self.obj))
        self.assertTrue(perms.user_can_read_object(self.user, self.obj))
        self.assertTrue(perms.user_can_update_object(self.user, self.obj))
        self.assertTrue(perms.user_can_delete_object(self.user, self.obj))
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
        self.assertAllowAll(AllowAll() | ThrowExceptions())

    def test_and_is_shortcircuited_for_efficiency(self):
        self.assertDenyAll(DenyAll() & ThrowExceptions())

    def test_or_is_not_shortcircuited_inappropriately(self):
        with self.assertRaises(Exception):
            self.assertAllowAll(ThrowExceptions() | AllowAll())

    def test_and_is_not_shortcircuited_inappropriately(self):
        with self.assertRaises(Exception):
            self.assertDenyAll(ThrowExceptions() & DenyAll())


class DummyDataMixin(object):

    def setUp(self):

        self.data1 = self.create_dummy_facility_data()
        self.learner1 = self.data1["learners_one_group"][0][0][0]
        self.learner1other = self.data1["learners_one_group"][0][0][1]
        self.admin1 = self.data1["facilityadmin"]
        self.coach1 = self.data1["coaches"][0]
        self.coach1other = self.data1["coaches"][1]

        self.data2 = self.create_dummy_facility_data()
        self.learner2 = self.data2["learners_one_group"][0][0][0]
        self.admin2 = self.data2["facilityadmin"]
        self.coach2 = self.data2["coaches"][0]

        self.device_owner = DeviceOwner.objects.create(username="blooh", password="#")


class DummyModelPermissionsTestCase(DummyDataMixin, TestCase):

    def test_dummy_user_log_permissions(self):
        # create a dummy log record (without saving it)
        log1 = DummyUserLogModel(user=self.learner1)

        # check that everyone who should be able to read it can read it
        for user in [self.learner1, self.admin1, self.coach1, self.device_owner]:
            self.assertTrue(log1.user_can_read(user))
        # check that everyone who shouldn't be able to read it cannot
        for user in [self.learner1other, self.coach1other, self.learner2, self.admin2, self.coach2]:
            self.assertFalse(log1.user_can_read(user))

        # check that everyone who should be able to write it can write it
        for user in [self.learner1, self.admin1, self.device_owner]:
            self.assertTrue(log1.user_can_create(user))
            self.assertTrue(log1.user_can_update(user))
            self.assertTrue(log1.user_can_delete(user))
        # check that everyone who shouldn't be able to write it cannot
        for user in [self.learner1other, self.coach1, self.coach1other, self.learner2, self.admin2, self.coach2]:
            self.assertFalse(log1.user_can_create(user))
            self.assertFalse(log1.user_can_update(user))
            self.assertFalse(log1.user_can_delete(user))

    def test_dummy_facility_setting_permissions(self):
        # create a dummy facility setting (without saving it)
        setting1 = DummyFacilitySettingModel(facility=self.data1["facility"])

        # check that everyone who should be able to read it can read it
        for user in [self.learner1, self.admin1, self.coach1, self.device_owner, self.learner1other, self.coach1other]:
            self.assertTrue(setting1.user_can_read(user))
        # check that everyone who shouldn't be able to read it cannot
        for user in [self.learner2, self.admin2, self.coach2]:
            self.assertFalse(setting1.user_can_read(user))

        # check that everyone who should be able to write it can write it
        for user in [self.admin1, self.device_owner]:
            self.assertTrue(setting1.user_can_create(user))
            self.assertTrue(setting1.user_can_update(user))
            self.assertTrue(setting1.user_can_delete(user))
        # check that everyone who shouldn't be able to write it cannot
        for user in [self.learner1, self.coach1, self.learner2, self.admin2, self.coach2]:
            self.assertFalse(setting1.user_can_create(user))
            self.assertFalse(setting1.user_can_update(user))
            self.assertFalse(setting1.user_can_delete(user))
