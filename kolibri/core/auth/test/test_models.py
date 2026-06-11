"""
Tests of the core auth models (Role, Membership, Collection, FacilityUser, etc).
"""

from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError
from django.test import TestCase
from django.utils import timezone

from kolibri.core.auth.constants.demographics import NOT_SPECIFIED
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.utils.time_utils import local_now

from ..constants import collection_kinds
from ..constants import role_kinds
from ..errors import InvalidCollectionHierarchy
from ..errors import InvalidMembershipError
from ..errors import InvalidRoleKind
from ..errors import UserDoesNotHaveRoleError
from ..errors import UserIsNotMemberError
from ..models import AdHocGroup
from ..models import Classroom
from ..models import Collection
from ..models import Facility
from ..models import FacilityUser
from ..models import LearnerGroup
from ..models import Membership
from ..models import Role
from ..models import Session
from .helpers import create_superuser


class CollectionRoleMembershipDeletionTestCase(TestCase):
    """
    Tests that removing users from a Collection deletes the corresponding Role, and that deleting a Collection
    or FacilityUser deletes all associated Roles and Memberships.
    """

    databases = "__all__"

    def setUp(self):
        self.facility = Facility.objects.create()

        learner, classroom_coach, facility_admin = (
            self.learner,
            self.classroom_coach,
            self.facility_admin,
        ) = (
            FacilityUser.objects.create(username="foo", facility=self.facility),
            FacilityUser.objects.create(username="bar", facility=self.facility),
            FacilityUser.objects.create(username="baz", facility=self.facility),
        )

        self.facility.add_admin(facility_admin)

        self.cr = Classroom.objects.create(parent=self.facility)
        self.cr.add_coach(classroom_coach)
        self.cr.add_member(learner)

        self.lg = LearnerGroup.objects.create(parent=self.cr)
        self.lg.add_learner(learner)

    def test_remove_learner(self):
        self.assertTrue(self.learner.is_member_of(self.lg))
        self.assertTrue(self.learner.is_member_of(self.cr))
        self.assertTrue(self.learner.is_member_of(self.facility))
        self.assertEqual(
            Membership.objects.filter(user=self.learner, collection=self.lg).count(), 1
        )

        self.lg.remove_learner(self.learner)
        self.cr.remove_member(self.learner)

        self.assertFalse(self.learner.is_member_of(self.lg))
        self.assertFalse(self.learner.is_member_of(self.cr))
        self.assertTrue(
            self.learner.is_member_of(self.facility)
        )  # always a member of one's own facility
        self.assertEqual(
            Membership.objects.filter(user=self.learner, collection=self.lg).count(), 0
        )

        with self.assertRaises(UserIsNotMemberError):
            self.lg.remove_learner(self.learner)

    def test_remove_learner_from_parent_removes_from_child(self):
        self.assertTrue(self.learner.is_member_of(self.lg))
        self.assertTrue(self.learner.is_member_of(self.cr))
        self.assertTrue(self.learner.is_member_of(self.facility))
        self.assertEqual(
            Membership.objects.filter(user=self.learner, collection=self.lg).count(), 1
        )

        self.cr.remove_member(self.learner)

        self.assertFalse(self.learner.is_member_of(self.lg))
        self.assertFalse(self.learner.is_member_of(self.cr))
        self.assertTrue(
            self.learner.is_member_of(self.facility)
        )  # always a member of one's own facility
        self.assertEqual(
            Membership.objects.filter(user=self.learner, collection=self.lg).count(), 0
        )

        with self.assertRaises(UserIsNotMemberError):
            self.lg.remove_learner(self.learner)

    def test_remove_coach(self):
        self.assertTrue(
            self.classroom_coach.has_role_for_collection(role_kinds.COACH, self.lg)
        )
        self.assertTrue(
            self.classroom_coach.has_role_for_collection(role_kinds.COACH, self.cr)
        )
        self.assertFalse(
            self.classroom_coach.has_role_for_collection(
                role_kinds.COACH, self.facility
            )
        )
        self.assertFalse(
            self.classroom_coach.has_role_for_collection(role_kinds.ADMIN, self.lg)
        )
        self.assertTrue(
            self.classroom_coach.has_role_for_user(role_kinds.COACH, self.learner)
        )
        self.assertFalse(
            self.classroom_coach.has_role_for_user(
                role_kinds.COACH, self.facility_admin
            )
        )
        self.assertFalse(
            self.classroom_coach.has_role_for_user(role_kinds.ADMIN, self.learner)
        )
        self.assertEqual(
            Role.objects.filter(
                user=self.classroom_coach, kind=role_kinds.COACH, collection=self.cr
            ).count(),
            1,
        )

        self.cr.remove_coach(self.classroom_coach)

        self.assertFalse(
            self.classroom_coach.has_role_for_collection(role_kinds.COACH, self.lg)
        )
        self.assertFalse(
            self.classroom_coach.has_role_for_collection(role_kinds.COACH, self.cr)
        )
        self.assertFalse(
            self.classroom_coach.has_role_for_collection(
                role_kinds.COACH, self.facility
            )
        )
        self.assertFalse(
            self.classroom_coach.has_role_for_collection(role_kinds.ADMIN, self.lg)
        )
        self.assertFalse(
            self.classroom_coach.has_role_for_user(role_kinds.COACH, self.learner)
        )
        self.assertFalse(
            self.classroom_coach.has_role_for_user(
                role_kinds.COACH, self.facility_admin
            )
        )
        self.assertFalse(
            self.classroom_coach.has_role_for_user(role_kinds.ADMIN, self.learner)
        )
        self.assertEqual(
            Role.objects.filter(
                user=self.classroom_coach, kind=role_kinds.COACH, collection=self.cr
            ).count(),
            0,
        )

        with self.assertRaises(UserDoesNotHaveRoleError):
            self.cr.remove_coach(self.classroom_coach)

    def test_remove_admin(self):
        self.assertTrue(
            self.facility_admin.has_role_for_collection(role_kinds.ADMIN, self.lg)
        )
        self.assertTrue(
            self.facility_admin.has_role_for_collection(role_kinds.ADMIN, self.cr)
        )
        self.assertTrue(
            self.facility_admin.has_role_for_collection(role_kinds.ADMIN, self.facility)
        )
        self.assertFalse(
            self.facility_admin.has_role_for_collection(role_kinds.COACH, self.lg)
        )
        self.assertTrue(
            self.facility_admin.has_role_for_user(role_kinds.ADMIN, self.learner)
        )
        self.assertTrue(
            self.facility_admin.has_role_for_user(role_kinds.ADMIN, self.facility_admin)
        )
        self.assertTrue(
            self.facility_admin.has_role_for_user(
                role_kinds.ADMIN, self.classroom_coach
            )
        )
        self.assertFalse(
            self.facility_admin.has_role_for_user(role_kinds.COACH, self.learner)
        )
        self.assertEqual(
            Role.objects.filter(
                user=self.facility_admin,
                kind=role_kinds.ADMIN,
                collection=self.facility,
            ).count(),
            1,
        )

        self.facility.remove_admin(self.facility_admin)

        self.assertEqual(
            Role.objects.filter(
                user=self.facility_admin,
                kind=role_kinds.ADMIN,
                collection=self.facility,
            ).count(),
            0,
        )

        with self.assertRaises(UserDoesNotHaveRoleError):
            self.facility.remove_admin(self.facility_admin)

    def test_remove_nonexistent_role(self):
        with self.assertRaises(UserDoesNotHaveRoleError):
            self.facility.remove_admin(self.learner)
        with self.assertRaises(UserDoesNotHaveRoleError):
            self.cr.remove_coach(self.learner)

    def test_remove_indirect_admin_role(self):
        """Trying to remove the admin role for a a Facility admin from a descendant classroom doesn't actually remove anything."""
        with self.assertRaises(UserDoesNotHaveRoleError):
            self.cr.remove_admin(self.facility_admin)

    def test_delete_learner_group(self):
        """Deleting a LearnerGroup should delete its associated Memberships as well"""
        self.assertEqual(Membership.objects.filter(collection=self.lg.id).count(), 1)
        self.lg.delete()
        self.assertEqual(Membership.objects.filter(collection=self.lg.id).count(), 0)

    def test_delete_classroom_pt1(self):
        """Deleting a Classroom should delete its associated Roles as well"""
        self.assertEqual(Role.objects.filter(collection=self.cr.id).count(), 1)
        self.cr.delete()
        self.assertEqual(Role.objects.filter(collection=self.cr.id).count(), 0)

    def test_delete_classroom_pt2(self):
        """Deleting a Classroom should delete its associated LearnerGroups"""
        self.assertEqual(LearnerGroup.objects.count(), 1)
        self.cr.delete()
        self.assertEqual(LearnerGroup.objects.count(), 0)

    def test_delete_facility_pt1(self):
        """Deleting a Facility should delete associated Roles as well"""
        self.assertEqual(Role.objects.filter(collection=self.facility.id).count(), 2)
        self.facility.delete()
        self.assertEqual(Role.objects.filter(collection=self.facility.id).count(), 0)

    def test_delete_facility_pt2(self):
        """Deleting a Facility should delete Classrooms under it."""
        self.assertEqual(Classroom.objects.count(), 1)
        self.facility.delete()
        self.assertEqual(Classroom.objects.count(), 0)

    def test_delete_facility_pt3(self):
        """Deleting a Facility should delete *every* Collection under it and associated Roles"""
        self.facility.delete()
        self.assertEqual(Collection.objects.count(), 0)
        self.assertEqual(Role.objects.count(), 0)

    def test_delete_facility_user(self):
        """Deleting a FacilityUser should delete associated Memberships"""
        self.learner.delete()
        self.assertEqual(Membership.objects.filter(user=self.learner).count(), 0)


class CollectionRelatedObjectTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create()

        users = cls.users = [
            FacilityUser.objects.create(username="foo%s" % i, facility=cls.facility)
            for i in range(10)
        ]

        cls.facility.add_admins(users[8:9])

        cls.cr = Classroom.objects.create(parent=cls.facility)
        cls.cr.add_coaches(users[5:8])
        for u in users[0:5]:
            cls.cr.add_member(u)

        cls.lg = LearnerGroup.objects.create(parent=cls.cr)
        cls.lg.add_learners(users[0:5])

    def test_get_learner_groups(self):
        self.assertSetEqual(
            {self.lg.pk}, {lg.pk for lg in self.cr.get_learner_groups()}
        )

    def test_get_classrooms(self):
        self.assertSetEqual(
            {self.cr.pk}, {cr.pk for cr in self.facility.get_classrooms()}
        )

    def test_get_classroom(self):
        self.assertEqual(self.cr.pk, self.lg.get_classroom().pk)


class CollectionsTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create()
        cls.classroom = Classroom.objects.create(parent=cls.facility)

    def test_add_and_remove_admin(self):
        user = FacilityUser.objects.create(username="foo", facility=self.facility)
        self.facility.add_admin(user)
        self.assertEqual(
            Role.objects.filter(
                user=user, kind=role_kinds.ADMIN, collection=self.facility
            ).count(),
            1,
        )
        self.facility.remove_admin(user)
        self.assertEqual(
            Role.objects.filter(
                user=user, kind=role_kinds.ADMIN, collection=self.facility
            ).count(),
            0,
        )

    def test_add_and_remove_coach(self):
        user = FacilityUser.objects.create(username="foo", facility=self.facility)
        self.classroom.add_coach(user)
        self.facility.add_coach(user)
        self.assertEqual(
            Role.objects.filter(
                user=user, kind=role_kinds.COACH, collection=self.classroom
            ).count(),
            1,
        )
        self.assertEqual(
            Role.objects.filter(
                user=user, kind=role_kinds.COACH, collection=self.facility
            ).count(),
            1,
        )
        self.assertEqual(
            Role.objects.filter(
                user=user, kind=role_kinds.ASSIGNABLE_COACH, collection=self.facility
            ).count(),
            1,
        )
        self.classroom.remove_coach(user)
        self.facility.remove_coach(user)
        self.assertEqual(
            Role.objects.filter(
                user=user, kind=role_kinds.COACH, collection=self.classroom
            ).count(),
            0,
        )
        self.assertEqual(
            Role.objects.filter(
                user=user, kind=role_kinds.COACH, collection=self.facility
            ).count(),
            0,
        )

    def test_add_and_remove_classroom_coach(self):
        user = FacilityUser.objects.create(username="foo", facility=self.facility)
        self.classroom.add_coach(user)
        self.assertEqual(
            Role.objects.filter(
                user=user, kind=role_kinds.COACH, collection=self.classroom
            ).count(),
            1,
        )
        self.assertEqual(
            Role.objects.filter(
                user=user, kind=role_kinds.ASSIGNABLE_COACH, collection=self.facility
            ).count(),
            1,
        )
        self.facility.remove_role(user, role_kinds.ASSIGNABLE_COACH)
        self.assertEqual(
            Role.objects.filter(
                user=user, kind=role_kinds.COACH, collection=self.classroom
            ).count(),
            0,
        )
        self.assertEqual(
            Role.objects.filter(
                user=user, kind=role_kinds.ASSIGNABLE_COACH, collection=self.facility
            ).count(),
            0,
        )

    def test_add_coaches(self):
        user1 = FacilityUser.objects.create(username="foo1", facility=self.facility)
        user2 = FacilityUser.objects.create(username="foo2", facility=self.facility)
        self.classroom.add_coaches([user1, user2])
        self.facility.add_coaches([user1, user2])
        self.assertEqual(
            Role.objects.filter(
                kind=role_kinds.COACH, collection=self.classroom
            ).count(),
            2,
        )
        self.assertEqual(
            Role.objects.filter(
                kind=role_kinds.COACH, collection=self.facility
            ).count(),
            2,
        )

    def test_add_admins(self):
        user1 = FacilityUser.objects.create(username="foo1", facility=self.facility)
        user2 = FacilityUser.objects.create(username="foo2", facility=self.facility)
        with self.assertRaises(InvalidRoleKind):
            self.classroom.add_admins([user1, user2])
        self.facility.add_admins([user1, user2])
        self.assertEqual(
            Role.objects.filter(
                kind=role_kinds.ADMIN, collection=self.facility
            ).count(),
            2,
        )

    def test_add_classroom(self):
        classroom = Classroom.objects.create(parent=self.facility)
        self.assertEqual(Classroom.objects.count(), 2)
        self.assertEqual(classroom.get_facility(), self.facility)

    def test_add_learner_group(self):
        classroom = Classroom.objects.create(name="blah", parent=self.facility)
        classroom.full_clean()
        LearnerGroup.objects.create(parent=classroom)
        self.assertEqual(LearnerGroup.objects.count(), 1)

    def test_learner_cannot_be_added_to_learnergroup_if_not_classroom_member(self):
        user = FacilityUser.objects.create(username="foo", facility=self.facility)
        classroom = Classroom.objects.create(parent=self.facility)
        learner_group = LearnerGroup.objects.create(name="blah", parent=classroom)
        learner_group.full_clean()
        with self.assertRaises(InvalidMembershipError):
            learner_group.add_learner(user)

    def test_learner_can_be_added_to_learnergroup_if_classroom_member(self):
        user = FacilityUser.objects.create(username="foo", facility=self.facility)
        classroom = Classroom.objects.create(parent=self.facility)
        classroom.add_member(user)
        learner_group = LearnerGroup.objects.create(name="blah", parent=classroom)
        learner_group.full_clean()
        learner_group.add_learner(user)
        self.assertEqual(
            Membership.objects.filter(user=user, collection=learner_group).count(), 1
        )

    def test_learner_cannot_be_added_to_adhocgroup_if_not_classroom_member(self):
        user = FacilityUser.objects.create(username="foo", facility=self.facility)
        classroom = Classroom.objects.create(parent=self.facility)
        adhoc_group = AdHocGroup.objects.create(name="blah", parent=classroom)
        adhoc_group.full_clean()
        with self.assertRaises(InvalidMembershipError):
            adhoc_group.add_learner(user)

    def test_learner_can_be_added_to_adhocgroup_if_classroom_member(self):
        user = FacilityUser.objects.create(username="foo", facility=self.facility)
        classroom = Classroom.objects.create(parent=self.facility)
        classroom.add_member(user)
        adhoc_group = AdHocGroup.objects.create(name="blah", parent=classroom)
        adhoc_group.full_clean()
        adhoc_group.add_learner(user)
        self.assertEqual(
            Membership.objects.filter(user=user, collection=adhoc_group).count(), 1
        )

    def test_parentless_classroom(self):
        classroom = Classroom(name="myclass")
        # shouldn't be valid, because no parent was specified, and Classrooms can't be the root of the collection tree
        with self.assertRaises(ValidationError):
            classroom.full_clean()
        with self.assertRaises(IntegrityError):
            classroom.save()

    def test_parentless_learnergroup(self):
        group = LearnerGroup(name="mygroup")
        # shouldn't be valid, because no parent was specified, and LearnerGroups can't be the root of the collection tree
        with self.assertRaises(ValidationError):
            group.full_clean()
        with self.assertRaises(IntegrityError):
            group.save()

    def test_facility_with_parent_facility(self):
        with self.assertRaises(IntegrityError):
            Facility.objects.create(name="blah", parent=self.facility)

    def test_create_bare_collection_without_kind(self):
        with self.assertRaises(ValidationError):
            Collection(name="qqq", parent=self.facility).full_clean()


