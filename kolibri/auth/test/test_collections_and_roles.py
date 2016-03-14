from __future__ import absolute_import, print_function, unicode_literals

from django.db.utils import IntegrityError
from django.test import TestCase

from kolibri.auth.models import FacilityUser, Facility, Classroom, LearnerGroup, Role, Collection, DeviceOwner


class CollectionRemovalTestCase(TestCase):
    """
    Tests that removing users from a Collection properly deletes the corresponding Role object, and that deleting
    a Collection also deletes the sub-Collections underneath it.
    """

    def setUp(self):

        self.facility = Facility.objects.create()

        user1, user2, user3 = self.user1, self.user2, self.user3 = (
            FacilityUser.objects.create(username='foo', facility=self.facility),
            FacilityUser.objects.create(username='bar', facility=self.facility),
            FacilityUser.objects.create(username='baz', facility=self.facility),
        )

        self.facility.add_admin(user3)

        self.cr = Classroom.objects.create(parent=self.facility)
        self.cr.add_coach(user2)

        self.lg = LearnerGroup.objects.create(parent=self.cr)
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
        self.assertEqual(Role.objects.filter(user=self.user3, kind=Role.KIND_ADMIN, collection=self.facility).count(), 1)
        self.facility.remove_admin(self.user3)
        self.assertEqual(Role.objects.filter(user=self.user3, kind=Role.KIND_ADMIN, collection=self.facility).count(), 0)

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
        self.assertEqual(Role.objects.filter(collection=self.facility.id).count(), 1)
        self.facility.delete()
        self.assertEqual(Role.objects.filter(collection=self.facility.id).count(), 0)

    def test_delete_facility_pt2(self):
        """ Deleting a Facility should delete Classrooms under it. """
        self.assertEqual(Classroom.objects.count(), 1)
        self.facility.delete()
        self.assertEqual(Classroom.objects.count(), 0)

    def test_delete_facility_pt3(self):
        """ Deleting a Facility should delete *every* Collection under it and associated Roles """
        self.facility.delete()
        self.assertEqual(Collection.objects.count(), 0)
        self.assertEqual(Role.objects.count(), 0)


class CollectionRelatedObjectTestCase(TestCase):

    def setUp(self):

        self.facility = Facility.objects.create()

        users = self.users = [FacilityUser.objects.create(
            username="foo%s" % i,
            facility=self.facility,
        ) for i in range(10)]

        self.facility.add_admins(users[8:9])

        self.cr = Classroom.objects.create(parent=self.facility)
        self.cr.add_coaches(users[5:8])

        self.lg = LearnerGroup.objects.create(parent=self.cr)
        self.lg.add_learners(users[0:5])

    def test_get_learner_groups(self):
        self.assertSetEqual({self.lg.pk}, set(lg.pk for lg in self.cr.get_learner_groups()))

    def test_get_classrooms(self):
        self.assertSetEqual({self.cr.pk}, set(cr.pk for cr in self.facility.get_classrooms()))

    def test_get_classroom(self):
        self.assertEqual(self.cr.pk, self.lg.get_classroom().pk)


class CollectionsTestCase(TestCase):

    def setUp(self):
        self.facility = Facility.objects.create()

    def test_add_admin(self):
        user = FacilityUser.objects.create(username='foo', facility=self.facility)
        self.facility.add_admin(user)
        self.assertEqual(Role.objects.filter(user=user, kind=Role.KIND_ADMIN, collection=self.facility).count(), 1)

    def test_add_classroom(self):
        Classroom.objects.create(parent=self.facility)
        self.assertEqual(Classroom.objects.count(), 1)

    def test_add_coach(self):
        user = FacilityUser.objects.create(username='foo', facility=self.facility)
        classroom = Classroom.objects.create(parent=self.facility)
        classroom.add_coach(user)
        self.assertEqual(Role.objects.filter(user=user, kind=Role.KIND_COACH, collection=classroom).count(), 1)

    def test_add_learner_group(self):
        classroom = Classroom.objects.create(parent=self.facility)
        LearnerGroup.objects.create(parent=classroom)
        self.assertEqual(LearnerGroup.objects.count(), 1)

    def test_learner(self):
        user = FacilityUser.objects.create(username='foo', facility=self.facility)
        classroom = Classroom.objects.create(parent=self.facility)
        learner_group = LearnerGroup.objects.create(parent=classroom)
        learner_group.add_learner(user)
        self.assertEqual(Role.objects.filter(user=user, kind=Role.KIND_LEARNER, collection=learner_group).count(), 1)


class FacilityDatasetTestCase(TestCase):

    def setUp(self):
        self.facility = Facility.objects.create()
        self.classroom = Classroom.objects.create(parent=self.facility)
        self.learner_group = LearnerGroup.objects.create(parent=self.classroom)
        self.facility_user = FacilityUser.objects.create(username="blah", password="#", facility=self.facility)
        self.device_owner = DeviceOwner.objects.create(username="blooh", password="#")

    def test_datasets_equal(self):
        self.assertTrue(self.facility.dataset is not None)
        self.assertEqual(self.facility.dataset, self.classroom.dataset)
        self.assertEqual(self.classroom.dataset, self.learner_group.dataset)
        self.assertEqual(self.learner_group.dataset, self.facility_user.dataset)

    def test_device_owner_has_no_dataset(self):
        self.assertFalse(hasattr(self.device_owner, "dataset"))

    def test_cannot_create_role_across_datasets(self):
        facility2 = Facility.objects.create()
        with self.assertRaises(IntegrityError):
            facility2.add_admin(self.facility_user)

    def test_cannot_pass_inappropriate_dataset(self):
        facility2 = Facility.objects.create()
        with self.assertRaises(IntegrityError):
            FacilityUser.objects.create(facility=self.facility, dataset=facility2.dataset)

    def test_cannot_change_dataset(self):
        facility2 = Facility.objects.create()
        self.facility_user.dataset = facility2.dataset
        with self.assertRaises(IntegrityError):
            self.facility_user.save()

    def test_cannot_change_facility(self):
        facility2 = Facility.objects.create()
        self.facility_user.facility = facility2
        with self.assertRaises(IntegrityError):
            self.facility_user.save()
