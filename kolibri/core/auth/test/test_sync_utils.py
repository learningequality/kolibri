import uuid

from django.test import TestCase
from mock import Mock
from morango.models import Filter
from morango.sync.utils import SyncSignalGroup

from kolibri.core.auth.constants.morango_sync import PARTITION_CLASSROOM
from kolibri.core.auth.constants.morango_sync import PARTITION_SUFFIX_COACH_RW
from kolibri.core.auth.constants.morango_sync import PARTITION_SUFFIX_LEARNER_RW
from kolibri.core.auth.management.utils import MorangoSyncCommand
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.utils.sync import ClassroomPartitionFactory
from kolibri.core.auth.utils.sync import ClassroomPartitionFilterFactory
from kolibri.core.auth.utils.sync import learner_canonicalized_assignments
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment

from .helpers import create_dummy_facility_data
from .helpers import provision_device


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
        super().setUp()
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


class ClassroomPartitionFactoryTestCase(TestCase):
    """
    Tests for the ClassroomPartitionFactory class.
    """

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create()
        cls.learner = FacilityUser.objects.create(username="foo", facility=cls.facility)
        cls.classroom_coach = FacilityUser.objects.create(
            username="bar", facility=cls.facility
        )

        cls.classroom = Classroom.objects.create(parent=cls.facility)
        cls.classroom.add_coach(cls.classroom_coach)
        cls.classroom.add_member(cls.learner)

        cls.group = LearnerGroup.objects.create(parent=cls.classroom)
        cls.group.add_learner(cls.learner)

    def setUp(self):
        self.dataset_id = self.facility.dataset_id
        self.factory = ClassroomPartitionFactory(self.dataset_id)
        self.collection_id = uuid.uuid4().hex

    def assertFilter(self, test_filter, expected_suffix=""):
        self.assertIsInstance(test_filter, Filter)
        self.assertEqual(
            str(test_filter),
            f"{self.dataset_id}:classroom:{self.collection_id}{expected_suffix}",
        )

    def test_template(self):
        self.assertEqual(self.factory.filter_template, PARTITION_CLASSROOM)

    def test_set_suffix(self):
        self.assertEqual(self.factory, self.factory.set_suffix(":test"))
        self.assertEqual(self.factory.filter_suffix, ":test")

    def test_set_coach_writeable(self):
        self.assertEqual(self.factory, self.factory.set_coach_writeable())
        self.assertEqual(self.factory.filter_suffix, PARTITION_SUFFIX_COACH_RW)

    def test_set_learner_writeable(self):
        self.assertEqual(self.factory, self.factory.set_learner_writeable())
        self.assertEqual(self.factory.filter_suffix, PARTITION_SUFFIX_LEARNER_RW)

    def test_build__no_suffix(self):
        test_filter = self.factory.build(self.collection_id)
        self.assertIsInstance(test_filter, Filter)
        self.assertFilter(test_filter)

    def test_build__custom_suffix(self):
        test_filter = self.factory.build(self.collection_id, filter_suffix=":test")
        self.assertIsInstance(test_filter, Filter)
        self.assertFilter(test_filter, expected_suffix=":test")

    def test_build__learner_suffix(self):
        test_filter = self.factory.set_learner_writeable().build(self.collection_id)
        self.assertIsInstance(test_filter, Filter)
        self.assertFilter(test_filter, expected_suffix=PARTITION_SUFFIX_LEARNER_RW)

    def test_build__coach_suffix(self):
        test_filter = self.factory.set_coach_writeable().build(self.collection_id)
        self.assertIsInstance(test_filter, Filter)
        self.assertFilter(test_filter, expected_suffix=PARTITION_SUFFIX_COACH_RW)

    def test_get_classroom_collection__no_arg(self):
        with self.assertRaises(ValueError):
            self.factory.get_classroom_collection()

    def test_get_classroom_collection__with_classroom_id(self):
        test_collection = ClassroomPartitionFactory.get_classroom_collection(
            collection_id=self.classroom.id
        )
        self.assertIsInstance(test_collection, Collection)
        self.assertEqual(test_collection.id, self.classroom.id)

    def test_get_classroom_collection__with_classroom(self):
        test_collection = ClassroomPartitionFactory.get_classroom_collection(
            collection=self.classroom
        )
        self.assertIsInstance(test_collection, Collection)
        self.assertEqual(test_collection.id, self.classroom.id)

    def test_get_classroom_collection__with_group_id(self):
        test_collection = ClassroomPartitionFactory.get_classroom_collection(
            collection_id=self.group.id,
        )
        self.assertIsInstance(test_collection, Collection)
        self.assertEqual(test_collection.id, self.classroom.id)

    def test_get_classroom_collection__with_group(self):
        test_collection = ClassroomPartitionFactory.get_classroom_collection(
            collection=self.group,
        )
        self.assertIsInstance(test_collection, Collection)
        self.assertEqual(test_collection.id, self.classroom.id)


class ClassroomPartitionFilterFactoryTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create()
        cls.learner_a = FacilityUser.objects.create(
            username="learner_a", facility=cls.facility
        )
        cls.learner_b = FacilityUser.objects.create(
            username="learner_b", facility=cls.facility
        )
        cls.learner_c = FacilityUser.objects.create(
            username="learner_c", facility=cls.facility
        )
        cls.learner_d = FacilityUser.objects.create(
            username="learner_d", facility=cls.facility
        )
        cls.classroom_coach_a = FacilityUser.objects.create(
            username="coach_a", facility=cls.facility
        )
        cls.classroom_coach_b = FacilityUser.objects.create(
            username="coach_b", facility=cls.facility
        )

        cls.classroom_a = Classroom.objects.create(parent=cls.facility)
        cls.classroom_a.add_coach(cls.classroom_coach_a)
        cls.classroom_a.add_member(cls.learner_a)
        cls.classroom_a.add_member(cls.classroom_coach_b)

        cls.classroom_b = Classroom.objects.create(parent=cls.facility)
        cls.classroom_b.add_coach(cls.classroom_coach_b)
        cls.classroom_b.add_member(cls.learner_b)
        cls.classroom_b.add_member(cls.learner_c)

        cls.group_ba = LearnerGroup.objects.create(parent=cls.classroom_b)
        cls.group_ba.add_learner(cls.learner_c)

    def setUp(self):
        self.dataset_id = self.facility.dataset_id
        self.factory = ClassroomPartitionFilterFactory(self.dataset_id)

    def assertFilter(self, test_filter, collection_id, expected_suffix=""):
        self.assertIsInstance(test_filter, Filter)
        self.assertEqual(
            str(test_filter),
            f"{self.dataset_id}:classroom:{collection_id}{expected_suffix}",
        )

    def assertFilterHas(self, test_filter, collection_id, expected_suffix=""):
        self.assertIsInstance(test_filter, Filter)
        self.assertTrue(
            test_filter.contains_partition(
                f"{self.dataset_id}:classroom:{collection_id}{expected_suffix}"
            )
        )

    def test_set_writable(self):
        self.assertFalse(self.factory.filter_writeable)
        self.assertEqual(self.factory, self.factory.set_writeable(writeable=True))
        self.assertTrue(self.factory.filter_writeable)

    def test_build__not_writeable(self):
        test_filter = self.factory.build(self.classroom_a.id)
        self.assertFilter(test_filter, self.classroom_a.id)

    def test_build__writeable__no_suffix(self):
        with self.assertRaises(ValueError):
            self.factory.set_writeable().build(self.classroom_a.id)

    def test_build__writeable__custom_suffix(self):
        test_filter = self.factory.set_writeable().build(
            self.classroom_a.id, filter_suffix=":custom"
        )
        self.assertFilter(test_filter, self.classroom_a.id, expected_suffix=":custom")

    def test_build__writeable__learner_suffix(self):
        test_filter = self.factory.set_learner_writeable().build(self.classroom_b.id)
        self.assertFilter(
            test_filter,
            self.classroom_b.id,
            expected_suffix=PARTITION_SUFFIX_LEARNER_RW,
        )

    def test_build__writeable__coach_suffix(self):
        test_filter = self.factory.set_coach_writeable().build(self.classroom_b.id)
        self.assertFilter(
            test_filter, self.classroom_b.id, expected_suffix=PARTITION_SUFFIX_COACH_RW
        )

    def test_build_for_user__learner(self):
        test_filter = self.factory.build_for_user(self.learner_a.id)
        self.assertFilter(test_filter, self.classroom_a.id)

    def test_build_for_user__learner__writeable(self):
        test_filter = self.factory.set_writeable().build_for_user(self.learner_a.id)
        self.assertFilter(
            test_filter,
            self.classroom_a.id,
            expected_suffix=PARTITION_SUFFIX_LEARNER_RW,
        )

    def test_build_for_user__group_learner(self):
        test_filter = self.factory.build_for_user(self.learner_c.id)
        self.assertFilter(test_filter, self.classroom_b.id)

    def test_build_for_user__group_learner__writeable(self):
        test_filter = self.factory.set_writeable().build_for_user(self.learner_c.id)
        self.assertFilter(
            test_filter,
            self.classroom_b.id,
            expected_suffix=PARTITION_SUFFIX_LEARNER_RW,
        )

    def test_build_for_user__unrelevant_learner(self):
        test_filter = self.factory.build_for_user(self.learner_d.id)
        self.assertIsNone(test_filter)

    def test_build_for_user__unrelevant__writeable(self):
        test_filter = self.factory.set_writeable().build_for_user(self.learner_d.id)
        self.assertIsNone(test_filter)

    def test_build_for_user__coach(self):
        test_filter = self.factory.build_for_user(self.classroom_coach_a.id)
        self.assertFilter(test_filter, self.classroom_a.id)

    def test_build_for_user__coach__writeable(self):
        test_filter = self.factory.set_coach_writeable().build_for_user(
            self.classroom_coach_a.id
        )
        self.assertFilter(
            test_filter, self.classroom_a.id, expected_suffix=PARTITION_SUFFIX_COACH_RW
        )

    def test_build_for_user__multirole(self):
        test_filter = self.factory.build_for_user(self.classroom_coach_b.id)
        self.assertFilterHas(test_filter, self.classroom_a.id)
        self.assertFilterHas(test_filter, self.classroom_b.id)

    def test_build_for_user__multirole__writeable(self):
        test_filter = self.factory.set_writeable().build_for_user(
            self.classroom_coach_b.id
        )
        self.assertFilterHas(
            test_filter,
            self.classroom_a.id,
            expected_suffix=PARTITION_SUFFIX_LEARNER_RW,
        )
        self.assertFilterHas(
            test_filter, self.classroom_b.id, expected_suffix=PARTITION_SUFFIX_COACH_RW
        )
