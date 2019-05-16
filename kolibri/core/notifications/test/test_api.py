import datetime
import json
import uuid

from le_utils.constants import content_kinds
from mock import patch
from rest_framework.test import APITestCase

from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import ClassroomFactory
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.content.models import ContentNode
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.test.factory_logger import ContentSessionLogFactory
from kolibri.core.logger.test.factory_logger import ContentSummaryLogFactory
from kolibri.core.logger.test.factory_logger import FacilityUserFactory
from kolibri.core.notifications.api import create_examlog
from kolibri.core.notifications.api import create_notification
from kolibri.core.notifications.api import create_summarylog
from kolibri.core.notifications.api import get_assignments
from kolibri.core.notifications.api import get_exam_group
from kolibri.core.notifications.api import parse_attemptslog
from kolibri.core.notifications.api import parse_examlog
from kolibri.core.notifications.api import parse_summarylog
from kolibri.core.notifications.models import HelpReason
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.core.notifications.models import NotificationEventType
from kolibri.core.notifications.models import NotificationObjectType
from kolibri.utils.time_utils import local_now


class NotificationsAPITestCase(APITestCase):
    def setUp(self):
        provision_device()
        self.facility = FacilityFactory.create()
        self.superuser = create_superuser(self.facility)
        self.user1 = FacilityUserFactory.create(facility=self.facility)
        self.user2 = FacilityUserFactory.create(facility=self.facility)
        # create classroom, learner group, add user1
        self.classroom = ClassroomFactory.create(parent=self.facility)
        self.classroom.add_member(self.user1)

        self.payload = {
            "user": self.user1.pk,
            "content_id": uuid.uuid4().hex,
            "channel_id": uuid.uuid4().hex,
            "kind": "exercise",
            "start_timestamp": str(datetime.datetime.now()),
        }
        self.channel_id = "15f32edcec565396a1840c5413c92450"
        self.lesson_id = "15f32edcec565396a1840c5413c92452"
        self.content_ids = [
            "15f32edcec565396a1840c5413c92451",
            "15f32edcec565396a1840c5413c92452",
            "15f32edcec565396a1840c5413c92453",
        ]
        self.contentnode_ids = [
            "25f32edcec565396a1840c5413c92451",
            "25f32edcec565396a1840c5413c92452",
            "25f32edcec565396a1840c5413c92453",
        ]
        self.node_1 = ContentNode.objects.create(
            title="Node 1",
            available=True,
            id=self.contentnode_ids[0],
            content_id=self.content_ids[0],
            channel_id=self.channel_id,
            kind=content_kinds.EXERCISE,
        )
        self.node_2 = ContentNode.objects.create(
            title="Node 2",
            available=True,
            id=self.contentnode_ids[1],
            content_id=self.content_ids[1],
            channel_id=self.channel_id,
            kind=content_kinds.EXERCISE,
        )
        self.lesson = Lesson.objects.create(
            id=self.lesson_id,
            title="My Lesson",
            is_active=True,
            created_by=self.superuser,
            collection=self.classroom,
            resources=json.dumps(
                [
                    {
                        "contentnode_id": self.node_1.id,
                        "content_id": self.node_1.content_id,
                        "channel_id": self.channel_id,
                    },
                    {
                        "contentnode_id": self.node_2.id,
                        "content_id": self.node_2.content_id,
                        "channel_id": self.channel_id,
                    },
                ]
            ),
        )

        self.assignment_1 = LessonAssignment.objects.create(
            lesson=self.lesson, assigned_by=self.superuser, collection=self.classroom
        )

        self.exam = Exam.objects.create(
            title="title",
            question_count=1,
            active=True,
            collection=self.classroom,
            creator=self.superuser,
        )
        self.assignment = ExamAssignment.objects.create(
            exam=self.exam, collection=self.classroom, assigned_by=self.superuser
        )
        self.summarylog1 = ContentSummaryLogFactory.create(
            user=self.user1,
            content_id=self.node_1.content_id,
            channel_id=self.channel_id,
        )

        self.summarylog2 = ContentSummaryLogFactory.create(
            user=self.user1,
            content_id=self.node_2.content_id,
            channel_id=self.channel_id,
            kind=content_kinds.EXERCISE,
        )

    def test_get_assignments(self):
        # user2 has no classroom assigned, thus no lessons:
        summarylog = ContentSummaryLogFactory.create(
            user=self.user2,
            content_id=self.node_1.content_id,
            channel_id=self.channel_id,
        )
        lessons = get_assignments(self.user2, summarylog, attempt=False)
        assert lessons == []
        # user1 has one lesson:
        lessons = get_assignments(self.user1, self.summarylog1, attempt=False)
        assert len(lessons) > 0
        assert type(lessons[0][0]) == Lesson
        # being the node an Exercise, it should be available for attempts:
        lessons = get_assignments(self.user1, self.summarylog1, attempt=True)
        assert len(lessons) > 0

    def test_get_exam_group(self):
        user_classrooms = self.user1.memberships.all()
        touched_groups = get_exam_group(user_classrooms, self.exam.id)
        assert len(touched_groups) > 0
        assert touched_groups[0] == self.classroom.id

    def test_create_notification(self):
        notification = create_notification(
            NotificationObjectType.Quiz,
            NotificationEventType.Completed,
            self.user1.id,
            self.classroom.id,
        )
        assert str(notification) == "Quiz - Completed"
        assert notification.user_id == self.user1.id

    @patch("kolibri.core.notifications.api.save_notifications")
    def test_parse_summarylog(self, save_notifications):
        parse_summarylog(self.summarylog1)
        assert save_notifications.called is False
        self.summarylog1.progress = 1.0
        parse_summarylog(self.summarylog1)
        assert save_notifications.called
        notification = save_notifications.call_args[0][0][0]
        assert notification.notification_object == NotificationObjectType.Resource
        assert notification.notification_event == NotificationEventType.Completed
        assert notification.lesson_id == self.lesson.id
        assert notification.contentnode_id == self.node_1.id

    @patch("kolibri.core.notifications.api.save_notifications")
    def test_parse_summarylog_exercise(self, save_notifications):
        parse_summarylog(self.summarylog2)
        assert save_notifications.called is False

    @patch("kolibri.core.notifications.api.save_notifications")
    def test_create_summarylog(self, save_notifications):
        create_summarylog(self.summarylog1)
        assert save_notifications.called is True
        notification = save_notifications.call_args[0][0][0]
        assert notification.notification_object == NotificationObjectType.Resource
        assert notification.notification_event == NotificationEventType.Started

    @patch("kolibri.core.notifications.api.save_notifications")
    def test_parse_examlog(self, save_notifications):
        examlog = ExamLog.objects.create(exam=self.exam, user=self.user1)
        parse_examlog(examlog, local_now())
        assert save_notifications.called is False
        examlog.closed = True
        parse_examlog(examlog, local_now())
        assert save_notifications.called
        notification = save_notifications.call_args[0][0][0]
        assert notification.notification_object == NotificationObjectType.Quiz
        assert notification.notification_event == NotificationEventType.Completed

    @patch("kolibri.core.notifications.api.save_notifications")
    def test_create_examlog(self, save_notifications):
        examlog = ExamLog.objects.create(exam=self.exam, user=self.user1)
        create_examlog(examlog, local_now())
        assert save_notifications.called
        notification = save_notifications.call_args[0][0][0]
        assert notification.notification_object == NotificationObjectType.Quiz
        assert notification.notification_event == NotificationEventType.Started

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_parse_attemptslog_create_on_new_attempt_with_no_notification(
        self, save_notifications, create_notification
    ):
        log = ContentSessionLogFactory(
            user=self.user1, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex
        )
        now = local_now()
        masterylog = MasteryLog.objects.create(
            summarylog=self.summarylog1,
            user=self.user1,
            start_timestamp=now,
            mastery_level=1,
            complete=True,
        )
        interactions = [{"type": "answer", "correct": 0} for _ in range(3)]
        attemptlog1 = AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=log,
            user=self.user1,
            start_timestamp=now,
            end_timestamp=now,
            time_spent=1.0,
            complete=True,
            correct=1,
            hinted=False,
            error=False,
            interaction_history=[interactions[0]],
        )
        parse_attemptslog(attemptlog1)
        assert save_notifications.called
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Started,
            attemptlog1.user_id,
            self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog1.start_timestamp,
        )

        create_notification.assert_any_call(
            NotificationObjectType.Lesson,
            NotificationEventType.Started,
            attemptlog1.user_id,
            self.classroom.id,
            lesson_id=self.lesson_id,
            timestamp=attemptlog1.start_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_parse_attemptslog_create_on_new_attempt_with_notification(
        self, save_notifications, create_notification
    ):
        log = ContentSessionLogFactory(
            user=self.user1, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex
        )
        now = local_now()
        masterylog = MasteryLog.objects.create(
            summarylog=self.summarylog1,
            user=self.user1,
            start_timestamp=now,
            mastery_level=1,
            complete=True,
        )
        interactions = [{"type": "answer", "correct": 0} for _ in range(3)]
        attemptlog1 = AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=log,
            user=self.user1,
            start_timestamp=now,
            end_timestamp=now,
            time_spent=1.0,
            complete=True,
            correct=1,
            hinted=False,
            error=False,
            interaction_history=[interactions[0]],
        )
        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Started,
            user_id=attemptlog1.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog1.start_timestamp,
        )

        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Lesson,
            notification_event=NotificationEventType.Started,
            user_id=attemptlog1.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            timestamp=attemptlog1.start_timestamp,
        )

        attemptlog2 = AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=log,
            user=self.user1,
            start_timestamp=now,
            end_timestamp=now,
            time_spent=1.0,
            complete=True,
            correct=1,
            hinted=False,
            error=False,
            interaction_history=[interactions[0]],
        )
        parse_attemptslog(attemptlog2)
        assert save_notifications.called is False
        assert create_notification.called is False

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_parse_attemptslog_update_attempt_with_three_wrong_attempts(
        self, save_notifications, create_notification
    ):
        log = ContentSessionLogFactory(
            user=self.user1, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex
        )
        now = local_now()
        masterylog = MasteryLog.objects.create(
            summarylog=self.summarylog1,
            user=self.user1,
            start_timestamp=now,
            mastery_level=1,
            complete=True,
        )
        interactions = [{"type": "answer", "correct": 0}]
        AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=log,
            user=self.user1,
            start_timestamp=now,
            end_timestamp=now,
            time_spent=1.0,
            complete=True,
            correct=0,
            hinted=False,
            error=False,
            interaction_history=interactions,
        )

        AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=log,
            user=self.user1,
            start_timestamp=now,
            end_timestamp=now,
            time_spent=1.0,
            complete=True,
            correct=0,
            hinted=False,
            error=False,
            interaction_history=interactions,
        )
        # more than 3 attempts will trigger the help notification
        interactions.append({"type": "answer", "correct": 0})
        attemptlog3 = AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=log,
            user=self.user1,
            start_timestamp=now,
            end_timestamp=now,
            time_spent=1.0,
            complete=True,
            correct=0,
            hinted=False,
            error=False,
            interaction_history=interactions,
        )
        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Started,
            user_id=attemptlog3.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog3.start_timestamp,
        )

        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Lesson,
            notification_event=NotificationEventType.Started,
            user_id=attemptlog3.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            timestamp=attemptlog3.start_timestamp,
        )
        parse_attemptslog(attemptlog3)
        assert save_notifications.called
        create_notification.assert_called_once_with(
            NotificationObjectType.Resource,
            NotificationEventType.Help,
            attemptlog3.user_id,
            self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog3.start_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_parse_attemptslog_update_attempt_with_three_wrong_attempts_on_same_attempt(
        self, save_notifications, create_notification
    ):
        log = ContentSessionLogFactory(
            user=self.user1, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex
        )
        now = local_now()
        masterylog = MasteryLog.objects.create(
            summarylog=self.summarylog1,
            user=self.user1,
            start_timestamp=now,
            mastery_level=1,
            complete=True,
        )
        interactions = [{"type": "answer", "correct": 0} for _ in range(3)]
        AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=log,
            user=self.user1,
            start_timestamp=now,
            end_timestamp=now,
            time_spent=1.0,
            complete=True,
            correct=1,
            hinted=False,
            error=False,
            interaction_history=[interactions[0]],
        )

        AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=log,
            user=self.user1,
            start_timestamp=now,
            end_timestamp=now,
            time_spent=1.0,
            complete=True,
            correct=1,
            hinted=False,
            error=False,
            interaction_history=[interactions[0]],
        )
        # more than 3 attempts will trigger the help notification
        interactions.append({"type": "answer", "correct": 0})
        attemptlog3 = AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=log,
            user=self.user1,
            start_timestamp=now,
            end_timestamp=now,
            time_spent=1.0,
            complete=True,
            correct=1,
            hinted=False,
            error=False,
            interaction_history=interactions,
        )
        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Started,
            user_id=attemptlog3.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog3.start_timestamp,
        )

        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Lesson,
            notification_event=NotificationEventType.Started,
            user_id=attemptlog3.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            timestamp=attemptlog3.start_timestamp,
        )
        parse_attemptslog(attemptlog3)
        assert save_notifications.called
        create_notification.assert_called_once_with(
            NotificationObjectType.Resource,
            NotificationEventType.Help,
            attemptlog3.user_id,
            self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog3.start_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_parse_attemptslog_update_attempt_with_three_wrong_attempts_no_started(
        self, save_notifications, create_notification
    ):
        log = ContentSessionLogFactory(
            user=self.user1, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex
        )
        now = local_now()
        masterylog = MasteryLog.objects.create(
            summarylog=self.summarylog1,
            user=self.user1,
            start_timestamp=now,
            mastery_level=1,
            complete=True,
        )
        interactions = [{"type": "answer", "correct": 0}]
        AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=log,
            user=self.user1,
            start_timestamp=now,
            end_timestamp=now,
            time_spent=1.0,
            complete=True,
            correct=0,
            hinted=False,
            error=False,
            interaction_history=interactions,
        )

        AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=log,
            user=self.user1,
            start_timestamp=now,
            end_timestamp=now,
            time_spent=1.0,
            complete=True,
            correct=0,
            hinted=False,
            error=False,
            interaction_history=interactions,
        )
        # more than 3 attempts will trigger the help notification
        interactions.append({"type": "answer", "correct": 0})
        attemptlog3 = AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=log,
            user=self.user1,
            start_timestamp=now,
            end_timestamp=now,
            time_spent=1.0,
            complete=True,
            correct=0,
            hinted=False,
            error=False,
            interaction_history=interactions,
        )
        parse_attemptslog(attemptlog3)
        assert save_notifications.called
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Help,
            attemptlog3.user_id,
            self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog3.start_timestamp,
        )

        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Started,
            attemptlog3.user_id,
            self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog3.start_timestamp,
        )
