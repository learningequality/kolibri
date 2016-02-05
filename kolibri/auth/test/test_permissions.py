from django.test import TestCase

from kolibri.auth.backends import InvalidPermission
from kolibri.auth.models import FacilityUser, Facility, Classroom, LearnerGroup


class FacilityUserPermissionsTestCase(TestCase):
    """
    Tests that permissions are granted/revoked as expected for FacilityUsers
    """
    def setUp(self):
        facility = Facility.objects.create()
        classrooms = [Classroom.objects.create() for _ in range(0, 2)]
        facility.add_classrooms(classrooms)
        for c in classrooms:
            c.add_learner_group(LearnerGroup.objects.create())

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
        self.classrooms = classrooms

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
