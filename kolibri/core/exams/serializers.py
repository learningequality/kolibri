from collections import OrderedDict

from django.db.models import Sum
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from kolibri.auth.models import Collection
from kolibri.auth.models import FacilityUser
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.logger.models import ExamLog
from rest_framework.serializers import SerializerMethodField


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
    collection_kind = SerializerMethodField()

    class Meta:
        model = ExamAssignment
        fields = (
            'id', 'exam', 'collection', 'assigned_by', 'collection_kind',
        )
        read_only_fields = ('assigned_by', 'exam', 'collection_kind')

    def get_collection_kind(self, instance):
        return instance.collection.kind

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

    assignments = ExamAssignmentCreationSerializer(many=True)
    question_sources = serializers.JSONField(default='[]')
    creator = serializers.PrimaryKeyRelatedField(read_only=False, queryset=FacilityUser.objects.all())

    class Meta:
        model = Exam
        fields = (
            'id', 'title', 'channel_id', 'question_count', 'question_sources', 'seed',
            'active', 'collection', 'archive', 'assignments', 'creator',
        )

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

    def create(self, validated_data):
        assignees = validated_data.pop('assignments')
        new_exam = Exam.objects.create(**validated_data)
        # Create all of the new ExamAssignment
        for assignee in assignees:
            self._create_exam_assignment(
                exam=new_exam,
                collection=assignee['collection']
            )
        return new_exam

    def _create_exam_assignment(self, **params):
        return ExamAssignment.objects.create(
            assigned_by=self.context['request'].user,
            **params
        )

    def update(self, instance, validated_data):
        # Update the scalar fields
        instance.title = validated_data.get('title', instance.title)
        instance.active = validated_data.get('active', instance.active)

        # Add/delete any new/removed Assignments
        if 'assignments' in validated_data:
            assignees = validated_data.pop('assignments')
            current_assignments = (instance.assignments).all()
            current_group_ids = [x.collection.id for x in list(current_assignments)]
            new_group_ids = [x['collection'].id for x in list(assignees)]

            ids_to_add = set(new_group_ids) - set(current_group_ids)
            for id in ids_to_add:
                self._create_exam_assignment(
                    exam=instance,
                    collection=Collection.objects.get(id=id)
                )

            ids_to_delete = set(current_group_ids) - set(new_group_ids)
            ExamAssignment.objects.filter(
                exam_id=instance.id,
                collection_id__in=ids_to_delete
            ).delete()

        instance.save()
        return instance


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
