from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

from kolibri.auth.models import FacilityUser, Facility, Classroom, LearnerGroup, Role, Collection, FacilityDataset


class CollectionRemovalTestCase(TestCase):
    """
    Tests that removing users from a Collection properly deletes the corresponding Role object, and that deleting
    a Collection also deletes the sub-Collections underneath it.
    """

    def setUp(self):
        self.dataset = FacilityDataset.objects.create()
        user1, user2, user3 = self.user1, self.user2, self.user3 = (
            FacilityUser.objects.create(username='foo', dataset=self.dataset),
            FacilityUser.objects.create(username='bar', dataset=self.dataset),
            FacilityUser.objects.create(username='baz', dataset=self.dataset),
        )

        self.f = Facility.objects.create(dataset=self.dataset)
        self.f.add_admin(user3)

        self.cr = Classroom.objects.create(dataset=self.dataset, parent=self.f)
        self.cr.add_coach(user2)

        self.lg = LearnerGroup.objects.create(dataset=self.dataset, parent=self.cr)
        self.lg.add_learner(user1)

    def test_remove_learner(self):
        self.assertEqual(Role.objects.filter(user=self.user1, kind=Role.KIND_LEARNER, collection=self.lg).count(), 1)
        self.lg.remove_learner(self.user1)
        self.assertEqual(Role.objects.filter(user=self.user1, kind=Role.KIND_LEARNER, collection=self.lg).count(), 0)

    def test_remove_coach(self):
        self.assertEqual(Role.objects.filter(user=self.user2, kind=Role.KIND_COACH, collection=self.cr).count(), 1)
        self.cr.remove_coach(self.user2)
        self.assertEqual(Role.objects.filter(user=self.user2, kind=Role.KIND_COACH, collection=self.cr).count(), 0)

    def test_remove_admin(self):
        # import IPython; IPython.embed()
        self.assertEqual(Role.objects.filter(user=self.user3, kind=Role.KIND_ADMIN, collection=self.f).count(), 1)
        self.f.remove_admin(self.user3)
        self.assertEqual(Role.objects.filter(user=self.user3, kind=Role.KIND_ADMIN, collection=self.f).count(), 0)

    def test_delete_learner_group(self):
        """ Deleting a LearnerGroup should delete its associated Roles as well """
        self.assertEqual(Role.objects.filter(collection=self.lg.id).count(), 1)
        self.lg.delete()
        self.assertEqual(Role.objects.filter(collection=self.lg.id).count(), 0)

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
        self.assertEqual(Role.objects.filter(collection=self.f.id).count(), 1)
        self.f.delete()
        self.assertEqual(Role.objects.filter(collection=self.f.id).count(), 0)

    def test_delete_facility_pt2(self):
        """ Deleting a Facility should delete Classrooms under it. """
        self.assertEqual(Classroom.objects.count(), 1)
        self.f.delete()
        self.assertEqual(Classroom.objects.count(), 0)

    def test_delete_facility_pt3(self):
        """ Deleting a Facility should delete *every* Collection under it and associated Roles """
        self.f.delete()
        self.assertEqual(Collection.objects.count(), 0)
        self.assertEqual(Role.objects.count(), 0)


class CollectionRelatedObjectTestCase(TestCase):

    def setUp(self):
        self.dataset = FacilityDataset.objects.create()

        users = self.users = [FacilityUser.objects.create(
            username="foo%s" % i,
            dataset=self.dataset,
        ) for i in range(10)]

        self.f = Facility.objects.create(dataset=self.dataset)
        self.f.add_admins(users[8:9])

        self.cr = Classroom.objects.create(parent=self.f, dataset=self.dataset)
        self.cr.add_coaches(users[5:8])

        self.lg = LearnerGroup.objects.create(parent=self.cr, dataset=self.dataset)
        self.lg.add_learners(users[0:5])

    def test_get_learner_groups(self):
        self.assertSetEqual({self.lg.pk}, set(lg.pk for lg in self.cr.get_learner_groups()))

    def test_get_classrooms(self):
        self.assertSetEqual({self.cr.pk}, set(cr.pk for cr in self.f.get_classrooms()))

    def test_get_classroom(self):
        self.assertEqual(self.cr.pk, self.lg.get_classroom().pk)


class CollectionsTestCase(TestCase):

    def setUp(self):
        self.dataset = FacilityDataset.objects.create()

    def test_add_admin(self):
        user = FacilityUser.objects.create(username='foo', dataset=self.dataset)
        facility = Facility.objects.create(dataset=self.dataset)
        facility.add_admin(user)
        self.assertEqual(Role.objects.filter(user=user, kind=Role.KIND_ADMIN, collection=facility).count(), 1)

    def test_add_classroom(self):
        facility = Facility.objects.create(dataset=self.dataset)
        Classroom.objects.create(parent=facility, dataset=self.dataset)
        self.assertEqual(Classroom.objects.count(), 1)

    def test_add_coach(self):
        user = FacilityUser.objects.create(username='foo', dataset=self.dataset)
        classroom = Classroom.objects.create(dataset=self.dataset)
        classroom.add_coach(user)
        self.assertEqual(Role.objects.filter(user=user, kind=Role.KIND_COACH, collection=classroom).count(), 1)

    def test_add_learner_group(self):
        classroom = Classroom.objects.create(dataset=self.dataset)
        LearnerGroup.objects.create(parent=classroom, dataset=self.dataset)
        self.assertEqual(LearnerGroup.objects.count(), 1)

    def test_learner(self):
        user = FacilityUser.objects.create(username='foo', dataset=self.dataset)
        learner_group = LearnerGroup.objects.create(dataset=self.dataset)
        learner_group.add_learner(user)
        self.assertEqual(Role.objects.filter(user=user, kind=Role.KIND_LEARNER, collection=learner_group).count(), 1)
