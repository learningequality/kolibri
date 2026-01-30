from collections import OrderedDict

from django.db.models import Exists
from django.db.models import OuterRef
from django_filters.rest_framework import DjangoFilterBackend
from le_utils.constants import modalities
from rest_framework.serializers import BooleanField
from rest_framework.serializers import ListField
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import ValidationError

from .models import CourseSession
from .models import CourseSessionAssignment
from kolibri.core import error_constants
from kolibri.core.api import ValuesViewset
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.auth.utils.users import create_adhoc_group_for_learners
from kolibri.core.content.models import ContentNode
from kolibri.core.query import annotate_array_aggregate


class CourseSessionSerializer(ModelSerializer):
    course = PrimaryKeyRelatedField(
        queryset=ContentNode.objects.filter(modality=modalities.COURSE),
        required=True,
    )
    assignments = ListField(
        child=PrimaryKeyRelatedField(
            read_only=False,
            queryset=Collection.objects.exclude(kind=ADHOCLEARNERSGROUP),
        ),
        required=False,
    )
    learner_ids = ListField(
        child=PrimaryKeyRelatedField(
            read_only=False, queryset=FacilityUser.objects.all()
        ),
        required=False,
    )
    active = BooleanField(source="is_active", required=False)

    class Meta:
        model = CourseSession
        fields = (
            "id",
            "active",
            "course",
            "collection",  # classroom
            "created_by",
            "assignments",
            "learner_ids",
        )

    def validate(self, attrs):
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
                    "Some learner_ids are not members of the collection that this course session is contained in",
                    code=error_constants.INVALID,
                )

        return attrs

    def to_internal_value(self, data):
        data = OrderedDict(data)
        data["created_by"] = self.context["request"].user.id
        instance = super().to_internal_value(data)

        # Transform course ContentNode object to its title and description
        course = instance.get("course")
        if course:
            instance["title"] = course.title
            instance["description"] = course.description
            instance["course"] = course.id
        return instance

    def create(self, validated_data):
        """
        POST a new CourseSession with the following payload
        {
            "active": false,
            "collection": "df6308209356328f726a09aa9bd323b7", // classroom ID
            "course": "df6308209356328f726a09aa9bd323b8", // course ID
            "assignments": [{"collection": "df6308209356328f726a09aa9bd323b9"}] // learnergroup IDs
            "learner_ids": ["df6308209356328f726a09aa9bd323ba"] // learner ids this course session is directly assigned to
        }
        """
        collections = validated_data.pop("assignments", [])
        learner_ids = validated_data.pop("learner_ids", [])

        new_course_session = CourseSession.objects.create(**validated_data)

        # Create all of the new CourseSessionAssignments
        for collection in collections:
            self._create_course_session_assignment(
                course_session=new_course_session, collection=collection
            )
        if learner_ids:
            adhoc_group = create_adhoc_group_for_learners(
                new_course_session.collection, learner_ids
            )
            self._create_course_session_assignment(
                course_session=new_course_session, collection=adhoc_group
            )

        return new_course_session

    def update(self, instance, validated_data):
        # Update the scalar fields
        instance.is_active = validated_data.get("is_active", instance.is_active)
        instance.course = validated_data.get("course", instance.course)
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)

        # Add/delete any new/removed Assignments
        if "assignments" in validated_data:
            collections = validated_data.pop("assignments")
            self._update_collection_assignments(instance, collections)

        # Update adhoc assignment
        if "learner_ids" in validated_data:
            learners = validated_data.pop("learner_ids")
            self._update_learner_ids(instance, learners)

        instance.save()
        return instance

    def _update_collection_assignments(self, instance, collections):
        # Add current instance adhoc assignments to collections to avoid deleting them
        try:
            adhoc_group_assignment = Collection.objects.get(
                assigned_courses__course_session=instance.id,
                kind=ADHOCLEARNERSGROUP,
            )
            collections.append(adhoc_group_assignment)
        except Collection.DoesNotExist:
            pass

        new_assignments = []
        for collection in collections:
            assignment, created = CourseSessionAssignment.objects.get_or_create(
                course_session=instance,
                collection=collection,
                defaults={"assigned_by": self.context["request"].user},
            )
            new_assignments.append(assignment)
        # Delete any assignments that are not in new_assignments
        instance.assignments.exclude(id__in=[a.id for a in new_assignments]).delete()

    def _update_learner_ids(self, instance, learners):
        try:
            adhoc_collection = Collection.objects.get(
                assigned_courses__course_session=instance.id,
                kind=ADHOCLEARNERSGROUP,
            )
            if not learners:
                # If no learners were passed, we consider that the adhoc group should be deleted
                adhoc_collection.delete()
            else:
                new_memberships = []
                # Ensure all new memberships exist
                for learner in learners:
                    membership, created = Membership.objects.get_or_create(
                        collection=adhoc_collection,
                        user=learner,
                    )
                    new_memberships.append(membership)

                # Delete any memberships that are not in new_memberships
                adhoc_collection.membership_set.exclude(
                    id__in=[m.id for m in new_memberships]
                ).delete()

        except Collection.DoesNotExist:
            if learners:
                adhoc_group = create_adhoc_group_for_learners(
                    instance.collection, learners
                )
                self._create_course_session_assignment(
                    course_session=instance, collection=adhoc_group
                )

    def _create_course_session_assignment(self, **params):
        return CourseSessionAssignment.objects.create(
            assigned_by=self.context["request"].user, **params
        )


