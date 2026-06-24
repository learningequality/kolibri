import datetime
import uuid

from django.urls import reverse
from django.utils import timezone
from le_utils.constants import content_kinds
from le_utils.constants import modalities

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import KolibriAPITestCase as APITestCase
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode
from kolibri.core.courses.models import CourseSession
from kolibri.core.courses.models import CourseSessionAssignment
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.core.notifications.models import NotificationEventType
from kolibri.core.notifications.models import NotificationObjectType
from kolibri.plugins.coach.test import helpers
from kolibri.plugins.coach.viewsets.class_summary import COMPLETED
from kolibri.plugins.coach.viewsets.class_summary import HELP_NEEDED
from kolibri.plugins.coach.viewsets.class_summary import NOT_STARTED
from kolibri.plugins.coach.viewsets.class_summary import STARTED

DUMMY_PASSWORD = "password"


def _url(course_session_id, unit_contentnode_id):
    return reverse(
        "kolibri:kolibri.plugins.coach:unit_lesson_progress",
        kwargs={
            "course_session_id": course_session_id,
            "unit_contentnode_id": unit_contentnode_id,
        },
    )


class UnitLessonProgressTestBase(APITestCase):
    """
    Shared setup: facility, classroom, users, course tree, course session.

    Content tree:
        course_node (COURSE)
        └── unit_node (UNIT)
            ├── lesson1_node (LESSON)
            │   ├── resource1a (VIDEO)
            │   └── resource1b (EXERCISE)
            └── lesson2_node (LESSON)
                └── resource2a (VIDEO)
    """

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="Test Facility")
        cls.classroom = Classroom.objects.create(
            name="Test Classroom", parent=cls.facility
        )

        cls.facility_admin = helpers.create_facility_admin(
            "fadmin", DUMMY_PASSWORD, cls.facility
        )
        cls.classroom_coach = helpers.create_coach(
            "ccoach", DUMMY_PASSWORD, cls.facility, classroom=cls.classroom
        )
        cls.facility_coach = helpers.create_coach(
            "fcoach", DUMMY_PASSWORD, cls.facility, is_facility_coach=True
        )
        cls.learner1 = helpers.create_learner(
            "learner1", DUMMY_PASSWORD, cls.facility, cls.classroom
        )
        cls.learner2 = helpers.create_learner(
            "learner2", DUMMY_PASSWORD, cls.facility, cls.classroom
        )
        cls.learner3 = helpers.create_learner(
            "learner3", DUMMY_PASSWORD, cls.facility, cls.classroom
        )

        # -- Content tree --
        channel_id = uuid.uuid4().hex
        cls.course_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            title="Test Course",
            kind=content_kinds.TOPIC,
            modality=modalities.COURSE,
            available=True,
        )
        cls.unit_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            title="Unit 1",
            kind=content_kinds.TOPIC,
            modality=modalities.UNIT,
            available=True,
            parent=cls.course_node,
        )
        cls.lesson1_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            title="Lesson 1",
            kind=content_kinds.TOPIC,
            modality=modalities.LESSON,
            available=True,
            parent=cls.unit_node,
        )
        cls.resource1a = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            title="Video 1a",
            kind=content_kinds.VIDEO,
            available=True,
            parent=cls.lesson1_node,
        )
        cls.resource1b = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            title="Exercise 1b",
            kind=content_kinds.EXERCISE,
            available=True,
            parent=cls.lesson1_node,
        )
        cls.lesson2_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            title="Lesson 2",
            kind=content_kinds.TOPIC,
            modality=modalities.LESSON,
            available=True,
            parent=cls.unit_node,
        )
        cls.resource2a = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            title="Video 2a",
            kind=content_kinds.VIDEO,
            available=True,
            parent=cls.lesson2_node,
        )

        # -- Course session + assignment --
        cls.course_session = CourseSession.objects.create(
            course=cls.course_node.id,
            title="Spring 2026",
            collection=cls.classroom,
            created_by=cls.facility_admin,
            is_active=True,
        )
        CourseSessionAssignment.objects.create(
            course_session=cls.course_session,
            collection=cls.classroom,
            assigned_by=cls.facility_admin,
        )

        cls.url = _url(cls.course_session.id, cls.unit_node.id)

    def _create_summary_log(
        self, user, content_id, progress=0.0, kind=content_kinds.VIDEO
    ):
        now = timezone.now()
        return ContentSummaryLog.objects.create(
            user=user,
            content_id=content_id,
            channel_id=uuid.uuid4().hex,
            start_timestamp=now - datetime.timedelta(hours=1),
            end_timestamp=now,
            time_spent=600.0,
            progress=progress,
            kind=kind,
        )

    def _create_exercise_log_with_attempts(self, user, content_id, progress=0.0):
        """Create a ContentSummaryLog for an exercise with attempt logs."""
        now = timezone.now()
        summary = ContentSummaryLog.objects.create(
            user=user,
            content_id=content_id,
            channel_id=uuid.uuid4().hex,
            start_timestamp=now - datetime.timedelta(hours=1),
            end_timestamp=now,
            time_spent=300.0,
            progress=progress,
            kind=content_kinds.EXERCISE,
        )
        session = ContentSessionLog.objects.create(
            user=user,
            content_id=content_id,
            channel_id=summary.channel_id,
            start_timestamp=now - datetime.timedelta(hours=1),
            end_timestamp=now,
            kind=content_kinds.EXERCISE,
        )
        mastery = MasteryLog.objects.create(
            user=user,
            summarylog=summary,
            start_timestamp=now - datetime.timedelta(hours=1),
            end_timestamp=now,
            mastery_level=1,
            complete=False,
        )
        AttemptLog.objects.create(
            masterylog=mastery,
            sessionlog=session,
            user=user,
            item=uuid.uuid4().hex,
            start_timestamp=now - datetime.timedelta(minutes=10),
            end_timestamp=now,
            correct=0,
        )
        return summary

    def _get_status_for(self, response, learner_id, content_id):
        """Find the status object for a given learner + content_id."""
        for entry in response.data["content_learner_status"]:
            if entry["learner_id"] == learner_id and entry["content_id"] == content_id:
                return entry
        return None


