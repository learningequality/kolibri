import json
import uuid
from datetime import timedelta

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
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.test.factory_logger import ContentSessionLogFactory
from kolibri.core.logger.test.factory_logger import ContentSummaryLogFactory
from kolibri.core.logger.test.factory_logger import FacilityUserFactory
from kolibri.core.logger.utils.exam_log_migration import migrate_from_exam_logs
from kolibri.core.notifications.api import _get_lesson_dict
from kolibri.core.notifications.api import batch_process_attemptlogs
from kolibri.core.notifications.api import batch_process_examlogs
from kolibri.core.notifications.api import batch_process_masterylogs_for_quizzes
from kolibri.core.notifications.api import batch_process_summarylogs
from kolibri.core.notifications.api import create_examlog
from kolibri.core.notifications.api import create_notification
from kolibri.core.notifications.api import create_summarylog
from kolibri.core.notifications.api import finish_lesson_resource
from kolibri.core.notifications.api import get_assignments
from kolibri.core.notifications.api import parse_attemptslog
from kolibri.core.notifications.api import parse_examlog
from kolibri.core.notifications.api import parse_summarylog
from kolibri.core.notifications.api import quiz_completed_notification
from kolibri.core.notifications.api import quiz_started_notification
from kolibri.core.notifications.api import start_lesson_assessment
from kolibri.core.notifications.api import start_lesson_resource
from kolibri.core.notifications.api import update_lesson_assessment
from kolibri.core.notifications.models import HelpReason
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.core.notifications.models import NotificationEventType
from kolibri.core.notifications.models import NotificationObjectType
from kolibri.utils.time_utils import local_now


class NotificationsAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)

    def setUp(self):
        _get_lesson_dict.cache_clear()
        self.user1 = FacilityUserFactory.create(facility=self.facility)
        self.user2 = FacilityUserFactory.create(facility=self.facility)
        # create classroom, learner group, add user1
        self.classroom = ClassroomFactory.create(parent=self.facility)
        self.classroom.add_member(self.user1)

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
        assert type(lessons[0][0]) == dict
        assert "assignment_collections" in lessons[0][0]
        # being the node an Exercise, it should be available for attempts:
        lessons = get_assignments(self.user1, self.summarylog1, attempt=True)
        assert len(lessons) > 0

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
    def test_finish_lesson_resource(self, save_notifications):
        finish_lesson_resource(self.summarylog1, self.node_1.id, self.lesson.id)
        assert save_notifications.called is False
        self.summarylog1.progress = 1.0
        self.summarylog1.save()
        finish_lesson_resource(self.summarylog1, self.node_1.id, self.lesson.id)
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
    def test_start_lesson_resource(self, save_notifications):
        start_lesson_resource(self.summarylog1, self.node_1.id, self.lesson.id)
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
    def test_quiz_completed_notification(self, save_notifications):
        summarylog_quiz = ContentSummaryLogFactory.create(
            user=self.user1,
            content_id=self.exam.id,
            channel_id=None,
            kind=content_kinds.QUIZ,
        )

        sessionlog_quiz = ContentSessionLogFactory.create(
            user=self.user1,
            content_id=self.exam.id,
            channel_id=None,
            kind=content_kinds.QUIZ,
        )

        masterylog_quiz = MasteryLog.objects.create(
            summarylog=summarylog_quiz,
            start_timestamp=local_now(),
            user=self.user1,
            mastery_level=-1,
        )

        AttemptLog.objects.create(
            masterylog=masterylog_quiz,
            sessionlog=sessionlog_quiz,
            item="test",
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            user=self.user1,
            correct=0,
        )
        quiz_completed_notification(masterylog_quiz, self.exam.id)
        assert save_notifications.called is False
        masterylog_quiz.complete = True
        masterylog_quiz.save()
        quiz_completed_notification(masterylog_quiz, self.exam.id)
        assert save_notifications.called
        notification = save_notifications.call_args[0][0][0]
        assert notification.notification_object == NotificationObjectType.Quiz
        assert notification.notification_event == NotificationEventType.Completed
        assert notification.quiz_num_answered == 1
        assert notification.quiz_num_correct == 0

    @patch("kolibri.core.notifications.api.save_notifications")
    def test_quiz_started_notification(self, save_notifications):
        summarylog_quiz = ContentSummaryLogFactory.create(
            user=self.user1,
            content_id=self.exam.id,
            channel_id=None,
            kind=content_kinds.QUIZ,
        )

        ContentSessionLogFactory.create(
            user=self.user1,
            content_id=self.exam.id,
            channel_id=None,
            kind=content_kinds.QUIZ,
        )

        masterylog_quiz = MasteryLog.objects.create(
            summarylog=summarylog_quiz,
            start_timestamp=local_now(),
            user=self.user1,
            mastery_level=-1,
            complete=True,
        )
        quiz_started_notification(masterylog_quiz, self.exam.id)
        assert save_notifications.called
        notification = save_notifications.call_args[0][0][0]
        assert notification.notification_object == NotificationObjectType.Quiz
        assert notification.notification_event == NotificationEventType.Started

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
    def test_start_lesson_assessment_with_no_notification(
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
        start_lesson_assessment(attemptlog1, self.node_1.id, self.lesson_id)
        assert save_notifications.called
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Started,
            attemptlog1.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog1.start_timestamp,
        )

        create_notification.assert_any_call(
            NotificationObjectType.Lesson,
            NotificationEventType.Started,
            attemptlog1.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            timestamp=attemptlog1.start_timestamp,
        )

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
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog1.start_timestamp,
        )

        create_notification.assert_any_call(
            NotificationObjectType.Lesson,
            NotificationEventType.Started,
            attemptlog1.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            timestamp=attemptlog1.start_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_start_lesson_assessment_with_notification(
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
        start_lesson_assessment(attemptlog2, self.node_1.id, self.lesson_id)
        assert create_notification.called is False

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
    def test_update_lesson_assessment_with_three_wrong_attempts(
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
        update_lesson_assessment(attemptlog3, self.node_1.id, self.lesson_id)
        assert save_notifications.called
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Help,
            attemptlog3.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog3.start_timestamp,
        )
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Answered,
            attemptlog3.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog3.start_timestamp,
        )

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
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog3.start_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_update_lesson_assessment_with_three_wrong_attempts_on_same_attempt(
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
        update_lesson_assessment(attemptlog3, self.node_1.id, self.lesson_id)
        assert save_notifications.called

        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Help,
            attemptlog3.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog3.start_timestamp,
        )
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Answered,
            attemptlog3.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
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
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog3.start_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_start_lesson_assessment_with_three_wrong_attempts_no_started(
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
        start_lesson_assessment(attemptlog3, self.node_1.id, self.lesson_id)
        assert save_notifications.called
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Help,
            attemptlog3.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
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
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
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
            assignment_collections=[self.classroom.id],
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
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog3.start_timestamp,
        )


class BulkNotificationsAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)

        cls.user1 = FacilityUserFactory.create(facility=cls.facility)
        cls.user2 = FacilityUserFactory.create(facility=cls.facility)
        # create classroom, learner group, add user1
        cls.classroom = ClassroomFactory.create(parent=cls.facility)
        cls.classroom.add_member(cls.user1)

        cls.channel_id = "15f32edcec565396a1840c5413c92450"
        cls.lesson_id = "15f32edcec565396a1840c5413c92452"
        cls.content_ids = [
            "15f32edcec565396a1840c5413c92451",
            "15f32edcec565396a1840c5413c92452",
            "15f32edcec565396a1840c5413c92453",
        ]
        cls.contentnode_ids = [
            "25f32edcec565396a1840c5413c92451",
            "25f32edcec565396a1840c5413c92452",
            "25f32edcec565396a1840c5413c92453",
        ]
        cls.node_1 = ContentNode.objects.create(
            title="Node 1",
            available=True,
            id=cls.contentnode_ids[0],
            content_id=cls.content_ids[0],
            channel_id=cls.channel_id,
            kind=content_kinds.EXERCISE,
        )
        cls.node_2 = ContentNode.objects.create(
            title="Node 2",
            available=True,
            id=cls.contentnode_ids[1],
            content_id=cls.content_ids[1],
            channel_id=cls.channel_id,
            kind=content_kinds.EXERCISE,
        )
        cls.lesson = Lesson.objects.create(
            id=cls.lesson_id,
            title="My Lesson",
            is_active=True,
            created_by=cls.superuser,
            collection=cls.classroom,
            resources=json.dumps(
                [
                    {
                        "contentnode_id": cls.node_1.id,
                        "content_id": cls.node_1.content_id,
                        "channel_id": cls.channel_id,
                    },
                    {
                        "contentnode_id": cls.node_2.id,
                        "content_id": cls.node_2.content_id,
                        "channel_id": cls.channel_id,
                    },
                ]
            ),
        )

        cls.lesson_assignment = LessonAssignment.objects.create(
            lesson=cls.lesson, assigned_by=cls.superuser, collection=cls.classroom
        )

        cls.exam1 = Exam.objects.create(
            title="title1",
            question_count=1,
            active=True,
            collection=cls.classroom,
            creator=cls.superuser,
        )
        cls.exam1_assignment = ExamAssignment.objects.create(
            exam=cls.exam1, collection=cls.classroom, assigned_by=cls.superuser
        )
        cls.examlog1 = ExamLog.objects.create(
            exam=cls.exam1,
            user=cls.user1,
            closed=True,
            completion_timestamp=local_now(),
        )
        cls.examattemptlog1 = ExamAttemptLog.objects.create(
            examlog=cls.examlog1,
            user=cls.user1,
            start_timestamp=local_now(),
            end_timestamp=local_now() + timedelta(seconds=10),
            complete=False,
            correct=0.0,
            content_id=uuid.uuid4(),
        )

        cls.exam2 = Exam.objects.create(
            title="title2",
            question_count=1,
            active=True,
            collection=cls.classroom,
            creator=cls.superuser,
        )
        cls.exam2_assignment = ExamAssignment.objects.create(
            exam=cls.exam2, collection=cls.classroom, assigned_by=cls.superuser
        )
        cls.examlog2 = ExamLog.objects.create(
            exam=cls.exam2,
            user=cls.user1,
            closed=False,
        )

        cls.summarylog1 = ContentSummaryLogFactory.create(
            user=cls.user1,
            content_id=cls.node_1.content_id,
            channel_id=cls.channel_id,
        )

        cls.summarylog2 = ContentSummaryLogFactory.create(
            user=cls.user1,
            content_id=cls.node_2.content_id,
            channel_id=cls.channel_id,
            kind=content_kinds.EXERCISE,
        )

        cls.sessionlog = ContentSessionLogFactory(
            user=cls.user1,
            content_id=cls.summarylog1.content_id,
            channel_id=cls.summarylog1.channel_id,
        )

        cls.mlog = masterylog = MasteryLog.objects.create(
            summarylog=cls.summarylog1,
            user=cls.user1,
            start_timestamp=local_now(),
            mastery_level=1,
            complete=True,
        )
        interactions = [{"type": "answer", "correct": 0}]
        cls.attemptlog1 = AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=cls.sessionlog,
            user=cls.user1,
            start_timestamp=local_now(),
            end_timestamp=local_now() + timedelta(seconds=10),
            time_spent=1.0,
            complete=True,
            correct=0,
            hinted=False,
            error=False,
            interaction_history=interactions,
        )

        cls.attemptlog2 = AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=cls.sessionlog,
            user=cls.user1,
            start_timestamp=local_now(),
            end_timestamp=local_now() + timedelta(seconds=10),
            time_spent=1.0,
            complete=True,
            correct=0,
            hinted=False,
            error=False,
            interaction_history=interactions,
        )

    def _assert_call_contains(self, call, *args, **kwargs):
        # Check args that are [1] in the call
        for actual, expected in zip(call[1], args):
            self.assertEqual(actual, expected)
        # Check kwargs that are [2] in the call
        for key, actual in call[2].items():
            if key in kwargs:
                expected = kwargs[key]
                self.assertEqual(actual, expected)

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_batch_summarylog_notifications(
        self, save_notifications, create_notification
    ):
        LearnerProgressNotification.objects.all().delete()
        batch_process_summarylogs([self.summarylog1.id, self.summarylog2.id])
        assert save_notifications.called
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Started,
            self.attemptlog1.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=self.summarylog1.start_timestamp,
        )
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Started,
            self.attemptlog1.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_2.id,
            timestamp=self.summarylog2.start_timestamp,
        )
        create_notification.assert_any_call(
            NotificationObjectType.Lesson,
            NotificationEventType.Started,
            self.attemptlog1.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            timestamp=self.summarylog1.start_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_batch_examlog_notifications(self, save_notifications, create_notification):
        LearnerProgressNotification.objects.all().delete()
        batch_process_examlogs(
            [self.examlog1.id, self.examlog2.id], [self.examattemptlog1.id]
        )
        assert save_notifications.called
        self._assert_call_contains(
            create_notification.mock_calls[0],
            NotificationObjectType.Quiz,
            NotificationEventType.Started,
            self.user1.id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            quiz_id=self.exam1.id,
            timestamp=self.examattemptlog1.start_timestamp,
        )
        self._assert_call_contains(
            create_notification.mock_calls[1],
            NotificationObjectType.Quiz,
            NotificationEventType.Answered,
            self.user1.id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            quiz_id=self.exam1.id,
            timestamp=self.examattemptlog1.start_timestamp,
        )
        self._assert_call_contains(
            create_notification.mock_calls[2],
            NotificationObjectType.Quiz,
            NotificationEventType.Completed,
            self.user1.id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            quiz_id=self.exam1.id,
            timestamp=self.examlog1.completion_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_batch_attemptlog_notifications(
        self, save_notifications, create_notification
    ):
        LearnerProgressNotification.objects.all().delete()
        batch_process_attemptlogs([self.attemptlog1.id, self.attemptlog2.id])
        assert save_notifications.called
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Answered,
            self.attemptlog1.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=self.attemptlog1.end_timestamp,
        )
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Answered,
            self.attemptlog2.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=self.attemptlog2.end_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_batch_attemptlog_needs_help(self, save_notifications, create_notification):
        LearnerProgressNotification.objects.all().delete()
        # more than 3 attempts will trigger the help notification
        interactions = [{"type": "answer", "correct": 0}] * 3
        attemptlog3 = AttemptLog.objects.create(
            masterylog=self.mlog,
            sessionlog=self.sessionlog,
            user=self.user1,
            start_timestamp=local_now(),
            end_timestamp=local_now() + timedelta(seconds=10),
            time_spent=1.0,
            complete=True,
            correct=0,
            hinted=False,
            error=False,
            interaction_history=interactions,
        )
        batch_process_attemptlogs(
            [self.attemptlog1.id, self.attemptlog2.id, attemptlog3.id]
        )
        assert save_notifications.called
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Answered,
            attemptlog3.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog3.end_timestamp,
        )
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Help,
            attemptlog3.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog3.end_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_batch_masterylog_from_examlog_notifications(
        self, save_notifications, create_notification
    ):
        LearnerProgressNotification.objects.all().delete()
        migrate_from_exam_logs(ExamLog.objects.all())
        batch_process_masterylogs_for_quizzes(
            MasteryLog.objects.filter(summarylog__content_id=self.exam1.id)
            .values_list("id", flat=True)
            .order_by("complete"),
            AttemptLog.objects.all().values_list("id", flat=True),
        )
        assert save_notifications.called
        self._assert_call_contains(
            create_notification.mock_calls[0],
            NotificationObjectType.Quiz,
            NotificationEventType.Answered,
            self.user1.id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            quiz_id=self.exam1.id,
            timestamp=self.examattemptlog1.start_timestamp,
        )
        self._assert_call_contains(
            create_notification.mock_calls[1],
            NotificationObjectType.Quiz,
            NotificationEventType.Started,
            self.user1.id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            quiz_id=self.exam1.id,
            timestamp=self.examattemptlog1.start_timestamp,
        )
        self._assert_call_contains(
            create_notification.mock_calls[2],
            NotificationObjectType.Quiz,
            NotificationEventType.Completed,
            self.user1.id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            quiz_id=self.exam1.id,
            timestamp=self.examlog1.completion_timestamp,
        )
