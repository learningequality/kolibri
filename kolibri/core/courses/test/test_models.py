import uuid

from django.test import TestCase
from django.utils import timezone
from le_utils.constants import modalities

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import ContentRequestPriority
from kolibri.core.courses.models import CourseSession
from kolibri.core.courses.models import CourseSessionAssignment
from kolibri.core.courses.models import GatingState
from kolibri.core.courses.models import TestType
from kolibri.core.courses.models import UnitTestAssignment
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.utils.pre_post_test import get_synthetic_content_id

DUMMY_PASSWORD = "password"


class CourseSessionGetResumeDataTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()

        cls.facility = Facility.objects.create(name="TestFacility")
        cls.classroom = Classroom.objects.create(
            name="TestClassroom", parent=cls.facility
        )
        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.coach.set_password(DUMMY_PASSWORD)
        cls.coach.save()
        cls.classroom.add_coach(cls.coach)

        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )
        cls.learner.set_password(DUMMY_PASSWORD)
        cls.learner.save()
        cls.classroom.add_member(cls.learner)

        channel_id = uuid.uuid4().hex

        cls.course_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            title="Test Course",
        )

        cls.unit_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=cls.course_node,
            available=True,
            title="Test Unit",
        )

        # A lesson node (child of unit)
        cls.lesson_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=cls.unit_node,
            available=True,
            title="Test Lesson",
        )

        # A resource node (child of lesson, grandchild of unit)
        cls.resource_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=cls.lesson_node,
            available=True,
            title="Test Resource",
        )

        cls.course_session = CourseSession.objects.create(
            course=cls.course_node.id,
            title="Test Course Session",
            is_active=True,
            collection=cls.classroom,
            created_by=cls.coach,
        )

    def test_not_started_returns_defaults(self):
        result = self.course_session.get_resume_data(self.learner)
        self.assertFalse(result["started"])
        self.assertIsNone(result["active_test"])
        self.assertIsNone(result["resume_position"])

    def test_active_test_returns_started_with_active_test(self):
        UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_node.id,
            collection=self.classroom,
            test_type=TestType.Pre,
            closed=False,
            activated_by=self.coach,
        )

        result = self.course_session.get_resume_data(self.learner)

        self.assertTrue(result["started"])
        self.assertEqual(result["active_test"]["unit_id"], self.unit_node.id)
        self.assertEqual(result["active_test"]["test_type"], TestType.Pre)
        self.assertIsNone(result["resume_position"])

    def test_completed_pre_test_marks_started(self):
        UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_node.id,
            collection=self.classroom,
            test_type=TestType.Pre,
            closed=True,
            activated_by=self.coach,
        )

        result = self.course_session.get_resume_data(self.learner)

        self.assertTrue(result["started"])
        self.assertIsNone(result["active_test"])

    def test_resume_position_has_incomplete_resource(self):
        UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_node.id,
            collection=self.classroom,
            test_type=TestType.Pre,
            closed=True,
            activated_by=self.coach,
        )

        result = self.course_session.get_resume_data(self.learner)

        self.assertIsNotNone(result["resume_position"])
        self.assertEqual(result["resume_position"]["unit_id"], self.unit_node.id)
        self.assertEqual(result["resume_position"]["lesson_id"], self.lesson_node.id)
        self.assertEqual(
            result["resume_position"]["resource_id"], self.resource_node.id
        )

    def test_resume_position_is_unit_level_when_all_resources_complete(self):
        UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_node.id,
            collection=self.classroom,
            test_type=TestType.Pre,
            closed=True,
            activated_by=self.coach,
        )
        ContentSummaryLog.objects.create(
            user=self.learner,
            content_id=self.resource_node.content_id,
            channel_id=self.resource_node.channel_id,
            kind="video",
            progress=1.0,
            start_timestamp=timezone.now(),
        )

        result = self.course_session.get_resume_data(self.learner)

        self.assertTrue(result["started"])
        self.assertIsNotNone(result["resume_position"])
        self.assertEqual(result["resume_position"]["unit_id"], self.unit_node.id)
        self.assertIsNone(result["resume_position"]["lesson_id"])
        self.assertIsNone(result["resume_position"]["resource_id"])

    def test_unassigned_learner_returns_defaults(self):
        """A learner not in the classroom should see no active tests."""
        other_learner = FacilityUser.objects.create(
            username="other_learner", facility=self.facility
        )
        UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_node.id,
            collection=self.classroom,
            test_type=TestType.Pre,
            closed=False,
            activated_by=self.coach,
        )

        result = self.course_session.get_resume_data(other_learner)

        self.assertFalse(result["started"])
        self.assertIsNone(result["active_test"])


