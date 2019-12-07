from collections import OrderedDict

from rest_framework.serializers import JSONField
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import ValidationError

from .models import Lesson
from .models import LessonAssignment
from kolibri.core import error_constants
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ContentNode


class LessonAssignmentSerializer(ModelSerializer):
    """
    Returns a simplified serialization of the LessonAssignment model,
    containing only the assignee Collection, and omitting redundant info
    about the Lesson
    """

    class Meta:
        model = LessonAssignment
        fields = ("id", "collection")
        read_only_fields = ("id",)


class LessonSerializer(ModelSerializer):
    created_by = PrimaryKeyRelatedField(
        read_only=False, queryset=FacilityUser.objects.all()
    )
    lesson_assignments = LessonAssignmentSerializer(many=True)
    resources = JSONField(default="[]")

    class Meta:
        model = Lesson
        fields = (
            "id",
            "title",
            "description",
            "resources",
            "is_active",
            "collection",  # classroom
            "lesson_assignments",
            "created_by",
        )

    def validate(self, attrs):
        title = attrs.get("title")
        # first condition is for creating object, second is for updating
        collection = attrs.get("collection") or getattr(self.instance, "collection")
        # if no lessons exist matching this, return data
        lessons = Lesson.objects.filter(title__iexact=title, collection=collection)
        if not lessons.exists():
            return attrs
        # if we are updating object, and this `instance` is a current model
        # and this lesson already has this title, return the data
        if self.instance is not None and lessons.filter(id=self.instance.id).exists():
            return attrs
        else:
            raise ValidationError(
                "The fields title, collection must make a unique set.",
                code=error_constants.UNIQUE,
            )

    def validate_resources(self, resources):
        # Validates that every ContentNode passed into resources is actually installed
        # on the server. NOTE that this could cause problems if content is deleted from
        # device.
        if resources == "[]":
            # If no value is passed to resources, 'resources' will default to '[]'
            # Set to empty list so we can iterate properly
            resources = []
        try:
            for resource in resources:
                ContentNode.objects.get(
                    content_id=resource["content_id"],
                    channel_id=resource["channel_id"],
                    id=resource["contentnode_id"],
                    available=True,
                )
            return resources
        except ContentNode.DoesNotExist:
            raise ValidationError(
                "One or more of the selected resources is not available"
            )

    def to_internal_value(self, data):
        data = OrderedDict(data)
        data["created_by"] = self.context["request"].user.id
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
        assignees = validated_data.pop("lesson_assignments")
        new_lesson = Lesson.objects.create(**validated_data)

        # Create all of the new LessonAssignments
        for assignee in assignees:
            self._create_lesson_assignment(
                lesson=new_lesson, collection=assignee["collection"]
            )

        return new_lesson

    def update(self, instance, validated_data):
        # Update the scalar fields
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.is_active = validated_data.get("is_active", instance.is_active)
        instance.resources = validated_data.get("resources", instance.resources)

        # Add/delete any new/removed Assignments
        if "lesson_assignments" in validated_data:
            assignees = validated_data.pop("lesson_assignments")
            current_group_ids = set(
                instance.lesson_assignments.values_list("collection__id", flat=True)
            )
            new_group_ids = set(x["collection"].id for x in assignees)

            for id in set(new_group_ids) - set(current_group_ids):
                self._create_lesson_assignment(
                    lesson=instance, collection=Collection.objects.get(id=id)
                )

            LessonAssignment.objects.filter(
                lesson_id=instance.id,
                collection_id__in=(set(current_group_ids) - set(new_group_ids)),
            ).delete()

        instance.save()
        return instance

    def _create_lesson_assignment(self, **params):
        return LessonAssignment.objects.create(
            assigned_by=self.context["request"].user, **params
        )