class RoleErrorTestCase(TestCase):
    def setUp(self):
        self.facility = Facility.objects.create()
        self.classroom = Classroom.objects.create(parent=self.facility)
        self.learner_group = LearnerGroup.objects.create(parent=self.classroom)
        self.adhoc_group = AdHocGroup.objects.create(parent=self.classroom)
        self.facility_user = FacilityUser.objects.create(
            username="blah", password="#", facility=self.facility
        )

    def test_invalid_role_kind(self):
        with self.assertRaises(InvalidRoleKind):
            self.learner_group.add_role(
                self.facility_user, "blahblahnonexistentroletype"
            )
        with self.assertRaises(InvalidRoleKind):
            self.learner_group.remove_role(
                self.facility_user, "blahblahnonexistentroletype"
            )

    def test_invalid_learner_group_roles(self):
        with self.assertRaises(InvalidRoleKind):
            self.learner_group.add_role(self.facility_user, role_kinds.ADMIN)
        with self.assertRaises(InvalidRoleKind):
            self.learner_group.add_role(self.facility_user, role_kinds.COACH)

    def test_invalid_adhoc_group_roles(self):
        with self.assertRaises(InvalidRoleKind):
            self.learner_group.add_role(self.facility_user, role_kinds.ADMIN)
        with self.assertRaises(InvalidRoleKind):
            self.learner_group.add_role(self.facility_user, role_kinds.COACH)

    def test_invalid_classroom_roles(self):
        with self.assertRaises(InvalidRoleKind):
            self.learner_group.add_role(self.facility_user, role_kinds.ADMIN)


class SuperuserRoleMembershipTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create()
        cls.classroom = Classroom.objects.create(parent=cls.facility)
        cls.learner_group = LearnerGroup.objects.create(parent=cls.classroom)
        cls.facility_user = FacilityUser.objects.create(
            username="blah", password="#", facility=cls.facility
        )
        cls.superuser = create_superuser(cls.facility)
        cls.superuser2 = create_superuser(cls.facility, username="superuser2")

    def test_superuser_is_not_member_of_any_sub_collection(self):
        self.assertFalse(self.superuser.is_member_of(self.classroom))
        self.assertTrue(self.superuser.is_member_of(self.facility))
        self.assertFalse(self.superuser.is_member_of(self.learner_group))

    def test_superuser_is_admin_for_everything(self):
        self.assertTrue(
            self.superuser.has_role_for_user([role_kinds.ADMIN], self.facility_user)
        )
        self.assertTrue(
            self.superuser.has_role_for_collection([role_kinds.ADMIN], self.facility)
        )


class SuperuserTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create()
        cls.superuser = create_superuser(cls.facility, username="the_superuser")

    def test_superuser_is_superuser(self):
        self.assertTrue(self.superuser.is_superuser)

    def test_superuser_manager_supports_superuser_creation(self):
        self.assertEqual(FacilityUser.objects.get().username, "the_superuser")

    def test_superuser_has_all_django_perms_for_django_admin(self):
        fake_permission = "fake_permission"
        fake_module = "module.someapp"
        self.assertTrue(self.superuser.has_perm(fake_permission, object()))
        self.assertTrue(self.superuser.has_perms([fake_permission], object()))
        self.assertTrue(self.superuser.has_module_perms(fake_module))


class StringMethodTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Arkham")

        learner, classroom_coach, facility_admin = (
            cls.learner,
            cls.classroom_coach,
            cls.facility_admin,
        ) = (
            FacilityUser.objects.create(username="foo", facility=cls.facility),
            FacilityUser.objects.create(username="bar", facility=cls.facility),
            FacilityUser.objects.create(username="baz", facility=cls.facility),
        )

        cls.facility.add_admin(facility_admin)

        cls.cr = Classroom.objects.create(name="Classroom X", parent=cls.facility)
        cls.cr.add_coach(classroom_coach)
        cls.cr.add_member(learner)

        cls.lg = LearnerGroup.objects.create(name="Oodles of Fun", parent=cls.cr)
        cls.lg.add_learner(learner)

        cls.superuser = create_superuser(cls.facility)

    def test_facility_user_str_method(self):
        self.assertEqual(str(self.learner), '"foo"@"Arkham"')

    def test_superuser_str_method(self):
        self.assertEqual(str(self.superuser), '"superuser"@"Arkham"')

    def test_collection_str_method(self):
        self.assertEqual(
            str(Collection.objects.filter(kind=collection_kinds.FACILITY)[0]),
            '"Arkham" (facility)',
        )

    def test_membership_str_method(self):
        self.assertEqual(
            str(self.learner.memberships.filter(collection=self.lg)[0]),
            '"foo"@"Arkham"\'s membership in "Oodles of Fun" (learnergroup)',
        )

    def test_role_str_method(self):
        self.assertEqual(
            str(self.classroom_coach.roles.filter(kind=role_kinds.COACH)[0]),
            '"bar"@"Arkham"\'s coach role for "Classroom X" (classroom)',
        )

    def test_facility_str_method(self):
        self.assertEqual(str(self.facility), "Arkham")

    def test_classroom_str_method(self):
        self.assertEqual(str(self.cr), "Classroom X")

    def test_learner_group_str_method(self):
        self.assertEqual(str(self.lg), "Oodles of Fun")


