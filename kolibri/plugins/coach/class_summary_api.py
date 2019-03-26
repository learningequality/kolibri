from django.db.models import Count
from django.db.models import Max
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from le_utils.constants import content_kinds
from rest_framework import permissions
from rest_framework import serializers
from rest_framework import viewsets
from rest_framework.response import Response

from kolibri.core.auth import models as auth_models
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import Collection
from kolibri.core.content.models import ContentNode
from kolibri.core.exams.models import Exam
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger import models as logger_models
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.core.notifications.models import NotificationEventType


# Intended to match  NotificationEventType
NOT_STARTED = "NotStarted"
STARTED = "Started"
HELP_NEEDED = "HelpNeeded"
COMPLETED = "Completed"


def content_status_serializer(lesson_data, learners_data, classroom):

    # First generate a unique set of content node ids from all the lessons
    lesson_node_ids = set()
    for lesson in lesson_data:
        lesson_node_ids |= set(lesson.get("node_ids"))

    # Now create a map of content_id to node_id so that we can map between lessons, and notifications
    # which use the node id, and summary logs, which use content_id
    content_map = {n[0]: n[1] for n in ContentNode.objects.filter(id__in=lesson_node_ids).values_list("content_id", "id")}

    # Get all the values we need from the summary logs to be able to summarize current status on the
    # relevant content items.
    content_log_values = logger_models.ContentSummaryLog.objects.filter(
        content_id__in=set(content_map.keys()), user__in=[learner["id"] for learner in learners_data]) \
        .annotate(attempts=Count('masterylogs__attemptlogs')) \
        .values("user_id", "content_id", "end_timestamp", "time_spent", "progress", "kind", "attempts")

    # In order to make the lookup speedy, generate a unique key for each user/node that we find
    # listed in the needs help notifications that are relevant. We can then just check
    # existence of this key in the set in order to see whether this user has been flagged as needing
    # help.
    lookup_key = "{user_id}-{node_id}"
    needs_help = {
        lookup_key.format(user_id=n[0], node_id=n[1]): n[2] for n in LearnerProgressNotification.objects.filter(
            classroom_id=classroom.id,
            notification_event=NotificationEventType.Help,
            lesson_id__in=[lesson["id"] for lesson in lesson_data],
        ).values_list("user_id", "contentnode_id", "timestamp")
    }

    # In case a previously flagged learner has since completed an exercise, check all the completed
    # notifications also
    completed = {
        lookup_key.format(user_id=n[0], node_id=n[1]): n[2] for n in LearnerProgressNotification.objects.filter(
            classroom_id=classroom.id,
            notification_event=NotificationEventType.Completed,
            lesson_id__in=[lesson["id"] for lesson in lesson_data],
        ).values_list("user_id", "contentnode_id", "timestamp")
    }

    def get_status(log):
        """
        Read the dict from a content summary log values query and return the status
        In the case that we have found a needs help notification for the user and content node
        in question, return that they need help, otherwise return status based on their
        current progress.
        """
        content_id = log["content_id"]
        if content_id in content_map:
            # Don't try to lookup anything if we don't know the content_id
            # node_id mapping - might happen if a channel has since been deleted
            key = lookup_key.format(user_id=log["user_id"], node_id=content_map[content_id])
            if key in needs_help:
                # Now check if we have not already registered completion of the content node
                # or if we have and the timestamp is earlier than that on the needs_help event
                if key not in completed or completed[key] < needs_help[key]:
                    return HELP_NEEDED
        if log["progress"] == 1:
            return COMPLETED
        if log["kind"] == content_kinds.EXERCISE:
            # if there are no attempt logs for this exercise, status is NOT_STARTED
            if log["attempts"] == 0:
                return NOT_STARTED
        return STARTED

    def map_content_logs(log):
        """
        Parse the content logs to return objects in the expected format.
        """
        return {
            "learner_id": log["user_id"],
            "content_id": log["content_id"],
            "status": get_status(log),
            "last_activity": log["end_timestamp"],
            "time_spent": log["time_spent"],
        }

    return map(map_content_logs, content_log_values)


class ExamStatusSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    exam_id = serializers.PrimaryKeyRelatedField(source="exam", read_only=True)
    learner_id = serializers.PrimaryKeyRelatedField(source="user", read_only=True)
    last_activity = serializers.CharField()
    num_correct = serializers.SerializerMethodField()

    def get_status(self, exam_log):
        if exam_log.closed:
            return COMPLETED
        else:
            return STARTED

    def get_num_correct(self, exam_log):
        return (
            exam_log.attemptlogs.values_list('item')
            .order_by('completion_timestamp')
            .distinct()
            .aggregate(Sum('correct'))
            .get('correct__sum')
        )

    class Meta:
        model = logger_models.ExamLog
        fields = ("exam_id", "learner_id", "status", "last_activity", "num_correct")


