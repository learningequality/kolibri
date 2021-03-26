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
from ..models import Membership
from .helpers import create_dummy_facility_data
from .helpers import create_superuser


def flatten(lst):
    if lst == []:
        return lst
    if isinstance(lst[0], list):
        return flatten(lst[0]) + flatten(lst[1:])
    return lst[:1] + flatten(lst[1:])


class RolesWithinFacilityTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.data = create_dummy_facility_data()

    def test_admin_has_admin_role_for_own_facility(self):
        admin = self.data["facility_admin"]
        facility = self.data["facility"]
        self.assertTrue(admin.has_role_for(role_kinds.ADMIN, facility))

    def test_coach_has_coach_role_for_own_classroom(self):
        coach0 = self.data["classroom_coaches"][0]
        classroom0 = self.data["classrooms"][0]
        self.assertTrue(coach0.has_role_for(role_kinds.COACH, classroom0))

    def test_coach_has_no_coach_role_for_other_classroom(self):
        coach0 = self.data["classroom_coaches"][0]
        classroom1 = self.data["classrooms"][1]
        self.assertFalse(coach0.has_role_for(role_kinds.COACH, classroom1))

    def test_coach_has_coach_role_for_learner_from_own_classroom(self):
        coach0 = self.data["classroom_coaches"][0]
        learner0 = self.data["learners_one_group"][0][0]
        self.assertTrue(coach0.has_role_for(role_kinds.COACH, learner0))

    def test_coach_has_no_coach_role_for_learner_from_other_classroom(self):
        coach0 = self.data["classroom_coaches"][0]
        learner1 = self.data["learners_one_group"][1][0]
        self.assertFalse(coach0.has_role_for(role_kinds.COACH, learner1))


class ImplicitMembershipTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="My Facility")
        cls.admin = FacilityUser.objects.create(username="admin", facility=cls.facility)
        cls.facility.add_admin(cls.admin)
        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )

    def test_has_admin_role_for_learner(self):
        self.assertTrue(self.admin.has_role_for(role_kinds.ADMIN, self.learner))

    def test_admin_can_read_learner_object(self):
        self.assertTrue(self.admin.can_read(self.learner))

    def test_learner_is_in_list_of_readable_objects(self):
        self.assertIn(
            self.learner, self.admin.filter_readable(FacilityUser.objects.all())
        )


class ExplicitMembershipTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="My Facility")

        cls.admin = FacilityUser.objects.create(username="admin", facility=cls.facility)
        cls.classroom = Classroom.objects.create(name="Class", parent=cls.facility)
        cls.facility.add_admin(cls.admin)

        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )
        cls.classroom.add_member(cls.learner)
        cls.group = LearnerGroup.objects.create(name="Group", parent=cls.classroom)
        cls.group.add_member(cls.learner)

    def test_has_admin_role_for_learner(self):
        # We do not support classroom admin roles
        self.assertTrue(self.admin.has_role_for(role_kinds.ADMIN, self.learner))

    def test_admin_can_read_learner_object(self):
        # We do not support classroom admin roles
        self.assertTrue(self.admin.can_read(self.learner))

    def test_learner_is_in_list_of_readable_objects(self):
        self.assertIn(
            self.learner, self.admin.filter_readable(FacilityUser.objects.all())
        )

    def test_learnergroup_membership_gets_deleted(self):
        self.classroom.remove_member(self.learner)
        self.assertFalse(
            Membership.objects.filter(collection=self.group, user=self.learner).exists()
        )


class MembershipWithinFacilityTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.data = create_dummy_facility_data()
        cls.anon_user = KolibriAnonymousUser()

    def test_facility_membership(self):
        actual_members = flatten(
            self.data["learners_one_group"]
            + [self.data["learner_all_groups"]]
            + self.data["unattached_users"]
            + [self.data["facility_admin"]]
            + [self.data["facility_coach"]]
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
    @classmethod
    def setUpTestData(cls):
        cls.data1 = create_dummy_facility_data()
        cls.data2 = create_dummy_facility_data()

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
    @classmethod
    def setUpTestData(cls):
        cls.data = create_dummy_facility_data()
        cls.superuser = cls.data["superuser"]
        cls.superuser2 = create_superuser(cls.data["facility"], username="superuser2")

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
    @classmethod
    def setUpTestData(cls):
        cls.data = create_dummy_facility_data()
        cls.anon_user = KolibriAnonymousUser()

    def test_anon_user_has_no_admin_role_for_anyone(self):
        for user in self.data["all_users"]:
            self.assertFalse(self.anon_user.has_role_for(role_kinds.ADMIN, user))

    def test_anon_user_has_no_admin_role_for_any_collection(self):
        for coll in self.data["all_collections"]:
            self.assertFalse(self.anon_user.has_role_for(role_kinds.ADMIN, coll))

    def test_nobody_but_superuser_has_roles_for_anon_user(self):
        for user in self.data["all_users"]:
            if not user.is_superuser:
                self.assertFalse(
                    user.has_role_for(
                        [role_kinds.ADMIN, role_kinds.COACH], self.anon_user
                    )
                )
