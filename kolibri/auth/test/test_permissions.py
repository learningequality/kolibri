"""
Tests of the permissions on specific models in the auth app. For tests of the permissions system itself, see test_permission_classes.py
"""

from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

from .helpers import create_dummy_facility_data

from ..models import DeviceOwner, Facility, Classroom, LearnerGroup


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

# from django.test import TestCase

# from .dummy_permissions_classes import AllowAll, DenyAll, ThrowExceptions
# from .dummy_test_models import DummyUserLogModel, DummyFacilitySettingModel

# from ..models import FacilityUser, DeviceOwner, Facility
# from ..permissions import BasePermissions

# # Python3 compatibility
# try:
#     from itertools import izip as zip
# except ImportError:
#     pass


# class FacilityUserPermissionsTestCase(TestCase):
#     """
#     Tests that permissions are granted/revoked as expected for FacilityUsers
#     """
#     def setUp(self):
#         facility = Facility.objects.create()
#         classrooms = [Classroom.objects.create() for _ in range(0, 2)]
#         facility.add_classrooms(classrooms)
#         learner_groups = [LearnerGroup.objects.create() for _ in classrooms]
#         for c, lg in zip(classrooms, learner_groups):
#             c.add_learner_group(lg)

#         coach1, coach2 = FacilityUser.objects.create(username='coach1'), FacilityUser.objects.create(username='coach2')
#         classrooms[0].add_coach(coach1)
#         classrooms[1].add_coach(coach2)

#         admin = FacilityUser.objects.create(username='boss_hogg')
#         facility.add_admin(admin)

#         learner1, learner2 = (FacilityUser.objects.create(username='student1'),
#                               FacilityUser.objects.create(username='student2'))
#         classrooms[0].learner_groups().first().add_learner(learner1)
#         classrooms[1].learner_groups().first().add_learner(learner2)

#         self.coach1, self.coach2, self.admin, self.learner1, self.learner2 = coach1, coach2, admin, learner1, learner2
#         self.classrooms, self.learner_groups = classrooms, learner_groups

#     def test_nonexistent_permissions_raises_error(self):
#         with self.assertRaises(InvalidPermission):
#             self.learner1.has_perm('foobar.perm')

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #       auth.add_facility       ##
#     # noqa #                               ##
#     # noqa ##################################

#     def test_add_facility_pt1(self):
#         """ FacilityUsers can't create new Facilities, regardless of their roles """
#         self.assertFalse(self.admin.has_perm('auth.add_facility'))

#     def test_add_facility_pt2(self):
#         """ FacilityUsers can't create new Facilities, regardless of their roles """
#         self.assertFalse(self.coach1.has_perm('auth.add_facility'))

#     def test_add_facility_pt3(self):
#         """ FacilityUsers can't create new Facilities, regardless of their roles """
#         self.assertFalse(self.learner1.has_perm('auth.add_facility'))

#     def test_add_facility_pt4(self):
#         """ Raises exception if optional obj supplied """
#         with self.assertRaises(InvalidPermission):
#             self.assertFalse(self.learner1.has_perm('auth.add_facility', obj=[]))

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #       auth.remove_facility    ##
#     # noqa #                               ##
#     # noqa ##################################

#     def test_remove_facility_pt1(self):
#         """ FacilityUsers can't remove Facilities, regardless of their roles """
#         self.assertFalse(self.admin.has_perm('auth.remove_facility'))

#     def test_remove_facility_pt2(self):
#         """ FacilityUsers can't remove Facilities, regardless of their roles """
#         self.assertFalse(self.coach1.has_perm('auth.remove_facility'))

#     def test_remove_facility_pt3(self):
#         """ FacilityUsers can't remove Facilities, regardless of their roles """
#         self.assertFalse(self.learner1.has_perm('auth.remove_facility'))

#     def test_remove_facility_pt4(self):
#         """ Raises exception if optional obj supplied """
#         with self.assertRaises(InvalidPermission):
#             self.assertFalse(self.learner1.has_perm('auth.remove_facility', obj=[]))

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #       auth.change_facility    ##
#     # noqa #                               ##
#     # noqa ##################################

