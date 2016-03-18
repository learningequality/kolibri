"""
Tests of the Role and Membership models, as well as the Collection model and its subclasses.
"""

from __future__ import absolute_import, print_function, unicode_literals

from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError
from django.test import TestCase

from ..constants import role_kinds, membership_kinds
from ..models import FacilityUser, Facility, Classroom, LearnerGroup, Role, Membership, Collection, DeviceOwner


class CollectionRoleMembershipDeletionTestCase(TestCase):
    """
    Tests that removing users from a Collection deletes the corresponding Role, and that deleting a Collection
    or FacilityUser deletes all associated Roles and Memberships.
    """

    def setUp(self):

        self.facility = Facility.objects.create()

        user1, user2, user3 = self.user1, self.user2, self.user3 = (
            FacilityUser.objects.create(username='foo', facility=self.facility),
            FacilityUser.objects.create(username='bar', facility=self.facility),
            FacilityUser.objects.create(username='baz', facility=self.facility),
        )

        self.facility.add_admin(user3)

        self.cr = Classroom.objects.create(parent=self.facility)
        self.cr.add_coach(user2)

        self.lg = LearnerGroup.objects.create(parent=self.cr)
        self.lg.add_learner(user1)

    def test_remove_learner(self):
        self.assertEqual(Membership.objects.filter(user=self.user1, kind=membership_kinds.LEARNER, collection=self.lg).count(), 1)
        self.lg.remove_learner(self.user1)
        self.assertEqual(Membership.objects.filter(user=self.user1, kind=membership_kinds.LEARNER, collection=self.lg).count(), 0)

    def test_remove_coach(self):
        self.assertEqual(Role.objects.filter(user=self.user2, kind=role_kinds.COACH, collection=self.cr).count(), 1)
        self.cr.remove_coach(self.user2)
        self.assertEqual(Role.objects.filter(user=self.user2, kind=role_kinds.COACH, collection=self.cr).count(), 0)

    def test_remove_admin(self):
        self.assertEqual(Role.objects.filter(user=self.user3, kind=role_kinds.ADMIN, collection=self.facility).count(), 1)
        self.facility.remove_admin(self.user3)
        self.assertEqual(Role.objects.filter(user=self.user3, kind=role_kinds.ADMIN, collection=self.facility).count(), 0)

    def test_delete_learner_group(self):
        """ Deleting a LearnerGroup should delete its associated Memberships as well """
        self.assertEqual(Membership.objects.filter(collection=self.lg.id).count(), 1)
        self.lg.delete()
        self.assertEqual(Membership.objects.filter(collection=self.lg.id).count(), 0)

    def test_delete_classroom_pt1(self):
        """ Deleting a Classroom should delete its associated Roles as well """
        self.assertEqual(Role.objects.filter(collection=self.cr.id).count(), 1)
        self.cr.delete()
        self.assertEqual(Role.objects.filter(collection=self.cr.id).count(), 0)

    def test_delete_classroom_pt2(self):
        """ Deleting a Classroom should delete its associated LearnerGroups """
        self.assertEqual(LearnerGroup.objects.count(), 1)
        self.cr.delete()
        self.assertEqual(LearnerGroup.objects.count(), 0)

    def test_delete_facility_pt1(self):
        """ Deleting a Facility should delete associated Roles as well """
        self.assertEqual(Role.objects.filter(collection=self.facility.id).count(), 1)
        self.facility.delete()
        self.assertEqual(Role.objects.filter(collection=self.facility.id).count(), 0)

    def test_delete_facility_pt2(self):
        """ Deleting a Facility should delete Classrooms under it. """
        self.assertEqual(Classroom.objects.count(), 1)
        self.facility.delete()
        self.assertEqual(Classroom.objects.count(), 0)

    def test_delete_facility_pt3(self):
        """ Deleting a Facility should delete *every* Collection under it and associated Roles """
        self.facility.delete()
        self.assertEqual(Collection.objects.count(), 0)
        self.assertEqual(Role.objects.count(), 0)

    def test_delete_facility_user(self):
        """ Deleting a FacilityUser should delete associated Roles """
        membership = Membership.objects.get(user=self.user1, kind=membership_kinds.LEARNER)
        self.user1.delete()
        self.assertEqual(Membership.objects.filter(id=membership.id).count(), 0)


class CollectionRelatedObjectTestCase(TestCase):

    def setUp(self):

        self.facility = Facility.objects.create()

        users = self.users = [FacilityUser.objects.create(
            username="foo%s" % i,
            facility=self.facility,
        ) for i in range(10)]

        self.facility.add_admins(users[8:9])

        self.cr = Classroom.objects.create(parent=self.facility)
        self.cr.add_coaches(users[5:8])

        self.lg = LearnerGroup.objects.create(parent=self.cr)
        self.lg.add_learners(users[0:5])

    def test_get_learner_groups(self):
        self.assertSetEqual({self.lg.pk}, set(lg.pk for lg in self.cr.get_learner_groups()))

    def test_get_classrooms(self):
        self.assertSetEqual({self.cr.pk}, set(cr.pk for cr in self.facility.get_classrooms()))

    def test_get_classroom(self):
        self.assertEqual(self.cr.pk, self.lg.get_classroom().pk)


