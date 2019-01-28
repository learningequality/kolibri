from django.db.models import Sum
from rest_framework import viewsets
from rest_framework import serializers
from rest_framework.response import Response

from kolibri.core.auth import models as auth_models
from kolibri.core.logger import models as logger_models
from kolibri.core.content.models import ContentNode
from kolibri.core.lessons.models import Lesson
from kolibri.core.exams.models import Exam


from django.db.models import Max


NOT_STARTED = "not_started"
STARTED = "started"
HELP_NEEDED = "help_needed"
COMPLETED = "completed"


class ContentStatusSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    learner_id = serializers.PrimaryKeyRelatedField(source="user", read_only=True)
    last_activity = serializers.CharField(source="end_timestamp")

    def get_status(self, content_summary_log):
        # if content_summary_log.help_needed:
        #     return HELP_NEEDED
        if content_summary_log.progress == 1:
            return COMPLETED
        elif content_summary_log.progress == 0:
            return NOT_STARTED
        return STARTED

    class Meta:
        model = logger_models.ContentSummaryLog
        fields = ("learner_id", "content_id", "status", "last_activity")


class ExamStatusSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    exam_id = serializers.PrimaryKeyRelatedField(source="exam", read_only=True)
    learner_id = serializers.PrimaryKeyRelatedField(source="user", read_only=True)
    last_activity = serializers.CharField()
    num_correct = serializers.SerializerMethodField()

    def get_status(self, exam_log):
        if exam_log.closed:
            return COMPLETED
        elif exam_log.attemptlogs.values_list("item").count() > 0:
            return STARTED
        return NOT_STARTED

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


class LessonNodeIdsField(serializers.Field):
    def to_representation(self, values):
        return [value["contentnode_id"] for value in values]


class LessonAssignmentsField(serializers.RelatedField):
    def to_representation(self, assignment):
        return assignment.collection.id


class LessonSerializer(serializers.ModelSerializer):
    active = serializers.BooleanField(source="is_active")
    node_ids = LessonNodeIdsField(default=[], source="resources")

    # classrooms are in here, and filtered out later
    groups = LessonAssignmentsField(
        many=True, read_only=True, source="lesson_assignments"
    )

    class Meta:
        model = Lesson
        fields = ("id", "title", "active", "node_ids", "groups")


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
        fields = ("id", "title", "active", "question_sources", "groups")


class ContentSerializer(serializers.ModelSerializer):
    node_id = serializers.CharField(source="id")

    class Meta:
        model = ContentNode
        fields = ("node_id", "content_id", "title", "kind")


def data(Serializer, queryset):
    return Serializer(queryset, many=True).data


class ClassSummaryViewSet(viewsets.ViewSet):
    def retrieve(self, request, pk):
        classroom = auth_models.Classroom.objects.filter(id=pk).get()
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

        query_content = ContentNode.objects.filter(id__in=all_node_ids)

        learner_ids = list(query_learners.values_list("id", flat=True))
        query_content_logs = logger_models.ContentSummaryLog.objects.filter(
            content_id__in=query_content.values_list("content_id"), user__in=learner_ids
        )

        output = {
            "id": pk,
            "name": classroom.name,
            "coaches": data(UserSerializer, classroom.get_coaches()),
            "learners": data(UserSerializer, query_learners),
            "groups": data(GroupSerializer, classroom.get_learner_groups()),
            "exams": exam_data,
            "exam_learner_status": data(ExamStatusSerializer, query_exam_logs),
            "content": data(ContentSerializer, query_content),
            "content_learner_status": data(ContentStatusSerializer, query_content_logs),
            "lessons": lesson_data,
        }

        return Response(output)