#     def test_change_facility(self):
#         self.assertTrue(self.admin.has_perm('auth.change_facility'))

#     def test_change_facility_denied_pt1(self):
#         self.assertFalse(self.coach1.has_perm('auth.change_facility'))

#     def test_change_facility_denied_pt2(self):
#         self.assertFalse(self.learner1.has_perm('auth.change_facility'))

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #       auth.add_classroom      ##
#     # noqa #                               ##
#     # noqa ##################################

#     def test_add_classroom_for_admin(self):
#         self.assertTrue(self.admin.has_perm('auth.add_classroom'))

#     def test_add_classroom_for_coach(self):
#         self.assertFalse(self.coach1.has_perm('auth.add_classroom'))

#     def test_add_classroom_for_learner(self):
#         self.assertFalse(self.learner1.has_perm('auth.add_classroom'))

#     def test_add_classroom_rejects_optional_objects(self):
#         with self.assertRaises(InvalidPermission):
#             self.admin.has_perm('auth.add_classroom', obj={})

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #       auth.remove_classroom   ##
#     # noqa #                               ##
#     # noqa ##################################

#     def test_remove_classroom_universal_for_admin(self):
#         self.assertTrue(self.admin.has_perm('auth.remove_classroom'))

#     def test_remove_classroom_universal_for_coach(self):
#         self.assertFalse(self.coach1.has_perm('auth.remove_classroom'))

#     def test_remove_classroom_universal_for_learner(self):
#         self.assertFalse(self.learner1.has_perm('auth.remove_classroom'))

#     def test_remove_classroom_specific_for_admin(self):
#         self.assertTrue(self.admin.has_perm('auth.remove_classroom', self.classrooms[0]))

#     def test_remove_classroom_specific_for_coach_pt1(self):
#         """ A Coach can remove his/her own Classroom """
#         self.assertTrue(self.coach1.has_perm('auth.remove_classroom', self.classrooms[0]))

#     def test_remove_classroom_specific_for_coach_pt2(self):
#         """ A Coach can *not* remove another's Classroom! """
#         self.assertFalse(self.coach1.has_perm('auth.remove_classroom', self.classrooms[1]))

#     def test_remove_classroom_specific_for_learner(self):
#         """ A Coach can *not* remove another's Classroom! """
#         self.assertFalse(self.learner1.has_perm('auth.remove_classroom', self.classrooms[1]))

#     def test_remove_classroom_optional_object_error(self):
#         """ If you pass in an optional object to remove_classroom that's *not* a Classroom, raise an error """
#         with self.assertRaises(InvalidPermission):
#             self.admin.has_perm('auth.remove_classroom', {})

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #       auth.change_classroom   ##
#     # noqa #                               ##
#     # noqa ##################################

#     def test_change_classroom_universal_for_admin(self):
#         self.assertTrue(self.admin.has_perm('auth.change_classroom'))

#     def test_change_classroom_universal_for_coach(self):
#         self.assertFalse(self.coach2.has_perm('auth.change_classroom'))

#     def test_change_classroom_universal_for_learner(self):
#         self.assertFalse(self.learner2.has_perm('auth.change_classroom'))

#     def test_change_classroom_specific_for_admin(self):
#         self.assertTrue(self.admin.has_perm('auth.change_classroom', self.classrooms[0]))

#     def test_change_classroom_specific_for_learner(self):
#         self.assertFalse(self.learner1.has_perm('auth.change_classroom', self.classrooms[0]))

#     def test_change_classroom_specific_for_coach_pt1(self):
#         """ Coaches can change their own Classrooms """
#         self.assertTrue(self.coach2.has_perm('auth.change_classroom', self.classrooms[1]))

#     def test_change_classroom_specific_for_coach_pt2(self):
#         """ Coaches can *not* change another's Classroom """
#         self.assertFalse(self.coach2.has_perm('auth.change_classroom', self.classrooms[0]))

#     def test_change_classroom_optional_object_error(self):
#         """ If you pass in an optional object to change_classroom that's *not* a Classroom, raise an error """
#         with self.assertRaises(InvalidPermission):
#             self.admin.has_perm('auth.change_classroom', {})

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #     auth.add_learner_group    ##
#     # noqa #                               ##
#     # noqa ##################################