class FacilityTestCase(TestCase):
    def test_existing_facility_becomes_default_facility(self):
        self.facility = Facility.objects.create()
        self.device_settings = DeviceSettings.objects.create(is_provisioned=True)
        self.assertEqual(self.device_settings.default_facility, None)
        default_facility = Facility.get_default_facility()
        self.assertEqual(default_facility, self.facility)
        self.device_settings.refresh_from_db()
        self.assertEqual(self.device_settings.default_facility, self.facility)

    def test_default_facility_returns_none_when_no_settings(self):
        default_facility = Facility.get_default_facility()
        self.assertEqual(default_facility, None)


class FacilityUserTestCase(TestCase):
    databases = "__all__"

    def test_all_objects_manager_returns_all_users(self):
        self.facility = Facility.objects.create(name="My Facility")
        FacilityUser.objects.create(
            username="deleted_user",
            password="password",
            facility=self.facility,
            date_deleted=local_now(),
        )
        user = FacilityUser.objects.create(
            username="user",
            password="password",
            facility=self.facility,
        )

        self.assertEqual(FacilityUser.objects.count(), 1)
        self.assertEqual(FacilityUser.objects.first(), user)

        self.assertEqual(FacilityUser.all_objects.count(), 2)

    def test_able_to_create_user_with_same_username_at_orm_level(self):
        self.facility = Facility.objects.create()
        self.device_settings = DeviceSettings.objects.create()
        FacilityUser.objects.create(username="bob", facility=self.facility)
        try:
            FacilityUser.objects.create(username="bob", facility=self.facility)
        except IntegrityError:
            self.fail("Can't create user with same username.")

    def test_deserialize_empty_password(self):
        self.facility = Facility.objects.create()
        self.device_settings = DeviceSettings.objects.create()

        user = FacilityUser.deserialize(dict(username="bob", password=""))
        self.assertEqual("bob", user.username)
        self.assertEqual(NOT_SPECIFIED, user.password)

    def test_username_validation(self):
        self.facility = Facility.objects.create()
        self.device_settings = DeviceSettings.objects.create()
        user1 = FacilityUser.objects.create(
            username="bob@learningequality.org",
            password="password",
            facility=self.facility,
        )
        user1.full_clean()
        user2 = FacilityUser.objects.create(
            username="@bob", password="password", facility=self.facility
        )
        with self.assertRaises(ValidationError):
            user2.full_clean()
        user3 = FacilityUser.objects.create(
            username=32 * "gh", password="password", facility=self.facility
        )
        with self.assertRaises(ValidationError):
            user3.full_clean()

    def test_no_soft_deleted_users_are_returned(self):
        self.facility = Facility.objects.create()
        self.device_settings = DeviceSettings.objects.create()
        FacilityUser.objects.create(
            username="bob",
            password="password",
            facility=self.facility,
            date_deleted=local_now(),
        )
        user2 = FacilityUser.objects.create(
            username="alice", password="password", facility=self.facility
        )

        self.assertEqual(list(FacilityUser.objects.all()), [user2])

    def test_only_soft_deleted_users_are_returned(self):
        self.facility = Facility.objects.create()
        self.device_settings = DeviceSettings.objects.create()
        FacilityUser.objects.create(
            username="bob", password="password", facility=self.facility
        )
        soft_deleted_user = FacilityUser.objects.create(
            username="john",
            password="password",
            facility=self.facility,
            date_deleted=local_now(),
        )
        self.assertEqual(
            list(FacilityUser.soft_deleted_objects.all()), [soft_deleted_user]
        )


