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
        unsaved_facility = Facility(name="Home")
        self.assertFalse(unsaved_facility.user_can_create(self.data1["facilityadmin"]))
        self.assertFalse(unsaved_facility.user_can_create(self.data1["classroom_coaches"][0]))
        self.assertFalse(unsaved_facility.user_can_create(self.data1["learners_one_group"][0][0][0]))
        self.assertFalse(unsaved_facility.user_can_create(self.data1["unattached_users"][0]))

    def test_facility_users_can_read_own_facility(self):
        """ FacilityUsers can read their own Facility, regardless of their roles """
        own_facility = self.data1["facility"]
        self.assertTrue(own_facility.user_can_read(self.data1["facilityadmin"]))
        self.assertTrue(own_facility.user_can_read(self.data1["classroom_coaches"][0]))
        self.assertTrue(own_facility.user_can_read(self.data1["learners_one_group"][0][0][0]))
        self.assertTrue(own_facility.user_can_read(self.data1["unattached_users"][0]))

    def test_facility_users_cannot_read_other_facility(self):
        """ FacilityUsers cannot read other Facilities, regardless of their roles """
        other_facility = self.data2["facility"]
        self.assertFalse(other_facility.user_can_read(self.data1["facilityadmin"]))
        self.assertFalse(other_facility.user_can_read(self.data1["classroom_coaches"][0]))
        self.assertFalse(other_facility.user_can_read(self.data1["learners_one_group"][0][0][0]))
        self.assertFalse(other_facility.user_can_read(self.data1["unattached_users"][0]))

    def test_only_facility_admins_can_update_own_facility(self):
        """ The only FacilityUser who can update a Facility is a facility admin for that Facility """
        own_facility = self.data1["facility"]
        self.assertTrue(own_facility.user_can_update(self.data1["facilityadmin"]))
        self.assertFalse(own_facility.user_can_update(self.data1["classroom_coaches"][0]))
        self.assertFalse(own_facility.user_can_update(self.data1["learners_one_group"][0][0][0]))
        self.assertFalse(own_facility.user_can_update(self.data1["unattached_users"][0]))

    def test_facility_users_cannot_update_other_facility(self):
        """ FacilityUsers cannot update other Facilities, regardless of their roles """
        other_facility = self.data2["facility"]
        self.assertFalse(other_facility.user_can_update(self.data1["facilityadmin"]))
        self.assertFalse(other_facility.user_can_update(self.data1["classroom_coaches"][0]))
        self.assertFalse(other_facility.user_can_update(self.data1["learners_one_group"][0][0][0]))
        self.assertFalse(other_facility.user_can_update(self.data1["unattached_users"][0]))

    def test_facility_users_cannot_delete_own_facility(self):
        """ FacilityUsers can't delete own Facility, regardless of their roles """
        own_facility = self.data1["facility"]
        self.assertFalse(own_facility.user_can_delete(self.data1["facilityadmin"]))
        self.assertFalse(own_facility.user_can_delete(self.data1["classroom_coaches"][0]))
        self.assertFalse(own_facility.user_can_delete(self.data1["learners_one_group"][0][0][0]))
        self.assertFalse(own_facility.user_can_delete(self.data1["unattached_users"][0]))

    def test_facility_users_cannot_delete_other_facility(self):
        """ FacilityUsers can't delete other Facility, regardless of their roles """
        other_facility = self.data2["facility"]
        self.assertFalse(other_facility.user_can_delete(self.data1["facilityadmin"]))
        self.assertFalse(other_facility.user_can_delete(self.data1["classroom_coaches"][0]))
        self.assertFalse(other_facility.user_can_delete(self.data1["learners_one_group"][0][0][0]))
        self.assertFalse(other_facility.user_can_delete(self.data1["unattached_users"][0]))

    def test_device_owner_can_do_anything_to_a_facility(self):
        """ DeviceOwner can do anything to a Facility """
        facility = self.data1["facility"]
        self.assertTrue(facility.user_can_create(self.device_owner))
        self.assertTrue(facility.user_can_read(self.device_owner))
        self.assertTrue(facility.user_can_update(self.device_owner))
        self.assertTrue(facility.user_can_delete(self.device_owner))


class ClassroomPermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying Classroom instances
    """

    def setUp(self):
        self.data = create_dummy_facility_data()
        self.member = self.data["learners_one_group"][0][0][0]
        self.own_classroom = self.data["classrooms"][0]
        self.other_classroom = self.data["classrooms"][1]
        self.own_classroom_coach = self.data["classroom_coaches"][0]
        self.own_classroom_admin = self.data["classroom_admins"][0]
        self.device_owner = DeviceOwner.objects.create(username="boss")

    def test_only_facility_admin_can_create_classroom(self):
        """ The only FacilityUser who can create a Classroom is a facility admin for the Facility """
        unsaved_classroom = Classroom(name="Home", parent=self.data["facility"])
        unsaved_classroom.full_clean()
        self.assertTrue(unsaved_classroom.user_can_create(self.data["facilityadmin"]))
        self.assertFalse(unsaved_classroom.user_can_create(self.own_classroom_coach))
        self.assertFalse(unsaved_classroom.user_can_create(self.member))
        self.assertFalse(unsaved_classroom.user_can_create(self.data["unattached_users"][0]))

    def test_members_can_read_own_classroom(self):
        """ Members of a Classroom can read that Classroom, as can coaches and admins for the Classroom """
        self.assertTrue(self.own_classroom.user_can_read(self.member))
        self.assertTrue(self.own_classroom.user_can_read(self.own_classroom_coach))
        self.assertTrue(self.own_classroom.user_can_read(self.own_classroom_admin))
        self.assertTrue(self.own_classroom.user_can_read(self.data["facilityadmin"]))

    def test_members_and_classroom_admins_and_coaches_cannot_read_other_classroom(self):
        """ Members and admins/coaches for a Classroom cannot read another Classroom """
        self.assertFalse(self.other_classroom.user_can_read(self.member))
        self.assertFalse(self.other_classroom.user_can_read(self.own_classroom_coach))
        self.assertFalse(self.other_classroom.user_can_read(self.own_classroom_admin))

    def test_only_admins_can_update_own_classroom(self):
        """ The only FacilityUsers who can update a Classroom are admins for that Classroom (or for the Facility) """
        self.assertTrue(self.own_classroom.user_can_update(self.data["facilityadmin"]))
        self.assertTrue(self.own_classroom.user_can_update(self.own_classroom_admin))
        self.assertFalse(self.own_classroom.user_can_update(self.own_classroom_coach))
        self.assertFalse(self.own_classroom.user_can_update(self.member))

    def test_facility_users_cannot_update_other_classroom(self):
        """ FacilityUsers cannot update other Classrooms, unless they are a facility admin """
        self.assertFalse(self.other_classroom.user_can_update(self.own_classroom_admin))
        self.assertFalse(self.other_classroom.user_can_update(self.own_classroom_coach))
        self.assertFalse(self.other_classroom.user_can_update(self.member))

    def test_only_admins_can_delete_own_classroom(self):
        """ The only FacilityUsers who can delete a Classroom are admins for that Classroom (or for the Facility) """
        self.assertTrue(self.own_classroom.user_can_delete(self.data["facilityadmin"]))
        self.assertTrue(self.own_classroom.user_can_delete(self.own_classroom_admin))
        self.assertFalse(self.own_classroom.user_can_delete(self.own_classroom_coach))
        self.assertFalse(self.own_classroom.user_can_delete(self.member))

    def test_facility_users_cannot_delete_other_classroom(self):
        """ FacilityUsers cannot delete other Classrooms, unless they are a facility admin """
        self.assertFalse(self.other_classroom.user_can_delete(self.own_classroom_admin))
        self.assertFalse(self.other_classroom.user_can_delete(self.own_classroom_coach))
        self.assertFalse(self.other_classroom.user_can_delete(self.member))

    def test_device_owner_can_do_anything_to_a_classroom(self):
        """ DeviceOwner can do anything to a Classroom """
        self.assertTrue(self.own_classroom.user_can_create(self.device_owner))
        self.assertTrue(self.own_classroom.user_can_read(self.device_owner))
        self.assertTrue(self.own_classroom.user_can_update(self.device_owner))
        self.assertTrue(self.own_classroom.user_can_delete(self.device_owner))


class LearnerGroupPermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying LearnerGroup instances
    """

    def setUp(self):
        self.data = create_dummy_facility_data()
        self.member = self.data["learners_one_group"][0][0][0]
        self.own_learnergroup = self.data["learnergroups"][0][0]
        self.other_learnergroup = self.data["learnergroups"][1][1]
        self.own_classroom = self.data["classrooms"][0]
        self.own_classroom_coach = self.data["classroom_coaches"][0]
        self.own_classroom_admin = self.data["classroom_admins"][0]
        self.other_classroom_admin = self.data["classroom_admins"][1]
        self.device_owner = DeviceOwner.objects.create(username="boss")

    def test_facility_or_classroom_admins_can_create_learnergroup(self):
        """ The only FacilityUser who can create a LearnerGroup is a facility admin for the Facility """
        unsaved_learnergroup = LearnerGroup(name="Cool Group", parent=self.own_classroom)
        unsaved_learnergroup.full_clean()
        self.assertTrue(unsaved_learnergroup.user_can_create(self.data["facilityadmin"]))
        self.assertTrue(unsaved_learnergroup.user_can_create(self.own_classroom_admin))
        self.assertFalse(unsaved_learnergroup.user_can_create(self.other_classroom_admin))
        self.assertFalse(unsaved_learnergroup.user_can_create(self.own_classroom_coach))
        self.assertFalse(unsaved_learnergroup.user_can_create(self.member))
        self.assertFalse(unsaved_learnergroup.user_can_create(self.data["unattached_users"][0]))

    def test_members_can_read_own_learnergroup(self):
        """ Members of a LearnerGroup can read that LearnerGroup, as can coaches and admins for the LearnerGroup """
        self.assertTrue(self.own_learnergroup.user_can_read(self.member))
        self.assertTrue(self.own_learnergroup.user_can_read(self.own_classroom_coach))
        self.assertTrue(self.own_learnergroup.user_can_read(self.own_classroom_admin))
        self.assertTrue(self.own_learnergroup.user_can_read(self.data["facilityadmin"]))

    def test_members_and_classroom_admins_and_coaches_cannot_read_other_learnergroup(self):
        """ Members and admins/coaches for a Classroom cannot read a LearnerGroup from another Classroom """
        self.assertFalse(self.other_learnergroup.user_can_read(self.member))
        self.assertFalse(self.other_learnergroup.user_can_read(self.own_classroom_coach))
        self.assertFalse(self.other_learnergroup.user_can_read(self.own_classroom_admin))

    def test_only_admins_can_update_own_learnergroup(self):
        """ The only FacilityUsers who can update a LearnerGroup are admins for that LearnerGroup """
        self.assertTrue(self.own_learnergroup.user_can_update(self.data["facilityadmin"]))
        self.assertTrue(self.own_learnergroup.user_can_update(self.own_classroom_admin))
        self.assertFalse(self.own_learnergroup.user_can_update(self.own_classroom_coach))
        self.assertFalse(self.own_learnergroup.user_can_update(self.member))

    def test_facility_users_cannot_update_other_learnergroup(self):
        """ FacilityUsers cannot update other LearnerGroups, unless they are a facility admin """
        self.assertFalse(self.other_learnergroup.user_can_update(self.own_classroom_admin))
        self.assertFalse(self.other_learnergroup.user_can_update(self.own_classroom_coach))
        self.assertFalse(self.other_learnergroup.user_can_update(self.member))

    def test_only_admins_can_delete_own_learnergroup(self):
        """ The only FacilityUsers who can delete a LearnerGroup are admins for that LearnerGroup """
        self.assertTrue(self.own_learnergroup.user_can_delete(self.data["facilityadmin"]))
        self.assertTrue(self.own_learnergroup.user_can_delete(self.own_classroom_admin))
        self.assertFalse(self.own_learnergroup.user_can_delete(self.own_classroom_coach))
        self.assertFalse(self.own_learnergroup.user_can_delete(self.member))

    def test_facility_users_cannot_delete_other_learnergroup(self):
        """ FacilityUsers cannot delete other LearnerGroups, if they aren't admin for Facility or parent Classroom """
        self.assertFalse(self.other_learnergroup.user_can_delete(self.own_classroom_admin))
        self.assertFalse(self.other_learnergroup.user_can_delete(self.own_classroom_coach))
        self.assertFalse(self.other_learnergroup.user_can_delete(self.member))

    def test_device_owner_can_do_anything_to_a_learnergroup(self):
        """ DeviceOwner can do anything to a LearnerGroup """
        self.assertTrue(self.own_learnergroup.user_can_create(self.device_owner))
        self.assertTrue(self.own_learnergroup.user_can_read(self.device_owner))
        self.assertTrue(self.own_learnergroup.user_can_update(self.device_owner))
        self.assertTrue(self.own_learnergroup.user_can_delete(self.device_owner))


class FacilityUserPermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying FacilityUser instances
    """

    def setUp(self):
        self.data = create_dummy_facility_data()
        self.data2 = create_dummy_facility_data()
        self.member = self.data["learners_one_group"][0][0][0]
        self.member2 = self.data2["learners_one_group"][0][0][0]
        self.other_member = self.data["learners_one_group"][1][1][1]
        self.own_learnergroup = self.data["learnergroups"][0][0]
        self.own_classroom = self.data["classrooms"][0]
        self.own_classroom_coach = self.data["classroom_coaches"][0]
        self.own_classroom_admin = self.data["classroom_admins"][0]
        self.other_classroom_admin = self.data["classroom_admins"][1]
        self.device_owner = DeviceOwner.objects.create(username="boss")

    def test_only_facility_admins_can_create_facility_user(self):
        """ The only FacilityUser who can create a FacilityUser is a facility admin for the Facility """
        unsaved_facilityuser = FacilityUser(username="janedoe", password="*", facility=self.data["facility"])
        unsaved_facilityuser.full_clean()
        self.assertTrue(unsaved_facilityuser.user_can_create(self.data["facilityadmin"]))
        self.assertFalse(unsaved_facilityuser.user_can_create(self.data["facilitycoach"]))
        self.assertFalse(unsaved_facilityuser.user_can_create(self.own_classroom_admin))
        self.assertFalse(unsaved_facilityuser.user_can_create(self.own_classroom_coach))
        self.assertFalse(unsaved_facilityuser.user_can_create(self.member))
        self.assertFalse(unsaved_facilityuser.user_can_create(self.data["unattached_users"][0]))

    def test_no_facility_user_can_create_facility_user_for_other_facility(self):
        """ FacilityUsers cannot create a FacilityUser for a different Facility """
        unsaved_facilityuser = FacilityUser(username="janedoe", password="*", facility=self.data2["facility"])
        unsaved_facilityuser.full_clean()
        self.assertFalse(unsaved_facilityuser.user_can_create(self.data["facilityadmin"]))
        self.assertFalse(unsaved_facilityuser.user_can_create(self.data["facilitycoach"]))
        self.assertFalse(unsaved_facilityuser.user_can_create(self.own_classroom_admin))
        self.assertFalse(unsaved_facilityuser.user_can_create(self.own_classroom_coach))
        self.assertFalse(unsaved_facilityuser.user_can_create(self.member))
        self.assertFalse(unsaved_facilityuser.user_can_create(self.data["unattached_users"][0]))

    def test_facility_user_can_read_self(self):
        """ A FacilityUser can read its own FacilityUser model """
        self.assertTrue(self.member.user_can_read(self.member))
        self.assertTrue(self.own_classroom_admin.user_can_read(self.own_classroom_admin))
        self.assertTrue(self.own_classroom_coach.user_can_read(self.own_classroom_coach))
        self.assertTrue(self.data["facilityadmin"].user_can_read(self.data["facilityadmin"]))

    def test_admins_and_coaches_can_read_facility_users(self):
        """ Users with admin/coach role for a FacilityUser can read that FacilityUser """
        self.assertTrue(self.member.user_can_read(self.data["facilityadmin"]))
        self.assertTrue(self.member.user_can_read(self.data["facilitycoach"]))
        self.assertTrue(self.member.user_can_read(self.own_classroom_admin))
        self.assertTrue(self.member.user_can_read(self.own_classroom_coach))

    def test_admins_and_coaches_for_other_classrooms_cannot_read_facility_users(self):
        """ Users without admin/coach role for a specific FacilityUser cannot read that FacilityUser """
        self.assertFalse(self.other_member.user_can_read(self.own_classroom_coach))
        self.assertFalse(self.other_member.user_can_read(self.own_classroom_admin))

    def test_only_facility_admins_and_coaches_can_read_unaffiliated_facility_users(self):
        """ Only Facility admins/coaches can read FacilityUser that is not a member of a Classroom or LearnerGroup """
        orphan = self.data["unattached_users"][0]
        self.assertTrue(orphan.user_can_read(self.data["facilityadmin"]))
        self.assertTrue(orphan.user_can_read(self.data["facilitycoach"]))
        self.assertFalse(orphan.user_can_read(self.own_classroom_admin))
        self.assertFalse(orphan.user_can_read(self.own_classroom_coach))
        self.assertFalse(orphan.user_can_read(self.member))

    def test_facility_user_can_update_self(self):
        """ A FacilityUser can update its own FacilityUser model """
        self.assertTrue(self.member.user_can_update(self.member))
        self.assertTrue(self.own_classroom_coach.user_can_update(self.own_classroom_coach))
        self.assertTrue(self.own_classroom_admin.user_can_update(self.own_classroom_admin))
        self.assertTrue(self.data["facilityadmin"].user_can_update(self.data["facilityadmin"]))

    def test_admins_but_not_coaches_can_update_facility_users(self):
        """ Users with admin (but not coach) role for a FacilityUser can update that FacilityUser """
        self.assertTrue(self.member.user_can_update(self.data["facilityadmin"]))
        self.assertFalse(self.member.user_can_update(self.data["facilitycoach"]))
        self.assertTrue(self.member.user_can_update(self.own_classroom_admin))
        self.assertFalse(self.member.user_can_update(self.own_classroom_coach))

    def test_admins_and_coaches_for_other_classrooms_cannot_update_facility_users(self):
        """ Users without admin/coach role for a specific FacilityUser cannot update that FacilityUser """
        self.assertFalse(self.other_member.user_can_update(self.own_classroom_coach))
        self.assertFalse(self.other_member.user_can_update(self.own_classroom_admin))

    def test_only_facility_admins_can_update_unaffiliated_facility_users(self):
        """ Only Facility admins can update FacilityUser that is not a member of a Classroom or LearnerGroup """
        orphan = self.data["unattached_users"][0]
        self.assertTrue(orphan.user_can_update(self.data["facilityadmin"]))
        self.assertFalse(orphan.user_can_update(self.data["facilitycoach"]))
        self.assertFalse(orphan.user_can_update(self.own_classroom_admin))
        self.assertFalse(orphan.user_can_update(self.own_classroom_coach))
        self.assertFalse(orphan.user_can_update(self.member))

    def test_facility_user_cannot_delete_self(self):
        """ A FacilityUser cannot delete its own FacilityUser model, even for an admin/coach """
        self.assertFalse(self.member.user_can_delete(self.member))
        self.assertFalse(self.own_classroom_coach.user_can_delete(self.own_classroom_coach))
        self.assertFalse(self.own_classroom_admin.user_can_delete(self.own_classroom_admin))
        self.assertFalse(self.data["facilityadmin"].user_can_delete(self.data["facilityadmin"]))

    def test_only_facility_admins_can_delete_facility_user(self):
        """ The only FacilityUsers who can delete a FacilityUser are admins for the Facility """
        self.assertTrue(self.member.user_can_delete(self.data["facilityadmin"]))
        self.assertFalse(self.member.user_can_delete(self.data["facilitycoach"]))
        self.assertFalse(self.member.user_can_delete(self.own_classroom_admin))
        self.assertFalse(self.member.user_can_delete(self.own_classroom_coach))

    def test_facility_users_cannot_delete_facility_users_from_other_facility(self):
        """ FacilityUsers cannot delete FacilityUsers from another Facility """
        self.assertFalse(self.member2.user_can_delete(self.data["facilityadmin"]))
        self.assertFalse(self.member2.user_can_delete(self.data["facilitycoach"]))
        self.assertFalse(self.member2.user_can_delete(self.own_classroom_admin))
        self.assertFalse(self.member2.user_can_delete(self.own_classroom_coach))
        self.assertFalse(self.member2.user_can_delete(self.member))

    def test_device_owner_can_do_anything_to_a_facility_user(self):
        """ DeviceOwner can do anything to a FacilityUser """
        self.assertTrue(self.member.user_can_create(self.device_owner))
        self.assertTrue(self.member.user_can_read(self.device_owner))
        self.assertTrue(self.member.user_can_update(self.device_owner))
        self.assertTrue(self.member.user_can_delete(self.device_owner))


class DeviceOwnerPermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying DeviceOwner instances
    """

    def setUp(self):
        self.data = create_dummy_facility_data()
        self.member = self.data["learners_one_group"][0][0][0]
        self.own_classroom_coach = self.data["classroom_coaches"][0]
        self.own_classroom_admin = self.data["classroom_admins"][0]
        self.device_owner = DeviceOwner.objects.create(username="boss")
        self.device_owner2 = DeviceOwner.objects.create(username="ubermensch")

    def test_non_device_owners_cannot_create_device_owner(self):
        """ Users who are not DeviceOwners cannot create a DeviceOwner """
        unsaved_deviceowner = DeviceOwner(username="janedoe", password="*")
        unsaved_deviceowner.full_clean()
        self.assertFalse(unsaved_deviceowner.user_can_create(self.data["facilityadmin"]))
        self.assertFalse(unsaved_deviceowner.user_can_create(self.data["facilitycoach"]))
        self.assertFalse(unsaved_deviceowner.user_can_create(self.own_classroom_admin))
        self.assertFalse(unsaved_deviceowner.user_can_create(self.own_classroom_coach))
        self.assertFalse(unsaved_deviceowner.user_can_create(self.member))
        self.assertFalse(unsaved_deviceowner.user_can_create(self.data["unattached_users"][0]))

    def test_non_device_owners_cannot_read_device_owner(self):
        """ Users who are not DeviceOwners cannot read a DeviceOwner """
        self.assertFalse(self.device_owner.user_can_read(self.data["facilityadmin"]))
        self.assertFalse(self.device_owner.user_can_read(self.data["facilitycoach"]))
        self.assertFalse(self.device_owner.user_can_read(self.own_classroom_admin))
        self.assertFalse(self.device_owner.user_can_read(self.own_classroom_coach))
        self.assertFalse(self.device_owner.user_can_read(self.member))
        self.assertFalse(self.device_owner.user_can_read(self.data["unattached_users"][0]))

    def test_non_device_owners_cannot_update_device_owner(self):
        """ Users who are not DeviceOwners cannot update a DeviceOwner """
        self.assertFalse(self.device_owner.user_can_update(self.data["facilityadmin"]))
        self.assertFalse(self.device_owner.user_can_update(self.data["facilitycoach"]))
        self.assertFalse(self.device_owner.user_can_update(self.own_classroom_admin))
        self.assertFalse(self.device_owner.user_can_update(self.own_classroom_coach))
        self.assertFalse(self.device_owner.user_can_update(self.member))
        self.assertFalse(self.device_owner.user_can_update(self.data["unattached_users"][0]))

    def test_non_device_owners_cannot_delete_device_owner(self):
        """ Users who are not DeviceOwners cannot delete a DeviceOwner """
        self.assertFalse(self.device_owner.user_can_delete(self.data["facilityadmin"]))
        self.assertFalse(self.device_owner.user_can_delete(self.data["facilitycoach"]))
        self.assertFalse(self.device_owner.user_can_delete(self.own_classroom_admin))
        self.assertFalse(self.device_owner.user_can_delete(self.own_classroom_coach))
        self.assertFalse(self.device_owner.user_can_delete(self.member))
        self.assertFalse(self.device_owner.user_can_delete(self.data["unattached_users"][0]))

    def test_device_owner_can_do_anything_to_a_device_owner(self):
        """ DeviceOwner can do anything to a DeviceOwner, except delete itself """
        self.assertTrue(self.device_owner2.user_can_create(self.device_owner))
        self.assertTrue(self.device_owner2.user_can_read(self.device_owner))
        self.assertTrue(self.device_owner2.user_can_update(self.device_owner))
        self.assertTrue(self.device_owner2.user_can_delete(self.device_owner))
        self.assertTrue(self.device_owner.user_can_create(self.device_owner))
        self.assertTrue(self.device_owner.user_can_read(self.device_owner))
        self.assertTrue(self.device_owner.user_can_update(self.device_owner))
        self.assertFalse(self.device_owner.user_can_delete(self.device_owner))