#     def test_add_learner_group_univeral_for_admin(self):
#         self.assertTrue(self.admin.has_perm('auth.add_learner_group'))

#     def test_add_learner_group_universal_for_coach(self):
#         self.assertFalse(self.coach1.has_perm('auth.add_learner_group'))

#     def test_add_learner_group_universal_for_learner(self):
#         self.assertFalse(self.learner1.has_perm('auth.add_learner_group'))

#     def test_add_learner_group_rejects_non_classroom_objects(self):
#         with self.assertRaises(InvalidPermission):
#             self.admin.has_perm('auth.add_learner_group', obj={})

#     def test_add_learner_group_specific_for_coach_pt1(self):
#         """ Coach has permission for his/her own classroom """
#         self.assertTrue(self.coach1.has_perm('auth.add_learner_group', self.classrooms[0]))

#     def test_add_learner_group_specific_for_coach_pt2(self):
#         """ But not another's classroom """
#         self.assertFalse(self.coach1.has_perm('auth.add_learner_group', self.classrooms[1]))

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #  auth.remove_learner_group    ##
#     # noqa #                               ##
#     # noqa ##################################

#     def test_remove_learner_group_universal_for_admin(self):
#         self.assertTrue(self.admin.has_perm('auth.remove_learner_group'))

#     def test_remove_learner_group_universal_for_coach(self):
#         self.assertFalse(self.coach2.has_perm('auth.remove_learner_group'))

#     def test_remove_learner_group_universal_for_learner(self):
#         self.assertFalse(self.learner2.has_perm('auth.remove_learner_group'))

#     def test_remove_learner_group_rejects_non_learner_group_objects(self):
#         with self.assertRaises(InvalidPermission):
#             self.admin.has_perm('auth.remove_learner_group', obj={})

#     def test_remove_learner_group_specific_for_admin(self):
#         self.assertTrue(self.admin.has_perm('auth.remove_learner_group', self.learner_groups[0]))

#     def test_remove_learner_group_specific_for_coach_pt1(self):
#         """ Coach can remove his/her own learner groups """
#         self.assertTrue(self.coach1.has_perm('auth.remove_learner_group', self.learner_groups[0]))

#     def test_remove_learner_group_specific_for_coach_pt2(self):
#         """ Coach can't remove another's learner groups """
#         self.assertFalse(self.coach1.has_perm('auth.remove_learner_group', self.learner_groups[1]))

#     def test_remove_learner_group_specific_for_learner(self):
#         self.assertFalse(self.learner2.has_perm('auth.remove_learner_group', self.learner_groups[0]))

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #  auth.change_learner_group    ##
#     # noqa #                               ##
#     # noqa ##################################

#     def test_change_learner_group_universal_for_admin(self):
#         self.assertTrue(self.admin.has_perm('auth.change_learner_group'))

#     def test_change_learner_group_universal_for_coach(self):
#         self.assertFalse(self.coach2.has_perm('auth.change_learner_group'))

#     def test_change_learner_group_universal_for_learner(self):
#         self.assertFalse(self.learner2.has_perm('auth.change_learner_group'))

#     def test_change_learner_group_rejects_non_learner_group_objects(self):
#         with self.assertRaises(InvalidPermission):
#             self.admin.has_perm('auth.change_learner_group', obj={})

#     def test_change_learner_group_specific_for_admin(self):
#         self.assertTrue(self.admin.has_perm('auth.change_learner_group', self.learner_groups[0]))

#     def test_change_learner_group_specific_for_coach_pt1(self):
#         """ Coach can change his/her own learner groups """
#         self.assertTrue(self.coach1.has_perm('auth.change_learner_group', self.learner_groups[0]))

#     def test_change_learner_group_specific_for_coach_pt2(self):
#         """ Coach can't change another's learner groups """
#         self.assertFalse(self.coach1.has_perm('auth.change_learner_group', self.learner_groups[1]))