class UnitLessonProgressPermissionTests(UnitLessonProgressTestBase):
    """Only coaches and admins may access the endpoint."""

    def test_anonymous_user_is_denied(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_learner_is_denied(self):
        self.client.login(username="learner1", password=DUMMY_PASSWORD)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_classroom_coach_is_allowed(self):
        self.client.login(username="ccoach", password=DUMMY_PASSWORD)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_facility_coach_is_allowed(self):
        self.client.login(username="fcoach", password=DUMMY_PASSWORD)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_facility_admin_is_allowed(self):
        self.client.login(username="fadmin", password=DUMMY_PASSWORD)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_nonexistent_course_session_returns_404(self):
        self.client.login(username="ccoach", password=DUMMY_PASSWORD)
        url = _url(uuid.uuid4().hex, self.unit_node.id)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_nonexistent_unit_returns_404(self):
        self.client.login(username="ccoach", password=DUMMY_PASSWORD)
        url = _url(self.course_session.id, uuid.uuid4().hex)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)


class UnitLessonProgressResponseShapeTests(UnitLessonProgressTestBase):
    """The response contains lessons with their child content_ids."""

    def setUp(self):
        self.client.login(username="ccoach", password=DUMMY_PASSWORD)

    def test_response_has_lessons_key(self):
        response = self.client.get(self.url)
        self.assertIn("lessons", response.data)

    def test_response_has_content_learner_status_key(self):
        response = self.client.get(self.url)
        self.assertIn("content_learner_status", response.data)

    def test_lessons_count_matches_unit_children(self):
        response = self.client.get(self.url)
        self.assertEqual(len(response.data["lessons"]), 2)

    def test_lesson_has_expected_fields(self):
        response = self.client.get(self.url)
        lesson = response.data["lessons"][0]
        self.assertIn("id", lesson)
        self.assertIn("title", lesson)
        self.assertIn("content_ids", lesson)

    def test_lesson1_content_ids(self):
        """Lesson 1 has two children: resource1a and resource1b."""
        response = self.client.get(self.url)
        lessons_by_id = {l["id"]: l for l in response.data["lessons"]}
        lesson1 = lessons_by_id[self.lesson1_node.id]
        expected_content_ids = sorted(
            [self.resource1a.content_id, self.resource1b.content_id]
        )
        self.assertEqual(sorted(lesson1["content_ids"]), expected_content_ids)

    def test_lesson2_content_ids(self):
        """Lesson 2 has one child: resource2a."""
        response = self.client.get(self.url)
        lessons_by_id = {l["id"]: l for l in response.data["lessons"]}
        lesson2 = lessons_by_id[self.lesson2_node.id]
        self.assertEqual(lesson2["content_ids"], [self.resource2a.content_id])

    def test_lessons_ordered_by_tree_position(self):
        """Lessons appear in the same order as the content tree (lft order)."""
        response = self.client.get(self.url)
        lesson_ids = [l["id"] for l in response.data["lessons"]]
        self.assertEqual(lesson_ids, [self.lesson1_node.id, self.lesson2_node.id])

    def test_empty_unit_returns_empty_lessons(self):
        """A unit with no lesson children returns an empty lessons list."""
        empty_unit = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=self.course_node.channel_id,
            title="Empty Unit",
            kind=content_kinds.TOPIC,
            modality=modalities.UNIT,
            available=True,
            parent=self.course_node,
        )
        url = _url(self.course_session.id, empty_unit.id)
        response = self.client.get(url)
        self.assertEqual(response.data["lessons"], [])
        self.assertEqual(response.data["content_learner_status"], [])


