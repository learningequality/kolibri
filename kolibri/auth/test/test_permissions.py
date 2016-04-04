"""
Tests of the permissions on specific models in the auth app. For tests of the permissions system itself, see test_permission_classes.py
"""

from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

from .helpers import create_dummy_facility_data

from ..constants import role_kinds
from ..models import DeviceOwner, Facility, Classroom, LearnerGroup, Role, FacilityUser


class FacilityPermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying Facility instances
    """

    def setUp(self):
        self.data1 = create_dummy_facility_data()
        self.data2 = create_dummy_facility_data()
        self.device_owner = DeviceOwner.objects.create(username="boss")

    def test_facility_users_cannot_create_facility(self):
        """ FacilityUsers can't create new Facilities, regardless of their roles """
        new_facility_data = {"name": "Home"}
        self.assertFalse(self.data1["facility_admin"].can_create(Facility, new_facility_data))
        self.assertFalse(self.data1["classroom_coaches"][0].can_create(Facility, new_facility_data))
        self.assertFalse(self.data1["learners_one_group"][0][0].can_create(Facility, new_facility_data))
        self.assertFalse(self.data1["unattached_users"][0].can_create(Facility, new_facility_data))

    def test_facility_users_can_read_own_facility(self):
        """ FacilityUsers can read their own Facility, regardless of their roles """
        own_facility = self.data1["facility"]
        self.assertTrue(self.data1["facility_admin"].can_read(own_facility))
        self.assertTrue(self.data1["classroom_coaches"][0].can_read(own_facility))
        self.assertTrue(self.data1["learners_one_group"][0][0].can_read(own_facility))
        self.assertTrue(self.data1["unattached_users"][0].can_read(own_facility))

    def test_facility_users_cannot_read_other_facility(self):
        """ FacilityUsers cannot read other Facilities, regardless of their roles """
        other_facility = self.data2["facility"]
        self.assertFalse(self.data1["facility_admin"].can_read(other_facility))
        self.assertFalse(self.data1["classroom_coaches"][0].can_read(other_facility))
        self.assertFalse(self.data1["learners_one_group"][0][0].can_read(other_facility))
        self.assertFalse(self.data1["unattached_users"][0].can_read(other_facility))

    def test_only_facility_admins_can_update_own_facility(self):
        """ The only FacilityUser who can update a Facility is a facility admin for that Facility """
        own_facility = self.data1["facility"]
        self.assertTrue(self.data1["facility_admin"].can_update(own_facility))
        self.assertFalse(self.data1["classroom_coaches"][0].can_update(own_facility))
        self.assertFalse(self.data1["learners_one_group"][0][0].can_update(own_facility))
        self.assertFalse(self.data1["unattached_users"][0].can_update(own_facility))

    def test_facility_users_cannot_update_other_facility(self):
        """ FacilityUsers cannot update other Facilities, regardless of their roles """
        other_facility = self.data2["facility"]
        self.assertFalse(self.data1["facility_admin"].can_update(other_facility))
        self.assertFalse(self.data1["classroom_coaches"][0].can_update(other_facility))
        self.assertFalse(self.data1["learners_one_group"][0][0].can_update(other_facility))
        self.assertFalse(self.data1["unattached_users"][0].can_update(other_facility))

    def test_facility_users_cannot_delete_own_facility(self):
        """ FacilityUsers can't delete own Facility, regardless of their roles """
        own_facility = self.data1["facility"]
        self.assertFalse(self.data1["facility_admin"].can_delete(own_facility))
        self.assertFalse(self.data1["classroom_coaches"][0].can_delete(own_facility))
        self.assertFalse(self.data1["learners_one_group"][0][0].can_delete(own_facility))
        self.assertFalse(self.data1["unattached_users"][0].can_delete(own_facility))

    def test_facility_users_cannot_delete_other_facility(self):
        """ FacilityUsers can't delete other Facility, regardless of their roles """
        other_facility = self.data2["facility"]
        self.assertFalse(self.data1["facility_admin"].can_delete(other_facility))
        self.assertFalse(self.data1["classroom_coaches"][0].can_delete(other_facility))
        self.assertFalse(self.data1["learners_one_group"][0][0].can_delete(other_facility))
        self.assertFalse(self.data1["unattached_users"][0].can_delete(other_facility))

    def test_device_owner_can_do_anything_to_a_facility(self):
        """ DeviceOwner can do anything to a Facility """

        new_facility_data = {"name": "Home"}
        self.assertTrue(self.device_owner.can_create(Facility, new_facility_data))

        facility = self.data1["facility"]
        self.assertTrue(self.device_owner.can_read(facility))
        self.assertTrue(self.device_owner.can_update(facility))
        self.assertTrue(self.device_owner.can_delete(facility))


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
        self.device_owner = DeviceOwner.objects.create(username="boss")

    def test_only_facility_admin_can_create_classroom(self):
        """ The only FacilityUser who can create a Classroom is a facility admin for the Facility """
        new_classroom_data = {"name": "Home", "parent": self.data["facility"]}
        self.assertTrue(self.data["facility_admin"].can_create(Classroom, new_classroom_data))
        self.assertFalse(self.own_classroom_coach.can_create(Classroom, new_classroom_data))
        self.assertFalse(self.member.can_create(Classroom, new_classroom_data))
        self.assertFalse(self.data["unattached_users"][0].can_create(Classroom, new_classroom_data))

    def test_members_can_read_own_classroom(self):
        """ Members of a Classroom can read that Classroom, as can coaches and admins for the Classroom """
        self.assertTrue(self.member.can_read(self.own_classroom))
        self.assertTrue(self.own_classroom_coach.can_read(self.own_classroom))
        self.assertTrue(self.own_classroom_admin.can_read(self.own_classroom))
        self.assertTrue(self.data["facility_admin"].can_read(self.own_classroom))

    def test_members_and_classroom_admins_and_coaches_cannot_read_other_classroom(self):
        """ Members and admins/coaches for a Classroom cannot read another Classroom """
        self.assertFalse(self.member.can_read(self.other_classroom))
        self.assertFalse(self.own_classroom_coach.can_read(self.other_classroom))
        self.assertFalse(self.own_classroom_admin.can_read(self.other_classroom))

    def test_only_admins_can_update_own_classroom(self):
        """ The only FacilityUsers who can update a Classroom are admins for that Classroom (or for the Facility) """
        self.assertTrue(self.data["facility_admin"].can_update(self.own_classroom))
        self.assertTrue(self.own_classroom_admin.can_update(self.own_classroom))
        self.assertFalse(self.own_classroom_coach.can_update(self.own_classroom))
        self.assertFalse(self.member.can_update(self.own_classroom))

    def test_facility_users_cannot_update_other_classroom(self):
        """ FacilityUsers cannot update other Classrooms, unless they are a facility admin """
        self.assertFalse(self.own_classroom_admin.can_update(self.other_classroom))
        self.assertFalse(self.own_classroom_coach.can_update(self.other_classroom))
        self.assertFalse(self.member.can_update(self.other_classroom))

    def test_only_admins_can_delete_own_classroom(self):
        """ The only FacilityUsers who can delete a Classroom are admins for that Classroom (or for the Facility) """
        self.assertTrue(self.data["facility_admin"].can_delete(self.own_classroom))
        self.assertTrue(self.own_classroom_admin.can_delete(self.own_classroom))
        self.assertFalse(self.own_classroom_coach.can_delete(self.own_classroom))
        self.assertFalse(self.member.can_delete(self.own_classroom))

    def test_facility_users_cannot_delete_other_classroom(self):
        """ FacilityUsers cannot delete other Classrooms, unless they are a facility admin """
        self.assertFalse(self.own_classroom_admin.can_delete(self.other_classroom))
        self.assertFalse(self.own_classroom_coach.can_delete(self.other_classroom))
        self.assertFalse(self.member.can_delete(self.other_classroom))

    def test_device_owner_can_do_anything_to_a_classroom(self):
        """ DeviceOwner can do anything to a Classroom """
        new_classroom_data = {"name": "Home", "parent": self.data["facility"]}
        self.assertTrue(self.device_owner.can_create(Classroom, new_classroom_data))
        self.assertTrue(self.device_owner.can_read(self.own_classroom))
        self.assertTrue(self.device_owner.can_update(self.own_classroom))
        self.assertTrue(self.device_owner.can_delete(self.own_classroom))


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
        self.device_owner = DeviceOwner.objects.create(username="boss")

    def test_facility_or_classroom_admins_can_create_learnergroup(self):
        """ The only FacilityUser who can create a LearnerGroup is a facility admin for the Facility """
        new_learnergroup_data = {"name": "Cool Group", "parent": self.own_classroom}
        self.assertTrue(self.data["facility_admin"].can_create(LearnerGroup, new_learnergroup_data))
        self.assertTrue(self.own_classroom_admin.can_create(LearnerGroup, new_learnergroup_data))
        self.assertFalse(self.other_classroom_admin.can_create(LearnerGroup, new_learnergroup_data))
        self.assertFalse(self.own_classroom_coach.can_create(LearnerGroup, new_learnergroup_data))
        self.assertFalse(self.member.can_create(LearnerGroup, new_learnergroup_data))
        self.assertFalse(self.data["unattached_users"][0].can_create(LearnerGroup, new_learnergroup_data))

    def test_members_can_read_own_learnergroup(self):
        """ Members of a LearnerGroup can read that LearnerGroup, as can coaches and admins for the LearnerGroup """
        self.assertTrue(self.member.can_read(self.own_learnergroup))
        self.assertTrue(self.own_classroom_coach.can_read(self.own_learnergroup))
        self.assertTrue(self.own_classroom_admin.can_read(self.own_learnergroup))
        self.assertTrue(self.data["facility_admin"].can_read(self.own_learnergroup))

    def test_members_and_classroom_admins_and_coaches_cannot_read_other_learnergroup(self):
        """ Members and admins/coaches for a Classroom cannot read a LearnerGroup from another Classroom """
        self.assertFalse(self.member.can_read(self.other_learnergroup))
        self.assertFalse(self.own_classroom_coach.can_read(self.other_learnergroup))
        self.assertFalse(self.own_classroom_admin.can_read(self.other_learnergroup))

    def test_only_admins_can_update_own_learnergroup(self):
        """ The only FacilityUsers who can update a LearnerGroup are admins for that LearnerGroup """
        self.assertTrue(self.data["facility_admin"].can_update(self.own_learnergroup))
        self.assertTrue(self.own_classroom_admin.can_update(self.own_learnergroup))
        self.assertFalse(self.own_classroom_coach.can_update(self.own_learnergroup))
        self.assertFalse(self.member.can_update(self.own_learnergroup))

    def test_facility_users_cannot_update_other_learnergroup(self):
        """ FacilityUsers cannot update other LearnerGroups, unless they are a facility admin """
        self.assertFalse(self.own_classroom_admin.can_update(self.other_learnergroup))
        self.assertFalse(self.own_classroom_coach.can_update(self.other_learnergroup))
        self.assertFalse(self.member.can_update(self.other_learnergroup))

    def test_only_admins_can_delete_own_learnergroup(self):
        """ The only FacilityUsers who can delete a LearnerGroup are admins for that LearnerGroup """
        self.assertTrue(self.data["facility_admin"].can_delete(self.own_learnergroup))
        self.assertTrue(self.own_classroom_admin.can_delete(self.own_learnergroup))
        self.assertFalse(self.own_classroom_coach.can_delete(self.own_learnergroup))
        self.assertFalse(self.member.can_delete(self.own_learnergroup))

    def test_facility_users_cannot_delete_other_learnergroup(self):
        """ FacilityUsers cannot delete other LearnerGroups, if they aren't admin for Facility or parent Classroom """
        self.assertFalse(self.own_classroom_admin.can_delete(self.other_learnergroup))
        self.assertFalse(self.own_classroom_coach.can_delete(self.other_learnergroup))
        self.assertFalse(self.member.can_delete(self.other_learnergroup))

    def test_device_owner_can_do_anything_to_a_learnergroup(self):
        """ DeviceOwner can do anything to a LearnerGroup """
        new_learnergroup_data = {"name": "Cool Group", "parent": self.own_classroom}
        self.assertTrue(self.device_owner.can_create(LearnerGroup, new_learnergroup_data))
        self.assertTrue(self.device_owner.can_read(self.own_learnergroup))
        self.assertTrue(self.device_owner.can_update(self.own_learnergroup))
        self.assertTrue(self.device_owner.can_delete(self.own_learnergroup))


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
        self.device_owner = DeviceOwner.objects.create(username="boss")

    def test_only_facility_admins_can_create_facility_user(self):
        """ The only FacilityUser who can create a FacilityUser is a facility admin for the Facility """
        new_facilityuser_data = {"username": "janedoe", "password": "*", "facility": self.data["facility"]}
        self.assertTrue(self.data["facility_admin"].can_create(FacilityUser, new_facilityuser_data))
        self.assertFalse(self.data["facility_coach"].can_create(FacilityUser, new_facilityuser_data))
        self.assertFalse(self.own_classroom_admin.can_create(FacilityUser, new_facilityuser_data))
        self.assertFalse(self.own_classroom_coach.can_create(FacilityUser, new_facilityuser_data))
        self.assertFalse(self.member.can_create(FacilityUser, new_facilityuser_data))
        self.assertFalse(self.data["unattached_users"][0].can_create(FacilityUser, new_facilityuser_data))

    def test_no_facility_user_can_create_facility_user_for_other_facility(self):
        """ FacilityUsers cannot create a FacilityUser for a different Facility """
        new_facilityuser_data = {"username": "janedoe", "password": "*", "facility": self.data2["facility"]}
        self.assertFalse(self.data["facility_admin"].can_create(FacilityUser, new_facilityuser_data))
        self.assertFalse(self.data["facility_coach"].can_create(FacilityUser, new_facilityuser_data))
        self.assertFalse(self.own_classroom_admin.can_create(FacilityUser, new_facilityuser_data))
        self.assertFalse(self.own_classroom_coach.can_create(FacilityUser, new_facilityuser_data))
        self.assertFalse(self.member.can_create(FacilityUser, new_facilityuser_data))
        self.assertFalse(self.data["unattached_users"][0].can_create(FacilityUser, new_facilityuser_data))

    def test_facility_user_can_read_self(self):
        """ A FacilityUser can read its own FacilityUser model """
        self.assertTrue(self.member.can_read(self.member))
        self.assertTrue(self.own_classroom_admin.can_read(self.own_classroom_admin))
        self.assertTrue(self.own_classroom_coach.can_read(self.own_classroom_coach))
        self.assertTrue(self.data["facility_admin"].can_read(self.data["facility_admin"]))

    def test_admins_and_coaches_can_read_facility_users(self):
        """ Users with admin/coach role for a FacilityUser can read that FacilityUser """
        self.assertTrue(self.data["facility_admin"].can_read(self.member))
        self.assertTrue(self.data["facility_coach"].can_read(self.member))
        self.assertTrue(self.own_classroom_admin.can_read(self.member))
        self.assertTrue(self.own_classroom_coach.can_read(self.member))

    def test_admins_and_coaches_for_other_classrooms_cannot_read_facility_users(self):
        """ Users without admin/coach role for a specific FacilityUser cannot read that FacilityUser """
        self.assertFalse(self.own_classroom_coach.can_read(self.other_member))
        self.assertFalse(self.own_classroom_admin.can_read(self.other_member))

    def test_only_facility_admins_and_coaches_can_read_unaffiliated_facility_users(self):
        """ Only Facility admins/coaches can read FacilityUser that is not a member of a Classroom or LearnerGroup """
        orphan = self.data["unattached_users"][0]
        self.assertTrue(self.data["facility_admin"].can_read(orphan))
        self.assertTrue(self.data["facility_coach"].can_read(orphan))
        self.assertFalse(self.own_classroom_admin.can_read(orphan))
        self.assertFalse(self.own_classroom_coach.can_read(orphan))
        self.assertFalse(self.member.can_read(orphan))

    def test_facility_user_can_update_self(self):
        """ A FacilityUser can update its own FacilityUser model """
        self.assertTrue(self.member.can_update(self.member))
        self.assertTrue(self.own_classroom_coach.can_update(self.own_classroom_coach))
        self.assertTrue(self.own_classroom_admin.can_update(self.own_classroom_admin))
        self.assertTrue(self.data["facility_admin"].can_update(self.data["facility_admin"]))

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

    def test_facility_user_cannot_delete_self(self):
        """ A FacilityUser cannot delete its own FacilityUser model, even for an admin/coach """
        self.assertFalse(self.member.can_delete(self.member))
        self.assertFalse(self.own_classroom_coach.can_delete(self.own_classroom_coach))
        self.assertFalse(self.own_classroom_admin.can_delete(self.own_classroom_admin))
        self.assertFalse(self.data["facility_admin"].can_delete(self.data["facility_admin"]))

    def test_only_facility_admins_can_delete_facility_user(self):
        """ The only FacilityUsers who can delete a FacilityUser are admins for the Facility """
        self.assertTrue(self.data["facility_admin"].can_delete(self.member))
        self.assertFalse(self.data["facility_coach"].can_delete(self.member))
        self.assertFalse(self.own_classroom_admin.can_delete(self.member))
        self.assertFalse(self.own_classroom_coach.can_delete(self.member))

    def test_facility_users_cannot_delete_facility_users_from_other_facility(self):
        """ FacilityUsers cannot delete FacilityUsers from another Facility """
        self.assertFalse(self.data["facility_admin"].can_delete(self.member2))
        self.assertFalse(self.data["facility_coach"].can_delete(self.member2))
        self.assertFalse(self.own_classroom_admin.can_delete(self.member2))
        self.assertFalse(self.own_classroom_coach.can_delete(self.member2))
        self.assertFalse(self.member.can_delete(self.member2))

    def test_device_owner_can_do_anything_to_a_facility_user(self):
        """ DeviceOwner can do anything to a FacilityUser """
        new_facilityuser_data_1 = {"username": "janedoe", "password": "*", "facility": self.data["facility"]}
        self.assertTrue(self.device_owner.can_create(FacilityUser, new_facilityuser_data_1))
        new_facilityuser_data_2 = {"username": "janedoe", "password": "*", "facility": self.data2["facility"]}
        self.assertTrue(self.device_owner.can_create(FacilityUser, new_facilityuser_data_2))
        self.assertTrue(self.device_owner.can_read(self.member))
        self.assertTrue(self.device_owner.can_update(self.member))
        self.assertTrue(self.device_owner.can_delete(self.member))


class DeviceOwnerPermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying DeviceOwner instances
    """

    def setUp(self):
        self.data = create_dummy_facility_data()
        self.member = self.data["learners_one_group"][0][0]
        self.own_classroom_coach = self.data["classroom_coaches"][0]
        self.own_classroom_admin = self.data["classroom_admins"][0]
        self.device_owner = DeviceOwner.objects.create(username="boss")
        self.device_owner2 = DeviceOwner.objects.create(username="ubermensch")

    def test_non_device_owners_cannot_create_device_owner(self):
        """ Users who are not DeviceOwners cannot create a DeviceOwner """
        new_deviceowner_data = {"username": "janedoe", "password": "*"}
        self.assertFalse(self.data["facility_admin"].can_create(DeviceOwner, new_deviceowner_data))
        self.assertFalse(self.data["facility_coach"].can_create(DeviceOwner, new_deviceowner_data))
        self.assertFalse(self.own_classroom_admin.can_create(DeviceOwner, new_deviceowner_data))
        self.assertFalse(self.own_classroom_coach.can_create(DeviceOwner, new_deviceowner_data))
        self.assertFalse(self.member.can_create(DeviceOwner, new_deviceowner_data))
        self.assertFalse(self.data["unattached_users"][0].can_create(DeviceOwner, new_deviceowner_data))

    def test_non_device_owners_cannot_read_device_owner(self):
        """ Users who are not DeviceOwners cannot read a DeviceOwner """
        self.assertFalse(self.data["facility_admin"].can_read(self.device_owner))
        self.assertFalse(self.data["facility_coach"].can_read(self.device_owner))
        self.assertFalse(self.own_classroom_admin.can_read(self.device_owner))
        self.assertFalse(self.own_classroom_coach.can_read(self.device_owner))
        self.assertFalse(self.member.can_read(self.device_owner))
        self.assertFalse(self.data["unattached_users"][0].can_read(self.device_owner))

    def test_non_device_owners_cannot_update_device_owner(self):
        """ Users who are not DeviceOwners cannot update a DeviceOwner """
        self.assertFalse(self.data["facility_admin"].can_update(self.device_owner))
        self.assertFalse(self.data["facility_coach"].can_update(self.device_owner))
        self.assertFalse(self.own_classroom_admin.can_update(self.device_owner))
        self.assertFalse(self.own_classroom_coach.can_update(self.device_owner))
        self.assertFalse(self.member.can_update(self.device_owner))
        self.assertFalse(self.data["unattached_users"][0].can_update(self.device_owner))

    def test_non_device_owners_cannot_delete_device_owner(self):
        """ Users who are not DeviceOwners cannot delete a DeviceOwner """
        self.assertFalse(self.data["facility_admin"].can_delete(self.device_owner))
        self.assertFalse(self.data["facility_coach"].can_delete(self.device_owner))
        self.assertFalse(self.own_classroom_admin.can_delete(self.device_owner))
        self.assertFalse(self.own_classroom_coach.can_delete(self.device_owner))
        self.assertFalse(self.member.can_delete(self.device_owner))
        self.assertFalse(self.data["unattached_users"][0].can_delete(self.device_owner))

    def test_device_owner_can_do_anything_to_a_device_owner(self):
        """ DeviceOwner can do anything to a DeviceOwner """

        new_deviceowner_data = {"username": "janedoe", "password": "*"}
        self.assertTrue(self.device_owner.can_create(DeviceOwner, new_deviceowner_data))

        self.assertTrue(self.device_owner.can_read(self.device_owner))
        self.assertTrue(self.device_owner.can_update(self.device_owner))
        self.assertTrue(self.device_owner.can_delete(self.device_owner))

        self.assertTrue(self.device_owner.can_read(self.device_owner2))
        self.assertTrue(self.device_owner.can_update(self.device_owner2))
        self.assertTrue(self.device_owner.can_delete(self.device_owner2))


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
        self.device_owner = DeviceOwner.objects.create(username="boss")
        self.role_user = self.data["unattached_users"][0]

    def test_facility_admin_can_create_facility_admin_role(self):
        new_role_data = {"user": self.role_user, "collection": self.data["facility"], "kind": role_kinds.ADMIN}
        self.assertTrue(self.data["facility_admin"].can_create(Role, new_role_data))
        self.assertFalse(self.data["facility_coach"].can_create(Role, new_role_data))
        self.assertFalse(self.own_classroom_admin.can_create(Role, new_role_data))
        self.assertFalse(self.own_classroom_coach.can_create(Role, new_role_data))
        self.assertFalse(self.member.can_create(Role, new_role_data))
        self.assertFalse(self.role_user.can_create(Role, new_role_data))
        self.assertTrue(self.device_owner.can_create(Role, new_role_data))

    def test_facility_admin_can_create_facility_coach_role(self):
        new_role_data = {"user": self.role_user, "collection": self.data["facility"], "kind": role_kinds.COACH}
        self.assertTrue(self.data["facility_admin"].can_create(Role, new_role_data))
        self.assertFalse(self.data["facility_coach"].can_create(Role, new_role_data))
        self.assertFalse(self.own_classroom_admin.can_create(Role, new_role_data))
        self.assertFalse(self.own_classroom_coach.can_create(Role, new_role_data))
        self.assertFalse(self.member.can_create(Role, new_role_data))
        self.assertFalse(self.role_user.can_create(Role, new_role_data))
        self.assertTrue(self.device_owner.can_create(Role, new_role_data))

    def test_facility_or_classroom_admin_can_create_classroom_admin_role(self):
        new_role_data = {"user": self.role_user, "collection": self.own_classroom, "kind": role_kinds.ADMIN}
        self.assertTrue(self.data["facility_admin"].can_create(Role, new_role_data))
        self.assertFalse(self.data["facility_coach"].can_create(Role, new_role_data))
        self.assertTrue(self.own_classroom_admin.can_create(Role, new_role_data))
        self.assertFalse(self.own_classroom_coach.can_create(Role, new_role_data))
        self.assertFalse(self.other_classroom_admin.can_create(Role, new_role_data))
        self.assertFalse(self.other_classroom_coach.can_create(Role, new_role_data))
        self.assertFalse(self.member.can_create(Role, new_role_data))
        self.assertFalse(self.role_user.can_create(Role, new_role_data))
        self.assertTrue(self.device_owner.can_create(Role, new_role_data))

    def test_facility_or_classroom_admin_can_create_classroom_coach_role(self):
        new_role_data = {"user": self.role_user, "collection": self.own_classroom, "kind": role_kinds.COACH}
        self.assertTrue(self.data["facility_admin"].can_create(Role, new_role_data))
        self.assertFalse(self.data["facility_coach"].can_create(Role, new_role_data))
        self.assertTrue(self.own_classroom_admin.can_create(Role, new_role_data))
        self.assertFalse(self.own_classroom_coach.can_create(Role, new_role_data))
        self.assertFalse(self.other_classroom_admin.can_create(Role, new_role_data))
        self.assertFalse(self.other_classroom_coach.can_create(Role, new_role_data))
        self.assertFalse(self.member.can_create(Role, new_role_data))
        self.assertFalse(self.role_user.can_create(Role, new_role_data))
        self.assertTrue(self.device_owner.can_create(Role, new_role_data))

    def test_facility_admin_or_coach_can_read_facility_admin_role(self):
        role = Role.objects.create(user=self.role_user, collection=self.data["facility"], kind=role_kinds.ADMIN)
        self.assertTrue(self.data["facility_admin"].can_read(role))
        self.assertTrue(self.data["facility_coach"].can_read(role))
        self.assertFalse(self.own_classroom_admin.can_read(role))
        self.assertFalse(self.own_classroom_coach.can_read(role))
        self.assertFalse(self.other_classroom_admin.can_read(role))
        self.assertFalse(self.other_classroom_coach.can_read(role))
        self.assertFalse(self.member.can_read(role))
        self.assertTrue(self.role_user.can_read(role))
        self.assertTrue(self.device_owner.can_read(role))

    def test_facility_or_classroom_admin_or_coach_can_read_classroom_admin_role(self):
        role = Role.objects.create(user=self.role_user, collection=self.own_classroom, kind=role_kinds.ADMIN)
        self.assertTrue(self.data["facility_admin"].can_read(role))
        self.assertTrue(self.data["facility_coach"].can_read(role))
        self.assertTrue(self.own_classroom_admin.can_read(role))
        self.assertTrue(self.own_classroom_coach.can_read(role))
        self.assertFalse(self.other_classroom_admin.can_read(role))
        self.assertFalse(self.other_classroom_coach.can_read(role))
        self.assertFalse(self.member.can_read(role))
        self.assertTrue(self.role_user.can_read(role))
        self.assertTrue(self.device_owner.can_read(role))

    def test_nobody_can_update_role(self):
        # None of the fields in a role are "mutable", so there's no reason to allow updates
        # (changing a role from one kind to another means deleting the existing role and creating another)
        role = Role.objects.create(user=self.role_user, collection=self.own_classroom, kind=role_kinds.COACH)
        self.assertFalse(self.data["facility_admin"].can_update(role))
        self.assertFalse(self.data["facility_coach"].can_update(role))
        self.assertFalse(self.own_classroom_admin.can_update(role))
        self.assertFalse(self.own_classroom_coach.can_update(role))
        self.assertFalse(self.other_classroom_admin.can_update(role))
        self.assertFalse(self.other_classroom_coach.can_update(role))
        self.assertFalse(self.member.can_update(role))
        self.assertFalse(self.role_user.can_update(role))
        self.assertFalse(self.device_owner.can_update(role))

    def test_facility_admin_can_delete_facility_admin_role(self):
        role = Role.objects.create(user=self.role_user, collection=self.data["facility"], kind=role_kinds.ADMIN)
        self.assertTrue(self.data["facility_admin"].can_delete(role))
        self.assertFalse(self.data["facility_coach"].can_delete(role))
        self.assertFalse(self.own_classroom_admin.can_delete(role))
        self.assertFalse(self.own_classroom_coach.can_delete(role))
        self.assertFalse(self.member.can_delete(role))
        self.assertTrue(self.role_user.can_delete(role))
        self.assertTrue(self.device_owner.can_delete(role))

    def test_facility_admin_can_delete_facility_coach_role(self):
        role = Role.objects.create(user=self.role_user, collection=self.data["facility"], kind=role_kinds.COACH)
        self.assertTrue(self.data["facility_admin"].can_delete(role))
        self.assertFalse(self.data["facility_coach"].can_delete(role))
        self.assertFalse(self.own_classroom_admin.can_delete(role))
        self.assertFalse(self.own_classroom_coach.can_delete(role))
        self.assertFalse(self.member.can_delete(role))
        self.assertTrue(self.role_user.can_delete(role))
        self.assertTrue(self.device_owner.can_delete(role))

    def test_facility_or_classroom_admin_can_delete_classroom_admin_role(self):
        role = Role.objects.create(user=self.role_user, collection=self.own_classroom, kind=role_kinds.ADMIN)
        self.assertTrue(self.data["facility_admin"].can_delete(role))
        self.assertFalse(self.data["facility_coach"].can_delete(role))
        self.assertTrue(self.own_classroom_admin.can_delete(role))
        self.assertFalse(self.own_classroom_coach.can_delete(role))
        self.assertFalse(self.other_classroom_admin.can_delete(role))
        self.assertFalse(self.other_classroom_coach.can_delete(role))
        self.assertFalse(self.member.can_delete(role))
        self.assertTrue(self.role_user.can_delete(role))
        self.assertTrue(self.device_owner.can_delete(role))

    def test_facility_or_classroom_admin_can_delete_classroom_coach_role(self):
        role = Role.objects.create(user=self.role_user, collection=self.own_classroom, kind=role_kinds.COACH)
        self.assertTrue(self.data["facility_admin"].can_delete(role))
        self.assertFalse(self.data["facility_coach"].can_delete(role))
        self.assertTrue(self.own_classroom_admin.can_delete(role))
        self.assertFalse(self.own_classroom_coach.can_delete(role))
        self.assertFalse(self.other_classroom_admin.can_delete(role))
        self.assertFalse(self.other_classroom_coach.can_delete(role))
        self.assertFalse(self.member.can_delete(role))
        self.assertTrue(self.role_user.can_delete(role))
        self.assertTrue(self.device_owner.can_delete(role))