#     def test_change_learner_group_specific_for_learner(self):
#         self.assertFalse(self.learner2.has_perm('auth.change_learner_group', self.learner_groups[0]))

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #       auth.add_coach          ##
#     # noqa #                               ##
#     # noqa ##################################
#     AUTH_ADD_COACH = 'auth.add_coach'

#     def test_add_coach_universal_for_admin(self):
#         self.assertTrue(self.admin.has_perm(self.AUTH_ADD_COACH))

#     def test_add_coach_universal_for_coach(self):
#         self.assertFalse(self.coach2.has_perm(self.AUTH_ADD_COACH))

#     def test_add_coach_universal_for_learner(self):
#         self.assertFalse(self.learner1.has_perm(self.AUTH_ADD_COACH))

#     def test_add_coach_specific_for_admin(self):
#         self.assertTrue(self.admin.has_perm(self.AUTH_ADD_COACH, self.classrooms[0]))

#     def test_add_coach_specific_for_coach_pt1(self):
#         """ Coaches can add Coaches for their own classrooms """
#         self.assertTrue(self.coach2.has_perm(self.AUTH_ADD_COACH, self.classrooms[1]))

#     def test_add_coach_specific_for_coach_pt2(self):
#         """ Coaches can *not* add Coaches for another's classroom """
#         self.assertFalse(self.coach1.has_perm(self.AUTH_ADD_COACH, self.classrooms[1]))

#     def test_add_coach_specific_for_learner(self):
#         self.assertFalse(self.learner1.has_perm(self.AUTH_ADD_COACH, self.classrooms[0]))

#     def test_add_coach_rejects_non_classroom_objects(self):
#         with self.assertRaises(InvalidPermission):
#             self.admin.has_perm(self.AUTH_ADD_COACH, obj={})

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #       auth.remove_coach       ##
#     # noqa #                               ##
#     # noqa ##################################
#     AUTH_REMOVE_COACH = 'auth.remove_coach'

#     def test_remove_coach_universal_for_admin(self):
#         self.assertTrue(self.admin.has_perm(self.AUTH_REMOVE_COACH))

#     def test_remove_coach_universal_for_coach(self):
#         self.assertFalse(self.coach2.has_perm(self.AUTH_REMOVE_COACH))

#     def test_remove_coach_universal_for_learner(self):
#         self.assertFalse(self.learner1.has_perm(self.AUTH_REMOVE_COACH))

#     def test_remove_coach_specific_for_admin(self):
#         self.assertTrue(self.admin.has_perm(self.AUTH_REMOVE_COACH, self.classrooms[0]))

#     def test_remove_coach_specific_for_coach_pt1(self):
#         """ Coaches can remove Coaches for their own classrooms """
#         self.assertTrue(self.coach2.has_perm(self.AUTH_REMOVE_COACH, self.classrooms[1]))

#     def test_remove_coach_specific_for_coach_pt2(self):
#         """ Coaches can *not* remove Coaches for another's classroom """
#         self.assertFalse(self.coach1.has_perm(self.AUTH_REMOVE_COACH, self.classrooms[1]))

#     def test_remove_coach_specific_for_learner(self):
#         self.assertFalse(self.learner1.has_perm(self.AUTH_REMOVE_COACH, self.classrooms[0]))

#     def test_remove_coach_rejects_non_classroom_objects(self):
#         with self.assertRaises(InvalidPermission):
#             self.admin.has_perm(self.AUTH_REMOVE_COACH, obj={})

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #       auth.add_learner        ##
#     # noqa #                               ##
#     # noqa ##################################
#     AUTH_ADD_LEARNER = 'auth.add_learner'

#     def test_add_learner_universal_for_admin(self):
#         self.assertTrue(self.admin.has_perm(self.AUTH_ADD_LEARNER))

#     def test_add_learner_universal_for_coach(self):
#         self.assertFalse(self.coach2.has_perm(self.AUTH_ADD_LEARNER))

#     def test_add_learner_universal_for_learner(self):
#         self.assertFalse(self.learner1.has_perm(self.AUTH_ADD_LEARNER))

#     def test_add_learner_specific_for_admin(self):
#         self.assertTrue(self.admin.has_perm(self.AUTH_ADD_LEARNER, self.learner_groups[0]))

