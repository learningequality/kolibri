from django.db.models import Sum
from kolibri.auth.models import Collection, FacilityUser
from kolibri.core.exams.models import Exam, ExamAssignment
from kolibri.logger.models import ExamLog
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

class NestedCollectionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Collection
        fields = (
            'id', 'name', 'kind',
        )

class NestedExamAssignmentSerializer(serializers.ModelSerializer):

    collection = NestedCollectionSerializer(read_only=True)

    class Meta:
        model = ExamAssignment
        fields = (
            'id', 'exam', 'collection',
        )

class ExamAssignmentSerializer(serializers.ModelSerializer):

    assigned_by = serializers.PrimaryKeyRelatedField(read_only=True)
    collection = NestedCollectionSerializer(read_only=False)

    class Meta:
        model = ExamAssignment
        fields = (
            'id', 'exam', 'collection', 'assigned_by',
        )
        read_only_fields = ('assigned_by',)

    def create(self, validated_data):
        validated_data['collection'] = Collection.objects.get(id=self.initial_data['collection'].get('id'))
        return ExamAssignment.objects.create(assigned_by=self.context['request'].user, **validated_data)

class ExamSerializer(serializers.ModelSerializer):

    assignments = ExamAssignmentSerializer(many=True, read_only=True)
    question_sources = serializers.JSONField(default='[]')

    class Meta:
        model = Exam
        fields = (
            'id', 'title', 'channel_id', 'question_count', 'question_sources', 'seed',
            'active', 'collection', 'archive', 'assignments',
        )
        read_only_fields = ('creator',)

        validators = [
            UniqueTogetherValidator(
                queryset=Exam.objects.all(),
                fields=('collection', 'title')
            )
        ]

    def create(self, validated_data):
        return Exam.objects.create(creator=self.context['request'].user, **validated_data)

class UserExamSerializer(serializers.ModelSerializer):

    question_sources = serializers.JSONField()

    class Meta:
        # Use the ExamAssignment as the primary model, as the permissions are more easily
        # defined as they are directly attached to a particular user's collection.
        model = ExamAssignment
        read_only_fields = (
            'id', 'title', 'channel_id', 'question_count', 'question_sources', 'seed',
            'active', 'score', 'archive', 'answer_count', 'closed',
        )

    def to_representation(self, obj):
        output = {}
        exam_fields = (
            'id', 'title', 'channel_id', 'question_count', 'question_sources', 'seed',
            'active', 'archive',
        )
        for field in exam_fields:
            output[field] = getattr(obj.exam, field)
        if isinstance(self.context['request'].user, FacilityUser):
            try:
                # Try to add the score from the user's ExamLog attempts.
                output['score'] = obj.exam.examlogs.get(user=self.context['request'].user).attemptlogs.aggregate(
                    Sum('correct')).get('correct__sum')
                output['answer_count'] = obj.exam.examlogs.get(user=self.context['request'].user).attemptlogs.count()
                output['closed'] = obj.exam.examlogs.get(user=self.context['request'].user).closed
            except ExamLog.DoesNotExist:
                output['score'] = None
                output['answer_count'] = None
                output['closed'] = False
        return output
