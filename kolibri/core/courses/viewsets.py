from collections import OrderedDict

from django.db.models import Exists
from django.db.models import OuterRef
from django_filters.rest_framework import DjangoFilterBackend
from le_utils.constants import modalities
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import BooleanField
from rest_framework.serializers import CharField
from rest_framework.serializers import ListField
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import Serializer
from rest_framework.serializers import ValidationError
from rest_framework.status import HTTP_200_OK
from rest_framework.status import HTTP_404_NOT_FOUND

from .models import CourseSession
from .models import CourseSessionAssignment
from .models import TestStatus
from .models import TestType
from .models import UnitTestAssignment
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


class UnitTestValidationSerializer(Serializer):
    """
    Serializer to validate unit_contentnode_id and test_type parameters
    for activate_test and close_test actions
    """

    unit_contentnode_id = PrimaryKeyRelatedField(
        queryset=ContentNode.objects.filter(modality=modalities.UNIT), required=True
    )
    test_type = CharField(required=True)

    def validate_test_type(self, value):
        """
        Validate that test_type is either 'pre' or 'post'
        """
        if value not in [TestType.Pre, TestType.Post]:
            raise ValidationError(
                "test_type must be either 'pre' or 'post'",
                code=error_constants.INVALID,
            )
        return value

    def validate(self, attrs):
        """
        Validate that the unit belongs to the course
        """
        course_session = self.context.get("course_session")
        if not course_session:
            raise ValidationError(
                "Course session not found in context", code=error_constants.INVALID
            )

        if attrs["unit_contentnode_id"].parent_id != course_session.course:
            raise ValidationError(
                "Unit does not belong to this course",
                code=error_constants.INVALID,
            )
        return attrs


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
    def has_object_permission(self, request, view, obj):
        if view.action in ["activate_test", "close_test", "active_test"]:
            # Custom actions should be allowed for users who can update the course session
            return request.user.can_update(obj)
        return super().has_object_permission(request, view, obj)

    def validator(self, request, view, datum):
        # we skip validation for custom actions (activate_test, close_test)
        # Note:these actions have their own serializers and validation logic
        if view.action in ["activate_test", "close_test"]:
            return True

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

    def filter_queryset(self, queryset):
        if getattr(self, "action", None) == "active_test":
            # we can skip the permissions filter so unauthorized users get a 403 via object permissions instead of a 404
            backends = [
                backend
                for backend in self.filter_backends
                if backend is not KolibriAuthPermissionsFilter
            ]
            for backend in backends:
                queryset = backend().filter_queryset(self.request, queryset, self)
            return queryset
        return super().filter_queryset(queryset)

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

    @action(detail=True, methods=["post"])
    def activate_test(self, request, pk=None):
        """
        Activates a pre-test or post-test for a unit within the course session.
        """
        course_session = self.get_object()

        serializer = UnitTestValidationSerializer(
            data=request.data, context={"course_session": course_session}
        )
        serializer.is_valid(raise_exception=True)

        unit = serializer.validated_data["unit_contentnode_id"]
        unit_contentnode_id = unit.id
        test_type = serializer.validated_data["test_type"]

        # Get or create the UnitTestAssignment
        unit_test_assignment, created = UnitTestAssignment.objects.get_or_create(
            course_session=course_session,
            unit_contentnode_id=unit_contentnode_id,
            test_type=test_type,
            collection=course_session.collection,
        )

        # Set as active
        unit_test_assignment.is_active = True
        unit_test_assignment.status = TestStatus.Active
        unit_test_assignment.activated_by = request.user
        unit_test_assignment.save()

        return Response(
            {
                "id": unit_test_assignment.id,
                "unit_contentnode_id": str(unit_contentnode_id),
                "test_type": test_type,
                "status": unit_test_assignment.status,
            },
            status=HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def close_test(self, request, pk=None):
        """
        Closes the currently active test for the course session.
        Sets is_active=False and status='ended' for the active test.
        """
        course_session = self.get_object()

        # Validate request parameters (both are required)
        serializer = UnitTestValidationSerializer(
            data=request.data, context={"course_session": course_session}
        )
        serializer.is_valid(raise_exception=True)

        unit = serializer.validated_data["unit_contentnode_id"]
        unit_contentnode_id = unit.id
        test_type = serializer.validated_data["test_type"]

        # Find the currently active test
        try:
            active_test = UnitTestAssignment.objects.get(
                course_session=course_session, is_active=True
            )
        except UnitTestAssignment.DoesNotExist:
            return Response(
                {"error": "No active test exists for this course session"},
                status=HTTP_404_NOT_FOUND,
            )

        # Validate that the provided parameters match the active test
        if str(active_test.unit_contentnode_id) != str(unit_contentnode_id):
            raise ValidationError(
                "The provided unit_contentnode_id does not match the active test",
                code=error_constants.INVALID,
            )

        if active_test.test_type != test_type:
            raise ValidationError(
                "The provided test_type does not match the active test",
                code=error_constants.INVALID,
            )

        # Close the active test
        active_test.is_active = False
        active_test.status = TestStatus.Ended
        active_test.save()

        return Response(
            {
                "id": active_test.id,
                "unit_contentnode_id": str(active_test.unit_contentnode_id),
                "test_type": active_test.test_type,
                "status": active_test.status,
            },
            status=HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def active_test(self, request, pk=None):
        """
        We get the details about the currently active test for the course session.
        If no active test exists, returns { "active_test": null }.
        """
        course_session = self.get_object()

        # but first, find the currently active test
        try:
            active_test = UnitTestAssignment.objects.get(
                course_session=course_session, is_active=True
            )
        except UnitTestAssignment.DoesNotExist:
            return Response({"active_test": None}, status=HTTP_200_OK)

        #  then fetch the unit's ContentNode
        try:
            unit = ContentNode.objects.get(id=active_test.unit_contentnode_id)
            unit_title = unit.title
        except ContentNode.DoesNotExist:
            unit_title = None

        # then get the details about the user who activated the test
        activated_by_info = None
        if active_test.activated_by:
            activated_by_info = {
                "id": active_test.activated_by.id,
                "username": active_test.activated_by.username,
                "full_name": active_test.activated_by.full_name,
            }

        return Response(
            {
                "id": active_test.id,
                "unit_contentnode_id": str(active_test.unit_contentnode_id),
                "unit_title": unit_title,
                "test_type": active_test.test_type,
                "status": active_test.status,
                "activated_by": activated_by_info,
            },
            status=HTTP_200_OK,
        )
