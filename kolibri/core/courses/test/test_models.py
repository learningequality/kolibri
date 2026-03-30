import uuid

from django.test import TestCase
from django.utils import timezone

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode
from kolibri.core.courses.models import CourseSession
from kolibri.core.courses.models import TestType
from kolibri.core.courses.models import UnitTestAssignment
from kolibri.core.logger.models import ContentSummaryLog

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
        assignment = UnitTestAssignment.objects.create(
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

        assignment.delete()

    def test_completed_pre_test_marks_started(self):
        assignment = UnitTestAssignment.objects.create(
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

        assignment.delete()

    def test_resume_position_has_incomplete_resource(self):
        assignment = UnitTestAssignment.objects.create(
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

        assignment.delete()

    def test_resume_position_is_unit_level_when_all_resources_complete(self):
        assignment = UnitTestAssignment.objects.create(
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

        assignment.delete()

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
