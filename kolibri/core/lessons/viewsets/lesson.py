from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import BooleanField
from rest_framework.serializers import CharField
from rest_framework.serializers import JSONField
from rest_framework.serializers import ListField
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import Serializer
from rest_framework.serializers import ValidationError

from kolibri.core import error_constants
from kolibri.core.api import HexUUIDField
from kolibri.core.api import ValuesViewset
from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.auth.permissions import _ensure_raw_dict
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.permissions import KolibriAuthPermissionsFilter
from kolibri.core.auth.serializers import AssignableCollectionField
from kolibri.core.auth.serializers import consolidate_assignments
from kolibri.core.auth.utils.users import create_adhoc_group_for_learners
from kolibri.core.content.models import ContentNode
from kolibri.core.content.utils.annotation import total_file_size
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment


class ResourceSerializer(Serializer):
    content_id = HexUUIDField()
    channel_id = HexUUIDField()
    contentnode_id = HexUUIDField()


class ResourcesField(JSONField):
    def to_internal_value(self, data):
        # DRF's ListSerializer reports non-list input as a nested dict, which
        # Kolibri's 400 handler doesn't flatten.
        if not isinstance(data, list):
            raise ValidationError(
                ListField.default_error_messages["not_a_list"].format(
                    input_type=type(data).__name__
                ),
                code="not_a_list",
            )
        serializer = ResourceSerializer(many=True, data=data)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data


class ClassroomSerializer(ModelSerializer):
    # Use the FK attname column (a UUID) rather than "parent" to avoid traversing
    # the relation, which would auto-defer into a further Collection query.
    parent = CharField(source="parent_id", read_only=True)

    class Meta:
        model = Collection
        fields = ("id", "name", "parent")


class LessonSerializer(ModelSerializer):
    created_by = PrimaryKeyRelatedField(
        read_only=False, queryset=FacilityUser.objects.all()
    )
    resources = ResourcesField(required=False)
    active = BooleanField(source="is_active", required=False)
    assignments = ListField(child=AssignableCollectionField(), required=False)
    learner_ids = ListField(
        child=PrimaryKeyRelatedField(queryset=FacilityUser.objects.all()),
        required=False,
    )
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

    def validate(self, attrs):
        title = attrs.get("title")
        # first condition is for creating object, second is for updating
        collection = attrs.get("collection") or self.instance.collection

        learner_ids = attrs.get("learner_ids")
        if learner_ids and (
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

        lessons = Lesson.objects.filter(title__iexact=title, collection=collection)
        if not lessons.exists() or (
            self.instance is not None and lessons.filter(id=self.instance.id).exists()
        ):
            return attrs
        raise ValidationError(
            "The fields title, collection must make a unique set.",
            code=error_constants.UNIQUE,
        )

    def to_internal_value(self, data):
        data = dict(data)
        data["created_by"] = self.context["request"].user.id
        return super().to_internal_value(data)

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
            collections = validated_data.pop("assignments")
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

                    Membership.objects.bulk_create(
                        [
                            Membership(
                                user_id=new_learner_id,
                                collection=adhoc_group_assignment.collection,
                            )
                            for new_learner_id in new_learner_ids
                        ]
                    )

    def _create_lesson_assignment(self, **params):
        return LessonAssignment.objects.create(
            assigned_by=self.context["request"].user, **params
        )


class LessonPermissions(KolibriAuthPermissions):
    # Overrides the default validator to sanitize the Lesson POST Payload
    # before validation
    def validator(self, request, view, datum):
        model = view.get_serializer_class().Meta.model
        validated_data = view.get_serializer().to_internal_value(
            _ensure_raw_dict(datum)
        )
        # Cannot have create assignments without creating the Lesson first,
        # so this doesn't try to validate the Lesson with a non-empty assignments list
        validated_data.pop("assignments", [])
        validated_data.pop("learner_ids", [])
        return request.user.can_create(model, validated_data)


class LessonViewset(ValuesViewset):
    serializer_class = LessonSerializer
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filterset_fields = ("collection", "id")
    permission_classes = (LessonPermissions,)
    queryset = Lesson.objects.all().order_by("-date_created")
    deferred_fields = ("assignments", "learner_ids")

    def consolidate(self, items, queryset):
        if not items:
            return items
        consolidate_assignments(items, LessonAssignment, "lesson")
        for item in items:
            item["resources"] = item["resources"] or []
        return items

    @action(detail=False)
    def size(self, request, **kwargs):
        lessons = self.filter_queryset(self.get_queryset())
        lessons_set = []
        for lesson in lessons:
            resource_nodes = ContentNode.objects.filter(
                id__in=[r["contentnode_id"] for r in lesson.resources]
            )
            lessons_set.append({lesson.id: total_file_size(resource_nodes)})

        return Response(lessons_set)