def _ensure_raw_dict(d):
    if hasattr(d, "dict"):
        d = d.dict()
    return dict(d)


class CourseSessionPermissions(KolibriAuthPermissions):
    # Overrides the default validator to sanitize the CourseSession POST Payload
    # before user.can_create validation. This is needed because can_create
    # instantiates the model with the validated_data, so we need to ensure
    # that the payload is in the correct format.
    # We do this here because if we do it in the serializer,
    # we would lose the assigments and learner_ids fields
    def validator(self, request, view, datum):
        model = view.get_serializer_class().Meta.model
        validated_data = view.get_serializer().to_internal_value(
            _ensure_raw_dict(datum)
        )
        validated_data.pop("assignments", [])
        validated_data.pop("learner_ids", [])
        return request.user.can_create(model, validated_data)


def _map_course_session_classroom(item):
    return {
        "id": item.pop("collection__id"),
        "name": item.pop("collection__name"),
        "parent": item.pop("collection__parent_id"),
    }


class CourseSessionViewset(ValuesViewset):
    serializer_class = CourseSessionSerializer
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filterset_fields = ("collection", "id")
    permission_classes = (CourseSessionPermissions,)
    queryset = CourseSession.objects.all().order_by("-date_created")

    values = (
        "id",
        "title",
        "description",
        "course",
        "is_active",
        "collection",  # classroom
        "collection__id",
        "collection__name",
        "collection__parent_id",
        "created_by",
        "date_created",
        "course_session_assignment_collections",
        "missing_resource",
    )

    field_map = {
        "active": "is_active",
        "classroom": _map_course_session_classroom,
        "assignments": "course_session_assignment_collections",
    }

    def consolidate(self, items, queryset):
        if items:
            course_session_ids = [l["id"] for l in items]
            adhoc_assignments = CourseSessionAssignment.objects.filter(
                course_session_id__in=course_session_ids,
                collection__kind=ADHOCLEARNERSGROUP,
            )
            adhoc_assignments = annotate_array_aggregate(
                adhoc_assignments,
                filter=FacilityUser.get_is_active_q("collection__membership"),
                learner_ids="collection__membership__user_id",
            )
            adhoc_assignments = {
                a["course_session"]: a
                for a in adhoc_assignments.values(
                    "collection", "course_session", "learner_ids"
                )
            }
            for item in items:
                if item["id"] in adhoc_assignments:
                    adhoc_assignment = adhoc_assignments[item["id"]]
                    item["learner_ids"] = adhoc_assignments[item["id"]]["learner_ids"]
                    item["assignments"] = [
                        i
                        for i in item["assignments"]
                        if i != adhoc_assignment["collection"]
                    ]
                else:
                    item["learner_ids"] = []

        return items

    def annotate_queryset(self, queryset):
        queryset = annotate_array_aggregate(
            queryset, course_session_assignment_collections="assignments__collection"
        )

        return queryset.annotate(
            missing_resource=~Exists(
                ContentNode.objects.filter(
                    id=OuterRef("course"),
                    available=True,
                )
            )
        )
