import uuid
from datetime import timedelta

from le_utils.constants import content_kinds
from mock import patch
from rest_framework.test import APITestCase

from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import ClassroomFactory
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_utils import MasteryLogFactory
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
from kolibri.core.notifications.api import NEEDS_HELP_NOTIFICATION_THRESHOLD
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
    databases = "__all__"

    @classmethod
    def setUpTestData(self):
        provision_device()
        self.facility = FacilityFactory.create()
        self.superuser = create_superuser(self.facility)
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
        ]
        self.contentnode_ids = [
            "25f32edcec565396a1840c5413c92451",
            "25f32edcec565396a1840c5413c92452",
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
            resources=[
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
            ],
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

    def _create_mock_attemptlog(self, sessionlog=None, masterylog=None):
        if sessionlog is None:
            sessionlog = ContentSessionLogFactory(
                user=self.user1,
                content_id=uuid.uuid4().hex,
                channel_id=uuid.uuid4().hex,
            )

        now = local_now()
        if masterylog is None:
            masterylog = MasteryLog.objects.create(
                summarylog=self.summarylog1,
                user=self.user1,
                start_timestamp=now,
                mastery_level=1,
                complete=True,
            )

        return AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=sessionlog,
            user=self.user1,
            start_timestamp=now,
            end_timestamp=now + timedelta(seconds=10),
            time_spent=1.0,
            complete=True,
            correct=1,
            hinted=False,
            error=False,
            interaction_history=[{"type": "answer", "correct": 0}],
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
        assert isinstance(lessons[0][0], dict)
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
    def test_parse_summarylog_doesnt_save_notifications(self, save_notifications):
        # Test not save notifications if progress is less than 1
        self.summarylog1.progress = 0
        parse_summarylog(self.summarylog1)
        assert save_notifications.called is False

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_parse_summarylog_save_completed_resource_notification(
        self, save_notifications, create_notification
    ):
        # Test save notifications if progress is 1
        self.summarylog1.progress = 1.0
        self.summarylog1.completion_timestamp = local_now()
        parse_summarylog(self.summarylog1)
        assert save_notifications.called
        create_notification.assert_called_once_with(
            NotificationObjectType.Resource,
            NotificationEventType.Completed,
            self.user1.id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            contentnode_id=self.node_1.id,
            lesson_id=self.lesson.id,
            timestamp=self.summarylog1.completion_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    def test_parse_summarylog_not_save_completed_lesson_notification(
        self, create_notification
    ):
        self.summarylog1.progress = 1.0
        parse_summarylog(self.summarylog1)

        # dont save completed lesson if there are more resources to complete
        notifications = create_notification.call_args_list
        assert not any(
            [
                (
                    call[1] == NotificationEventType.Completed
                    and call[0] == NotificationObjectType.Lesson
                )
                for call in notifications
            ]
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_parse_summarylog_save_completed_lesson_notification(
        self, save_notifications, create_notification
    ):
        self.summarylog1.progress = 1.0
        self.summarylog1.completion_timestamp = local_now() + timedelta(seconds=2)
        self.summarylog1.end_timestamp = local_now() + timedelta(seconds=5)
        self.summarylog1.save()
        parse_summarylog(self.summarylog1)

        self.summarylog2.progress = 1.0
        self.summarylog2.completion_timestamp = local_now() + timedelta(seconds=7)
        self.summarylog2.end_timestamp = local_now() + timedelta(seconds=10)
        self.summarylog2.save()
        parse_summarylog(self.summarylog2)

        assert save_notifications.called
        create_notification.assert_any_call(
            NotificationObjectType.Lesson,
            NotificationEventType.Completed,
            self.user1.id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson.id,
            # End timestamp should be the latest completion time
            timestamp=self.summarylog2.completion_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_parse_summarylog_save_completed_lesson_notification_with_retry(
        self, save_notifications, create_notification
    ):
        self.summarylog1.progress = 1.0
        self.summarylog1.completion_timestamp = local_now() + timedelta(seconds=2)
        self.summarylog1.end_timestamp = local_now() + timedelta(seconds=5)
        self.summarylog1.save()
        MasteryLogFactory.create(
            summarylog=self.summarylog1,
            start_timestamp=self.summarylog1.start_timestamp,
            completion_timestamp=self.summarylog1.completion_timestamp,
            end_timestamp=self.summarylog1.end_timestamp,
            user=self.user1,
            complete=True,
        )
        parse_summarylog(self.summarylog1)

        # Student retried the exercise, and even with progress = 0, this should
        # be considered as completed
        self.summarylog1.progress = 0
        MasteryLogFactory.create(
            summarylog=self.summarylog1,
            start_timestamp=self.summarylog1.start_timestamp,
            user=self.user1,
            complete=False,
        )
        self.summarylog1.save()

        self.summarylog2.progress = 1.0
        self.summarylog2.completion_timestamp = local_now() + timedelta(seconds=7)
        self.summarylog2.end_timestamp = local_now() + timedelta(seconds=10)
        self.summarylog2.save()
        parse_summarylog(self.summarylog2)

        assert save_notifications.called
        create_notification.assert_any_call(
            NotificationObjectType.Lesson,
            NotificationEventType.Completed,
            self.user1.id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson.id,
            # End timestamp should be the latest completion time
            timestamp=self.summarylog2.completion_timestamp,
        )

    def test_parse_retry_summarylog_dont_update_resource_completed_notification(self):
        self.summarylog1.progress = 1.0
        self.summarylog1.completion_timestamp = local_now() + timedelta(seconds=2)
        self.summarylog1.end_timestamp = local_now() + timedelta(seconds=5)
        self.summarylog1.save()
        masterylog1 = MasteryLogFactory.create(
            summarylog=self.summarylog1,
            start_timestamp=self.summarylog1.start_timestamp,
            completion_timestamp=self.summarylog1.completion_timestamp,
            end_timestamp=self.summarylog1.end_timestamp,
            user=self.user1,
            complete=True,
        )

        parse_summarylog(self.summarylog1)

        # User tried again
        self.summarylog1.progress = 1.0
        self.summarylog1.completion_timestamp = local_now() + timedelta(seconds=2)
        self.summarylog1.end_timestamp = local_now() + timedelta(seconds=5)
        self.summarylog1.save()
        MasteryLogFactory.create(
            summarylog=self.summarylog1,
            start_timestamp=self.summarylog1.start_timestamp,
            completion_timestamp=self.summarylog1.completion_timestamp,
            end_timestamp=self.summarylog1.end_timestamp,
            user=self.user1,
            complete=True,
        )

        parse_summarylog(self.summarylog1)

        # Only one notification should be created with the first masterylog completion timestamp
        notifications = LearnerProgressNotification.objects.filter(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Completed,
            user_id=self.user1.id,
            classroom_id=self.classroom.id,
            assignment_collections=[self.classroom.id],
            contentnode_id=self.node_1.id,
            lesson_id=self.lesson.id,
        )
        assert notifications.count() == 1
        assert notifications[0].timestamp == masterylog1.completion_timestamp

    def test_parse_retry_summarylog_dont_update_lesson_completed_notification(self):
        self.summarylog1.progress = 1.0
        self.summarylog1.completion_timestamp = local_now() + timedelta(seconds=2)
        self.summarylog1.end_timestamp = local_now() + timedelta(seconds=5)
        self.summarylog1.save()
        MasteryLogFactory.create(
            summarylog=self.summarylog1,
            start_timestamp=self.summarylog1.start_timestamp,
            completion_timestamp=self.summarylog1.completion_timestamp,
            end_timestamp=self.summarylog1.end_timestamp,
            user=self.user1,
            complete=True,
        )

        parse_summarylog(self.summarylog1)

        self.summarylog2.progress = 1.0
        self.summarylog2.completion_timestamp = local_now() + timedelta(seconds=2)
        self.summarylog2.end_timestamp = local_now() + timedelta(seconds=5)
        self.summarylog2.save()
        masterylog2 = MasteryLogFactory.create(
            id=uuid.uuid4().hex,
            summarylog=self.summarylog2,
            start_timestamp=self.summarylog2.start_timestamp,
            completion_timestamp=self.summarylog2.completion_timestamp,
            end_timestamp=self.summarylog2.end_timestamp,
            user=self.user1,
            complete=True,
        )

        # Lesson completed with timestamp of summarylog2.completion_timestamp
        parse_summarylog(self.summarylog2)

        # User retried 2nd resource
        self.summarylog2.progress = 1.0
        self.summarylog2.completion_timestamp = local_now() + timedelta(seconds=2)
        self.summarylog2.end_timestamp = local_now() + timedelta(seconds=5)
        self.summarylog2.save()
        MasteryLogFactory.create(
            summarylog=self.summarylog2,
            start_timestamp=self.summarylog2.start_timestamp,
            completion_timestamp=self.summarylog2.completion_timestamp,
            end_timestamp=self.summarylog2.end_timestamp,
            user=self.user1,
            complete=True,
        )

        parse_summarylog(self.summarylog2)

        # Only one lesson completed notification should be created with the first masterylog completion timestamp
        # of the last resource completed
        notifications = LearnerProgressNotification.objects.filter(
            notification_object=NotificationObjectType.Lesson,
            notification_event=NotificationEventType.Completed,
            user_id=self.user1.id,
            classroom_id=self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson.id,
        )
        assert notifications.count() == 1
        assert notifications[0].timestamp == masterylog2.completion_timestamp

    @patch("kolibri.core.notifications.api.save_notifications")
    def test_finish_lesson_resource_doesnt_save_notifications(self, save_notifications):
        self.summarylog1.progress = 0
        finish_lesson_resource(self.summarylog1, self.node_1.id, self.lesson.id)
        assert save_notifications.called is False

    @patch("kolibri.core.notifications.api.save_notifications")
    def test_finish_lesson_resource_save_completed_notifications(
        self, save_notifications
    ):
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
    def test_create_summarylog(self, save_notifications):
        create_summarylog(self.summarylog1)
        assert save_notifications.called is True
        notification = save_notifications.call_args[0][0][0]
        assert notification.notification_object == NotificationObjectType.Resource
        assert notification.notification_event == NotificationEventType.Started

    @patch("kolibri.core.notifications.api.save_notifications")
    def test_create_summarylog_doesnt_save_notifications_if_exercise(
        self, save_notifications
    ):
        # Dont save notifications if the summarylog is an exercise
        self.summarylog2.kind = content_kinds.EXERCISE
        self.summarylog2.save()
        create_summarylog(self.summarylog2)
        assert save_notifications.called is False

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_create_1st_resource_summarylog_create_lesson_started_notification(
        self, save_notifications, create_notification
    ):
        self.summarylog1.kind = content_kinds.DOCUMENT
        create_summarylog(self.summarylog1)

        assert save_notifications.called is True
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Started,
            self.user1.id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            contentnode_id=self.node_1.id,
            lesson_id=self.lesson.id,
            timestamp=self.summarylog1.start_timestamp,
        )
        create_notification.assert_any_call(
            NotificationObjectType.Lesson,
            NotificationEventType.Started,
            self.user1.id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson.id,
            timestamp=self.summarylog1.start_timestamp,
        )

    def test_create_2nd_resource_summarylog_doesnt_update_lesson_started_notification(
        self,
    ):
        self.summarylog1.start_timestamp = local_now()
        self.summarylog1.kind = content_kinds.DOCUMENT
        self.summarylog1.save()
        create_summarylog(self.summarylog1)

        self.summarylog2.start_timestamp = local_now() + timedelta(seconds=20)
        self.summarylog2.kind = content_kinds.DOCUMENT
        self.summarylog2.save()
        create_summarylog(self.summarylog2)

        # Only one lesson started notification should be created
        notifications = LearnerProgressNotification.objects.filter(
            notification_object=NotificationObjectType.Lesson,
            notification_event=NotificationEventType.Started,
            user_id=self.user1.id,
            classroom_id=self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson.id,
        )
        assert notifications.count() == 1
        # It should keep the timestamp of the first resource started
        assert notifications[0].timestamp == self.summarylog1.start_timestamp

    @patch("kolibri.core.notifications.api.save_notifications")
    def test_start_lesson_resource(self, save_notifications):
        start_lesson_resource(self.summarylog1, self.node_1.id, self.lesson.id)
        assert save_notifications.called is True

        # Check resource started
        notification = save_notifications.call_args[0][0][0]
        assert notification.notification_object == NotificationObjectType.Resource
        assert notification.notification_event == NotificationEventType.Started
        assert notification.timestamp == self.summarylog1.start_timestamp

        # As is the first started resource, it should create a lesson started notification
        notification = save_notifications.call_args[0][0][1]
        assert notification.notification_object == NotificationObjectType.Lesson
        assert notification.notification_event == NotificationEventType.Started
        assert notification.timestamp == self.summarylog1.start_timestamp

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
        # Make sure we test with greater than 2 attempts
        # as otherwise a regression is possible where
        # the unique values of correct are counted
        # rather than the unique attempt items.
        AttemptLog.objects.create(
            masterylog=masterylog_quiz,
            sessionlog=sessionlog_quiz,
            item="test",
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            user=self.user1,
            correct=0,
        )
        AttemptLog.objects.create(
            masterylog=masterylog_quiz,
            sessionlog=sessionlog_quiz,
            item="test1",
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            user=self.user1,
            correct=1,
        )
        AttemptLog.objects.create(
            masterylog=masterylog_quiz,
            sessionlog=sessionlog_quiz,
            item="test2",
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            user=self.user1,
            correct=1,
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
        assert notification.quiz_num_answered == 3
        assert notification.quiz_num_correct == 2

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
        attemptlog1 = self._create_mock_attemptlog()
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
        attemptlog1 = self._create_mock_attemptlog()
        parse_attemptslog(attemptlog1)
        # If no notification has already been created, then create it with
        # the first attempt
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
        attemptlog1 = self._create_mock_attemptlog()
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

        attemptlog2 = self._create_mock_attemptlog(
            sessionlog=attemptlog1.sessionlog, masterylog=attemptlog1.masterylog
        )
        start_lesson_assessment(attemptlog2, self.node_1.id, self.lesson_id)
        assert create_notification.called is False

    @patch("kolibri.core.notifications.api.create_notification")
    def test_parse_attemptslog_create_on_new_attempt_with_notification(
        self, create_notification
    ):
        attemptlog1 = self._create_mock_attemptlog()
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

        attemptlog2 = self._create_mock_attemptlog(
            sessionlog=attemptlog1.sessionlog, masterylog=attemptlog1.masterylog
        )
        parse_attemptslog(attemptlog2)
        notifications = create_notification.call_args_list
        assert not any(
            [call[1] == NotificationEventType.Help for call in notifications]
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_update_lesson_assessment_with_needs_help(
        self, save_notifications, create_notification
    ):
        # 1 wrong interaction til now
        attemptlog1 = self._create_mock_attemptlog()

        attemptlog2 = self._create_mock_attemptlog(
            sessionlog=attemptlog1.sessionlog, masterylog=attemptlog1.masterylog
        )
        attemptlog2.interaction_history = [
            {"type": "answer", "correct": 0}
            for _ in range(NEEDS_HELP_NOTIFICATION_THRESHOLD - 1)
        ]
        attemptlog2.save()

        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Started,
            user_id=attemptlog2.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog2.start_timestamp,
        )

        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Lesson,
            notification_event=NotificationEventType.Started,
            user_id=attemptlog2.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            timestamp=attemptlog2.start_timestamp,
        )
        update_lesson_assessment(attemptlog2, self.node_1.id, self.lesson_id)
        assert save_notifications.called
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Help,
            attemptlog2.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog2.end_timestamp,
        )
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Answered,
            attemptlog2.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog2.end_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_parse_attemptslog_update_attempt_with_needs_help(
        self, save_notifications, create_notification
    ):
        # 1 wrong interaction til now
        attemptlog1 = self._create_mock_attemptlog()

        attemptlog2 = self._create_mock_attemptlog(
            sessionlog=attemptlog1.sessionlog, masterylog=attemptlog1.masterylog
        )
        attemptlog2.interaction_history = [
            {"type": "answer", "correct": 0}
            for _ in range(NEEDS_HELP_NOTIFICATION_THRESHOLD - 1)
        ]
        attemptlog2.save()

        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Started,
            user_id=attemptlog2.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog2.start_timestamp,
        )

        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Lesson,
            notification_event=NotificationEventType.Started,
            user_id=attemptlog2.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            timestamp=attemptlog2.start_timestamp,
        )
        parse_attemptslog(attemptlog2)
        assert save_notifications.called
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Help,
            attemptlog2.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog2.end_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_update_lesson_assessment_with_needs_help_on_one_attempt(
        self, save_notifications, create_notification
    ):
        attemptlog = self._create_mock_attemptlog()
        interactions = [
            {"type": "answer", "correct": 0}
            for _ in range(NEEDS_HELP_NOTIFICATION_THRESHOLD)
        ]
        attemptlog.interaction_history = interactions
        attemptlog.save()

        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Started,
            user_id=attemptlog.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog.start_timestamp,
        )

        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Lesson,
            notification_event=NotificationEventType.Started,
            user_id=attemptlog.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            timestamp=attemptlog.start_timestamp,
        )
        update_lesson_assessment(attemptlog, self.node_1.id, self.lesson_id)
        assert save_notifications.called

        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Help,
            attemptlog.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog.end_timestamp,
        )
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Answered,
            attemptlog.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog.end_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_parse_attemptslog_update_attempt_with_needs_help_on_one_attempt(
        self, save_notifications, create_notification
    ):
        attemptlog = self._create_mock_attemptlog()
        interactions = [
            {"type": "answer", "correct": 0}
            for _ in range(NEEDS_HELP_NOTIFICATION_THRESHOLD)
        ]
        attemptlog.interaction_history = interactions
        attemptlog.save()

        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Started,
            user_id=attemptlog.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog.start_timestamp,
        )

        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Lesson,
            notification_event=NotificationEventType.Started,
            user_id=attemptlog.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            timestamp=attemptlog.start_timestamp,
        )
        parse_attemptslog(attemptlog)
        assert save_notifications.called

        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Help,
            attemptlog.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog.end_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_start_lesson_assessment_with_needs_help_no_started(
        self, save_notifications, create_notification
    ):
        attemptlog = self._create_mock_attemptlog()
        interactions = [
            {"type": "answer", "correct": 0}
            for _ in range(NEEDS_HELP_NOTIFICATION_THRESHOLD)
        ]
        attemptlog.interaction_history = interactions
        attemptlog.save()

        start_lesson_assessment(attemptlog, self.node_1.id, self.lesson_id)
        assert save_notifications.called
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Help,
            attemptlog.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog.end_timestamp,
        )

        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Started,
            attemptlog.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog.start_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_parse_attemptslog_update_attempt_with_needs_help_no_started(
        self, save_notifications, create_notification
    ):
        attemptlog = self._create_mock_attemptlog()
        interactions = [
            {"type": "answer", "correct": 0}
            for _ in range(NEEDS_HELP_NOTIFICATION_THRESHOLD)
        ]
        attemptlog.interaction_history = interactions
        attemptlog.save()

        parse_attemptslog(attemptlog)
        assert save_notifications.called
        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Help,
            attemptlog.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog.end_timestamp,
        )

        create_notification.assert_any_call(
            NotificationObjectType.Resource,
            NotificationEventType.Started,
            attemptlog.user_id,
            self.classroom.id,
            assignment_collections=[self.classroom.id],
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            timestamp=attemptlog.start_timestamp,
        )

    @patch("kolibri.core.notifications.api.create_notification")
    def test_parse_attemptlog_with_wrong_interactions_without_needs_help(
        self, create_notification
    ):
        attemptlog = self._create_mock_attemptlog()
        interactions = [
            {"type": "answer", "correct": 0}
            for _ in range(NEEDS_HELP_NOTIFICATION_THRESHOLD - 1)
        ]
        attemptlog.interaction_history = interactions
        attemptlog.save()

        parse_attemptslog(attemptlog)

        notifications = create_notification.call_args_list
        assert not any(
            [call[1] == NotificationEventType.Help for call in notifications]
        )

    def test_parse_attemptlog_updates_needs_help_notification_if_user_keeps_failing(
        self,
    ):
        attemptlog1 = self._create_mock_attemptlog()
        interactions = [
            {"type": "answer", "correct": 0}
            for _ in range(NEEDS_HELP_NOTIFICATION_THRESHOLD)
        ]
        attemptlog1.interaction_history = interactions
        attemptlog1.save()

        parse_attemptslog(attemptlog1)

        notification1 = LearnerProgressNotification.objects.get(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Help,
            user_id=attemptlog1.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
        )
        assert notification1.timestamp == attemptlog1.end_timestamp

        attemptlog2 = self._create_mock_attemptlog(
            sessionlog=attemptlog1.sessionlog, masterylog=attemptlog1.masterylog
        )
        interactions = [{"type": "answer", "correct": 0}]
        attemptlog2.interaction_history = interactions
        attemptlog2.end_timestamp = attemptlog1.end_timestamp + timedelta(seconds=10)
        attemptlog2.save()

        parse_attemptslog(attemptlog2)

        notification2 = LearnerProgressNotification.objects.get(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Help,
            user_id=attemptlog2.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
        )

        # Test that notification has updated with latest attemptlog
        assert notification1.id == notification2.id
        assert notification2.timestamp == attemptlog2.end_timestamp

    def test_parse_attemptlog_doesnt_update_needs_help_notification_if_user_didnt_fail_again(
        self,
    ):
        attemptlog1 = self._create_mock_attemptlog()
        interactions = [
            {"type": "answer", "correct": 0}
            for _ in range(NEEDS_HELP_NOTIFICATION_THRESHOLD)
        ]
        attemptlog1.interaction_history = interactions
        attemptlog1.save()

        parse_attemptslog(attemptlog1)

        attemptlog2 = self._create_mock_attemptlog(
            sessionlog=attemptlog1.sessionlog, masterylog=attemptlog1.masterylog
        )
        # This time the student gets it right, so the notification shouldnt be updated
        interactions = [{"type": "answer", "correct": 1}]
        attemptlog2.interaction_history = interactions
        attemptlog2.end_timestamp = attemptlog1.end_timestamp + timedelta(seconds=10)
        attemptlog2.save()

        parse_attemptslog(attemptlog2)

        notification = LearnerProgressNotification.objects.get(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Help,
            user_id=attemptlog2.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
        )

        # Keeps the timestamp of the first failed attempt
        assert notification.timestamp == attemptlog1.end_timestamp


