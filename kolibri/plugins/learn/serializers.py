from django.db.models import Sum
from kolibri.auth.models import Classroom
from kolibri.core.exams.models import Exam
from kolibri.core.lessons.models import Lesson
from kolibri.logger.models import ContentSummaryLog
from kolibri.logger.models import ExamLog
from rest_framework.serializers import JSONField
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import SerializerMethodField


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
            }
        except ExamLog.DoesNotExist:
            return {
                'score': None,
                'answer_count': None,
                'closed': None,
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
        num_completed_logs = ContentSummaryLog.objects \
            .exclude(completion_timestamp__isnull=True) \
            .filter(
                user=self.context['user'],
                content_id__in=content_ids
            ) \
            .count()
        return {
            'resources_completed': num_completed_logs,
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
        memberships = current_user.memberships.all()
        learner_groups = [m.collection for m in memberships]

        # Return only active Lessons that are assigned to the requesting user's groups
        # TODO move this to a permission_class on Lesson
        filtered_lessons = Lesson.objects.filter(
            lesson_assignments__collection__in=learner_groups,
            collection=instance,
            is_active=True,
        )

        filtered_exams = Exam.objects.filter(
            assignments__collection__in=learner_groups,
            collection=instance,
            active=True,
        )

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