class CourseSessionGetResumeDataAdvancedTestCase(TestCase):
    """
    Tests for get_resume_data behaviors that require multi-unit setups:
    completed-test detection and advance-past-completed-unit.
    """

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()

        cls.facility = Facility.objects.create(name="AdvancedTestFacility")
        cls.classroom = Classroom.objects.create(
            name="AdvancedTestClassroom", parent=cls.facility
        )
        cls.coach = FacilityUser.objects.create(
            username="adv_coach", facility=cls.facility
        )
        cls.coach.set_password(DUMMY_PASSWORD)
        cls.coach.save()
        cls.classroom.add_coach(cls.coach)

        cls.learner = FacilityUser.objects.create(
            username="adv_learner", facility=cls.facility
        )
        cls.learner.set_password(DUMMY_PASSWORD)
        cls.learner.save()
        cls.classroom.add_member(cls.learner)

        channel_id = uuid.uuid4().hex

        cls.course_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            title="Advanced Test Course",
            modality=modalities.COURSE,
        )

        # Unit 1 with one lesson and one resource
        cls.unit1 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=cls.course_node,
            available=True,
            title="Unit 1",
            modality=modalities.UNIT,
        )
        cls.lesson1 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=cls.unit1,
            available=True,
            title="Lesson 1",
            modality=modalities.LESSON,
        )
        cls.resource1 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=cls.lesson1,
            available=True,
            title="Resource 1",
        )

        # Unit 2 with one lesson and one resource
        cls.unit2 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=cls.course_node,
            available=True,
            title="Unit 2",
            modality=modalities.UNIT,
        )
        cls.lesson2 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=cls.unit2,
            available=True,
            title="Lesson 2",
            modality=modalities.LESSON,
        )
        cls.resource2 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=cls.lesson2,
            available=True,
            title="Resource 2",
        )

        cls.course_session = CourseSession.objects.create(
            course=cls.course_node.id,
            title="Advanced Test Session",
            is_active=True,
            collection=cls.classroom,
            created_by=cls.coach,
        )

    def _mark_test_completed(self, unit, test_type):
        synthetic_content_id = get_synthetic_content_id(
            str(self.course_session.id), str(unit.id), test_type
        )
        summary_log = ContentSummaryLog.objects.create(
            user=self.learner,
            content_id=synthetic_content_id,
            channel_id=self.course_node.channel_id,
            kind="quiz",
            progress=1.0,
            start_timestamp=timezone.now(),
        )
        MasteryLog.objects.create(
            summarylog=summary_log,
            user=self.learner,
            mastery_criterion={"type": "pre_post_test", "test_type": test_type},
            start_timestamp=timezone.now(),
            end_timestamp=timezone.now(),
            complete=True,
            mastery_level=-1,
        )

    def test_active_test_completed_returns_resume_position(self):
        """
        When the learner has completed the active pre-test but the coach
        hasn't closed it, resume should return active_test and a unit-only
        resume_position (no lesson/resource) with PRE_TEST_ACTIVE_COMPLETE.
        """
        UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit1.id,
            collection=self.classroom,
            test_type=TestType.Pre,
            closed=False,
            activated_by=self.coach,
        )
        self._mark_test_completed(self.unit1, TestType.Pre)

        result = self.course_session.get_resume_data(self.learner)

        self.assertTrue(result["started"])
        self.assertEqual(result["active_test"]["unit_id"], self.unit1.id)
        self.assertEqual(result["active_test"]["test_type"], TestType.Pre)
        self.assertIsNotNone(result["resume_position"])
        self.assertEqual(result["resume_position"]["unit_id"], self.unit1.id)
        self.assertIsNone(result["resume_position"]["lesson_id"])
        self.assertIsNone(result["resume_position"]["resource_id"])
        self.assertEqual(result["gating_state"], GatingState.PreTestActiveComplete)

    def test_active_test_not_completed_returns_no_resume_position(self):
        """
        When the test is active but the learner hasn't completed it,
        resume_position should be None (learner still needs to take the test).
        """
        UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit1.id,
            collection=self.classroom,
            test_type=TestType.Pre,
            closed=False,
            activated_by=self.coach,
        )
        # No _mark_test_completed call

        result = self.course_session.get_resume_data(self.learner)

        self.assertTrue(result["started"])
        self.assertEqual(result["active_test"]["unit_id"], self.unit1.id)
        self.assertIsNone(result["resume_position"])

    def test_advances_past_completed_unit(self):
        """
        When a unit's pre-test is closed, all resources are complete, and the
        post-test is also closed, resume_position stays on the completed unit
        and gating_state signals UNIT_COMPLETE.
        """
        # Unit 1: pre-test and post-test both closed
        UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit1.id,
            collection=self.classroom,
            test_type=TestType.Pre,
            closed=True,
            activated_by=self.coach,
        )
        UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit1.id,
            collection=self.classroom,
            test_type=TestType.Post,
            closed=True,
            activated_by=self.coach,
        )
        # Mark unit 1's resource as complete
        ContentSummaryLog.objects.create(
            user=self.learner,
            content_id=self.resource1.content_id,
            channel_id=self.resource1.channel_id,
            kind="video",
            progress=1.0,
            start_timestamp=timezone.now(),
        )

        result = self.course_session.get_resume_data(self.learner)

        self.assertTrue(result["started"])
        self.assertIsNone(result["active_test"])
        # Stays on completed unit; gating_state signals advancement
        self.assertEqual(result["resume_position"]["unit_id"], self.unit1.id)
        self.assertEqual(result["gating_state"], GatingState.UnitComplete)
        self.assertIsNone(result["resume_position"]["lesson_id"])
        self.assertIsNone(result["resume_position"]["resource_id"])