class UnitLessonProgressStatusTests(UnitLessonProgressTestBase):
    """
    Tests that per-learner, per-content status is correctly derived from
    ContentSummaryLog and LearnerProgressNotification data.
    """

    def setUp(self):
        self.client.login(username="ccoach", password=DUMMY_PASSWORD)

    def test_not_started_when_no_log(self):
        """Learners with no ContentSummaryLog do not appear in the status list."""
        response = self.client.get(self.url)
        # No logs created, so content_learner_status should be empty
        self.assertEqual(len(response.data["content_learner_status"]), 0)

    def test_started_status_for_video(self):
        """A video with progress < 1 is STARTED."""
        self._create_summary_log(
            self.learner1, self.resource1a.content_id, progress=0.5
        )
        response = self.client.get(self.url)
        status = self._get_status_for(
            response, self.learner1.id, self.resource1a.content_id
        )
        self.assertIsNotNone(status)
        self.assertEqual(status["status"], STARTED)

    def test_completed_status(self):
        """A resource with progress == 1 is COMPLETED."""
        self._create_summary_log(
            self.learner1, self.resource1a.content_id, progress=1.0
        )
        response = self.client.get(self.url)
        status = self._get_status_for(
            response, self.learner1.id, self.resource1a.content_id
        )
        self.assertEqual(status["status"], COMPLETED)

    def test_exercise_not_started_without_attempts(self):
        """An exercise with a log but no attempts is NOT_STARTED."""
        self._create_summary_log(
            self.learner1,
            self.resource1b.content_id,
            progress=0.0,
            kind=content_kinds.EXERCISE,
        )
        response = self.client.get(self.url)
        status = self._get_status_for(
            response, self.learner1.id, self.resource1b.content_id
        )
        self.assertEqual(status["status"], NOT_STARTED)

    def test_exercise_started_with_attempts(self):
        """An exercise with attempts but progress < 1 is STARTED."""
        self._create_exercise_log_with_attempts(
            self.learner1, self.resource1b.content_id, progress=0.3
        )
        response = self.client.get(self.url)
        status = self._get_status_for(
            response, self.learner1.id, self.resource1b.content_id
        )
        self.assertEqual(status["status"], STARTED)

    def test_help_needed_status(self):
        """A HelpNeeded notification overrides STARTED status."""
        self._create_exercise_log_with_attempts(
            self.learner1, self.resource1b.content_id, progress=0.3
        )
        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Help,
            user_id=self.learner1.id,
            classroom_id=self.classroom.id,
            contentnode_id=self.resource1b.id,
            course_session_id=self.course_session.id,
            timestamp=timezone.now(),
        )
        response = self.client.get(self.url)
        status = self._get_status_for(
            response, self.learner1.id, self.resource1b.content_id
        )
        self.assertEqual(status["status"], HELP_NEEDED)

    def test_help_needed_superseded_by_completion(self):
        """A Completed notification after HelpNeeded clears the help status."""
        self._create_exercise_log_with_attempts(
            self.learner1, self.resource1b.content_id, progress=1.0
        )
        help_time = timezone.now() - datetime.timedelta(minutes=30)
        complete_time = timezone.now()
        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Help,
            user_id=self.learner1.id,
            classroom_id=self.classroom.id,
            contentnode_id=self.resource1b.id,
            course_session_id=self.course_session.id,
            timestamp=help_time,
        )
        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Completed,
            user_id=self.learner1.id,
            classroom_id=self.classroom.id,
            contentnode_id=self.resource1b.id,
            course_session_id=self.course_session.id,
            timestamp=complete_time,
        )
        response = self.client.get(self.url)
        status = self._get_status_for(
            response, self.learner1.id, self.resource1b.content_id
        )
        # Completed timestamp > Help timestamp, so status reverts to Completed
        self.assertEqual(status["status"], COMPLETED)

    def test_progress_complete_not_overridden_by_help_notification(self):
        """progress==1 returns COMPLETED even when a HelpNeeded notification exists without a Completed notification."""
        self._create_exercise_log_with_attempts(
            self.learner1, self.resource1b.content_id, progress=1.0
        )
        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Help,
            user_id=self.learner1.id,
            classroom_id=self.classroom.id,
            contentnode_id=self.resource1b.id,
            course_session_id=self.course_session.id,
            timestamp=timezone.now(),
        )
        response = self.client.get(self.url)
        status = self._get_status_for(
            response, self.learner1.id, self.resource1b.content_id
        )
        self.assertEqual(status["status"], COMPLETED)

    def test_status_output_shape(self):
        """Each status entry has the expected fields matching content_learner_status."""
        self._create_summary_log(
            self.learner1, self.resource1a.content_id, progress=0.5
        )
        response = self.client.get(self.url)
        status = response.data["content_learner_status"][0]
        self.assertIn("learner_id", status)
        self.assertIn("content_id", status)
        self.assertIn("status", status)
        self.assertIn("last_activity", status)
        self.assertIn("time_spent", status)
        self.assertIn("tries", status)


