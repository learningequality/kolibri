from django.db.models import Count
from rest_framework import serializers

from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ContentNode
from kolibri.core.exams.models import Exam
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.core.notifications.models import NotificationEventType
from kolibri.core.notifications.models import NotificationObjectType
from kolibri.core.notifications.utils import memoize


class LessonReportSerializer(serializers.ModelSerializer):
    """
    Annotates a Lesson with a 'progress' array, which maps 1-to-1 with Lesson.resources.
    Each entry in the 'progress' array gives the total number of Learners who have
    been assigned the Lesson and have 'mastered' the Resource.
    """

    progress = serializers.SerializerMethodField()
    total_learners = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = ("id", "title", "progress", "total_learners")

    def get_progress(self, instance):
        learners = instance.get_all_learners()
        if learners.count() == 0:
            return []

        return [self._resource_progress(r, learners) for r in instance.resources]

    def get_total_learners(self, instance):
        return instance.get_all_learners().count()

    def _resource_progress(self, resource, learners):
        response = {
            "contentnode_id": resource["contentnode_id"],
            "num_learners_completed": 0,
        }
        completed_content_logs = (
            ContentSummaryLog.objects.filter(
                content_id=resource["content_id"], user__in=learners, progress=1.0
            )
            .values("content_id")
            .annotate(total=Count("pk"))
        )

        # If no logs for the Content Item,
        if completed_content_logs.count() == 0:
            return response
        else:
            response["num_learners_completed"] = completed_content_logs[0]["total"]
            return response


def get_lesson_title(lesson_id):
    try:
        lesson = Lesson.objects.get(pk=lesson_id)
        return lesson.title
    except Lesson.DoesNotExist:
        return ""


def get_quiz_title(quiz_id):
    try:
        quiz = Exam.objects.get(pk=quiz_id)
        return quiz.title
    except Exam.DoesNotExist:
        return ""


@memoize
def get_resource_title(resource_id):
    try:
        node = ContentNode.objects.get(pk=resource_id)
        return node.title
    except ContentNode.DoesNotExist:
        return ""


@memoize
def get_user_name(user_id):
    try:
        user = FacilityUser.objects.get(pk=user_id)
        return user.full_name
    except FacilityUser.DoesNotExist:
        return ""


@memoize
def get_resource_kind(resource_id):
    try:
        node = ContentNode.objects.get(pk=resource_id)
        return node.kind
    except ContentNode.DoesNotExist:
        return ""


class LearnerNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearnerProgressNotification
        fields = ("id", "timestamp", "user_id", "classroom_id", "lesson_id")

    def to_representation(self, instance):
        value = super(LearnerNotificationSerializer, self).to_representation(instance)

        if instance.notification_event == NotificationEventType.Help:
            value["reason"] = instance.reason

        if instance.notification_object == NotificationObjectType.Quiz:
            value["quiz_id"] = instance.quiz_id
            value["quiz_num_correct"] = instance.quiz_num_correct
            value["quiz_num_answered"] = instance.quiz_num_answered
            value["quiz"] = get_quiz_title(instance.quiz_id)

        if instance.notification_object == NotificationObjectType.Lesson:
            value["lesson"] = get_lesson_title(instance.lesson_id)

        if instance.notification_object == NotificationObjectType.Resource:
            value["contentnode_id"] = instance.contentnode_id
            value["contentnode_kind"] = get_resource_kind(instance.contentnode_id)
            value["resource"] = get_resource_title(instance.contentnode_id)
            value["lesson"] = get_lesson_title(instance.lesson_id)

        value["object"] = instance.notification_object
        value["event"] = instance.notification_event
        value["type"] = "{object}{event}".format(
            object=instance.notification_object, event=instance.notification_event
        )
        value["user"] = get_user_name(instance.user_id)
        return value
