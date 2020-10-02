"""
Tests related specifically to the FacilityDataset model.
"""
from django.db.utils import IntegrityError
from django.test import TestCase

from ..models import Classroom
from ..models import Facility
from ..models import FacilityDataset
from ..models import FacilityUser
from ..models import LearnerGroup


class FacilityDatasetTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create()
        cls.facility_2 = Facility.objects.create()
        cls.classroom = Classroom.objects.create(parent=cls.facility)
        cls.learner_group = LearnerGroup.objects.create(parent=cls.classroom)

    def setUp(self):
        self.facility_user = FacilityUser.objects.create(
            username="blah", password="#", facility=self.facility
        )

    def test_datasets_equal(self):
        self.assertTrue(self.facility.dataset is not None)
        self.assertEqual(self.facility.dataset, self.classroom.dataset)
        self.assertEqual(self.classroom.dataset, self.learner_group.dataset)
        self.assertEqual(self.learner_group.dataset, self.facility_user.dataset)

    def test_cannot_create_role_across_datasets(self):
        with self.assertRaises(IntegrityError):
            self.facility_2.add_admin(self.facility_user)

    def test_cannot_create_membership_across_datasets(self):
        with self.assertRaises(IntegrityError):
            facility_user2 = FacilityUser.objects.create(
                username="blah", password="#", facility=self.facility_2
            )
            self.learner_group.add_learner(facility_user2)

    def test_cannot_pass_inappropriate_dataset(self):
        with self.assertRaises(IntegrityError):
            FacilityUser.objects.create(
                facility=self.facility, dataset=self.facility_2.dataset
            )

    def test_cannot_change_dataset(self):
        with self.assertRaises(IntegrityError):
            self.facility_user.dataset = self.facility_2.dataset
            self.facility_user.save()

    def test_cannot_change_facility(self):
        with self.assertRaises(IntegrityError):
            self.facility_user.facility = self.facility_2
            self.facility_user.save()

    def test_manually_passing_dataset_for_new_facility(self):
        dataset = FacilityDataset.objects.create()
        facility = Facility(name="blah", dataset=dataset)
        facility.full_clean()
        facility.save()
        self.assertEqual(dataset, facility.dataset)

    def test_dataset_representation(self):
        self.assertEqual(
            str(self.facility.dataset),
            "FacilityDataset for {}".format(self.facility.name),
        )
        new_dataset = FacilityDataset.objects.create()
        self.assertEqual(str(new_dataset), "FacilityDataset (no associated Facility)")