class UnitLessonProgressScopingTests(UnitLessonProgressTestBase):
    """
    Status data only includes learners assigned to the course session.
    """

    def setUp(self):
        self.client.login(username="ccoach", password=DUMMY_PASSWORD)

    def test_assigned_learner_included(self):
        """Learner in the assigned classroom appears in status."""
        self._create_summary_log(self.learner1, self.resource1a.content_id)
        response = self.client.get(self.url)
        learner_ids = {s["learner_id"] for s in response.data["content_learner_status"]}
        self.assertIn(self.learner1.id, learner_ids)

    def test_unassigned_learner_excluded(self):
        """Learner NOT in any assigned collection is excluded even if they
        have a ContentSummaryLog for the same content."""
        other_classroom = Classroom.objects.create(
            name="Other Class", parent=self.facility
        )
        unassigned_learner = helpers.create_learner(
            "unassigned", DUMMY_PASSWORD, self.facility, other_classroom
        )
        self._create_summary_log(unassigned_learner, self.resource1a.content_id)
        response = self.client.get(self.url)
        learner_ids = {s["learner_id"] for s in response.data["content_learner_status"]}
        self.assertNotIn(unassigned_learner.id, learner_ids)

    def test_learner_group_assignment_scoping(self):
        """When a course session is assigned to a LearnerGroup, only group
        members are included."""
        # Create a learner group with only learner1
        group = LearnerGroup.objects.create(name="Group A", parent=self.classroom)
        group.add_member(self.learner1)

        # Create a separate course session assigned to the group only
        course_session2 = CourseSession.objects.create(
            course=self.course_node.id,
            title="Group Session",
            collection=self.classroom,
            created_by=self.facility_admin,
            is_active=True,
        )
        CourseSessionAssignment.objects.create(
            course_session=course_session2,
            collection=group,
            assigned_by=self.facility_admin,
        )

        # Both learners have logs
        self._create_summary_log(self.learner1, self.resource1a.content_id)
        self._create_summary_log(self.learner2, self.resource1a.content_id)

        url = _url(course_session2.id, self.unit_node.id)
        response = self.client.get(url)
        learner_ids = {s["learner_id"] for s in response.data["content_learner_status"]}
        # Only learner1 is in the group
        self.assertIn(self.learner1.id, learner_ids)
        self.assertNotIn(self.learner2.id, learner_ids)
