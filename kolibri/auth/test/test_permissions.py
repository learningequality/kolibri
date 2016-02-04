from django.test import TestCase


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

    def test_add_facility_pt1(self):
        """ FacilityUsers can't create new Facilities, regardless of their roles """
        self.assertFalse(self.admin.has_perm('auth.add_facility'))

    def test_add_facility_pt2(self):
        """ FacilityUsers can't create new Facilities, regardless of their roles """
        self.assertFalse(self.coach1.has_perm('auth.add_facility'))

    def test_add_facility_pt3(self):
        """ FacilityUsers can't create new Facilities, regardless of their roles """
        self.assertFalse(self.learner1.has_perm('auth.add_facility'))
