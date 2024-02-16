from django.test import TestCase
from mock import Mock
from morango.sync.utils import SyncSignalGroup

from .helpers import create_dummy_facility_data
from .helpers import provision_device
from kolibri.core.auth.management.utils import MorangoSyncCommand
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.utils.sync import learner_canonicalized_assignments
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment


class TestProgressTracking(TestCase):
    def test_transfer_tracker_adapter(self):
        # Create an instance of the class you're testing
        instance = MorangoSyncCommand()

        # Mock the relevant methods
        instance.start_progress = Mock()

        instance.progresstracker = Mock()
        instance.progresstracker.progress = 0

        signal_group = SyncSignalGroup()
        # Mock the TransferSession
        transfer_session_mock = Mock()

        transfer_session_mock.records_transferred = 0
        transfer_session_mock.records_total = 10
        transfer_session_mock.bytes_sent = 0
        transfer_session_mock.bytes_received = 0

        # Connect the signal group to _transfer_tracker_adapter for testing
        instance._transfer_tracker_adapter(signal_group, "message", "sync_state", False)

        # Check if start_progress hasn't been called yet
        instance.start_progress.assert_not_called()

        # Simulate the started signal
        signal_group.started.fire(transfer_session=transfer_session_mock)

        # Check that start_progress has now been called
        instance.start_progress.assert_called()

    def test_queueing_tracker_adapter(self):
        # Create an instance of the class you're testing
        instance = MorangoSyncCommand()

        # Mock the relevant methods
        instance.start_progress = Mock()

        instance.progresstracker = Mock()
        instance.progresstracker.progress = 0

        signal_group = SyncSignalGroup()
        # Mock the TransferSession
        transfer_session_mock = Mock()

        transfer_session_mock.records_transferred = 0
        transfer_session_mock.records_total = 10
        transfer_session_mock.bytes_sent = 0
        transfer_session_mock.bytes_received = 0

        # Connect the signal group to _transfer_tracker_adapter for testing
        instance._queueing_tracker_adapter(signal_group, "message", "sync_state", False)

        # Check if start_progress hasn't been called yet
        instance.start_progress.assert_not_called()

        # Simulate the started signal
        signal_group.started.fire(transfer_session=transfer_session_mock)

        # Check that start_progress has now been called
        instance.start_progress.assert_called()


class CanonicalizeAssignmentsTestCase(TestCase):
    def setUp(self):
        super(CanonicalizeAssignmentsTestCase, self).setUp()
        provision_device()
        self.test_data = create_dummy_facility_data()
        self.ad_hoc_group = AdHocGroup.objects.create(
            name="An ad hoc group",
            parent=self.test_data["classrooms"][0],
        )
        self.ad_hoc_group.add_learner(self.test_data["learner_all_groups"])

    def _create_lesson_assignment(self, lesson, collection):
        return LessonAssignment.objects.create(
            lesson=lesson,
            collection=collection,
            assigned_by=self.test_data["facility_admin"],
        )

    def _create_exam_assignment(self, exam, collection):
        return ExamAssignment.objects.create(
            exam=exam,
            collection=collection,
            assigned_by=self.test_data["facility_admin"],
        )

    def _assert_assignments(self, resource_name, all_assignments, expected):
        self.assertEqual(len(all_assignments), 2)
        assignments = learner_canonicalized_assignments(resource_name, all_assignments)
        self.assertEqual(len(assignments), 1)
        assignment = assignments[0]
        self.assertEqual(assignment.id, expected.id)

    def test_canonicalize_assignments__lesson(self):
        lesson = Lesson.objects.create(
            title="A lesson",
            created_by=self.test_data["facility_admin"],
            collection=self.test_data["classrooms"][0],
            is_active=True,
        )
        expected = self._create_lesson_assignment(
            lesson, self.test_data["classrooms"][0]
        )
        self._create_lesson_assignment(lesson, self.test_data["learnergroups"][0][0])

        assignments = LessonAssignment.objects.filter(
            collection__membership__user_id=self.test_data["learner_all_groups"].id,
            lesson__is_active=True,
        ).distinct()

        self._assert_assignments("lesson", assignments, expected)

    def test_canonicalize_assignments__lesson__no_classroom(self):
        lesson = Lesson.objects.create(
            title="A lesson",
            created_by=self.test_data["facility_admin"],
            collection=self.test_data["classrooms"][0],
            is_active=True,
        )

        expected = self._create_lesson_assignment(
            lesson, self.test_data["learnergroups"][0][0]
        )
        self._create_lesson_assignment(lesson, self.ad_hoc_group)

        assignments = LessonAssignment.objects.filter(
            collection__membership__user_id=self.test_data["learner_all_groups"].id,
            lesson__is_active=True,
        ).distinct()

        self._assert_assignments("lesson", assignments, expected)

    def test_canonicalize_assignments__exam(self):
        exam = Exam.objects.create(
            title="An exam",
            question_count=10,
            active=True,
            creator=self.test_data["facility_admin"],
            collection=self.test_data["classrooms"][0],
        )
        expected = self._create_exam_assignment(exam, self.test_data["classrooms"][0])
        self._create_exam_assignment(exam, self.test_data["learnergroups"][0][0])

        assignments = ExamAssignment.objects.filter(
            collection__membership__user_id=self.test_data["learner_all_groups"].id,
            exam__active=True,
        ).distinct()

        self._assert_assignments("exam", assignments, expected)

    def test_canonicalize_assignments__exam__no_classroom(self):
        exam = Exam.objects.create(
            title="An exam",
            question_count=10,
            active=True,
            creator=self.test_data["facility_admin"],
            collection=self.test_data["classrooms"][0],
        )
        expected = self._create_exam_assignment(
            exam, self.test_data["learnergroups"][0][0]
        )
        self._create_exam_assignment(exam, self.ad_hoc_group)

        assignments = ExamAssignment.objects.filter(
            collection__membership__user_id=self.test_data["learner_all_groups"].id,
            exam__active=True,
        ).distinct()

        self._assert_assignments("exam", assignments, expected)
