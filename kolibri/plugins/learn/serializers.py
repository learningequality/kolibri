from django.db.models import Q
from django.db.models import Sum
from django.db.models.query import F
from rest_framework.serializers import JSONField
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import SerializerMethodField

from kolibri.core.auth.filters import HierarchyRelationsFilter
from kolibri.core.auth.models import Classroom
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamLog


class ExamProgressSerializer(ModelSerializer):
    """
    Annotates an Exam with progress information based on logs generated
    by the requesting User
    """
    class Meta:
        model = Exam
        fields = (
            'active',
            'id',
            'progress',
            'question_count',
            'title',
        )

    progress = SerializerMethodField()

    # Mostly copied from UserExamSerializer.to_representation, but working directly
    # from Exam Model instead of ExamAssignment
    def get_progress(self, instance):
        try:
            examlogs = instance.examlogs.get(user=self.context['user'])
            return {
                'score': examlogs.attemptlogs.aggregate(Sum('correct')).get('correct__sum'),
                'answer_count': examlogs.attemptlogs.count(),
                'closed': examlogs.closed,
                'started': True,
            }
        except ExamLog.DoesNotExist:
            return {
                'score': None,
                'answer_count': None,
                'closed': None,
                'started': False,
            }


class LessonProgressSerializer(ModelSerializer):
    """
    Annotates a Lesson with progress information based on logs generated
    by the requesting User
    """
    progress = SerializerMethodField()
    resources = JSONField(default='[]')

    class Meta:
        model = Lesson
        fields = (
            'description',
            'id',
            'is_active',
            'title',
            'progress',
            'resources',
        )

    def get_progress(self, instance):
        content_ids = [resource['content_id'] for resource in instance.resources]
        resource_progress = ContentSummaryLog.objects \
            .filter(
                user=self.context['user'],
                content_id__in=content_ids
            ) \
            .aggregate(Sum('progress')).get('progress__sum')
        return {
            'resource_progress': resource_progress,
            'total_resources': len(instance.resources),
        }


class LearnerClassroomSerializer(ModelSerializer):
    assignments = SerializerMethodField()

    class Meta:
        model = Classroom
        fields = (
            'id',
            'name',
            'assignments',
        )

    def get_assignments(self, instance):
        """
        Returns all Exams and Lessons (and progress) assigned to the requesting User
        """
        current_user = self.context['request'].user

        # Return only active Lessons that are assigned to the requesting user's groups
        # TODO move this to a permission_class on Lesson
        lesson_assignments = HierarchyRelationsFilter(LessonAssignment.objects.all()) \
            .filter_by_hierarchy(
                target_user=current_user,
                ancestor_collection=F('collection')
        )
        filtered_lessons = Lesson.objects.filter(
            lesson_assignments__in=lesson_assignments,
            is_active=True,
            collection=instance,
        ).distinct()

        exam_assignments = HierarchyRelationsFilter(ExamAssignment.objects.all()) \
            .filter_by_hierarchy(
                target_user=current_user,
                ancestor_collection=F('collection')
        )

        filtered_exams = Exam.objects.filter(
            assignments__in=exam_assignments,
            collection=instance,
        ).filter(Q(active=True) | Q(examlogs__user=current_user)).distinct()

        return {
            'lessons': LessonProgressSerializer(
                filtered_lessons,
                many=True,
                context={'user': current_user},
            ).data,
            'exams': ExamProgressSerializer(
                filtered_exams,
                many=True,
                context={'user': current_user},
            ).data,
        }