class CollectionsTestCase(TestCase):

    def setUp(self):
        self.facility = Facility.objects.create()
        self.classroom = Classroom.objects.create(parent=self.facility)

    def test_add_and_remove_admin(self):
        user = FacilityUser.objects.create(username='foo', facility=self.facility)
        self.classroom.add_admin(user)
        self.facility.add_admin(user)
        self.assertEqual(Role.objects.filter(user=user, kind=role_kinds.ADMIN, collection=self.classroom).count(), 1)
        self.assertEqual(Role.objects.filter(user=user, kind=role_kinds.ADMIN, collection=self.facility).count(), 1)
        self.classroom.remove_admin(user)
        self.facility.remove_admin(user)
        self.assertEqual(Role.objects.filter(user=user, kind=role_kinds.ADMIN, collection=self.classroom).count(), 0)
        self.assertEqual(Role.objects.filter(user=user, kind=role_kinds.ADMIN, collection=self.facility).count(), 0)

    def test_add_and_remove_coach(self):
        user = FacilityUser.objects.create(username='foo', facility=self.facility)
        self.classroom.add_coach(user)
        self.facility.add_coach(user)
        self.assertEqual(Role.objects.filter(user=user, kind=role_kinds.COACH, collection=self.classroom).count(), 1)
        self.assertEqual(Role.objects.filter(user=user, kind=role_kinds.COACH, collection=self.facility).count(), 1)
        self.classroom.remove_coach(user)
        self.facility.remove_coach(user)
        self.assertEqual(Role.objects.filter(user=user, kind=role_kinds.COACH, collection=self.classroom).count(), 0)
        self.assertEqual(Role.objects.filter(user=user, kind=role_kinds.COACH, collection=self.facility).count(), 0)

    def test_add_coaches(self):
        user1 = FacilityUser.objects.create(username='foo1', facility=self.facility)
        user2 = FacilityUser.objects.create(username='foo2', facility=self.facility)
        self.classroom.add_coaches([user1, user2])
        self.facility.add_coaches([user1, user2])
        self.assertEqual(Role.objects.filter(kind=role_kinds.COACH, collection=self.classroom).count(), 2)
        self.assertEqual(Role.objects.filter(kind=role_kinds.COACH, collection=self.facility).count(), 2)

    def test_add_admins(self):
        user1 = FacilityUser.objects.create(username='foo1', facility=self.facility)
        user2 = FacilityUser.objects.create(username='foo2', facility=self.facility)
        self.classroom.add_admins([user1, user2])
        self.facility.add_admins([user1, user2])
        self.assertEqual(Role.objects.filter(kind=role_kinds.ADMIN, collection=self.classroom).count(), 2)
        self.assertEqual(Role.objects.filter(kind=role_kinds.ADMIN, collection=self.facility).count(), 2)

    def test_add_classroom(self):
        classroom = Classroom.objects.create(parent=self.facility)
        self.assertEqual(Classroom.objects.count(), 2)
        self.assertEqual(classroom.get_facility(), self.facility)

    def test_add_learner_group(self):
        classroom = Classroom.objects.create(name="blah", parent=self.facility)
        classroom.full_clean()
        LearnerGroup.objects.create(parent=classroom)
        self.assertEqual(LearnerGroup.objects.count(), 1)

    def test_learner(self):
        user = FacilityUser.objects.create(username='foo', facility=self.facility)
        classroom = Classroom.objects.create(parent=self.facility)
        learner_group = LearnerGroup.objects.create(name="blah", parent=classroom)
        learner_group.full_clean()
        learner_group.add_learner(user)
        self.assertEqual(Membership.objects.filter(user=user, kind=membership_kinds.LEARNER, collection=learner_group).count(), 1)

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


class RoleTestCase(TestCase):

    def setUp(self):
        self.facility = Facility.objects.create()
        self.classroom = Classroom.objects.create(parent=self.facility)
        self.learner_group = LearnerGroup.objects.create(parent=self.classroom)
        self.facility_user = FacilityUser.objects.create(username="blah", password="#", facility=self.facility)
        self.device_owner = DeviceOwner.objects.create(username="blooh", password="#")

    def test_invalid_role_type(self):
        with self.assertRaises(AssertionError):
            self.learner_group.add_role(self.facility_user, "blahblahnonexistentroletype")
        with self.assertRaises(AssertionError):
            self.learner_group.remove_role(self.facility_user, "blahblahnonexistentroletype")
