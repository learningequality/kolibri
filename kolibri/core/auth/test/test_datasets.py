"""
Tests related specifically to the FacilityDataset model.
"""
import uuid

from django.db.utils import IntegrityError
from django.test import TestCase

from ..errors import IncompatibleDeviceSettingError
from ..models import Classroom
from ..models import Facility
from ..models import FacilityDataset
from ..models import FacilityUser
from ..models import LearnerGroup
from kolibri.core.auth.constants import role_kinds
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment


def _create_classroom_data():
    facility = Facility.objects.create()
    classroom = Classroom.objects.create(parent=facility)
    learner_group = LearnerGroup.objects.create(parent=classroom)
    coach = FacilityUser.objects.create(
        username="coach_" + uuid.uuid4().hex[:10],
        password="password",
        facility=facility,
    )
    facility.add_role(coach, role_kinds.COACH)
    exam = Exam.objects.create(
        title="", question_count=1, collection=facility, creator=coach
    )
    lesson = Lesson.objects.create(
        created_by=coach, title="lesson", collection=facility
    )
    return (facility, classroom, learner_group, coach, exam, lesson)


class FacilityDatasetTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        (
            cls.facility,
            cls.classroom,
            cls.learner_group,
            cls.coach,
            cls.exam,
            cls.lesson,
        ) = _create_classroom_data()
        cls.facility_2 = Facility.objects.create()

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


class MultipleDatasetAssignmentTestCase(TestCase):
    """
    Tests enforcement of correct dataset for creation of lessons, exams, and their assignments,
    which involves related models and ensuring those are not in the wrong dataset
    """

    @classmethod
    def setUpTestData(cls):
        (
            cls.facility_1,
            cls.classroom_1,
            cls.learner_group_1,
            cls.coach_1,
            cls.exam_1,
            cls.lesson_1,
        ) = _create_classroom_data()
        (
            cls.facility_2,
            cls.classroom_2,
            cls.learner_group_2,
            cls.coach_2,
            cls.exam_2,
            cls.lesson_2,
        ) = _create_classroom_data()

        cls.super_1 = FacilityUser.objects.create_superuser(
            "super_1",
            "password",
            facility=cls.facility_1,
        )
        cls.super_2 = FacilityUser.objects.create_superuser(
            "super_2",
            "password",
            facility=cls.facility_2,
        )

    def assertMatchingDatasets(self, expected_obj, actual_obj):
        self.assertEqual(expected_obj.dataset_id, actual_obj.infer_dataset())
        self.assertEqual(expected_obj.dataset_id, actual_obj.dataset_id)

    def test_exam_creation_requires_creator_assigner(self):
        with self.assertRaises(IntegrityError):
            Exam.objects.create(
                title="",
                question_count=1,
                collection=self.classroom_1,
            )
        with self.assertRaises(IntegrityError):
            ExamAssignment.objects.create(
                exam=self.exam_1,
                collection=self.learner_group_1,
            )

    def test_exam_creation_across_facilities_by_superuser(self):
        exam = Exam.objects.create(
            title="",
            question_count=1,
            collection=self.classroom_1,
            creator=self.super_2,
        )
        exam_assignment = ExamAssignment.objects.create(
            exam=exam, collection=self.learner_group_1, assigned_by=self.super_2
        )
        self.assertMatchingDatasets(self.facility_1, exam)
        self.assertIsNone(exam.creator)
        self.assertMatchingDatasets(self.facility_1, exam_assignment)
        self.assertIsNone(exam_assignment.assigned_by)

    def test_exam_creation_across_facilities_by_non_superuser(self):
        # fails as coach is in wrong facility
        with self.assertRaises(IntegrityError):
            Exam.objects.create(
                title="",
                question_count=1,
                collection=self.classroom_1,
                creator=self.coach_2,
            )
        # fails as coach is in wrong facility
        with self.assertRaises(IntegrityError):
            ExamAssignment.objects.create(
                exam=self.exam_1,
                collection=self.learner_group_1,
                assigned_by=self.coach_2,
            )
        exam_assignment = ExamAssignment.objects.create(
            exam=self.exam_1, collection=self.learner_group_1, assigned_by=self.coach_1
        )
        self.assertMatchingDatasets(self.facility_1, self.exam_1)
        self.assertEqual(self.coach_1, self.exam_1.creator)
        self.assertMatchingDatasets(self.facility_1, exam_assignment)
        self.assertEqual(self.coach_1, exam_assignment.assigned_by)

    def test_exam_assignment_dataset_mismatch(self):
        # fails as exam is in different facility
        with self.assertRaises(IntegrityError):
            ExamAssignment.objects.create(
                exam=self.exam_1,
                collection=self.learner_group_2,
                assigned_by=self.coach_2,
            )

    def test_lesson_creation_requires_creator_assigner(self):
        with self.assertRaises(IntegrityError):
            Lesson.objects.create(
                title="lesson",
                collection=self.classroom_2,
            )
        with self.assertRaises(IntegrityError):
            LessonAssignment.objects.create(
                lesson=self.lesson_2,
                collection=self.learner_group_2,
            )

    def test_lesson_creation_across_facilities_by_superuser(self):
        lesson = Lesson.objects.create(
            title="lesson",
            collection=self.classroom_2,
            created_by=self.super_1,
        )
        lesson_assignment = LessonAssignment.objects.create(
            lesson=lesson, collection=self.learner_group_2, assigned_by=self.super_1
        )
        self.assertMatchingDatasets(self.facility_2, lesson)
        self.assertIsNone(lesson.created_by)
        self.assertMatchingDatasets(self.facility_2, lesson_assignment)
        self.assertIsNone(lesson_assignment.assigned_by)

    def test_lesson_creation_across_facilities_by_non_superuser(self):
        # fails as coach is in wrong facility
        with self.assertRaises(IntegrityError):
            Lesson.objects.create(
                title="lesson",
                collection=self.classroom_2,
                created_by=self.coach_1,
            )
        # fails as coach is in wrong facility
        with self.assertRaises(IntegrityError):
            LessonAssignment.objects.create(
                lesson=self.lesson_2,
                collection=self.learner_group_2,
                assigned_by=self.coach_1,
            )
        lesson_assignment = LessonAssignment.objects.create(
            lesson=self.lesson_2,
            collection=self.learner_group_2,
            assigned_by=self.coach_2,
        )
        self.assertMatchingDatasets(self.facility_2, self.lesson_2)
        self.assertEqual(self.coach_2, self.lesson_2.created_by)
        self.assertMatchingDatasets(self.facility_2, lesson_assignment)
        self.assertEqual(self.coach_2, lesson_assignment.assigned_by)

    def test_lesson_assignment_dataset_mismatch(self):
        # fails as lesson is in different facility
        with self.assertRaises(IntegrityError):
            LessonAssignment.objects.create(
                lesson=self.lesson_1,
                collection=self.learner_group_2,
                assigned_by=self.coach_2,
            )
