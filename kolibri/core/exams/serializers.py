from collections import OrderedDict

from django.db.models import Sum
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from kolibri.auth.models import Collection
from kolibri.auth.models import FacilityUser
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.logger.models import ExamLog


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


class ExamAssignmentCreationSerializer(serializers.ModelSerializer):
    assigned_by = serializers.PrimaryKeyRelatedField(read_only=False, queryset=FacilityUser.objects.all())
    collection = serializers.PrimaryKeyRelatedField(read_only=False, queryset=Collection.objects.all())

    class Meta:
        model = ExamAssignment
        fields = (
            'id', 'exam', 'collection', 'assigned_by',
        )
        read_only_fields = ('assigned_by',)

    def to_internal_value(self, data):
        # Make a new OrderedDict from the input, which could be an immutable QueryDict
        data = OrderedDict(data)
        data['assigned_by'] = self.context['request'].user.id
        return super(ExamAssignmentCreationSerializer, self).to_internal_value(data)


class ExamAssignmentRetrieveSerializer(serializers.ModelSerializer):

    assigned_by = serializers.PrimaryKeyRelatedField(read_only=True)
    collection = NestedCollectionSerializer(read_only=True)

    class Meta:
        model = ExamAssignment
        fields = (
            'id', 'exam', 'collection', 'assigned_by',
        )
        read_only_fields = ('assigned_by', 'collection', )


class ExamSerializer(serializers.ModelSerializer):

    assignments = ExamAssignmentRetrieveSerializer(many=True, read_only=True)
    question_sources = serializers.JSONField(default='[]')
    creator = serializers.PrimaryKeyRelatedField(read_only=False, queryset=FacilityUser.objects.all())

    class Meta:
        model = Exam
        fields = (
            'id', 'title', 'channel_id', 'question_count', 'question_sources', 'seed',
            'active', 'collection', 'archive', 'assignments', 'creator',
        )
        read_only_fields = ('assignments',)

        validators = [
            UniqueTogetherValidator(
                queryset=Exam.objects.all(),
                fields=('collection', 'title')
            )
        ]

    def to_internal_value(self, data):
        # Make a new OrderedDict from the input, which could be an immutable QueryDict
        data = OrderedDict(data)
        if 'creator' not in data:
            if self.context['view'].action == 'create':
                data['creator'] = self.context['request'].user.id
            else:
                # Otherwise we are just updating the exam, so allow a partial update
                self.partial = True
        return super(ExamSerializer, self).to_internal_value(data)


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
        fields = '__all__'

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