#     def test_add_learner_specific_for_coach_pt1(self):
#         """ Coaches can add Learners for their own LearnerGroups """
#         self.assertTrue(self.coach2.has_perm(self.AUTH_ADD_LEARNER, self.learner_groups[1]))

#     def test_add_learner_specific_for_coach_pt2(self):
#         """ Coaches can *not* add Learners for another's LearnerGroups """
#         self.assertFalse(self.coach1.has_perm(self.AUTH_ADD_LEARNER, self.learner_groups[1]))

#     def test_add_learner_specific_for_learner(self):
#         self.assertFalse(self.learner1.has_perm(self.AUTH_ADD_LEARNER, self.learner_groups[0]))

#     def test_add_learner_rejects_non_learner_group_objects(self):
#         with self.assertRaises(InvalidPermission):
#             self.admin.has_perm(self.AUTH_ADD_LEARNER, obj={})

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #       auth.remove_learner     ##
#     # noqa #                               ##
#     # noqa ##################################
#     AUTH_REMOVE_LEARNER = 'auth.remove_learner'

#     def test_remove_learner_universal_for_admin(self):
#         self.assertTrue(self.admin.has_perm(self.AUTH_REMOVE_LEARNER))

#     def test_remove_learner_universal_for_coach(self):
#         self.assertFalse(self.coach2.has_perm(self.AUTH_REMOVE_LEARNER))

#     def test_remove_learner_universal_for_learner(self):
#         self.assertFalse(self.learner1.has_perm(self.AUTH_REMOVE_LEARNER))

#     def test_remove_learner_specific_for_admin(self):
#         self.assertTrue(self.admin.has_perm(self.AUTH_REMOVE_LEARNER, self.learner_groups[0]))

#     def test_remove_learner_specific_for_coach_pt1(self):
#         """ Coaches can remove Learners for their own LearnerGroups """
#         self.assertTrue(self.coach2.has_perm(self.AUTH_REMOVE_LEARNER, self.learner_groups[1]))

#     def test_remove_learner_specific_for_coach_pt2(self):
#         """ Coaches can *not* remove Learners for another's LearnerGroups """
#         self.assertFalse(self.coach1.has_perm(self.AUTH_REMOVE_LEARNER, self.learner_groups[1]))

#     def test_remove_learner_specific_for_learner(self):
#         self.assertFalse(self.learner1.has_perm(self.AUTH_REMOVE_LEARNER, self.learner_groups[0]))

#     def test_remove_learner_rejects_non_classroom_objects(self):
#         with self.assertRaises(InvalidPermission):
#             self.admin.has_perm(self.AUTH_REMOVE_LEARNER, obj={})

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #   auth.add_facility_admin     ##
#     # noqa #                               ##
#     # noqa ##################################
#     AUTH_ADD_FACILITY_ADMIN = 'auth.add_facility_admin'

#     def test_add_facility_admin_for_admin(self):
#         self.assertTrue(self.admin.has_perm(self.AUTH_ADD_FACILITY_ADMIN))

#     def test_add_facility_admin_for_coach(self):
#         self.assertFalse(self.coach2.has_perm(self.AUTH_ADD_FACILITY_ADMIN))

#     def test_add_facility_admin_for_learner(self):
#         self.assertFalse(self.learner1.has_perm(self.AUTH_ADD_FACILITY_ADMIN))

#     # noqa ##################################
#     # noqa #                               ##
#     # noqa #   auth.remove_facility_admin  ##
#     # noqa #                               ##
#     # noqa ##################################
#     AUTH_REMOVE_FACILITY_ADMIN = 'auth.remove_facility_admin'

#     def test_remove_facility_admin_for_admin(self):
#         self.assertTrue(self.admin.has_perm(self.AUTH_REMOVE_FACILITY_ADMIN))

#     def test_remove_facility_admin_for_coach(self):
#         self.assertFalse(self.coach2.has_perm(self.AUTH_REMOVE_FACILITY_ADMIN))

#     def test_remove_facility_admin_for_learner(self):
#         self.assertFalse(self.learner1.has_perm(self.AUTH_REMOVE_FACILITY_ADMIN))