class GroupSerializer(serializers.ModelSerializer):
    member_ids = serializers.SerializerMethodField()

    def get_member_ids(self, group):
        return group.get_members().values_list("id", flat=True)

    class Meta:
        model = auth_models.LearnerGroup
        fields = ("id", "name", "member_ids")


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="full_name")

    class Meta:
        model = auth_models.FacilityUser
        fields = ("id", "name", "username")


class LessonAssignmentsField(serializers.RelatedField):
    def to_representation(self, assignment):
        return assignment.collection.id


class LessonSerializer(serializers.ModelSerializer):
    active = serializers.BooleanField(source="is_active")
    node_ids = serializers.SerializerMethodField()

    # classrooms are in here, and filtered out later
    groups = LessonAssignmentsField(
        many=True, read_only=True, source="lesson_assignments"
    )

    class Meta:
        model = Lesson
        fields = ("id", "title", "active", "node_ids", "groups")

    def get_node_ids(self, obj):
        return [resource['contentnode_id'] for resource in obj.resources]


class ExamQuestionSourcesField(serializers.Field):
    def to_representation(self, values):
        return values


class ExamAssignmentsField(serializers.RelatedField):
    def to_representation(self, assignment):
        return assignment.collection.id


class ExamSerializer(serializers.ModelSerializer):

    question_sources = ExamQuestionSourcesField(default=[])

    # classes are in here, and filtered out later
    groups = ExamAssignmentsField(many=True, read_only=True, source="assignments")

    class Meta:
        model = Exam
        fields = ("id", "title", "active", "question_sources", "groups", "data_model_version", "question_count")


class ContentSerializer(serializers.ModelSerializer):
    node_id = serializers.CharField(source="id")

    class Meta:
        model = ContentNode
        fields = ("node_id", "content_id", "title", "kind")


def data(Serializer, queryset):
    return Serializer(queryset, many=True).data


class ClassSummaryPermissions(permissions.BasePermission):
    """
    Allow only users with admin/coach permissions on the classroom.
    """

    def has_permission(self, request, view):
        classroom_id = view.kwargs.get('pk')
        allowed_roles = [role_kinds.ADMIN, role_kinds.COACH]

        try:
            return request.user.has_role_for(allowed_roles, Collection.objects.get(pk=classroom_id))
        except (Collection.DoesNotExist, ValueError):
            return False


class ClassSummaryViewSet(viewsets.ViewSet):
    permission_classes = (permissions.IsAuthenticated, ClassSummaryPermissions,)

    def retrieve(self, request, pk):
        classroom = get_object_or_404(auth_models.Classroom, id=pk)
        query_learners = classroom.get_members()
        query_lesson = Lesson.objects.filter(collection=pk)
        query_exams = Exam.objects.filter(collection=pk)
        query_exam_logs = logger_models.ExamLog.objects.filter(
            exam__in=query_exams
        ).annotate(last_activity=Max("attemptlogs__end_timestamp"))

        lesson_data = data(LessonSerializer, query_lesson)
        exam_data = data(ExamSerializer, query_exams)

        # filter classes out of exam assignments
        for exam in exam_data:
            exam["groups"] = [g for g in exam["groups"] if g != pk]

        # filter classes out of lesson assignments
        for lesson in lesson_data:
            lesson["groups"] = [g for g in lesson["groups"] if g != pk]

        all_node_ids = set()
        for lesson in lesson_data:
            all_node_ids |= set(lesson.get("node_ids"))
        for exam in exam_data:
            exam_node_ids = [question['exercise_id'] for question in exam.get("question_sources")]
            all_node_ids |= set(exam_node_ids)

        # map node ids => content_ids so we can replace missing nodes, if another matching content_id node exists
        content_id_map = {resource['contentnode_id']: resource['content_id'] for lesson in query_lesson for resource in lesson.resources}
        query_content = ContentNode.objects.filter(id__in=all_node_ids)
        # final list of available nodes
        list_of_ids = [node.id for node in query_content]
        # determine a new list of node_ids for each lesson, removing/replacing missing content items
        for lesson in lesson_data:
            node_ids = []
            for node_id in lesson['node_ids']:
                # if resource exists, add to node_ids
                if node_id in list_of_ids:
                    node_ids.append(node_id)
                else:
                    # if resource does not exist, check if another resource with same content_id exists
                    nodes = ContentNode.objects.filter(content_id=content_id_map[node_id])
                    if nodes:
                        node_ids.append(nodes[0].id)
            # point to new list of node ids
            lesson['node_ids'] = node_ids

        learners_data = data(UserSerializer, query_learners)

        output = {
            "id": pk,
            "name": classroom.name,
            "coaches": data(UserSerializer, classroom.get_coaches()),
            "learners": learners_data,
            "groups": data(GroupSerializer, classroom.get_learner_groups()),
            "exams": exam_data,
            "exam_learner_status": data(ExamStatusSerializer, query_exam_logs),
            "content": data(ContentSerializer, query_content),
            "content_learner_status": content_status_serializer(lesson_data, learners_data, classroom),
            "lessons": lesson_data,
        }

        return Response(output)
