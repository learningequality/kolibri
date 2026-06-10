from rest_framework.serializers import BooleanField
from rest_framework.serializers import CharField
from rest_framework.serializers import ListField
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import Serializer
from rest_framework.serializers import ValidationError

from .models import Lesson
from .models import LessonAssignment
from kolibri.core import error_constants
from kolibri.core.api import HexUUIDField
from kolibri.core.api import ValuesMethodField
from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.auth.utils.users import create_adhoc_group_for_learners


class ResourceSerializer(Serializer):
    content_id = HexUUIDField()
    channel_id = HexUUIDField()
    contentnode_id = HexUUIDField()


class ClassroomSerializer(ModelSerializer):
    parent = CharField(source="parent_id", read_only=True)

    class Meta:
        model = Collection
        fields = ("id", "name", "parent")


class LessonSerializer(ModelSerializer):
    created_by = PrimaryKeyRelatedField(
        read_only=False, queryset=FacilityUser.objects.all()
    )
    resources = ListField(child=ResourceSerializer(), required=False)
    active = BooleanField(source="is_active", required=False)
    # Read path: list of assignment collection IDs from the lesson_assignment_collections
    # annotation added by LessonViewset.annotate_queryset().
    assignments = ValuesMethodField(sources=("lesson_assignment_collections",))
    # Read path: default [] overwritten by consolidate() with adhoc-group member IDs.
    # Write path: popped in to_internal_value and validated with a temporary field.
    learner_ids = ValuesMethodField(sources=())
    # source="collection" prefixes child values with "collection__" in the values() query,
    # so ClassroomSerializer's parent_id becomes "collection__parent_id".
    classroom = ClassroomSerializer(source="collection", read_only=True)

    class Meta:
        model = Lesson
        fields = (
            "id",
            "title",
            "description",
            "resources",
            "active",
            "collection",
            "classroom",
            "assignments",
            "learner_ids",
            "created_by",
            "date_created",
        )

    def get_assignments(self, obj):
        # obj is a _SourcesProxy over the values() row;
        # obj.lesson_assignment_collections returns the annotation value.
        return obj.lesson_assignment_collections or []

    def get_learner_ids(self, obj):
        # consolidate() overwrites this default with actual adhoc-group member IDs.
        return []

    def validate(self, attrs):
        title = attrs.get("title")
        # first condition is for creating object, second is for updating
        collection = attrs.get("collection") or getattr(self.instance, "collection")

        learner_ids = attrs.get("learner_ids")
        if learner_ids:
            if (
                len(learner_ids)
                != FacilityUser.objects.filter(
                    memberships__collection=collection,
                    id__in=[u.id for u in learner_ids],
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
        raise ValidationError(
            "The fields title, collection must make a unique set.",
            code=error_constants.UNIQUE,
        )

    def _validate_pk_list(self, field_name, queryset, raw_value):
        field = ListField(child=PrimaryKeyRelatedField(queryset=queryset))
        field.bind(field_name, self)
        try:
            return field.run_validation(raw_value)
        except ValidationError as exc:
            raise ValidationError({field_name: exc.detail})

    def to_internal_value(self, data):
        data = dict(data)
        data["created_by"] = self.context["request"].user.id
        # 'assignments' and 'learner_ids' are ValuesMethodFields (read-only), so
        # DRF's to_internal_value skips them. Extract and validate manually here.
        raw_assignments = data.pop("assignments", None)
        raw_learner_ids = data.pop("learner_ids", None)
        result = super().to_internal_value(data)
        if raw_assignments is not None:
            result["assignments"] = self._validate_pk_list(
                "assignments", Collection.objects.all(), raw_assignments
            )
        if raw_learner_ids is not None:
            result["learner_ids"] = self._validate_pk_list(
                "learner_ids", FacilityUser.objects.all(), raw_learner_ids
            )
        return result

    def create(self, validated_data):
        """
        POST a new Lesson with the following payload
        {
            "title": "Lesson Title",
            "description": "Lesson Description",
            "resources": [...], // Array of {contentnode_id, channel_id, content_id}
            "active": false,
            "collection": "df6308209356328f726a09aa9bd323b7", // classroom ID
            "assignments": [{"collection": "df6308209356328f726a09aa9bd323b7"}] // learnergroup IDs
            "learner_ids": ["df6308209356328f726a09aa9bd323b8"] // learner ids this lesson is directly assigned to
        }
        """
        collections = validated_data.pop("assignments", [])
        learners = validated_data.pop("learner_ids", [])
        new_lesson = Lesson.objects.create(**validated_data)

        for collection in collections:
            self._create_lesson_assignment(lesson=new_lesson, collection=collection)

        if learners:
            adhoc_group = create_adhoc_group_for_learners(
                new_lesson.collection, learners
            )
            self._create_lesson_assignment(lesson=new_lesson, collection=adhoc_group)

        return new_lesson

    def update(self, instance, validated_data):
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.is_active = validated_data.get("is_active", instance.is_active)
        instance.resources = validated_data.get("resources", instance.resources)

        if "assignments" in validated_data:
            collections = [
                c
                for c in validated_data.pop("assignments")
                if c.kind != ADHOCLEARNERSGROUP
            ]
            current_group_ids = set(
                instance.lesson_assignments.exclude(
                    collection__kind=ADHOCLEARNERSGROUP
                ).values_list("collection__id", flat=True)
            )
            new_group_ids = {c.id for c in collections}

            for collection in collections:
                if collection.id not in current_group_ids:
                    self._create_lesson_assignment(
                        lesson=instance, collection=collection
                    )

            LessonAssignment.objects.filter(
                lesson=instance,
                collection_id__in=(current_group_ids - new_group_ids),
            ).exclude(collection__kind=ADHOCLEARNERSGROUP).delete()

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
            if adhoc_group_assignment is not None:
                adhoc_group_assignment.collection.delete()
        else:
            if adhoc_group_assignment is None:
                adhoc_group = create_adhoc_group_for_learners(
                    instance.collection, learners
                )
                self._create_lesson_assignment(lesson=instance, collection=adhoc_group)
            else:
                original_learner_ids_set = set(
                    Membership.objects.filter(
                        collection=adhoc_group_assignment.collection
                    ).values_list("user_id", flat=True)
                )
                learner_ids_set = {learner.id for learner in learners}
                if original_learner_ids_set != learner_ids_set:
                    new_learner_ids = learner_ids_set - original_learner_ids_set
                    deleted_learner_ids = original_learner_ids_set - learner_ids_set

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