class RolePermissionsTestCase(TestCase):
    """
    Tests of permissions for reading/modifying Role instances
    """

    def setUp(self):
        self.data = create_dummy_facility_data()
        self.member = self.data["learners_one_group"][0][0][0]
        self.own_classroom = self.data["classrooms"][0]
        self.other_classroom = self.data["classrooms"][1]
        self.own_classroom_coach = self.data["classroom_coaches"][0]
        self.own_classroom_admin = self.data["classroom_admins"][0]
        self.other_classroom_coach = self.data["classroom_coaches"][1]
        self.other_classroom_admin = self.data["classroom_admins"][1]
        self.device_owner = DeviceOwner.objects.create(username="boss")
        self.role_user = self.data["unattached_users"][0]

    def test_facility_admin_can_create_facility_admin_role(self):
        unsaved_role = Role(user=self.role_user, collection=self.data["facility"], kind=role_kinds.ADMIN)
        unsaved_role.full_clean()
        self.assertTrue(unsaved_role.user_can_create(self.data["facilityadmin"]))
        self.assertFalse(unsaved_role.user_can_create(self.data["facilitycoach"]))
        self.assertFalse(unsaved_role.user_can_create(self.own_classroom_admin))
        self.assertFalse(unsaved_role.user_can_create(self.own_classroom_coach))
        self.assertFalse(unsaved_role.user_can_create(self.member))
        self.assertFalse(unsaved_role.user_can_create(self.role_user))
        self.assertTrue(unsaved_role.user_can_create(self.device_owner))

    def test_facility_admin_can_create_facility_coach_role(self):
        unsaved_role = Role(user=self.role_user, collection=self.data["facility"], kind=role_kinds.COACH)
        unsaved_role.full_clean()
        self.assertTrue(unsaved_role.user_can_create(self.data["facilityadmin"]))
        self.assertFalse(unsaved_role.user_can_create(self.data["facilitycoach"]))
        self.assertFalse(unsaved_role.user_can_create(self.own_classroom_admin))
        self.assertFalse(unsaved_role.user_can_create(self.own_classroom_coach))
        self.assertFalse(unsaved_role.user_can_create(self.member))
        self.assertFalse(unsaved_role.user_can_create(self.role_user))
        self.assertTrue(unsaved_role.user_can_create(self.device_owner))

    def test_facility_or_classroom_admin_can_create_classroom_admin_role(self):
        unsaved_role = Role(user=self.role_user, collection=self.own_classroom, kind=role_kinds.ADMIN)
        unsaved_role.full_clean()
        self.assertTrue(unsaved_role.user_can_create(self.data["facilityadmin"]))
        self.assertFalse(unsaved_role.user_can_create(self.data["facilitycoach"]))
        self.assertTrue(unsaved_role.user_can_create(self.own_classroom_admin))
        self.assertFalse(unsaved_role.user_can_create(self.own_classroom_coach))
        self.assertFalse(unsaved_role.user_can_create(self.other_classroom_admin))
        self.assertFalse(unsaved_role.user_can_create(self.other_classroom_coach))
        self.assertFalse(unsaved_role.user_can_create(self.member))
        self.assertFalse(unsaved_role.user_can_create(self.role_user))
        self.assertTrue(unsaved_role.user_can_create(self.device_owner))

    def test_facility_or_classroom_admin_can_create_classroom_coach_role(self):
        unsaved_role = Role(user=self.role_user, collection=self.own_classroom, kind=role_kinds.COACH)
        unsaved_role.full_clean()
        self.assertTrue(unsaved_role.user_can_create(self.data["facilityadmin"]))
        self.assertFalse(unsaved_role.user_can_create(self.data["facilitycoach"]))
        self.assertTrue(unsaved_role.user_can_create(self.own_classroom_admin))
        self.assertFalse(unsaved_role.user_can_create(self.own_classroom_coach))
        self.assertFalse(unsaved_role.user_can_create(self.other_classroom_admin))
        self.assertFalse(unsaved_role.user_can_create(self.other_classroom_coach))
        self.assertFalse(unsaved_role.user_can_create(self.member))
        self.assertFalse(unsaved_role.user_can_create(self.role_user))
        self.assertTrue(unsaved_role.user_can_create(self.device_owner))

    def test_facility_admin_or_coach_can_read_facility_admin_role(self):
        role = Role.objects.create(user=self.role_user, collection=self.data["facility"], kind=role_kinds.ADMIN)
        self.assertTrue(role.user_can_read(self.data["facilityadmin"]))
        self.assertTrue(role.user_can_read(self.data["facilitycoach"]))
        self.assertFalse(role.user_can_read(self.own_classroom_admin))
        self.assertFalse(role.user_can_read(self.own_classroom_coach))
        self.assertFalse(role.user_can_read(self.other_classroom_admin))
        self.assertFalse(role.user_can_read(self.other_classroom_coach))
        self.assertFalse(role.user_can_read(self.member))
        self.assertTrue(role.user_can_read(self.role_user))
        self.assertTrue(role.user_can_read(self.device_owner))

    def test_facility_or_classroom_admin_or_coach_can_read_classroom_admin_role(self):
        role = Role.objects.create(user=self.role_user, collection=self.own_classroom, kind=role_kinds.ADMIN)
        self.assertTrue(role.user_can_read(self.data["facilityadmin"]))
        self.assertTrue(role.user_can_read(self.data["facilitycoach"]))
        self.assertTrue(role.user_can_read(self.own_classroom_admin))
        self.assertTrue(role.user_can_read(self.own_classroom_coach))
        self.assertFalse(role.user_can_read(self.other_classroom_admin))
        self.assertFalse(role.user_can_read(self.other_classroom_coach))
        self.assertFalse(role.user_can_read(self.member))
        self.assertTrue(role.user_can_read(self.role_user))
        self.assertTrue(role.user_can_read(self.device_owner))

    def test_nobody_can_update_role(self):
        # None of the fields in a role are "mutable", so there's no reason to allow updates
        # (changing a role from one kind to another means deleting the existing role and creating another)
        role = Role.objects.create(user=self.role_user, collection=self.own_classroom, kind=role_kinds.COACH)
        self.assertFalse(role.user_can_update(self.data["facilityadmin"]))
        self.assertFalse(role.user_can_update(self.data["facilitycoach"]))
        self.assertFalse(role.user_can_update(self.own_classroom_admin))
        self.assertFalse(role.user_can_update(self.own_classroom_coach))
        self.assertFalse(role.user_can_update(self.other_classroom_admin))
        self.assertFalse(role.user_can_update(self.other_classroom_coach))
        self.assertFalse(role.user_can_update(self.member))
        self.assertFalse(role.user_can_update(self.role_user))
        self.assertFalse(role.user_can_update(self.device_owner))

    def test_facility_admin_can_delete_facility_admin_role(self):
        role = Role.objects.create(user=self.role_user, collection=self.data["facility"], kind=role_kinds.ADMIN)
        self.assertTrue.user_can_delete(self.data["facilityadmin"])
        self.assertFalse(role.user_can_delete(self.data["facilitycoach"]))
        self.assertFalse(role.user_can_delete(self.own_classroom_admin))
        self.assertFalse(role.user_can_delete(self.own_classroom_coach))
        self.assertFalse(role.user_can_delete(self.member))
        self.assertTrue(role.user_can_delete(self.role_user))
        self.assertTrue(role.user_can_delete(self.device_owner))

    def test_facility_admin_can_delete_facility_coach_role(self):
        role = Role.objects.create(user=self.role_user, collection=self.data["facility"], kind=role_kinds.COACH)
        self.assertTrue(role.user_can_delete(self.data["facilityadmin"]))
        self.assertFalse(role.user_can_delete(self.data["facilitycoach"]))
        self.assertFalse(role.user_can_delete(self.own_classroom_admin))
        self.assertFalse(role.user_can_delete(self.own_classroom_coach))
        self.assertFalse(role.user_can_delete(self.member))
        self.assertTrue(role.user_can_delete(self.role_user))
        self.assertTrue(role.user_can_delete(self.device_owner))

    def test_facility_or_classroom_admin_can_delete_classroom_admin_role(self):
        role = Role.objects.create(user=self.role_user, collection=self.own_classroom, kind=role_kinds.ADMIN)
        self.assertTrue(role.user_can_delete(self.data["facilityadmin"]))
        self.assertFalse(role.user_can_delete(self.data["facilitycoach"]))
        self.assertTrue(role.user_can_delete(self.own_classroom_admin))
        self.assertFalse(role.user_can_delete(self.own_classroom_coach))
        self.assertFalse(role.user_can_delete(self.other_classroom_admin))
        self.assertFalse(role.user_can_delete(self.other_classroom_coach))
        self.assertFalse(role.user_can_delete(self.member))
        self.assertTrue(role.user_can_delete(self.role_user))
        self.assertTrue(role.user_can_delete(self.device_owner))

    def test_facility_or_classroom_admin_can_delete_classroom_coach_role(self):
        role = Role.objects.create(user=self.role_user, collection=self.own_classroom, kind=role_kinds.COACH)
        self.assertTrue(role.user_can_delete(self.data["facilityadmin"]))
        self.assertFalse(role.user_can_delete(self.data["facilitycoach"]))
        self.assertTrue(role.user_can_delete(self.own_classroom_admin))
        self.assertFalse(role.user_can_delete(self.own_classroom_coach))
        self.assertFalse(role.user_can_delete(self.other_classroom_admin))
        self.assertFalse(role.user_can_delete(self.other_classroom_coach))
        self.assertFalse(role.user_can_delete(self.member))
        self.assertTrue(role.user_can_delete(self.role_user))
        self.assertTrue(role.user_can_delete(self.device_owner))
