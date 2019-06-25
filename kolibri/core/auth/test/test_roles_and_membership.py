"""
Tests of role and membership calculations.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.test import TestCase

from ..constants import role_kinds
from ..models import Classroom
from ..models import Facility
from ..models import FacilityUser
from ..models import KolibriAnonymousUser
from ..models import LearnerGroup
from .helpers import create_dummy_facility_data
from .helpers import create_superuser


def flatten(lst):
    if lst == []:
        return lst
    if isinstance(lst[0], list):
        return flatten(lst[0]) + flatten(lst[1:])
    return lst[:1] + flatten(lst[1:])


class RolesWithinFacilityTestCase(TestCase):
    def setUp(self):
        self.data = create_dummy_facility_data()

    def test_admin_has_admin_role_for_own_facility(self):
        admin = self.data["facility_admin"]
        facility = self.data["facility"]
        self.assertTrue(admin.has_role_for(role_kinds.ADMIN, facility))
        self.assertIn(role_kinds.ADMIN, admin.get_roles_for(facility))

    def test_coach_has_coach_role_for_own_classroom(self):
        coach0 = self.data["classroom_coaches"][0]
        classroom0 = self.data["classrooms"][0]
        self.assertTrue(coach0.has_role_for(role_kinds.COACH, classroom0))
        self.assertIn(role_kinds.COACH, coach0.get_roles_for(classroom0))

    def test_coach_has_no_coach_role_for_other_classroom(self):
        coach0 = self.data["classroom_coaches"][0]
        classroom1 = self.data["classrooms"][1]
        self.assertFalse(coach0.has_role_for(role_kinds.COACH, classroom1))
        self.assertNotIn(role_kinds.COACH, coach0.get_roles_for(classroom1))

    def test_coach_has_coach_role_for_learner_from_own_classroom(self):
        coach0 = self.data["classroom_coaches"][0]
        learner0 = self.data["learners_one_group"][0][0]
        self.assertTrue(coach0.has_role_for(role_kinds.COACH, learner0))
        self.assertIn(role_kinds.COACH, coach0.get_roles_for(learner0))

    def test_coach_has_no_coach_role_for_learner_from_other_classroom(self):
        coach0 = self.data["classroom_coaches"][0]
        learner1 = self.data["learners_one_group"][1][0]
        self.assertFalse(coach0.has_role_for(role_kinds.COACH, learner1))
        self.assertNotIn(role_kinds.COACH, coach0.get_roles_for(learner1))


class ImplicitMembershipTestCase(TestCase):
    def setUp(self):
        self.facility = Facility.objects.create(name="My Facility")
        self.admin = FacilityUser.objects.create(
            username="admin", facility=self.facility
        )
        self.facility.add_admin(self.admin)
        self.learner = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )

    def test_has_admin_role_for_learner(self):
        self.assertTrue(self.admin.has_role_for(role_kinds.ADMIN, self.learner))

    def test_only_has_admin_role_for_learner(self):
        self.assertEqual(
            self.admin.get_roles_for(self.learner), set([role_kinds.ADMIN])
        )

    def test_admin_can_read_learner_object(self):
        self.assertTrue(self.admin.can_read(self.learner))

    def test_learner_is_in_list_of_readable_objects(self):
        self.assertIn(
            self.learner, self.admin.filter_readable(FacilityUser.objects.all())
        )


class ExplicitMembershipTestCase(TestCase):
    def setUp(self):

        self.facility = Facility.objects.create(name="My Facility")

        self.admin = FacilityUser.objects.create(
            username="admin", facility=self.facility
        )
        self.classroom = Classroom.objects.create(name="Class", parent=self.facility)
        self.classroom.add_admin(self.admin)

        self.learner = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        self.group = LearnerGroup.objects.create(name="Group", parent=self.classroom)
        self.group.add_member(self.learner)

    def test_has_admin_role_for_learner(self):
        self.assertTrue(self.admin.has_role_for(role_kinds.ADMIN, self.learner))

    def test_only_has_admin_role_for_learner(self):
        self.assertEqual(
            self.admin.get_roles_for(self.learner), set([role_kinds.ADMIN])
        )

    def test_admin_can_read_learner_object(self):
        self.assertTrue(self.admin.can_read(self.learner))

    def test_learner_is_in_list_of_readable_objects(self):
        self.assertIn(
            self.learner, self.admin.filter_readable(FacilityUser.objects.all())
        )


class RolesAcrossFacilitiesTestCase(TestCase):
    def setUp(self):
        self.data1 = create_dummy_facility_data()
        self.data2 = create_dummy_facility_data()

    def test_no_roles_between_users_across_facilities(self):
        users1 = self.data1["all_users"]
        users2 = self.data2["all_users"]
        for user1 in users1:
            for user2 in users2:
                if not user1.is_superuser:
                    self.assertEqual(len(user1.get_roles_for(user2)), 0)

    def test_no_roles_for_collections_across_facilities(self):
        users1 = (
            self.data1["classroom_coaches"]
            + [self.data1["facility_admin"]]
            + list(self.data1["facility"].get_members())
        )
        collections2 = (
            [self.data2["facility"]]
            + self.data2["classrooms"]
            + flatten(self.data2["learnergroups"])
        )
        for user1 in users1:
            for collection2 in collections2:
                if not user1.is_superuser:
                    self.assertEqual(len(user1.get_roles_for(collection2)), 0)


class MembershipWithinFacilityTestCase(TestCase):
    def setUp(self):
        self.data = create_dummy_facility_data()
        self.anon_user = KolibriAnonymousUser()

    def test_facility_membership(self):
        actual_members = flatten(
            self.data["learners_one_group"]
            + [self.data["learner_all_groups"]]
            + self.data["unattached_users"]
            + [self.data["facility_admin"]]
            + [self.data["facility_coach"]]
            + self.data["classroom_admins"]
            + self.data["classroom_coaches"]
            + [self.data["superuser"]]
        )
        returned_members = self.data["facility"].get_members()
        self.assertSetEqual(set(actual_members), set(returned_members))
        for user in actual_members:
            self.assertTrue(user.is_member_of(self.data["facility"]))
        self.assertFalse(self.anon_user.is_member_of(self.data["facility"]))

    def test_classroom_membership(self):
        for i, classroom in enumerate(self.data["classrooms"]):
            actual_members = flatten(
                self.data["learners_one_group"][i] + [self.data["learner_all_groups"]]
            )
            returned_members = classroom.get_members()
            self.assertSetEqual(set(actual_members), set(returned_members))
            # ensure that `is_member` is True for all users in the classroom
            for user in actual_members:
                self.assertTrue(user.is_member_of(classroom))
            # ensure that `is_member` is False for all users not in the classroom
            for user in set(self.data["all_users"]) - set(actual_members):
                self.assertFalse(user.is_member_of(classroom))
            self.assertFalse(self.anon_user.is_member_of(classroom))

    def test_learnergroup_membership(self):
        for i, classroom_users in enumerate(self.data["learners_one_group"]):
            for j, learnergroup_users in enumerate(classroom_users):
                learnergroup = self.data["learnergroups"][i][j]
                actual_members = [self.data["learners_one_group"][i][j]] + [
                    self.data["learner_all_groups"]
                ]
                returned_members = learnergroup.get_members()
                self.assertSetEqual(set(actual_members), set(returned_members))
                # ensure that `is_member` is True for all users in the learnergroup
                for user in actual_members:
                    self.assertTrue(user.is_member_of(learnergroup))
                # ensure that `is_member` is False for all users not in the learnergroup
                for user in set(self.data["all_users"]) - set(actual_members):
                    self.assertFalse(user.is_member_of(learnergroup))


class MembershipAcrossFacilitiesTestCase(TestCase):
    def setUp(self):
        self.data1 = create_dummy_facility_data()
        self.data2 = create_dummy_facility_data()

    def test_users_are_not_members_of_other_facility(self):
        for user in self.data1["all_users"]:
            self.assertFalse(user.is_member_of(self.data2["facility"]))

    def test_users_are_not_members_of_other_facility_classroom(self):
        for user in self.data1["all_users"]:
            self.assertFalse(user.is_member_of(self.data2["classrooms"][0]))

    def test_users_are_not_members_of_other_facility_learnergroup(self):
        for user in self.data1["all_users"]:
            self.assertFalse(user.is_member_of(self.data2["learnergroups"][0][0]))


class SuperuserRolesTestCase(TestCase):
    def setUp(self):
        self.data = create_dummy_facility_data()
        self.superuser = self.data["superuser"]
        self.superuser2 = create_superuser(self.data["facility"], username="superuser2")

    def test_superuser_has_admin_role_for_everyone(self):
        for user in self.data["all_users"]:
            self.assertTrue(self.superuser.has_role_for(role_kinds.ADMIN, user))

    def test_superuser_has_admin_role_for_all_collections(self):
        for coll in self.data["all_collections"]:
            self.assertTrue(self.superuser.has_role_for(role_kinds.ADMIN, coll))

    def test_superuser_has_admin_role_for_itself(self):
        self.assertTrue(self.superuser.has_role_for(role_kinds.ADMIN, self.superuser))

    def test_superuser_has_admin_role_for_other_superuser(self):
        self.assertTrue(self.superuser.has_role_for(role_kinds.ADMIN, self.superuser2))


class AnonymousUserRolesTestCase(TestCase):
    def setUp(self):
        self.data = create_dummy_facility_data()
        self.anon_user = KolibriAnonymousUser()

    def test_anon_user_has_no_admin_role_for_anyone(self):
        for user in self.data["all_users"]:
            self.assertFalse(self.anon_user.has_role_for(role_kinds.ADMIN, user))
            self.assertEqual(len(self.anon_user.get_roles_for(user)), 0)

    def test_anon_user_has_no_admin_role_for_any_collection(self):
        for coll in self.data["all_collections"]:
            self.assertFalse(self.anon_user.has_role_for(role_kinds.ADMIN, coll))
            self.assertEqual(len(self.anon_user.get_roles_for(coll)), 0)

    def test_nobody_but_superuser_has_roles_for_anon_user(self):
        for user in self.data["all_users"]:
            if not user.is_superuser:
                self.assertEqual(len(user.get_roles_for(self.anon_user)), 0)
