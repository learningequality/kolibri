from django.test import TestCase

from kolibri.auth.backends import InvalidPermission
from kolibri.auth.models import FacilityUser, Facility, Classroom, LearnerGroup

# Python3 compatibility
try:
    from itertools import izip as zip
except ImportError:
    pass


class FacilityUserPermissionsTestCase(TestCase):
    """
    Tests that permissions are granted/revoked as expected for FacilityUsers
    """
    def setUp(self):
        facility = Facility.objects.create()
        classrooms = [Classroom.objects.create() for _ in range(0, 2)]
        facility.add_classrooms(classrooms)
        learner_groups = [LearnerGroup.objects.create() for _ in classrooms]
        for c, lg in zip(classrooms, learner_groups):
            c.add_learner_group(lg)

        coach1, coach2 = FacilityUser.objects.create(username='coach1'), FacilityUser.objects.create(username='coach2')
        classrooms[0].add_coach(coach1)
        classrooms[1].add_coach(coach2)

        admin = FacilityUser.objects.create(username='boss_hogg')
        facility.add_admin(admin)

        learner1, learner2 = (FacilityUser.objects.create(username='student1'),
                              FacilityUser.objects.create(username='student2'))
        classrooms[0].learner_groups().first().add_learner(learner1)
        classrooms[1].learner_groups().first().add_learner(learner2)

        self.coach1, self.coach2, self.admin, self.learner1, self.learner2 = coach1, coach2, admin, learner1, learner2
        self.classrooms, self.learner_groups = classrooms, learner_groups

    def test_nonexistent_permissions_raises_error(self):
        with self.assertRaises(InvalidPermission):
            self.learner1.has_perm('foobar.perm')

    # noqa ##################################
    # noqa #                               ##
    # noqa #       auth.add_facility       ##
    # noqa #                               ##
    # noqa ##################################

    def test_add_facility_pt1(self):
        """ FacilityUsers can't create new Facilities, regardless of their roles """
        self.assertFalse(self.admin.has_perm('auth.add_facility'))

    def test_add_facility_pt2(self):
        """ FacilityUsers can't create new Facilities, regardless of their roles """
        self.assertFalse(self.coach1.has_perm('auth.add_facility'))

    def test_add_facility_pt3(self):
        """ FacilityUsers can't create new Facilities, regardless of their roles """
        self.assertFalse(self.learner1.has_perm('auth.add_facility'))

    def test_add_facility_pt4(self):
        """ Raises exception if optional obj supplied """
        with self.assertRaises(InvalidPermission):
            self.assertFalse(self.learner1.has_perm('auth.add_facility', obj=[]))

    # noqa ##################################
    # noqa #                               ##
    # noqa #       auth.remove_facility    ##
    # noqa #                               ##
    # noqa ##################################

    def test_remove_facility_pt1(self):
        """ FacilityUsers can't remove Facilities, regardless of their roles """
        self.assertFalse(self.admin.has_perm('auth.remove_facility'))

    def test_remove_facility_pt2(self):
        """ FacilityUsers can't remove Facilities, regardless of their roles """
        self.assertFalse(self.coach1.has_perm('auth.remove_facility'))

    def test_remove_facility_pt3(self):
        """ FacilityUsers can't remove Facilities, regardless of their roles """
        self.assertFalse(self.learner1.has_perm('auth.remove_facility'))

    def test_remove_facility_pt4(self):
        """ Raises exception if optional obj supplied """
        with self.assertRaises(InvalidPermission):
            self.assertFalse(self.learner1.has_perm('auth.remove_facility', obj=[]))

    # noqa ##################################
    # noqa #                               ##
    # noqa #       auth.change_facility    ##
    # noqa #                               ##
    # noqa ##################################

    def test_change_facility(self):
        self.assertTrue(self.admin.has_perm('auth.change_facility'))

    def test_change_facility_denied_pt1(self):
        self.assertFalse(self.coach1.has_perm('auth.change_facility'))

    def test_change_facility_denied_pt2(self):
        self.assertFalse(self.learner1.has_perm('auth.change_facility'))

    # noqa ##################################
    # noqa #                               ##
    # noqa #       auth.add_classroom      ##
    # noqa #                               ##
    # noqa ##################################

    def test_add_classroom_for_admin(self):
        self.assertTrue(self.admin.has_perm('auth.add_classroom'))

    def test_add_classroom_for_coach(self):
        self.assertFalse(self.coach1.has_perm('auth.add_classroom'))

    def test_add_classroom_for_learner(self):
        self.assertFalse(self.learner1.has_perm('auth.add_classroom'))

    def test_add_classroom_rejects_optional_objects(self):
        with self.assertRaises(InvalidPermission):
            self.admin.has_perm('auth.add_classroom', obj={})

    # noqa ##################################
    # noqa #                               ##
    # noqa #       auth.remove_classroom   ##
    # noqa #                               ##
    # noqa ##################################

    def test_remove_classroom_universal_for_admin(self):
        self.assertTrue(self.admin.has_perm('auth.remove_classroom'))

    def test_remove_classroom_universal_for_coach(self):
        self.assertFalse(self.coach1.has_perm('auth.remove_classroom'))

    def test_remove_classroom_universal_for_learner(self):
        self.assertFalse(self.learner1.has_perm('auth.remove_classroom'))

    def test_remove_classroom_specific_for_admin(self):
        self.assertTrue(self.admin.has_perm('auth.remove_classroom', self.classrooms[0]))

    def test_remove_classroom_specific_for_coach_pt1(self):
        """ A Coach can remove his/her own Classroom """
        self.assertTrue(self.coach1.has_perm('auth.remove_classroom', self.classrooms[0]))

    def test_remove_classroom_specific_for_coach_pt2(self):
        """ A Coach can *not* remove another's Classroom! """
        self.assertFalse(self.coach1.has_perm('auth.remove_classroom', self.classrooms[1]))

    def test_remove_classroom_specific_for_learner(self):
        """ A Coach can *not* remove another's Classroom! """
        self.assertFalse(self.learner1.has_perm('auth.remove_classroom', self.classrooms[1]))

    def test_remove_classroom_optional_object_error(self):
        """ If you pass in an optional object to remove_classroom that's *not* a Classroom, raise an error """
        with self.assertRaises(InvalidPermission):
            self.admin.has_perm('auth.remove_classroom', {})

    # noqa ##################################
    # noqa #                               ##
    # noqa #       auth.change_classroom   ##
    # noqa #                               ##
    # noqa ##################################

    def test_change_classroom_universal_for_admin(self):
        self.assertTrue(self.admin.has_perm('auth.change_classroom'))

    def test_change_classroom_universal_for_coach(self):
        self.assertFalse(self.coach2.has_perm('auth.change_classroom'))

    def test_change_classroom_universal_for_learner(self):
        self.assertFalse(self.learner2.has_perm('auth.change_classroom'))

    def test_change_classroom_specific_for_admin(self):
        self.assertTrue(self.admin.has_perm('auth.change_classroom', self.classrooms[0]))

    def test_change_classroom_specific_for_learner(self):
        self.assertFalse(self.learner1.has_perm('auth.change_classroom', self.classrooms[0]))

    def test_change_classroom_specific_for_coach_pt1(self):
        """ Coaches can change their own Classrooms """
        self.assertTrue(self.coach2.has_perm('auth.change_classroom', self.classrooms[1]))

    def test_change_classroom_specific_for_coach_pt2(self):
        """ Coaches can *not* change another's Classroom """
        self.assertFalse(self.coach2.has_perm('auth.change_classroom', self.classrooms[0]))

    def test_change_classroom_optional_object_error(self):
        """ If you pass in an optional object to change_classroom that's *not* a Classroom, raise an error """
        with self.assertRaises(InvalidPermission):
            self.admin.has_perm('auth.change_classroom', {})

    # noqa ##################################
    # noqa #                               ##
    # noqa #     auth.add_learner_group    ##
    # noqa #                               ##
    # noqa ##################################

    def test_add_learner_group_univeral_for_admin(self):
        self.assertTrue(self.admin.has_perm('auth.add_learner_group'))

    def test_add_learner_group_universal_for_coach(self):
        self.assertFalse(self.coach1.has_perm('auth.add_learner_group'))

    def test_add_learner_group_universal_for_learner(self):
        self.assertFalse(self.learner1.has_perm('auth.add_learner_group'))

    def test_add_learner_group_rejects_non_classroom_objects(self):
        with self.assertRaises(InvalidPermission):
            self.admin.has_perm('auth.add_learner_group', obj={})

    def test_add_learner_group_specific_for_coach_pt1(self):
        """ Coach has permission for his/her own classroom """
        self.assertTrue(self.coach1.has_perm('auth.add_learner_group', self.classrooms[0]))

    def test_add_learner_group_specific_for_coach_pt2(self):
        """ But not another's classroom """
        self.assertFalse(self.coach1.has_perm('auth.add_learner_group', self.classrooms[1]))

    # noqa ##################################
    # noqa #                               ##
    # noqa #  auth.remove_learner_group    ##
    # noqa #                               ##
    # noqa ##################################

    def test_remove_learner_group_universal_for_admin(self):
        self.assertTrue(self.admin.has_perm('auth.remove_learner_group'))

    def test_remove_learner_group_universal_for_coach(self):
        self.assertFalse(self.coach2.has_perm('auth.remove_learner_group'))

    def test_remove_learner_group_universal_for_learner(self):
        self.assertFalse(self.learner2.has_perm('auth.remove_learner_group'))

    def test_remove_learner_group_rejects_non_learner_group_objects(self):
        with self.assertRaises(InvalidPermission):
            self.admin.has_perm('auth.remove_learner_group', obj={})

    def test_remove_learner_group_specific_for_admin(self):
        self.assertTrue(self.admin.has_perm('auth.remove_learner_group', self.learner_groups[0]))

    def test_remove_learner_group_specific_for_coach_pt1(self):
        """ Coach can remove his/her own learner groups """
        self.assertTrue(self.coach1.has_perm('auth.remove_learner_group', self.learner_groups[0]))

    def test_remove_learner_group_specific_for_coach_pt2(self):
        """ Coach can't remove another's learner groups """
        self.assertFalse(self.coach1.has_perm('auth.remove_learner_group', self.learner_groups[1]))

    def test_remove_learner_group_specific_for_learner(self):
        self.assertFalse(self.learner2.has_perm('auth.remove_learner_group', self.learner_groups[0]))

    # noqa ##################################
    # noqa #                               ##
    # noqa #  auth.change_learner_group    ##
    # noqa #                               ##
    # noqa ##################################

    def test_change_learner_group_universal_for_admin(self):
        self.assertTrue(self.admin.has_perm('auth.change_learner_group'))

    def test_change_learner_group_universal_for_coach(self):
        self.assertFalse(self.coach2.has_perm('auth.change_learner_group'))

    def test_change_learner_group_universal_for_learner(self):
        self.assertFalse(self.learner2.has_perm('auth.change_learner_group'))

    def test_change_learner_group_rejects_non_learner_group_objects(self):
        with self.assertRaises(InvalidPermission):
            self.admin.has_perm('auth.change_learner_group', obj={})

    def test_change_learner_group_specific_for_admin(self):
        self.assertTrue(self.admin.has_perm('auth.change_learner_group', self.learner_groups[0]))

    def test_change_learner_group_specific_for_coach_pt1(self):
        """ Coach can change his/her own learner groups """
        self.assertTrue(self.coach1.has_perm('auth.change_learner_group', self.learner_groups[0]))

    def test_change_learner_group_specific_for_coach_pt2(self):
        """ Coach can't change another's learner groups """
        self.assertFalse(self.coach1.has_perm('auth.change_learner_group', self.learner_groups[1]))

    def test_change_learner_group_specific_for_learner(self):
        self.assertFalse(self.learner2.has_perm('auth.change_learner_group', self.learner_groups[0]))

    # noqa ##################################
    # noqa #                               ##
    # noqa #       auth.add_coach          ##
    # noqa #                               ##
    # noqa ##################################
    AUTH_ADD_COACH = 'auth.add_coach'

    def test_add_coach_universal_for_admin(self):
        self.assertTrue(self.admin.has_perm(self.AUTH_ADD_COACH))

    def test_add_coach_universal_for_coach(self):
        self.assertFalse(self.coach2.has_perm(self.AUTH_ADD_COACH))

    def test_add_coach_universal_for_learner(self):
        self.assertFalse(self.learner1.has_perm(self.AUTH_ADD_COACH))

    def test_add_coach_specific_for_admin(self):
        self.assertTrue(self.admin.has_perm(self.AUTH_ADD_COACH, self.classrooms[0]))

    def test_add_coach_specific_for_coach_pt1(self):
        """ Coaches can add Coaches for their own classrooms """
        self.assertTrue(self.coach2.has_perm(self.AUTH_ADD_COACH, self.classrooms[1]))

    def test_add_coach_specific_for_coach_pt2(self):
        """ Coaches can *not* add Coaches for another's classroom """
        self.assertFalse(self.coach1.has_perm(self.AUTH_ADD_COACH, self.classrooms[1]))

    def test_add_coach_specific_for_learner(self):
        self.assertFalse(self.learner1.has_perm(self.AUTH_ADD_COACH, self.classrooms[0]))

    def test_add_coach_rejects_non_classroom_objects(self):
        with self.assertRaises(InvalidPermission):
            self.admin.has_perm(self.AUTH_ADD_COACH, obj={})

    # noqa ##################################
    # noqa #                               ##
    # noqa #       auth.remove_coach       ##
    # noqa #                               ##
    # noqa ##################################
    AUTH_REMOVE_COACH = 'auth.remove_coach'

    def test_remove_coach_universal_for_admin(self):
        self.assertTrue(self.admin.has_perm(self.AUTH_REMOVE_COACH))

    def test_remove_coach_universal_for_coach(self):
        self.assertFalse(self.coach2.has_perm(self.AUTH_REMOVE_COACH))

    def test_remove_coach_universal_for_learner(self):
        self.assertFalse(self.learner1.has_perm(self.AUTH_REMOVE_COACH))

    def test_remove_coach_specific_for_admin(self):
        self.assertTrue(self.admin.has_perm(self.AUTH_REMOVE_COACH, self.classrooms[0]))

    def test_remove_coach_specific_for_coach_pt1(self):
        """ Coaches can remove Coaches for their own classrooms """
        self.assertTrue(self.coach2.has_perm(self.AUTH_REMOVE_COACH, self.classrooms[1]))

    def test_remove_coach_specific_for_coach_pt2(self):
        """ Coaches can *not* remove Coaches for another's classroom """
        self.assertFalse(self.coach1.has_perm(self.AUTH_REMOVE_COACH, self.classrooms[1]))

    def test_remove_coach_specific_for_learner(self):
        self.assertFalse(self.learner1.has_perm(self.AUTH_REMOVE_COACH, self.classrooms[0]))

    def test_remove_coach_rejects_non_classroom_objects(self):
        with self.assertRaises(InvalidPermission):
            self.admin.has_perm(self.AUTH_REMOVE_COACH, obj={})

    # noqa ##################################
    # noqa #                               ##
    # noqa #       auth.add_learner        ##
    # noqa #                               ##
    # noqa ##################################
    AUTH_ADD_LEARNER = 'auth.add_learner'

    def test_add_learner_universal_for_admin(self):
        self.assertTrue(self.admin.has_perm(self.AUTH_ADD_LEARNER))

    def test_add_learner_universal_for_coach(self):
        self.assertFalse(self.coach2.has_perm(self.AUTH_ADD_LEARNER))

    def test_add_learner_universal_for_learner(self):
        self.assertFalse(self.learner1.has_perm(self.AUTH_ADD_LEARNER))

    def test_add_learner_specific_for_admin(self):
        self.assertTrue(self.admin.has_perm(self.AUTH_ADD_LEARNER, self.learner_groups[0]))

    def test_add_learner_specific_for_coach_pt1(self):
        """ Coaches can add Learners for their own LearnerGroups """
        self.assertTrue(self.coach2.has_perm(self.AUTH_ADD_LEARNER, self.learner_groups[1]))

    def test_add_learner_specific_for_coach_pt2(self):
        """ Coaches can *not* add Learners for another's LearnerGroups """
        self.assertFalse(self.coach1.has_perm(self.AUTH_ADD_LEARNER, self.learner_groups[1]))

    def test_add_learner_specific_for_learner(self):
        self.assertFalse(self.learner1.has_perm(self.AUTH_ADD_LEARNER, self.learner_groups[0]))

    def test_add_learner_rejects_non_learner_group_objects(self):
        with self.assertRaises(InvalidPermission):
            self.admin.has_perm(self.AUTH_ADD_LEARNER, obj={})

    # noqa ##################################
    # noqa #                               ##
    # noqa #       auth.remove_learner     ##
    # noqa #                               ##
    # noqa ##################################
    AUTH_REMOVE_LEARNER = 'auth.remove_learner'

    def test_remove_learner_universal_for_admin(self):
        self.assertTrue(self.admin.has_perm(self.AUTH_REMOVE_LEARNER))

    def test_remove_learner_universal_for_coach(self):
        self.assertFalse(self.coach2.has_perm(self.AUTH_REMOVE_LEARNER))

    def test_remove_learner_universal_for_learner(self):
        self.assertFalse(self.learner1.has_perm(self.AUTH_REMOVE_LEARNER))

    def test_remove_learner_specific_for_admin(self):
        self.assertTrue(self.admin.has_perm(self.AUTH_REMOVE_LEARNER, self.learner_groups[0]))

    def test_remove_learner_specific_for_coach_pt1(self):
        """ Coaches can remove Learners for their own LearnerGroups """
        self.assertTrue(self.coach2.has_perm(self.AUTH_REMOVE_LEARNER, self.learner_groups[1]))

    def test_remove_learner_specific_for_coach_pt2(self):
        """ Coaches can *not* remove Learners for another's LearnerGroups """
        self.assertFalse(self.coach1.has_perm(self.AUTH_REMOVE_LEARNER, self.learner_groups[1]))

    def test_remove_learner_specific_for_learner(self):
        self.assertFalse(self.learner1.has_perm(self.AUTH_REMOVE_LEARNER, self.learner_groups[0]))

    def test_remove_learner_rejects_non_classroom_objects(self):
        with self.assertRaises(InvalidPermission):
            self.admin.has_perm(self.AUTH_REMOVE_LEARNER, obj={})