class CollectionHierarchyTestCase(TestCase):
    def test_facility_with_parent(self):
        facility = Facility.objects.create()
        with self.assertRaises(IntegrityError):
            Facility.objects.create(parent=facility)

    def test_classroom_no_parent(self):
        with self.assertRaises(IntegrityError):
            Classroom.objects.create()

    def test_classroom_no_facility_parent(self):
        facility = Facility.objects.create()
        clsroom = Classroom.objects.create(parent=facility)
        with self.assertRaises(InvalidCollectionHierarchy):
            Classroom.objects.create(parent=clsroom)

    def test_learnergroup_no_parent(self):
        with self.assertRaises(IntegrityError):
            LearnerGroup.objects.create()

    def test_learnergroup_no_facility_parent(self):
        facility = Facility.objects.create()
        clsroom = Classroom.objects.create(parent=facility)
        lgroup = LearnerGroup.objects.create(parent=clsroom)
        with self.assertRaises(InvalidCollectionHierarchy):
            LearnerGroup.objects.create(parent=lgroup)

    def test_adhocgroup_no_parent(self):
        with self.assertRaises(IntegrityError):
            AdHocGroup.objects.create()

    def test_adhocgroup_no_facility_parent(self):
        facility = Facility.objects.create()
        clsroom = Classroom.objects.create(parent=facility)
        adhocgroup = AdHocGroup.objects.create(parent=clsroom)
        with self.assertRaises(InvalidCollectionHierarchy):
            AdHocGroup.objects.create(parent=adhocgroup)


class UserSessionCleanupTestCase(TestCase):
    """
    Tests that sessions are cleaned up when users are soft deleted or hard deleted.
    """

    databases = "__all__"

    def setUp(self):
        self.facility = Facility.objects.create(name="Test Facility")
        self.user = FacilityUser.objects.create(
            username="testuser", facility=self.facility, full_name="Test User"
        )

    def _create_test_session(self, user, session_key):
        """Helper to create a test session for a user."""
        return Session.objects.create(
            session_key=session_key,
            session_data="test_data",
            expire_date=timezone.now() + timezone.timedelta(days=1),
            user_id=user.id,
        )

    def test_individual_soft_delete_cleans_up_sessions(self):
        """Test that individual soft delete removes user sessions."""
        self._create_test_session(self.user, "test_session_1")

        # Verify session exists
        self.assertTrue(Session.objects.filter(user_id=self.user.id).exists())

        # Soft delete the user
        self.user.date_deleted = timezone.now()
        self.user.save()

        # Verify sessions are deleted
        self.assertFalse(Session.objects.filter(user_id=self.user.id).exists())

    def test_bulk_soft_delete_cleans_up_sessions(self):
        """Test that bulk soft delete removes user sessions."""
        user2 = FacilityUser.objects.create(
            username="testuser2", facility=self.facility, full_name="Test User 2"
        )

        self._create_test_session(self.user, "test_session_1")
        self._create_test_session(user2, "test_session_2")

        # Verify sessions exist
        self.assertEqual(
            Session.objects.filter(user_id__in=[self.user.id, user2.id]).count(), 2
        )

        # Bulk soft delete users
        FacilityUser.objects.filter(id__in=[self.user.id, user2.id]).update(
            date_deleted=timezone.now()
        )

        # Verify sessions are deleted
        self.assertEqual(
            Session.objects.filter(user_id__in=[self.user.id, user2.id]).count(), 0
        )

    def test_individual_hard_delete_cleans_up_sessions(self):
        """Test that individual hard delete removes user sessions."""
        self._create_test_session(self.user, "test_session_1")
        user_id = self.user.id

        # Verify session exists
        self.assertTrue(Session.objects.filter(user_id=user_id).exists())

        # Hard delete the user
        self.user.delete()

        # Verify sessions are deleted
        self.assertFalse(Session.objects.filter(user_id=user_id).exists())

    def test_bulk_hard_delete_cleans_up_sessions(self):
        """Test that bulk hard delete removes user sessions."""
        user2 = FacilityUser.objects.create(
            username="testuser2", facility=self.facility, full_name="Test User 2"
        )

        self._create_test_session(self.user, "test_session_1")
        self._create_test_session(user2, "test_session_2")
        user_ids = [self.user.id, user2.id]

        # Verify sessions exist
        self.assertEqual(Session.objects.filter(user_id__in=user_ids).count(), 2)

        # Bulk hard delete users (using all_objects to bypass soft delete filtering)
        FacilityUser.all_objects.filter(id__in=user_ids).delete()

        # Verify sessions are deleted
        self.assertEqual(Session.objects.filter(user_id__in=user_ids).count(), 0)

    def test_soft_delete_only_affects_non_deleted_users(self):
        """Test that only non-soft-deleted users have their sessions cleaned up."""
        user2 = FacilityUser.objects.create(
            username="testuser2",
            facility=self.facility,
            full_name="Test User 2",
            date_deleted=timezone.now(),
        )

        self._create_test_session(self.user, "test_session_1")
        self._create_test_session(user2, "test_session_2")

        # Verify both sessions exist
        self.assertEqual(
            Session.objects.filter(user_id__in=[self.user.id, user2.id]).count(), 2
        )

        # Bulk update with date_deleted (should only affect user, not user2)
        FacilityUser.all_objects.filter(id__in=[self.user.id, user2.id]).update(
            date_deleted=timezone.now()
        )

        # Only the first user's session should be deleted (user2 was already soft deleted)
        self.assertFalse(Session.objects.filter(user_id=self.user.id).exists())
        self.assertTrue(Session.objects.filter(user_id=user2.id).exists())