class CourseSessionGetContentDownloadPriorityTestCase(TestCase):
    """
    Tests for CourseSession.get_course_content_download_priority.

    Priority rules:
    - CRITICAL: the exact resource being resumed, or the active test unit node
    - URGENT: the active lesson itself, or any resource that is a direct child of the active lesson
    - HIGH: any other node within the currently active unit (outside the active lesson)
    - REGULAR: a node in a future unit, a node outside any unit, the course node
            itself, or when priority cannot be determined
    - LOW: a node in a past unit
    """

    databases = "__all__"

    @classmethod
    def _create_unit(cls, channel_id, course_node, suffix):
        """Creates a unit with one lesson and one resource, returning all three nodes."""
        unit = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=course_node,
            available=True,
            title="Unit {}".format(suffix),
            modality=modalities.UNIT,
        )
        lesson = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=unit,
            available=True,
            title="Lesson {}".format(suffix),
            modality=modalities.LESSON,
        )
        resource = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=lesson,
            available=True,
            title="Resource {}".format(suffix),
        )
        return unit, lesson, resource

    @classmethod
    def setUpTestData(cls):
        provision_device()

        cls.facility = Facility.objects.create(name="TestFacility2")
        cls.classroom = Classroom.objects.create(
            name="TestClassroom2", parent=cls.facility
        )
        cls.coach = FacilityUser.objects.create(
            username="coach2", facility=cls.facility
        )
        cls.coach.set_password(DUMMY_PASSWORD)
        cls.coach.save()
        cls.classroom.add_coach(cls.coach)

        cls.learner = FacilityUser.objects.create(
            username="learner2", facility=cls.facility
        )
        cls.learner.set_password(DUMMY_PASSWORD)
        cls.learner.save()
        cls.classroom.add_member(cls.learner)

        channel_id = uuid.uuid4().hex

        cls.course_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            title="Priority Test Course",
            modality=modalities.COURSE,
        )

        # Units inserted in order — MPTT assigns lft on insert, preserving order
        cls.unit1_node, cls.lesson1_node, cls.resource1_node = cls._create_unit(
            channel_id, cls.course_node, "1"
        )
        cls.unit2_node, cls.lesson2_node, cls.resource2_node = cls._create_unit(
            channel_id, cls.course_node, "2"
        )

        cls.course_session = CourseSession.objects.create(
            course=cls.course_node.id,
            title="Priority Test Session",
            is_active=True,
            collection=cls.classroom,
            created_by=cls.coach,
        )
        CourseSessionAssignment.objects.create(
            course_session=cls.course_session,
            collection=cls.classroom,
            assigned_by=cls.coach,
        )

    def _complete_pre_test(self, unit_node):
        return UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=unit_node.id,
            collection=self.classroom,
            test_type=TestType.Pre,
            closed=True,
            activated_by=self.coach,
        )

    def _activate_pre_test(self, unit_node):
        return UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=unit_node.id,
            collection=self.classroom,
            test_type=TestType.Pre,
            closed=False,
            activated_by=self.coach,
        )

    def test_returns_regular_for_nonexistent_contentnode(self):
        priority = self.course_session.get_course_content_download_priority(
            uuid.uuid4().hex
        )
        self.assertEqual(priority, ContentRequestPriority.REGULAR)

    def test_returns_regular_for_course_node(self):
        priority = self.course_session.get_course_content_download_priority(
            self.course_node.id
        )
        self.assertEqual(priority, ContentRequestPriority.REGULAR)

    def test_returns_regular_when_no_user_assigned(self):
        # Create a session with no assigned users
        other_classroom = Classroom.objects.create(
            name="EmptyClassroom", parent=self.facility
        )
        session = CourseSession.objects.create(
            course=self.course_node.id,
            title="No User Session",
            is_active=True,
            collection=other_classroom,
            created_by=self.coach,
        )
        priority = session.get_course_content_download_priority(self.resource1_node.id)
        self.assertEqual(priority, ContentRequestPriority.REGULAR)

    def test_returns_regular_when_course_not_started(self):
        # Learner is assigned but no pre-test has been completed
        priority = self.course_session.get_course_content_download_priority(
            self.resource1_node.id
        )
        self.assertEqual(priority, ContentRequestPriority.REGULAR)

    def test_returns_critical_for_active_test_unit(self):
        self._activate_pre_test(self.unit1_node)
        priority = self.course_session.get_course_content_download_priority(
            self.unit1_node.id
        )
        self.assertEqual(priority, ContentRequestPriority.CRITICAL)

    def test_returns_critical_for_current_resume_resource(self):
        # Pre-test for unit1 completed, resource1 is incomplete -> resume resource
        self._complete_pre_test(self.unit1_node)
        priority = self.course_session.get_course_content_download_priority(
            self.resource1_node.id
        )
        self.assertEqual(priority, ContentRequestPriority.CRITICAL)

    def test_returns_urgent_for_active_lesson(self):
        # Pre-test for unit1 completed. lesson1 is the active lesson -> URGENT
        self._complete_pre_test(self.unit1_node)
        priority = self.course_session.get_course_content_download_priority(
            self.lesson1_node.id
        )
        self.assertEqual(priority, ContentRequestPriority.URGENT)

    def test_returns_urgent_for_resource_in_active_lesson(self):
        # Pre-test for unit1 is completed. resource1 is the first incomplete resource
        # (resume target -> CRITICAL). A second resource in the same active lesson should
        # get URGENT.
        channel_id = self.unit1_node.channel_id
        second_resource = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=self.lesson1_node,
            available=True,
            title="Resource 1b",
        )
        self._complete_pre_test(self.unit1_node)
        # Confirm resource1 is the resume target (CRITICAL)
        self.assertEqual(
            self.course_session.get_course_content_download_priority(
                self.resource1_node.id
            ),
            ContentRequestPriority.CRITICAL,
        )
        # second_resource is in the same active lesson but not the resume target
        priority = self.course_session.get_course_content_download_priority(
            second_resource.id
        )
        self.assertEqual(priority, ContentRequestPriority.URGENT)

    def test_completed_resource_in_active_lesson_becomes_urgent(self):
        # Pre-test for unit1 completed. resource1 is complete, so second_resource
        # becomes the resume target (CRITICAL); resource1 should still be URGENT
        # (same active lesson).
        channel_id = self.unit1_node.channel_id
        second_resource = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=self.lesson1_node,
            available=True,
            title="Resource 1b",
        )
        ContentSummaryLog.objects.create(
            user=self.learner,
            content_id=self.resource1_node.content_id,
            channel_id=channel_id,
            kind="video",
            progress=1.0,
            start_timestamp=timezone.now(),
        )
        self._complete_pre_test(self.unit1_node)
        self.assertEqual(
            self.course_session.get_course_content_download_priority(
                second_resource.id
            ),
            ContentRequestPriority.CRITICAL,
        )
        self.assertEqual(
            self.course_session.get_course_content_download_priority(
                self.resource1_node.id
            ),
            ContentRequestPriority.URGENT,
        )

    def test_returns_high_for_resource_in_active_unit_but_different_lesson(self):
        # Pre-test for unit1 completed. A resource in a different lesson of unit1
        # (not the active lesson) should get HIGH.
        channel_id = self.unit1_node.channel_id
        other_lesson = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=self.unit1_node,
            available=True,
            title="Lesson 1b",
            modality=modalities.LESSON,
        )
        other_resource = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=other_lesson,
            available=True,
            title="Resource in other lesson",
        )
        self._complete_pre_test(self.unit1_node)
        priority = self.course_session.get_course_content_download_priority(
            other_resource.id
        )
        self.assertEqual(priority, ContentRequestPriority.HIGH)

    def test_returns_regular_for_resource_in_future_unit(self):
        # Active unit is unit1; resource2 is in unit2 (future)
        self._complete_pre_test(self.unit1_node)
        priority = self.course_session.get_course_content_download_priority(
            self.resource2_node.id
        )
        self.assertEqual(priority, ContentRequestPriority.REGULAR)

    def test_returns_low_for_resource_in_past_unit(self):
        # Active unit is unit2; resource1 is in unit1 (past)
        self._complete_pre_test(self.unit1_node)
        self._complete_pre_test(self.unit2_node)
        priority = self.course_session.get_course_content_download_priority(
            self.resource1_node.id
        )
        self.assertEqual(priority, ContentRequestPriority.LOW)
