"""
Tests related specifically to the FacilityDataset model.
"""
from django.db.utils import IntegrityError
from django.test import TestCase

from ..errors import IncompatibleDeviceSettingError
from ..models import Classroom
from ..models import Facility
from ..models import FacilityDataset
from ..models import FacilityUser
from ..models import LearnerGroup
from kolibri.core.exams.models import Exam
from kolibri.core.lessons.models import Lesson


class FacilityDatasetTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create()
        cls.facility_2 = Facility.objects.create()
        cls.classroom = Classroom.objects.create(parent=cls.facility)
        cls.learner_group = LearnerGroup.objects.create(parent=cls.classroom)
        cls.user = FacilityUser.objects.create(
            username="user", password="password", facility=cls.facility
        )
        cls.exam = Exam.objects.create(
            title="", question_count=1, collection=cls.facility, creator=cls.user
        )
        cls.lesson = Lesson.objects.create(
            created_by=cls.user, title="lesson", collection=cls.facility
        )

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
            self.classroom.add_member(facility_user2)

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

    def test_exam_lesson_dataset(self):
        self.assertTrue(self.facility.dataset is not None)
        self.assertEqual(self.exam.infer_dataset(), self.lesson.infer_dataset())

        # Check current implementation of infer_dataset on Lesson and Exam
        self.assertEqual(
            self.exam.infer_dataset(),
            self.exam.cached_related_dataset_lookup("collection"),
        )
        self.assertEqual(
            self.lesson.infer_dataset(),
            self.lesson.cached_related_dataset_lookup("collection"),
        )

        # Check if the current implementation is equivalent to the previous implementation
        self.assertEqual(
            self.exam.infer_dataset(),
            self.exam.cached_related_dataset_lookup("creator"),
        )
        self.assertEqual(
            self.lesson.infer_dataset(),
            self.lesson.cached_related_dataset_lookup("created_by"),
        )
        self.assertEqual(self.exam.infer_dataset(), self.facility.dataset.id)

    def test_dataset_incompatible_setting(self):
        with self.assertRaises(IncompatibleDeviceSettingError):
            FacilityDataset.objects.create(
                learner_can_edit_password=True, learner_can_login_with_no_password=True
            )
