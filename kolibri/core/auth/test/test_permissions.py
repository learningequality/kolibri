"""
Tests of the permissions on specific models in the auth app. For tests of the permissions system itself, see test_permission_classes.py
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.test import TestCase

from ..constants import role_kinds
from ..errors import InvalidHierarchyRelationsArgument
from ..filters import HierarchyRelationsFilter
from ..models import Classroom
from ..models import Facility
from ..models import FacilityDataset
from ..models import FacilityUser
from ..models import KolibriAnonymousUser
from ..models import LearnerGroup
from ..models import Membership
from ..models import Role
from .helpers import create_dummy_facility_data
from .helpers import create_superuser
from kolibri.core.device.models import DevicePermissions


class ImproperUsageIsProperlyHandledTestCase(TestCase):
    """
    Tests that error cases and misuse of the interface are properly caught.
    """

    def setUp(self):
        self.data1 = create_dummy_facility_data()
        self.data2 = create_dummy_facility_data()
        self.superuser = self.data1["superuser"]
        self.anon_user = KolibriAnonymousUser()

    def test_that_checking_creation_perms_on_invalid_model_returns_false(self):
        # cannot create a LearnerGroup with invalid attribute name
        self.assertFalse(
            self.data1["facility_admin"].can_create(
                LearnerGroup, {"bad_attr_name": 77, "parent": self.data1["facility"]}
            )
        )
        # cannot create a LearnerGroup with missing attribute value ("name")
        self.assertFalse(
            self.data1["facility_admin"].can_create(
                LearnerGroup, {"parent": self.data1["facility"]}
            )
        )

    def test_that_getting_roles_for_noncollection_fails(self):
        with self.assertRaises(ValueError):
            self.data1["facility_admin"].get_roles_for(object())
        with self.assertRaises(ValueError):
            self.data1["facility_admin"].has_role_for([role_kinds.ADMIN], object())

    def test_that_getting_roles_for_anonuser_returns_false(self):
        self.assertFalse(
            self.data1["facility_admin"].has_role_for_user(
                [role_kinds.ADMIN], self.anon_user
            )
        )

    def test_that_getting_roles_for_user_in_other_facility_returns_false(self):
        self.assertFalse(
            self.data1["facility_admin"].has_role_for_user(
                [role_kinds.ADMIN], self.data2["learners_one_group"][0][0]
            )
        )

    def test_that_invalid_references_to_hierarchyrelationsfilter_throw_errors(self):
        with self.assertRaises(InvalidHierarchyRelationsArgument):
            HierarchyRelationsFilter(Facility).filter_by_hierarchy(target_user=object())
        with self.assertRaises(InvalidHierarchyRelationsArgument):
            HierarchyRelationsFilter(Facility).filter_by_hierarchy(target_user=["test"])


class FacilityDatasetPermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying FacilityData instances
    """

    def setUp(self):
        self.data1 = create_dummy_facility_data()
        self.data2 = create_dummy_facility_data()
        self.superuser = self.data1["superuser"]
        self.anon_user = KolibriAnonymousUser()

    def test_facility_users_and_anon_users_cannot_create_facility_dataset(self):
        """ FacilityUsers can't create new Facilities, regardless of their roles """
        new_facility_dataset = {}
        self.assertFalse(
            self.data1["facility_admin"].can_create(
                FacilityDataset, new_facility_dataset
            )
        )
        self.assertFalse(
            self.data1["classroom_coaches"][0].can_create(
                FacilityDataset, new_facility_dataset
            )
        )
        self.assertFalse(
            self.data1["learners_one_group"][0][0].can_create(
                FacilityDataset, new_facility_dataset
            )
        )
        self.assertFalse(
            self.data1["unattached_users"][0].can_create(
                FacilityDataset, new_facility_dataset
            )
        )

    def test_facility_users_can_read_own_facility_dataset(self):
        """ FacilityUsers can read own FacilityDatasets. """
        own_dataset = self.data1["dataset"]
        self.assertTrue(self.data1["facility_admin"].can_read(own_dataset))
        self.assertTrue(self.data1["classroom_coaches"][0].can_read(own_dataset))
        self.assertTrue(self.data1["learners_one_group"][0][0].can_read(own_dataset))
        self.assertTrue(self.data1["unattached_users"][0].can_read(own_dataset))
        self.assertTrue(self.anon_user.can_read(own_dataset))
        self.assertIn(
            own_dataset, self.anon_user.filter_readable(FacilityDataset.objects.all())
        )

    def test_only_facility_admins_can_update_own_facility_dataset(self):
        """ The only FacilityUser who can update a FacilityDataset is a facility admin for that FacilityDataset """
        own_dataset = self.data1["dataset"]
        self.assertTrue(self.data1["facility_admin"].can_update(own_dataset))
        self.assertFalse(self.data1["classroom_coaches"][0].can_update(own_dataset))
        self.assertFalse(self.data1["learners_one_group"][0][0].can_update(own_dataset))
        self.assertFalse(self.data1["unattached_users"][0].can_update(own_dataset))
        self.assertFalse(self.anon_user.can_update(own_dataset))

    def test_facility_users_and_anon_users_cannot_delete_own_facility_dataset(self):
        """ FacilityUsers can't delete own FacilityDataset, regardless of their roles """
        own_dataset = self.data1["dataset"]
        self.assertFalse(self.data1["facility_admin"].can_delete(own_dataset))
        self.assertFalse(self.data1["classroom_coaches"][0].can_delete(own_dataset))
        self.assertFalse(self.data1["learners_one_group"][0][0].can_delete(own_dataset))
        self.assertFalse(self.data1["unattached_users"][0].can_delete(own_dataset))
        self.assertFalse(self.anon_user.can_delete(own_dataset))

    def test_facility_users_cannot_delete_other_facility_dataset(self):
        """ FacilityUsers can't delete other FacilityDataset, regardless of their roles """
        other_facility_dataset = self.data2["dataset"]
        self.assertFalse(
            self.data1["facility_admin"].can_delete(other_facility_dataset)
        )
        self.assertFalse(
            self.data1["classroom_coaches"][0].can_delete(other_facility_dataset)
        )
        self.assertFalse(
            self.data1["learners_one_group"][0][0].can_delete(other_facility_dataset)
        )
        self.assertFalse(
            self.data1["unattached_users"][0].can_delete(other_facility_dataset)
        )

    def test_superuser_can_do_anything_to_a_facility_dataset(self):
        """ superuser can do anything to a FacilityDataset """

        new_facility_data = {}
        self.assertTrue(self.superuser.can_create(FacilityDataset, new_facility_data))

        facility_dataset = self.data1["dataset"]
        self.assertTrue(self.superuser.can_read(facility_dataset))
        self.assertTrue(self.superuser.can_update(facility_dataset))
        self.assertTrue(self.superuser.can_delete(facility_dataset))

        self.assertSetEqual(
            set(FacilityDataset.objects.all()),
            set(self.superuser.filter_readable(FacilityDataset.objects.all())),
        )


class FacilityPermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying Facility instances
    """

    def setUp(self):
        self.data1 = create_dummy_facility_data()
        self.data2 = create_dummy_facility_data(allow_sign_ups=True)
        self.superuser = self.data1["superuser"]
        self.anon_user = KolibriAnonymousUser()

    def test_facility_users_and_anon_users_cannot_create_facility(self):
        """ FacilityUsers can't create new Facilities, regardless of their roles """
        new_facility_data = {"name": "Home"}
        self.assertFalse(
            self.data1["facility_admin"].can_create(Facility, new_facility_data)
        )
        self.assertFalse(
            self.data1["classroom_coaches"][0].can_create(Facility, new_facility_data)
        )
        self.assertFalse(
            self.data1["learners_one_group"][0][0].can_create(
                Facility, new_facility_data
            )
        )
        self.assertFalse(
            self.data1["unattached_users"][0].can_create(Facility, new_facility_data)
        )

    def test_facility_users_can_read_own_facility(self):
        """ FacilityUsers can read their own Facility, regardless of their roles """
        own_facility = self.data1["facility"]
        for user in [
            self.data1["facility_admin"],
            self.data1["classroom_coaches"][0],
            self.data1["learners_one_group"][0][0],
            self.data1["unattached_users"][0],
        ]:
            self.assertTrue(user.can_read(own_facility))
            self.assertIn(own_facility, user.filter_readable(Facility.objects.all()))

    def test_facility_users_cannot_read_other_facility(self):
        """ FacilityUsers cannot read other Facilities, regardless of their roles """
        other_facility = self.data2["facility"]
        for user in [
            self.data1["facility_admin"],
            self.data1["classroom_coaches"][0],
            self.data1["learners_one_group"][0][0],
            self.data1["unattached_users"][0],
        ]:
            self.assertFalse(user.can_read(other_facility))
            self.assertNotIn(
                other_facility, user.filter_readable(Facility.objects.all())
            )

    def test_anon_users_can_read_facility(self):
        """ KolibriAnonymousUser can now read Facility objects """
        self.assertTrue(self.anon_user.can_read(self.data1["facility"]))
        self.assertIn(
            self.data1["facility"],
            self.anon_user.filter_readable(Facility.objects.all()),
        )

    def test_only_facility_admins_can_update_own_facility(self):
        """ The only FacilityUser who can update a Facility is a facility admin for that Facility """
        own_facility = self.data1["facility"]
        self.assertTrue(self.data1["facility_admin"].can_update(own_facility))
        self.assertFalse(self.data1["classroom_coaches"][0].can_update(own_facility))
        self.assertFalse(
            self.data1["learners_one_group"][0][0].can_update(own_facility)
        )
        self.assertFalse(self.data1["unattached_users"][0].can_update(own_facility))
        self.assertFalse(self.anon_user.can_update(own_facility))

    def test_facility_users_cannot_update_other_facility(self):
        """ FacilityUsers cannot update other Facilities, regardless of their roles """
        other_facility = self.data2["facility"]
        self.assertFalse(self.data1["facility_admin"].can_update(other_facility))
        self.assertFalse(self.data1["classroom_coaches"][0].can_update(other_facility))
        self.assertFalse(
            self.data1["learners_one_group"][0][0].can_update(other_facility)
        )
        self.assertFalse(self.data1["unattached_users"][0].can_update(other_facility))

    def test_facility_users_and_anon_users_cannot_delete_own_facility(self):
        """ FacilityUsers can't delete own Facility, regardless of their roles """
        own_facility = self.data1["facility"]
        self.assertFalse(self.data1["facility_admin"].can_delete(own_facility))
        self.assertFalse(self.data1["classroom_coaches"][0].can_delete(own_facility))
        self.assertFalse(
            self.data1["learners_one_group"][0][0].can_delete(own_facility)
        )
        self.assertFalse(self.data1["unattached_users"][0].can_delete(own_facility))
        self.assertFalse(self.anon_user.can_delete(own_facility))

    def test_facility_users_cannot_delete_other_facility(self):
        """ FacilityUsers can't delete other Facility, regardless of their roles """
        other_facility = self.data2["facility"]
        self.assertFalse(self.data1["facility_admin"].can_delete(other_facility))
        self.assertFalse(self.data1["classroom_coaches"][0].can_delete(other_facility))
        self.assertFalse(
            self.data1["learners_one_group"][0][0].can_delete(other_facility)
        )
        self.assertFalse(self.data1["unattached_users"][0].can_delete(other_facility))

    def test_superuser_can_do_anything_to_a_facility(self):
        """ superuser can do anything to a Facility """

        new_facility_data = {"name": "Home"}
        self.assertTrue(self.superuser.can_create(Facility, new_facility_data))

        facility = self.data1["facility"]
        self.assertTrue(self.superuser.can_read(facility))
        self.assertTrue(self.superuser.can_update(facility))
        self.assertTrue(self.superuser.can_delete(facility))

        self.assertSetEqual(
            set(Facility.objects.all()),
            set(self.superuser.filter_readable(Facility.objects.all())),
        )


class ClassroomPermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying Classroom instances
    """

    def setUp(self):
        self.data = create_dummy_facility_data()
        self.member = self.data["learners_one_group"][0][0]
        self.own_classroom = self.data["classrooms"][0]
        self.other_classroom = self.data["classrooms"][1]
        self.own_classroom_coach = self.data["classroom_coaches"][0]
        self.own_classroom_admin = self.data["classroom_admins"][0]
        self.superuser = self.data["superuser"]
        self.anon_user = KolibriAnonymousUser()

    def test_only_facility_admin_can_create_classroom(self):
        """ The only FacilityUser who can create a Classroom is a facility admin for the Facility """
        new_classroom_data = {"name": "Home", "parent": self.data["facility"]}
        self.assertTrue(
            self.data["facility_admin"].can_create(Classroom, new_classroom_data)
        )
        self.assertFalse(
            self.own_classroom_coach.can_create(Classroom, new_classroom_data)
        )
        self.assertFalse(self.member.can_create(Classroom, new_classroom_data))
        self.assertFalse(
            self.data["unattached_users"][0].can_create(Classroom, new_classroom_data)
        )
        self.assertFalse(self.anon_user.can_create(Classroom, new_classroom_data))

    def test_members_can_read_own_classroom(self):
        """ Members of a Classroom can read that Classroom, as can coaches and admins for the Classroom """
        for user in [
            self.data["facility_admin"],
            self.own_classroom_coach,
            self.own_classroom_admin,
            self.member,
        ]:
            self.assertTrue(user.can_read(self.own_classroom))
            self.assertIn(
                self.own_classroom, user.filter_readable(Classroom.objects.all())
            )

    def test_members_and_classroom_admins_and_coaches_can_read_other_classroom(self):
        """ Members and admins/coaches for a Classroom can read another Classroom """
        for user in [
            self.data["facility_admin"],
            self.own_classroom_coach,
            self.own_classroom_admin,
            self.member,
        ]:
            self.assertTrue(user.can_read(self.other_classroom))
            self.assertIn(
                self.other_classroom, user.filter_readable(Classroom.objects.all())
            )

    def test_only_admins_can_update_own_classroom(self):
        """ The only FacilityUsers who can update a Classroom are admins for that Classroom (or for the Facility) """
        self.assertTrue(self.data["facility_admin"].can_update(self.own_classroom))
        self.assertTrue(self.own_classroom_admin.can_update(self.own_classroom))
        self.assertFalse(self.own_classroom_coach.can_update(self.own_classroom))
        self.assertFalse(self.member.can_update(self.own_classroom))
        self.assertFalse(self.anon_user.can_update(self.own_classroom))

    def test_facility_users_cannot_update_other_classroom(self):
        """ FacilityUsers cannot update other Classrooms, unless they are a facility admin """
        self.assertFalse(self.own_classroom_admin.can_update(self.other_classroom))
        self.assertFalse(self.own_classroom_coach.can_update(self.other_classroom))
        self.assertFalse(self.member.can_update(self.other_classroom))

    def test_only_admins_can_delete_own_classroom(self):
        """ The only FacilityUsers who can delete a Classroom are admins for the Facility """
        self.assertTrue(self.data["facility_admin"].can_delete(self.own_classroom))
        self.assertFalse(self.own_classroom_admin.can_delete(self.own_classroom))
        self.assertFalse(self.own_classroom_coach.can_delete(self.own_classroom))
        self.assertFalse(self.member.can_delete(self.own_classroom))
        self.assertFalse(self.anon_user.can_delete(self.own_classroom))

    def test_facility_users_cannot_delete_other_classroom(self):
        """ FacilityUsers cannot delete other Classrooms, unless they are a facility admin """
        self.assertFalse(self.own_classroom_admin.can_delete(self.other_classroom))
        self.assertFalse(self.own_classroom_coach.can_delete(self.other_classroom))
        self.assertFalse(self.member.can_delete(self.other_classroom))

    def test_superuser_can_do_anything_to_a_classroom(self):
        """ superuser can do anything to a Classroom """
        new_classroom_data = {"name": "Home", "parent": self.data["facility"]}
        self.assertTrue(self.superuser.can_create(Classroom, new_classroom_data))
        self.assertTrue(self.superuser.can_read(self.own_classroom))
        self.assertTrue(self.superuser.can_update(self.own_classroom))
        self.assertTrue(self.superuser.can_delete(self.own_classroom))

        self.assertSetEqual(
            set(Classroom.objects.all()),
            set(self.superuser.filter_readable(Classroom.objects.all())),
        )


class LearnerGroupPermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying LearnerGroup instances
    """

    def setUp(self):
        self.data = create_dummy_facility_data()
        self.member = self.data["learners_one_group"][0][0]
        self.own_learnergroup = self.data["learnergroups"][0][0]
        self.other_learnergroup = self.data["learnergroups"][1][1]
        self.own_classroom = self.data["classrooms"][0]
        self.own_classroom_coach = self.data["classroom_coaches"][0]
        self.own_classroom_admin = self.data["classroom_admins"][0]
        self.other_classroom_admin = self.data["classroom_admins"][1]
        self.other_classroom_coach = self.data["classroom_coaches"][1]
        self.superuser = self.data["superuser"]
        self.anon_user = KolibriAnonymousUser()

    def test_facility_or_classroom_admins_or_classroom_coach_can_create_learnergroup(
        self,
    ):
        """ The FacilityUser who can create a LearnerGroup is a facility admin for the Facility or coach for the classroom"""
        new_learnergroup_data = {"name": "Cool Group", "parent": self.own_classroom}
        self.assertTrue(
            self.data["facility_admin"].can_create(LearnerGroup, new_learnergroup_data)
        )
        self.assertTrue(
            self.own_classroom_admin.can_create(LearnerGroup, new_learnergroup_data)
        )
        self.assertFalse(
            self.other_classroom_admin.can_create(LearnerGroup, new_learnergroup_data)
        )
        self.assertTrue(
            self.own_classroom_coach.can_create(LearnerGroup, new_learnergroup_data)
        )
        self.assertFalse(
            self.other_classroom_coach.can_create(LearnerGroup, new_learnergroup_data)
        )
        self.assertFalse(self.member.can_create(LearnerGroup, new_learnergroup_data))
        self.assertFalse(
            self.data["unattached_users"][0].can_create(
                LearnerGroup, new_learnergroup_data
            )
        )
        self.assertFalse(self.anon_user.can_create(LearnerGroup, new_learnergroup_data))

    def test_members_can_read_own_learnergroup(self):
        """ Members of a LearnerGroup can read that LearnerGroup, as can coaches and admins for the LearnerGroup """
        for user in [
            self.data["facility_admin"],
            self.own_classroom_coach,
            self.own_classroom_admin,
            self.member,
        ]:
            self.assertTrue(user.can_read(self.own_learnergroup))
            self.assertIn(
                self.own_learnergroup, user.filter_readable(LearnerGroup.objects.all())
            )

    def test_admins_or_coach_can_update_own_learnergroup(self):
        """ The only FacilityUsers who can update a LearnerGroup are admins for that LearnerGroup """
        self.assertTrue(self.data["facility_admin"].can_update(self.own_learnergroup))
        self.assertTrue(self.own_classroom_admin.can_update(self.own_learnergroup))
        self.assertTrue(self.own_classroom_coach.can_update(self.own_learnergroup))
        self.assertFalse(self.member.can_update(self.own_learnergroup))
        self.assertFalse(self.anon_user.can_update(self.own_learnergroup))

    def test_facility_users_cannot_update_other_learnergroup(self):
        """ FacilityUsers cannot update other LearnerGroups, unless they are a facility admin """
        self.assertFalse(self.own_classroom_admin.can_update(self.other_learnergroup))
        self.assertFalse(self.own_classroom_coach.can_update(self.other_learnergroup))
        self.assertFalse(self.member.can_update(self.other_learnergroup))

    def test_admins_or_coach_can_delete_own_learnergroup(self):
        """ The only FacilityUsers who can delete a LearnerGroup are admins for that LearnerGroup """
        self.assertTrue(self.data["facility_admin"].can_delete(self.own_learnergroup))
        self.assertTrue(self.own_classroom_admin.can_delete(self.own_learnergroup))
        self.assertTrue(self.own_classroom_coach.can_delete(self.own_learnergroup))
        self.assertFalse(self.member.can_delete(self.own_learnergroup))
        self.assertFalse(self.anon_user.can_delete(self.own_learnergroup))

    def test_facility_users_cannot_delete_other_learnergroup(self):
        """ FacilityUsers cannot delete other LearnerGroups, if they aren't admin for Facility or parent Classroom """
        self.assertFalse(self.own_classroom_admin.can_delete(self.other_learnergroup))
        self.assertFalse(self.own_classroom_coach.can_delete(self.other_learnergroup))
        self.assertFalse(self.member.can_delete(self.other_learnergroup))

    def test_superuser_can_do_anything_to_a_learnergroup(self):
        """ superuser can do anything to a LearnerGroup """
        new_learnergroup_data = {"name": "Cool Group", "parent": self.own_classroom}
        self.assertTrue(self.superuser.can_create(LearnerGroup, new_learnergroup_data))
        self.assertTrue(self.superuser.can_read(self.own_learnergroup))
        self.assertTrue(self.superuser.can_update(self.own_learnergroup))
        self.assertTrue(self.superuser.can_delete(self.own_learnergroup))

        self.assertSetEqual(
            set(LearnerGroup.objects.all()),
            set(self.superuser.filter_readable(LearnerGroup.objects.all())),
        )


class FacilityUserPermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying FacilityUser instances
    """

    def setUp(self):
        self.data = create_dummy_facility_data()
        self.data2 = create_dummy_facility_data()
        self.member = self.data["learners_one_group"][0][0]
        self.member2 = self.data2["learners_one_group"][0][0]
        self.other_member = self.data["learners_one_group"][1][1]
        self.own_learnergroup = self.data["learnergroups"][0][0]
        self.own_classroom = self.data["classrooms"][0]
        self.own_classroom_coach = self.data["classroom_coaches"][0]
        self.own_classroom_admin = self.data["classroom_admins"][0]
        self.other_classroom_admin = self.data["classroom_admins"][1]
        self.superuser = self.data["superuser"]
        self.anon_user = KolibriAnonymousUser()

    def test_only_facility_admins_can_create_facility_user(self):
        """ The only FacilityUser who can create a FacilityUser is a facility admin for the Facility """
        new_facilityuser_data = {
            "username": "janedoe",
            "password": "*",
            "facility": self.data["facility"],
        }
        self.assertTrue(
            self.data["facility_admin"].can_create(FacilityUser, new_facilityuser_data)
        )
        self.assertFalse(
            self.data["facility_coach"].can_create(FacilityUser, new_facilityuser_data)
        )
        self.assertFalse(
            self.own_classroom_admin.can_create(FacilityUser, new_facilityuser_data)
        )
        self.assertFalse(
            self.own_classroom_coach.can_create(FacilityUser, new_facilityuser_data)
        )
        self.assertFalse(self.member.can_create(FacilityUser, new_facilityuser_data))
        self.assertFalse(
            self.data["unattached_users"][0].can_create(
                FacilityUser, new_facilityuser_data
            )
        )
        self.assertFalse(self.anon_user.can_create(FacilityUser, new_facilityuser_data))

    def test_no_facility_user_can_create_facility_user_for_other_facility(self):
        """ FacilityUsers cannot create a FacilityUser for a different Facility """
        new_facilityuser_data = {
            "username": "janedoe",
            "password": "*",
            "facility": self.data2["facility"],
        }
        self.assertFalse(
            self.data["facility_admin"].can_create(FacilityUser, new_facilityuser_data)
        )
        self.assertFalse(
            self.data["facility_coach"].can_create(FacilityUser, new_facilityuser_data)
        )
        self.assertFalse(
            self.own_classroom_admin.can_create(FacilityUser, new_facilityuser_data)
        )
        self.assertFalse(
            self.own_classroom_coach.can_create(FacilityUser, new_facilityuser_data)
        )
        self.assertFalse(self.member.can_create(FacilityUser, new_facilityuser_data))
        self.assertFalse(
            self.data["unattached_users"][0].can_create(
                FacilityUser, new_facilityuser_data
            )
        )

    def test_facility_user_can_read_self(self):
        """ A FacilityUser can read its own FacilityUser model """
        for user in [
            self.own_classroom_admin,
            self.member,
            self.own_classroom_coach,
            self.data["facility_admin"],
        ]:
            self.assertTrue(user.can_read(user))
            self.assertIn(user, user.filter_readable(FacilityUser.objects.all()))

    def test_admins_and_coaches_can_read_facility_users(self):
        """ Users with admin/coach role for a FacilityUser can read that FacilityUser """
        for user in [
            self.own_classroom_admin,
            self.own_classroom_coach,
            self.data["facility_admin"],
            self.data["facility_coach"],
        ]:
            self.assertTrue(user.can_read(self.member))
            self.assertIn(self.member, user.filter_readable(FacilityUser.objects.all()))

    def test_members_and_admins_and_coaches_for_other_classrooms_cannot_read_facility_users(
        self,
    ):
        """ Users without admin/coach role for a specific FacilityUser cannot read that FacilityUser """
        for user in [
            self.own_classroom_coach,
            self.own_classroom_admin,
            self.member,
            self.anon_user,
        ]:
            self.assertFalse(user.can_read(self.other_member))
            self.assertNotIn(
                self.other_member, user.filter_readable(FacilityUser.objects.all())
            )

    def test_only_facility_admins_and_coaches_can_read_unaffiliated_facility_users(
        self,
    ):
        """ Only Facility admins/coaches can read FacilityUser that is not a member of a Classroom or LearnerGroup """
        orphan = self.data["unattached_users"][0]
        for user in [self.data["facility_admin"], self.data["facility_coach"]]:
            self.assertTrue(user.can_read(orphan))
            self.assertIn(orphan, user.filter_readable(FacilityUser.objects.all()))
        for user in [
            self.own_classroom_coach,
            self.own_classroom_admin,
            self.member,
            self.anon_user,
        ]:
            self.assertFalse(user.can_read(orphan))
            self.assertNotIn(orphan, user.filter_readable(FacilityUser.objects.all()))

    def test_facility_user_can_update_self(self):
        """ A FacilityUser can update its own FacilityUser model """
        self.assertTrue(self.member.can_update(self.member))
        self.assertTrue(self.own_classroom_coach.can_update(self.own_classroom_coach))
        self.assertTrue(self.own_classroom_admin.can_update(self.own_classroom_admin))
        self.assertTrue(
            self.data["facility_admin"].can_update(self.data["facility_admin"])
        )

    def test_admins_but_not_coaches_can_update_facility_users(self):
        """ Users with admin (but not coach) role for a FacilityUser can update that FacilityUser """
        self.assertTrue(self.data["facility_admin"].can_update(self.member))
        self.assertFalse(self.data["facility_coach"].can_update(self.member))
        self.assertTrue(self.own_classroom_admin.can_update(self.member))
        self.assertFalse(self.own_classroom_coach.can_update(self.member))

    def test_admins_and_coaches_for_other_classrooms_cannot_update_facility_users(self):
        """ Users without admin/coach role for a specific FacilityUser cannot update that FacilityUser """
        self.assertFalse(self.own_classroom_coach.can_update(self.other_member))
        self.assertFalse(self.own_classroom_admin.can_update(self.other_member))

    def test_only_facility_admins_can_update_unaffiliated_facility_users(self):
        """ Only Facility admins can update FacilityUser that is not a member of a Classroom or LearnerGroup """
        orphan = self.data["unattached_users"][0]
        self.assertTrue(self.data["facility_admin"].can_update(orphan))
        self.assertFalse(self.data["facility_coach"].can_update(orphan))
        self.assertFalse(self.own_classroom_admin.can_update(orphan))
        self.assertFalse(self.own_classroom_coach.can_update(orphan))
        self.assertFalse(self.member.can_update(orphan))
        self.assertFalse(self.anon_user.can_update(orphan))

    def test_facility_user_cannot_delete_self(self):
        """ A FacilityUser cannot delete its own FacilityUser model """
        self.assertFalse(self.member.can_delete(self.member))
        self.assertFalse(self.own_classroom_coach.can_delete(self.own_classroom_coach))
        self.assertFalse(self.own_classroom_admin.can_delete(self.own_classroom_admin))
        self.assertFalse(
            self.data["facility_admin"].can_delete(self.data["facility_admin"])
        )

    def test_only_facility_admins_can_delete_facility_user(self):
        """ The only FacilityUsers who can delete a FacilityUser are admins for the Facility """
        self.assertTrue(self.data["facility_admin"].can_delete(self.member))
        self.assertFalse(self.data["facility_coach"].can_delete(self.member))
        self.assertFalse(self.own_classroom_admin.can_delete(self.member))
        self.assertFalse(self.own_classroom_coach.can_delete(self.member))
        self.assertFalse(self.anon_user.can_delete(self.member))

    def test_facility_users_cannot_delete_facility_users_from_other_facility(self):
        """ FacilityUsers cannot delete FacilityUsers from another Facility """
        self.assertFalse(self.data["facility_admin"].can_delete(self.member2))
        self.assertFalse(self.data["facility_coach"].can_delete(self.member2))
        self.assertFalse(self.own_classroom_admin.can_delete(self.member2))
        self.assertFalse(self.own_classroom_coach.can_delete(self.member2))
        self.assertFalse(self.member.can_delete(self.member2))

    def test_superuser_can_do_anything_to_a_facility_user(self):
        """ superuser can do anything to a FacilityUser """
        new_facilityuser_data_1 = {
            "username": "janedoe",
            "password": "*",
            "facility": self.data["facility"],
        }
        self.assertTrue(
            self.superuser.can_create(FacilityUser, new_facilityuser_data_1)
        )
        new_facilityuser_data_2 = {
            "username": "janedoe",
            "password": "*",
            "facility": self.data2["facility"],
        }
        self.assertTrue(
            self.superuser.can_create(FacilityUser, new_facilityuser_data_2)
        )
        self.assertTrue(self.superuser.can_read(self.member))
        self.assertTrue(self.superuser.can_update(self.member))
        self.assertTrue(self.superuser.can_delete(self.member))

        self.assertSetEqual(
            set(FacilityUser.objects.all()),
            set(self.superuser.filter_readable(FacilityUser.objects.all())),
        )

    def test_superuser_cannot_delete_self(self):
        """ superuser can't delete themselves """
        self.assertFalse(self.superuser.can_delete(self.superuser))


class SuperuserPermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying superuser permissions
    """

    def setUp(self):
        self.data = create_dummy_facility_data()
        self.member = self.data["learners_one_group"][0][0]
        self.own_classroom_coach = self.data["classroom_coaches"][0]
        self.own_classroom_admin = self.data["classroom_admins"][0]
        self.superuser = self.data["superuser"]
        self.superuser2 = create_superuser(self.data["facility"], username="ubermensch")
        self.anon_user = KolibriAnonymousUser()

    def test_non_superusers_cannot_create_superuser(self):
        """ Users who are not Superusers cannot create a DevicePermissions """
        new_devicepermission_data = {
            "user_id": self.data["facility_admin"].id,
            "is_superuser": True,
        }
        self.assertFalse(
            self.data["facility_admin"].can_create(
                DevicePermissions, new_devicepermission_data
            )
        )
        self.assertFalse(
            self.data["facility_coach"].can_create(
                DevicePermissions, new_devicepermission_data
            )
        )
        self.assertFalse(
            self.own_classroom_admin.can_create(
                DevicePermissions, new_devicepermission_data
            )
        )
        self.assertFalse(
            self.own_classroom_coach.can_create(
                DevicePermissions, new_devicepermission_data
            )
        )
        self.assertFalse(
            self.member.can_create(DevicePermissions, new_devicepermission_data)
        )
        self.assertFalse(
            self.data["unattached_users"][0].can_create(
                DevicePermissions, new_devicepermission_data
            )
        )
        self.assertFalse(
            self.anon_user.can_create(DevicePermissions, new_devicepermission_data)
        )

    def test_non_superusers_cannot_read_devicepermission(self):
        """ Users who are not superusers cannot read DevicePermission """
        for user in [
            self.data["facility_admin"],
            self.data["facility_coach"],
            self.own_classroom_admin,
            self.own_classroom_coach,
            self.member,
            self.data["unattached_users"][0],
            self.anon_user,
        ]:
            self.assertFalse(user.can_read(self.superuser.devicepermissions))
            self.assertEqual(
                len(user.filter_readable(DevicePermissions.objects.all())), 0
            )

    def test_non_superusers_cannot_update_devicepermissions(self):
        """ Users who are not superuser cannot update DevicePermission """
        self.assertFalse(
            self.data["facility_admin"].can_update(self.superuser.devicepermissions)
        )
        self.assertFalse(
            self.data["facility_coach"].can_update(self.superuser.devicepermissions)
        )
        self.assertFalse(
            self.own_classroom_admin.can_update(self.superuser.devicepermissions)
        )
        self.assertFalse(
            self.own_classroom_coach.can_update(self.superuser.devicepermissions)
        )
        self.assertFalse(self.member.can_update(self.superuser.devicepermissions))
        self.assertFalse(
            self.data["unattached_users"][0].can_update(
                self.superuser.devicepermissions
            )
        )
        self.assertFalse(self.anon_user.can_update(self.superuser.devicepermissions))

    def test_non_superusers_cannot_delete_devicepermissions(self):
        """ Users who are not superusers cannot delete a DevicePermission """
        self.assertFalse(
            self.data["facility_admin"].can_delete(self.superuser.devicepermissions)
        )
        self.assertFalse(
            self.data["facility_coach"].can_delete(self.superuser.devicepermissions)
        )
        self.assertFalse(
            self.own_classroom_admin.can_delete(self.superuser.devicepermissions)
        )
        self.assertFalse(
            self.own_classroom_coach.can_delete(self.superuser.devicepermissions)
        )
        self.assertFalse(self.member.can_delete(self.superuser.devicepermissions))
        self.assertFalse(
            self.data["unattached_users"][0].can_delete(
                self.superuser.devicepermissions
            )
        )
        self.assertFalse(self.anon_user.can_delete(self.superuser.devicepermissions))

    def test_superuser_can_do_anything_to_other_devicepermission(self):
        """ Superuser can do anything to DevicePermissions """

        new_devicepermission_data = {
            "user_id": self.data["facility_admin"].id,
            "is_superuser": True,
        }
        self.assertTrue(
            self.superuser.can_create(DevicePermissions, new_devicepermission_data)
        )

        self.assertTrue(self.superuser.can_read(self.superuser.devicepermissions))
        self.assertFalse(self.superuser.can_update(self.superuser.devicepermissions))
        self.assertFalse(self.superuser.can_delete(self.superuser.devicepermissions))

        self.assertTrue(self.superuser.can_read(self.superuser2.devicepermissions))
        self.assertTrue(self.superuser.can_update(self.superuser2.devicepermissions))
        self.assertTrue(self.superuser.can_delete(self.superuser2.devicepermissions))


class RolePermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying Role instances
    """

    def setUp(self):
        self.data = create_dummy_facility_data()
        self.member = self.data["learners_one_group"][0][0]
        self.own_classroom = self.data["classrooms"][0]
        self.other_classroom = self.data["classrooms"][1]
        self.own_classroom_coach = self.data["classroom_coaches"][0]
        self.own_classroom_admin = self.data["classroom_admins"][0]
        self.other_classroom_coach = self.data["classroom_coaches"][1]
        self.other_classroom_admin = self.data["classroom_admins"][1]
        self.superuser = self.data["superuser"]
        self.role_user = self.data["unattached_users"][0]
        self.anon_user = KolibriAnonymousUser()

    def test_facility_admin_can_create_facility_admin_role(self):
        new_role_data = {
            "user": self.role_user,
            "collection": self.data["facility"],
            "kind": role_kinds.ADMIN,
        }
        self.assertTrue(self.data["facility_admin"].can_create(Role, new_role_data))
        self.assertFalse(self.data["facility_coach"].can_create(Role, new_role_data))
        self.assertFalse(self.own_classroom_admin.can_create(Role, new_role_data))
        self.assertFalse(self.own_classroom_coach.can_create(Role, new_role_data))
        self.assertFalse(self.member.can_create(Role, new_role_data))
        self.assertFalse(self.role_user.can_create(Role, new_role_data))
        self.assertTrue(self.superuser.can_create(Role, new_role_data))

    def test_facility_admin_can_create_facility_coach_role(self):
        new_role_data = {
            "user": self.role_user,
            "collection": self.data["facility"],
            "kind": role_kinds.COACH,
        }
        self.assertTrue(self.data["facility_admin"].can_create(Role, new_role_data))
        self.assertFalse(self.data["facility_coach"].can_create(Role, new_role_data))
        self.assertFalse(self.own_classroom_admin.can_create(Role, new_role_data))
        self.assertFalse(self.own_classroom_coach.can_create(Role, new_role_data))
        self.assertFalse(self.member.can_create(Role, new_role_data))
        self.assertFalse(self.role_user.can_create(Role, new_role_data))
        self.assertTrue(self.superuser.can_create(Role, new_role_data))
        self.assertFalse(self.anon_user.can_create(Role, new_role_data))

    def test_facility_or_classroom_admin_can_create_classroom_admin_role(self):
        new_role_data = {
            "user": self.role_user,
            "collection": self.own_classroom,
            "kind": role_kinds.ADMIN,
        }
        self.assertTrue(self.data["facility_admin"].can_create(Role, new_role_data))
        self.assertFalse(self.data["facility_coach"].can_create(Role, new_role_data))
        self.assertTrue(self.own_classroom_admin.can_create(Role, new_role_data))
        self.assertFalse(self.own_classroom_coach.can_create(Role, new_role_data))
        self.assertFalse(self.other_classroom_admin.can_create(Role, new_role_data))
        self.assertFalse(self.other_classroom_coach.can_create(Role, new_role_data))
        self.assertFalse(self.member.can_create(Role, new_role_data))
        self.assertFalse(self.role_user.can_create(Role, new_role_data))
        self.assertTrue(self.superuser.can_create(Role, new_role_data))
        self.assertFalse(self.anon_user.can_create(Role, new_role_data))

    def test_facility_or_classroom_admin_can_create_classroom_coach_role(self):
        new_role_data = {
            "user": self.role_user,
            "collection": self.own_classroom,
            "kind": role_kinds.COACH,
        }
        self.assertTrue(self.data["facility_admin"].can_create(Role, new_role_data))
        self.assertFalse(self.data["facility_coach"].can_create(Role, new_role_data))
        self.assertTrue(self.own_classroom_admin.can_create(Role, new_role_data))
        self.assertFalse(self.own_classroom_coach.can_create(Role, new_role_data))
        self.assertFalse(self.other_classroom_admin.can_create(Role, new_role_data))
        self.assertFalse(self.other_classroom_coach.can_create(Role, new_role_data))
        self.assertFalse(self.member.can_create(Role, new_role_data))
        self.assertFalse(self.role_user.can_create(Role, new_role_data))
        self.assertTrue(self.superuser.can_create(Role, new_role_data))
        self.assertFalse(self.anon_user.can_create(Role, new_role_data))

    def test_facility_admin_or_coach_can_read_facility_admin_role(self):
        role = Role.objects.create(
            user=self.role_user, collection=self.data["facility"], kind=role_kinds.ADMIN
        )
        for user in [
            self.data["facility_admin"],
            self.data["facility_coach"],
            self.role_user,
            self.superuser,
        ]:
            self.assertTrue(user.can_read(role))
            self.assertIn(role, user.filter_readable(Role.objects.all()))
        for user in [
            self.own_classroom_admin,
            self.own_classroom_coach,
            self.other_classroom_admin,
            self.other_classroom_coach,
            self.member,
            self.anon_user,
        ]:
            self.assertFalse(user.can_read(role))
            self.assertNotIn(role, user.filter_readable(Role.objects.all()))

    def test_facility_or_classroom_admin_or_coach_can_read_classroom_admin_role(self):
        role = Role.objects.create(
            user=self.role_user, collection=self.own_classroom, kind=role_kinds.ADMIN
        )
        self.assertTrue(self.data["facility_admin"].can_read(role))
        self.assertTrue(self.data["facility_coach"].can_read(role))
        self.assertTrue(self.own_classroom_admin.can_read(role))
        self.assertTrue(self.own_classroom_coach.can_read(role))
        self.assertFalse(self.other_classroom_admin.can_read(role))
        self.assertFalse(self.other_classroom_coach.can_read(role))
        self.assertFalse(self.member.can_read(role))
        self.assertTrue(self.role_user.can_read(role))
        self.assertTrue(self.superuser.can_read(role))
        self.assertFalse(self.anon_user.can_read(role))

    def test_facility_users_cannot_update_roles(self):
        # None of the fields in a role are "mutable", so there's no reason to allow updates
        # (changing a role from one kind to another means deleting the existing role and creating another)
        role = Role.objects.create(
            user=self.role_user, collection=self.own_classroom, kind=role_kinds.COACH
        )
        self.assertFalse(self.data["facility_admin"].can_update(role))
        self.assertFalse(self.data["facility_coach"].can_update(role))
        self.assertFalse(self.own_classroom_admin.can_update(role))
        self.assertFalse(self.own_classroom_coach.can_update(role))
        self.assertFalse(self.other_classroom_admin.can_update(role))
        self.assertFalse(self.other_classroom_coach.can_update(role))
        self.assertFalse(self.member.can_update(role))
        self.assertFalse(self.role_user.can_update(role))
        self.assertFalse(self.anon_user.can_update(role))

    def test_facility_admin_can_delete_facility_admin_role(self):
        role = Role.objects.create(
            user=self.role_user, collection=self.data["facility"], kind=role_kinds.ADMIN
        )
        self.assertTrue(self.data["facility_admin"].can_delete(role))
        self.assertFalse(self.data["facility_coach"].can_delete(role))
        self.assertFalse(self.own_classroom_admin.can_delete(role))
        self.assertFalse(self.own_classroom_coach.can_delete(role))
        self.assertFalse(self.member.can_delete(role))
        self.assertTrue(self.role_user.can_delete(role))
        self.assertTrue(self.superuser.can_delete(role))
        self.assertFalse(self.anon_user.can_delete(role))

    def test_facility_admin_can_delete_facility_coach_role(self):
        role = Role.objects.create(
            user=self.role_user, collection=self.data["facility"], kind=role_kinds.COACH
        )
        self.assertTrue(self.data["facility_admin"].can_delete(role))
        self.assertFalse(self.data["facility_coach"].can_delete(role))
        self.assertFalse(self.own_classroom_admin.can_delete(role))
        self.assertFalse(self.own_classroom_coach.can_delete(role))
        self.assertFalse(self.member.can_delete(role))
        self.assertFalse(self.role_user.can_delete(role))
        self.assertTrue(self.superuser.can_delete(role))
        self.assertFalse(self.anon_user.can_delete(role))

    def test_facility_or_classroom_admin_can_delete_classroom_admin_role(self):
        role = Role.objects.create(
            user=self.role_user, collection=self.own_classroom, kind=role_kinds.ADMIN
        )
        self.assertTrue(self.data["facility_admin"].can_delete(role))
        self.assertFalse(self.data["facility_coach"].can_delete(role))
        self.assertTrue(self.own_classroom_admin.can_delete(role))
        self.assertFalse(self.own_classroom_coach.can_delete(role))
        self.assertFalse(self.other_classroom_admin.can_delete(role))
        self.assertFalse(self.other_classroom_coach.can_delete(role))
        self.assertFalse(self.member.can_delete(role))
        self.assertTrue(
            self.role_user.can_delete(role)
        )  # the role's user can delete it as she is an admin for collection
        self.assertTrue(self.superuser.can_delete(role))
        self.assertFalse(self.anon_user.can_delete(role))

    def test_facility_or_classroom_admin_can_delete_classroom_coach_role(self):
        role = Role.objects.create(
            user=self.role_user, collection=self.own_classroom, kind=role_kinds.COACH
        )
        self.assertTrue(self.data["facility_admin"].can_delete(role))
        self.assertFalse(self.data["facility_coach"].can_delete(role))
        self.assertTrue(self.own_classroom_admin.can_delete(role))
        self.assertFalse(self.own_classroom_coach.can_delete(role))
        self.assertFalse(self.other_classroom_admin.can_delete(role))
        self.assertFalse(self.other_classroom_coach.can_delete(role))
        self.assertFalse(self.member.can_delete(role))
        self.assertFalse(self.role_user.can_delete(role))
        self.assertTrue(self.superuser.can_delete(role))
        self.assertFalse(self.anon_user.can_delete(role))


class MembershipPermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying Membership instances
    """

    def setUp(self):
        self.data = create_dummy_facility_data()
        self.member = self.data["learners_one_group"][0][0]
        self.own_classroom = self.data["classrooms"][0]
        self.other_classroom = self.data["classrooms"][1]
        self.own_learnergroup = self.data["learnergroups"][0][0]
        self.other_learnergroup = self.data["learnergroups"][1][1]
        self.own_classroom_coach = self.data["classroom_coaches"][0]
        self.own_classroom_admin = self.data["classroom_admins"][0]
        self.other_classroom_coach = self.data["classroom_coaches"][1]
        self.other_classroom_admin = self.data["classroom_admins"][1]
        self.superuser = self.data["superuser"]
        self.anon_user = KolibriAnonymousUser()

    def test_admin_or_coach_for_user_can_create_membership(self):
        # try adding member of own_classroom as a member of other_classroom
        new_membership_data = {
            "user": self.member,
            "collection": self.other_learnergroup,
        }
        self.assertTrue(
            self.data["facility_admin"].can_create(Membership, new_membership_data)
        )
        self.assertFalse(
            self.data["facility_coach"].can_create(Membership, new_membership_data)
        )
        self.assertTrue(
            self.own_classroom_admin.can_create(Membership, new_membership_data)
        )
        self.assertFalse(
            self.own_classroom_coach.can_create(Membership, new_membership_data)
        )
        self.assertFalse(
            self.other_classroom_admin.can_create(Membership, new_membership_data)
        )
        self.assertFalse(
            self.other_classroom_coach.can_create(Membership, new_membership_data)
        )
        self.assertFalse(self.member.can_create(Membership, new_membership_data))
        self.assertTrue(self.superuser.can_create(Membership, new_membership_data))
        self.assertFalse(self.anon_user.can_create(Membership, new_membership_data))

    def test_facility_or_classroom_admin_or_coach_or_member_can_read_membership(self):
        membership = Membership.objects.get(
            user=self.member, collection=self.own_learnergroup
        )
        for user in [
            self.data["facility_admin"],
            self.own_classroom_admin,
            self.member,
            self.superuser,
        ]:
            self.assertTrue(user.can_read(membership))
            self.assertIn(membership, user.filter_readable(Membership.objects.all()))
        for user in [self.data["facility_coach"], self.own_classroom_coach]:
            self.assertTrue(user.can_read(membership))
        for user in [
            self.other_classroom_admin,
            self.other_classroom_coach,
            self.anon_user,
        ]:
            self.assertFalse(user.can_read(membership))
            self.assertNotIn(membership, user.filter_readable(Membership.objects.all()))

    def test_facility_users_cannot_update_memberships(self):
        # None of the fields in a Membership are "mutable", so there's no reason to allow updates
        membership = Membership.objects.get(
            user=self.member, collection=self.own_learnergroup
        )
        self.assertFalse(self.data["facility_admin"].can_update(membership))
        self.assertTrue(self.data["facility_coach"].can_update(membership))
        self.assertFalse(self.own_classroom_admin.can_update(membership))
        self.assertTrue(self.own_classroom_coach.can_update(membership))
        self.assertFalse(self.other_classroom_admin.can_update(membership))
        self.assertFalse(self.other_classroom_coach.can_update(membership))
        self.assertFalse(self.member.can_update(membership))
        self.assertFalse(self.anon_user.can_update(membership))

    def test_admin_or_coach_can_delete_membership(self):
        membership = Membership.objects.get(
            user=self.member, collection=self.own_learnergroup
        )
        self.assertTrue(self.data["facility_admin"].can_delete(membership))
        self.assertTrue(self.data["facility_coach"].can_delete(membership))
        self.assertTrue(self.own_classroom_admin.can_delete(membership))
        self.assertTrue(self.own_classroom_coach.can_delete(membership))
        self.assertFalse(self.member.can_delete(membership))
        self.assertTrue(self.superuser.can_delete(membership))
        self.assertFalse(self.anon_user.can_delete(membership))


class FacilityDatasetCertificateNamespacingTestCase(TestCase):
    def test_unsaved_facility_validation_only_create_one_dataset(self):
        facility = Facility(name="Hello!")
        self.assertEqual(FacilityDataset.objects.count(), 0)
        facility.full_clean()
        self.assertEqual(FacilityDataset.objects.count(), 0)
        facility.save()
        self.assertEqual(FacilityDataset.objects.count(), 1)
