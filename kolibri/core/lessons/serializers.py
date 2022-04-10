from collections import OrderedDict

from rest_framework.serializers import ListField
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import Serializer
from rest_framework.serializers import ValidationError

from .models import Lesson
from .models import LessonAssignment
from kolibri.core import error_constants
from kolibri.core.api import HexUUIDField
from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.auth.utils.users import create_adhoc_group_for_learners


class ResourceSerializer(Serializer):
    content_id = HexUUIDField()
    channel_id = HexUUIDField()
    contentnode_id = HexUUIDField()


class LessonSerializer(ModelSerializer):
    created_by = PrimaryKeyRelatedField(
        read_only=False, queryset=FacilityUser.objects.all()
    )
    lesson_assignments = ListField(
        child=PrimaryKeyRelatedField(
            read_only=False, queryset=Collection.objects.all()
        ),
        required=False,
    )
    resources = ListField(child=ResourceSerializer(), required=False)
    learner_ids = ListField(
        child=PrimaryKeyRelatedField(
            read_only=False, queryset=FacilityUser.objects.all()
        ),
        required=False,
    )

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
            "learner_ids",
            "created_by",
        )

    def validate(self, attrs):
        title = attrs.get("title")
        # first condition is for creating object, second is for updating
        collection = attrs.get("collection") or getattr(self.instance, "collection")

        if "learner_ids" in self.initial_data and self.initial_data["learner_ids"]:
            if (
                len(self.initial_data["learner_ids"])
                != FacilityUser.objects.filter(
                    memberships__collection=collection,
                    id__in=self.initial_data["learner_ids"],
                ).count()
            ):
                raise ValidationError(
                    "Some learner_ids are not members of the collection that this lesson is contained in",
                    code=error_constants.INVALID,
                )

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
            "learner_ids": ["df6308209356328f726a09aa9bd323b8"] // learner ids this lesson is directly assigned to
        }
        """
        collections = validated_data.pop("lesson_assignments", [])
        learners = validated_data.pop("learner_ids", [])
        new_lesson = Lesson.objects.create(**validated_data)

        # Create all of the new LessonAssignments
        for collection in collections:
            self._create_lesson_assignment(lesson=new_lesson, collection=collection)

        if learners:
            adhoc_group = create_adhoc_group_for_learners(
                new_lesson.collection, learners
            )
            self._create_lesson_assignment(lesson=new_lesson, collection=adhoc_group)

        return new_lesson

    def update(self, instance, validated_data):
        # Update the scalar fields
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.is_active = validated_data.get("is_active", instance.is_active)
        instance.resources = validated_data.get("resources", instance.resources)

        # Add/delete any new/removed Assignments
        if "lesson_assignments" in validated_data:
            collections = validated_data.pop("lesson_assignments")
            current_group_ids = set(
                instance.lesson_assignments.exclude(
                    collection__kind=ADHOCLEARNERSGROUP
                ).values_list("collection__id", flat=True)
            )
            new_group_ids = {x.id for x in collections}

            for cid in set(new_group_ids) - set(current_group_ids):
                collection = Collection.objects.get(id=cid)
                if collection.kind != ADHOCLEARNERSGROUP:
                    self._create_lesson_assignment(
                        lesson=instance, collection=collection
                    )

            LessonAssignment.objects.filter(
                lesson=instance,
                collection_id__in=(set(current_group_ids) - set(new_group_ids)),
            ).exclude(collection__kind=ADHOCLEARNERSGROUP).delete()

        # Update adhoc assignment
        if "learner_ids" in validated_data:
            self._update_learner_ids(instance, validated_data["learner_ids"])

        instance.save()
        return instance

    def _update_learner_ids(self, instance, learners):
        try:
            adhoc_group_assignment = LessonAssignment.objects.select_related(
                "collection"
            ).get(lesson_id=instance.id, collection__kind=ADHOCLEARNERSGROUP)
        except LessonAssignment.DoesNotExist:
            adhoc_group_assignment = None
        if not learners:
            # Setting learner_ids to empty, so only need to do something
            # if there is already an adhoc_group_assignment defined
            if adhoc_group_assignment is not None:
                # Adhoc group already exists delete it and the assignment
                # cascade deletion should also delete the adhoc_group_assignment
                adhoc_group_assignment.collection.delete()
        else:
            if adhoc_group_assignment is None:
                # There is no adhoc group right now, so just make a new one
                adhoc_group = create_adhoc_group_for_learners(
                    instance.collection, learners
                )
                self._create_lesson_assignment(lesson=instance, collection=adhoc_group)
            else:
                # There is an adhoc group, so we need to potentially update its membership
                original_learner_ids = Membership.objects.filter(
                    collection=adhoc_group_assignment.collection
                ).values_list("user_id", flat=True)
                original_learner_ids_set = set(original_learner_ids)
                learner_ids_set = {learner.id for learner in learners}
                if original_learner_ids_set != learner_ids_set:
                    # Only bother to do anything if these are different
                    new_learner_ids = learner_ids_set - original_learner_ids_set
                    deleted_learner_ids = original_learner_ids_set - learner_ids_set

                    if deleted_learner_ids:
                        Membership.objects.filter(
                            collection=adhoc_group_assignment.collection,
                            user_id__in=deleted_learner_ids,
                        ).delete()

                    for new_learner_id in new_learner_ids:
                        Membership.objects.create(
                            user_id=new_learner_id,
                            collection=adhoc_group_assignment.collection,
                        )

    def _create_lesson_assignment(self, **params):
        return LessonAssignment.objects.create(
            assigned_by=self.context["request"].user, **params
        )