class CreateSuperuserRegressionTestCase(TestCase):
    """
    Regression test for issue #13897 where the createsuperuser command failed
    because the default manager (all_objects) inherited from Django's UserManager
    which tried to pass an 'email' parameter that FacilityUser doesn't accept.

    The fix was to move create_user and create_superuser methods from
    FacilityUserModelManager to BaseFacilityUserModelManager so all managers
    inherit the correct implementation.
    """

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Test Facility")

    def test_create_superuser_with_all_objects_manager(self):
        """Test that all_objects manager can create superuser without email parameter."""
        username = "admin1"
        password = "password123"

        # Use all_objects manager (the default manager, which was broken before)
        superuser = FacilityUser.all_objects.create_superuser(
            username=username,
            password=password,
            facility=self.facility,
            full_name="Admin User",
        )

        # Verify the user was created
        self.assertEqual(superuser.username, username)
        self.assertEqual(superuser.full_name, "Admin User")
        self.assertTrue(superuser.check_password(password))

        # Verify it's a superuser
        self.assertTrue(superuser.is_superuser)

        # Verify DevicePermissions were set
        device_perms = DevicePermissions.objects.get(user=superuser)
        self.assertTrue(device_perms.is_superuser)
        self.assertTrue(device_perms.can_manage_content)

    def test_create_superuser_with_objects_manager(self):
        """Test that objects manager can create superuser."""
        username = "admin2"
        password = "password456"

        # Use objects manager
        superuser = FacilityUser.objects.create_superuser(
            username=username,
            password=password,
            facility=self.facility,
        )

        # Verify the user was created
        self.assertEqual(superuser.username, username)
        self.assertTrue(superuser.check_password(password))
        self.assertTrue(superuser.is_superuser)

    def test_create_user_accepts_email_parameter(self):
        """
        Test that create_user accepts email parameter (for Django compatibility)
        but doesn't try to pass it to the model constructor.
        """
        username = "testuser"
        password = "testpass"
        # Django's createsuperuser command might pass email even if we don't need it
        user = FacilityUser.all_objects.create_user(
            username=username,
            email="ignored@example.com",  # This should be accepted but ignored
            password=password,
            facility=self.facility,
        )

        # Verify the user was created successfully (email was ignored)
        self.assertEqual(user.username, username)
        self.assertTrue(user.check_password(password))