class BulkNotificationsAPITestCase(APITestCase):
    databases = "__all__"

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
        ]
        cls.contentnode_ids = [
            "25f32edcec565396a1840c5413c92451",
            "25f32edcec565396a1840c5413c92452",
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
            kind=content_kinds.DOCUMENT,
        )
        cls.lesson = Lesson.objects.create(
            id=cls.lesson_id,
            title="My Lesson",
            is_active=True,
            created_by=cls.superuser,
            collection=cls.classroom,
            resources=[
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
            ],
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
            kind=content_kinds.DOCUMENT,
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
            completion_timestamp=local_now() + timedelta(seconds=1),
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

    def _create_mock_attemptlog(self, sessionlog=None, masterylog=None):
        if sessionlog is None:
            sessionlog = ContentSessionLogFactory(
                user=self.user1,
                content_id=uuid.uuid4().hex,
                channel_id=uuid.uuid4().hex,
            )

        now = local_now()
        if masterylog is None:
            masterylog = MasteryLog.objects.create(
                summarylog=self.summarylog1,
                user=self.user1,
                start_timestamp=now,
                mastery_level=1,
                complete=True,
            )

        return AttemptLog.objects.create(
            masterylog=masterylog,
            sessionlog=sessionlog,
            user=self.user1,
            start_timestamp=now,
            end_timestamp=now + timedelta(seconds=10),
            time_spent=1.0,
            complete=True,
            correct=1,
            hinted=False,
            error=False,
            interaction_history=[{"type": "answer", "correct": 0}],
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

    def test_batch_summarylog_lesson_started_notifications_timestamp(self):
        self.summarylog1.start_timestamp = local_now() - timedelta(days=1)
        self.summarylog1.kind = content_kinds.DOCUMENT
        self.summarylog1.save()
        self.summarylog2.start_timestamp = local_now() - timedelta(days=2)
        self.summarylog2.kind = content_kinds.DOCUMENT
        self.summarylog2.save()

        batch_process_summarylogs([self.summarylog1.id, self.summarylog2.id])

        notification = LearnerProgressNotification.objects.get(
            notification_object=NotificationObjectType.Lesson,
            notification_event=NotificationEventType.Started,
            user_id=self.attemptlog1.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
        )

        # It should keep the timestamp of the first resource started independent of
        # the order of the summarylogs
        assert notification.timestamp == self.summarylog2.start_timestamp

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_batch_summarylog_dont_save_excercise_notifications(
        self, save_notifications, create_notification
    ):
        self.summarylog1.kind = content_kinds.EXERCISE
        self.summarylog1.save()
        self.summarylog2.kind = content_kinds.EXERCISE
        self.summarylog2.save()

        batch_process_summarylogs([self.summarylog1.id, self.summarylog2.id])

        assert not save_notifications.called
        assert not create_notification.called

    def test_batch_summarylog_lesson_completed_notifications_timestamp(self):
        # ignore masterylog
        self.mlog.complete = False
        self.mlog.save()

        self.summarylog1.progress = 1.0
        self.summarylog1.completion_timestamp = local_now() + timedelta(seconds=3)
        self.summarylog1.end_timestamp = local_now() + timedelta(seconds=1)
        self.summarylog1.kind = content_kinds.DOCUMENT
        self.summarylog1.save()

        self.summarylog2.progress = 1.0
        self.summarylog2.completion_timestamp = local_now() + timedelta(seconds=5)
        self.summarylog2.end_timestamp = local_now() + timedelta(seconds=7)
        self.summarylog2.kind = content_kinds.DOCUMENT
        self.summarylog2.save()

        batch_process_summarylogs([self.summarylog1.id, self.summarylog2.id])

        notifications = LearnerProgressNotification.objects.filter(
            notification_object=NotificationObjectType.Lesson,
            notification_event=NotificationEventType.Completed,
            user_id=self.attemptlog1.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
        )

        # It should keep the timestamp of the last resource completion_timestamp independent of
        # the order of the summarylogs
        assert notifications.count() == 1
        assert notifications[0].timestamp == self.summarylog2.completion_timestamp

    def test_batch_summarylog_lesson_with_retries_completed_notifications_timestamp(
        self,
    ):
        # ignore masterylog
        self.mlog.complete = False
        self.mlog.save()

        self.summarylog1.progress = 1.0
        self.summarylog1.completion_timestamp = local_now() + timedelta(seconds=3)
        self.summarylog1.end_timestamp = local_now() + timedelta(seconds=1)
        self.summarylog1.kind = content_kinds.DOCUMENT
        self.summarylog1.save()

        # User retried it
        self.summarylog1.progress = 0
        self.summarylog1.save()

        self.summarylog2.completion_timestamp = local_now() + timedelta(seconds=5)
        self.summarylog2.end_timestamp = local_now() + timedelta(seconds=7)
        self.summarylog2.kind = content_kinds.DOCUMENT
        self.summarylog2.save()

        batch_process_summarylogs([self.summarylog1.id, self.summarylog2.id])

        notifications = LearnerProgressNotification.objects.filter(
            notification_object=NotificationObjectType.Lesson,
            notification_event=NotificationEventType.Completed,
            user_id=self.attemptlog1.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
        )

        # It should keep the timestamp of the last resource completion_timestamp independent of
        # the order of the summarylogs
        assert notifications.count() == 1
        assert notifications[0].timestamp == self.summarylog2.completion_timestamp

    def test_batch_summarylog_exercise_resource_completed_notifications_timestamp(self):
        # ignore previously created masterylog
        self.mlog.complete = False
        self.mlog.save()

        masterylog1 = MasteryLogFactory.create(
            id=uuid.uuid4().hex,
            summarylog=self.summarylog1,
            start_timestamp=self.summarylog1.start_timestamp,
            completion_timestamp=local_now() + timedelta(seconds=1),
            end_timestamp=local_now() + timedelta(seconds=1),
            user=self.user1,
            complete=True,
        )
        masterylog2 = MasteryLogFactory.create(
            id=uuid.uuid4().hex,
            summarylog=self.summarylog1,
            start_timestamp=self.summarylog1.start_timestamp,
            completion_timestamp=local_now() + timedelta(seconds=3),
            end_timestamp=local_now() + timedelta(seconds=3),
            user=self.user1,
            complete=True,
        )

        # Summarylog completion_timestamp is the latest masterylog completion timestamp
        self.summarylog1.completion_timestamp = masterylog2.completion_timestamp
        self.summarylog1.end_timestamp = local_now() + timedelta(seconds=10)
        self.summarylog1.kind = content_kinds.EXERCISE
        self.summarylog1.save()

        batch_process_summarylogs([self.summarylog1.id])

        notifications = LearnerProgressNotification.objects.filter(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Completed,
            user_id=self.attemptlog1.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
        )

        # The resource completion notification should be the first completion attempt
        # that means, the earliest masterylog completion timestamp
        assert notifications.count() == 1
        assert notifications[0].timestamp == masterylog1.completion_timestamp

    def test_batch_summarylog_exercise_lesson_completed_notifications_timestamp(self):
        # ignore previously created masterylog
        self.mlog.complete = False
        self.mlog.save()

        masterylog1 = MasteryLogFactory.create(
            id=uuid.uuid4().hex,
            summarylog=self.summarylog1,
            start_timestamp=self.summarylog1.start_timestamp,
            completion_timestamp=local_now() + timedelta(seconds=1),
            end_timestamp=local_now() + timedelta(seconds=1),
            user=self.user1,
            complete=True,
        )
        self.summarylog1.completion_timestamp = masterylog1.completion_timestamp
        self.summarylog1.end_timestamp = local_now() + timedelta(seconds=3)
        self.summarylog1.kind = content_kinds.EXERCISE
        self.summarylog1.save()

        masterylog2_1 = MasteryLogFactory.create(
            id=uuid.uuid4().hex,
            summarylog=self.summarylog2,
            start_timestamp=self.summarylog1.start_timestamp,
            completion_timestamp=local_now() + timedelta(seconds=4),
            end_timestamp=local_now() + timedelta(seconds=4),
            user=self.user1,
            complete=True,
        )
        masterylog2_2 = MasteryLogFactory.create(
            id=uuid.uuid4().hex,
            summarylog=self.summarylog2,
            start_timestamp=self.summarylog1.start_timestamp,
            completion_timestamp=local_now() + timedelta(seconds=10),
            end_timestamp=local_now() + timedelta(seconds=10),
            user=self.user1,
            complete=True,
        )
        # Summarylog completion_timestamp is the latest masterylog completion timestamp
        self.summarylog2.completion_timestamp = masterylog2_2.completion_timestamp
        self.summarylog2.end_timestamp = local_now() + timedelta(seconds=12)
        self.summarylog2.kind = content_kinds.EXERCISE
        self.summarylog2.save()

        batch_process_summarylogs([self.summarylog1.id, self.summarylog2.id])

        notifications = LearnerProgressNotification.objects.filter(
            notification_object=NotificationObjectType.Lesson,
            notification_event=NotificationEventType.Completed,
            user_id=self.attemptlog1.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
        )

        # It should keep the timestamp of the last resource completion_timestamp, which should be
        # the first completion_timestamp of the masterylog related to that summarylog, independent of
        # the order of the summarylogs
        assert notifications.count() == 1
        assert notifications[0].timestamp == masterylog2_1.completion_timestamp

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

    def test_batch_attemptlog_resource_started_notifications(self):
        self.attemptlog1.start_timestamp = local_now() + timedelta(minutes=10)
        self.attemptlog1.save()

        attemptlog2 = self._create_mock_attemptlog(
            sessionlog=self.attemptlog1.sessionlog,
            masterylog=self.attemptlog1.masterylog,
        )
        attemptlog2.start_timestamp = local_now()
        attemptlog2.save()

        batch_process_attemptlogs([self.attemptlog1.id, attemptlog2.id])

        notifications = LearnerProgressNotification.objects.filter(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Started,
            user_id=self.attemptlog1.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
        )

        # It should keep the timestamp of the earliest attempt independent of the order of the attemptlogs
        assert notifications.count() == 1
        assert notifications[0].timestamp == attemptlog2.start_timestamp

    @patch("kolibri.core.notifications.api.create_notification")
    @patch("kolibri.core.notifications.api.save_notifications")
    def test_batch_attemptlog_with_needs_help_notification(
        self, save_notifications, create_notification
    ):
        LearnerProgressNotification.objects.all().delete()
        self.attemptlog1.interaction_history = [{"type": "answer", "correct": 0}]
        self.attemptlog1.save()

        self.attemptlog2.interaction_history = []
        self.attemptlog2.save()

        interactions = [{"type": "answer", "correct": 0}] * (
            NEEDS_HELP_NOTIFICATION_THRESHOLD - 1
        )
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

    def test_batch_attemptlog_needs_help_with_correct_attempts(self):
        LearnerProgressNotification.objects.all().delete()
        interactions = [
            {"type": "answer", "correct": 0}
        ] * NEEDS_HELP_NOTIFICATION_THRESHOLD
        attemptlog3 = self._create_mock_attemptlog(
            sessionlog=self.attemptlog1.sessionlog,
            masterylog=self.attemptlog1.masterylog,
        )
        attemptlog3.interaction_history = interactions
        attemptlog3.end_timestamp = local_now() + timedelta(seconds=10)
        attemptlog3.save()

        interactions = [{"type": "answer", "correct": 1}]
        attemptlog4 = self._create_mock_attemptlog(
            sessionlog=attemptlog3.sessionlog, masterylog=attemptlog3.masterylog
        )
        attemptlog4.interaction_history = interactions
        attemptlog4.end_timestamp = local_now() + timedelta(seconds=20)
        attemptlog4.save()

        batch_process_attemptlogs(
            [self.attemptlog1.id, self.attemptlog2.id, attemptlog3.id]
        )

        # Even though there is an attempt 4, the notification should be created with the
        # timestamp of the last attempt with failed interactions
        notifications = LearnerProgressNotification.objects.filter(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Help,
            user_id=attemptlog3.user_id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson_id,
            contentnode_id=self.node_1.id,
            reason=HelpReason.Multiple,
        )
        assert notifications.count() == 1
        assert notifications[0].timestamp == attemptlog3.end_timestamp

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
