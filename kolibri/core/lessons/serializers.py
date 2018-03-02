from collections import OrderedDict
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import JSONField
from rest_framework.serializers import SerializerMethodField
from rest_framework.serializers import ValidationError
from kolibri.auth.serializers import ClassroomSerializer
from kolibri.auth.models import Collection
from kolibri.auth.models import FacilityUser
from kolibri.content.models import ContentNode
from .models import Lesson
from .models import LessonAssignment


class LessonAssignmentSerializer(ModelSerializer):
    """
    Returns a simplified serialization of the LessonAssignment model,
    containing only the assignee Collection, and omitting redundant info
    about the Lesson
    """
    collection_kind = SerializerMethodField()

    class Meta:
        model = LessonAssignment
        fields = ('id', 'collection', 'assigned_by', 'collection_kind',)
        read_only_fields = ('assigned_by', 'collection_kind',)

    def get_collection_kind(self, instance):
        return instance.collection.kind


class LessonSerializer(ModelSerializer):
    classroom = ClassroomSerializer(source='collection', read_only=True)
    created_by = PrimaryKeyRelatedField(read_only=False, queryset=FacilityUser.objects.all())
    lesson_assignments = LessonAssignmentSerializer(many=True)
    learner_ids = SerializerMethodField()
    resources = JSONField(default='[]')

    class Meta:
        model = Lesson
        fields = (
            'id',
            'title',
            'description',
            'resources',
            'is_active',
            'collection',  # classroom
            'classroom',  # details about classroom
            'lesson_assignments',
            'created_by',
            'learner_ids',
        )

    def get_learner_ids(self, data):
        return [user.id for user in data.get_all_learners()]

    def validate_resources(self, resources):
        # Validates that every ContentNode passed into resources is actually installed
        # on the server. NOTE that this could cause problems if content is deleted from
        # device.
        try:
            for resource in resources:
                ContentNode.objects.get(
                    content_id=resource['content_id'],
                    channel_id=resource['channel_id'],
                    id=resource['contentnode_id'],
                    available=True,
                )
            return resources
        except ContentNode.DoesNotExist:
            raise ValidationError('One or more of the selected resources is not available')

    def to_internal_value(self, data):
        data = OrderedDict(data)
        data['created_by'] = self.context['request'].user.id
        return super(LessonSerializer, self).to_internal_value(data)

    def create(self, validated_data):
        """
        POST a new Lesson with the following payload
        {
            "title": "Lesson Title",
            "description": "Lesson Description",
            "resources": [...], // Array of {contentnode_id, channel_id, content_id}
            "is_active": false,
            "collection": "df6308209356328f726a09aa9bd323b7", // classroom ID
            "lesson_assignments": [{"collection": "df6308209356328f726a09aa9bd323b7"}] // learnergroup IDs
        }
        """
        assignees = validated_data.pop('lesson_assignments')
        new_lesson = Lesson.objects.create(**validated_data)

        # Create all of the new LessonAssignments
        for assignee in assignees:
            self._create_lesson_assignment(
                lesson=new_lesson,
                collection=assignee['collection']
            )

        return new_lesson

    def update(self, instance, validated_data):
        # Update the scalar fields
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.resources = validated_data.get('resources', instance.resources)

        # Add/delete any new/removed Assignments
        if 'lesson_assignments' in validated_data:
            assignees = validated_data.pop('lesson_assignments')
            current_assignments = (instance.lesson_assignments).all()
            current_group_ids = [x.collection.id for x in list(current_assignments)]
            new_group_ids = [x['collection'].id for x in list(assignees)]

            ids_to_add = set(new_group_ids) - set(current_group_ids)
            for id in ids_to_add:
                self._create_lesson_assignment(
                    lesson=instance,
                    collection=Collection.objects.get(id=id)
                )

            ids_to_delete = set(current_group_ids) - set(new_group_ids)
            LessonAssignment.objects.filter(
                lesson_id=instance.id,
                collection_id__in=ids_to_delete
            ).delete()

        instance.save()
        return instance

    def _create_lesson_assignment(self, **params):
        return LessonAssignment.objects.create(
            assigned_by=self.context['request'].user,
            **params
        )
