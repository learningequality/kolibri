import itertools
import logging
import types
from collections import OrderedDict

from django.db import transaction
from django.db.models import Case
from django.db.models import Exists
from django.db.models import IntegerField
from django.db.models import OuterRef
from django.db.models import Subquery
from django.db.models import Value
from django.db.models import When
from django_filters.rest_framework import DjangoFilterBackend
from le_utils.constants import modalities
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import BooleanField
from rest_framework.serializers import CharField
from rest_framework.serializers import ChoiceField
from rest_framework.serializers import IntegerField as SerializerIntegerField
from rest_framework.serializers import ListField
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import Serializer
from rest_framework.serializers import UUIDField
from rest_framework.serializers import ValidationError
from rest_framework.status import HTTP_200_OK
from rest_framework.status import HTTP_404_NOT_FOUND

from kolibri.core import error_constants
from kolibri.core.api import ValuesMethodField
from kolibri.core.api import ValuesViewset
from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.permissions import KolibriAuthPermissionsFilter
from kolibri.core.auth.utils.users import create_adhoc_group_for_learners
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.utils.pre_post_test import get_synthetic_content_id
from kolibri.core.query import annotate_array_aggregate

from ..models import CourseSession
from ..models import CourseSessionAssignment
from ..models import TestType
from ..models import UnitPhase
from ..models import UnitTestAssignment

logger = logging.getLogger(__name__)


class UnitTestValidationSerializer(Serializer):
    """
    Serializer to validate unit_contentnode_id and test_type parameters
    for activate_test and close_test actions
    """

    unit_contentnode_id = PrimaryKeyRelatedField(
        queryset=ContentNode.objects.filter(modality=modalities.UNIT), required=True
    )
    test_type = ChoiceField(choices=[TestType.Pre, TestType.Post], required=True)

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


class TestLearnerProgressSerializer(Serializer):
    completed = SerializerIntegerField(read_only=True)
    started = SerializerIntegerField(read_only=True)
    notStarted = SerializerIntegerField(read_only=True)
    total = SerializerIntegerField(read_only=True)


class CourseSessionClassroomSerializer(ModelSerializer):
    parent = UUIDField(source="parent_id", read_only=True)

    class Meta:
        model = Collection
        fields = ("id", "name", "parent")


class CourseSessionSerializer(ModelSerializer):
    # UUIDField not PrimaryKeyRelatedField: .to_representation does .pk on raw UUIDs from .values(), failing. ContentNode validation is in to_internal_value.
    course = UUIDField(format="hex", required=True)
    classroom = CourseSessionClassroomSerializer(source="collection", read_only=True)
    # Read-only at field level; write-path validation (Collection PKs, ADHOCLEARNERSGROUP exclusion) is in to_internal_value.
    assignments = ValuesMethodField(sources=("course_session_assignment_collections",))
    learner_ids = ListField(
        child=PrimaryKeyRelatedField(
            read_only=False, queryset=FacilityUser.objects.all()
        ),
        required=False,
    )
    active = BooleanField(source="is_active", required=False)
    title = CharField(read_only=True)
    description = CharField(read_only=True, allow_null=True, allow_blank=True)
    missing_resource = BooleanField(read_only=True)
    unit_phase = ChoiceField(choices=UnitPhase.choices(), read_only=True)
    active_unit_number = SerializerIntegerField(
        read_only=True, allow_null=True, required=False
    )
    active_unit_title = CharField(
        read_only=True, allow_null=True, allow_blank=True, required=False
    )
    test_learner_progress = TestLearnerProgressSerializer(
        read_only=True, required=False
    )

    def get_assignments(self, obj):
        return obj.course_session_assignment_collections

    class Meta:
        model = CourseSession
        fields = (
            "id",
            "title",
            "description",
            "course",
            "active",
            "collection",
            "classroom",
            "created_by",
            "date_created",
            "assignments",
            "missing_resource",
            "learner_ids",
            "unit_phase",
            "active_unit_number",
            "active_unit_title",
            "test_learner_progress",
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

    def _validate_list_field(self, field_name, child_field, raw_value):
        field = ListField(child=child_field)
        field.bind(field_name, self)
        try:
            return field.run_validation(raw_value)
        except ValidationError as exc:
            raise ValidationError({field_name: exc.detail})

    def to_internal_value(self, data):
        data = OrderedDict(data)
        data["created_by"] = self.context["request"].user.id

        # ValuesMethodField is read-only; pop assignments before super() so
        # client-supplied values aren't silently discarded without validation.
        assignment_ids = data.pop("assignments", None)

        instance = super().to_internal_value(data)

        if assignment_ids is not None:
            instance["assignments"] = self._validate_list_field(
                "assignments",
                PrimaryKeyRelatedField(
                    queryset=Collection.objects.exclude(kind=ADHOCLEARNERSGROUP)
                ),
                assignment_ids,
            )

        # course is a UUIDField on the model (not a FK); validate and resolve
        # the ContentNode manually to extract title, description, and channel version.
        course_id = instance.get("course")
        if course_id:
            try:
                course = ContentNode.objects.filter(modality=modalities.COURSE).get(
                    id=course_id
                )
            except (ContentNode.DoesNotExist, ValueError):
                raise ValidationError(
                    {"course": [f'Invalid pk "{course_id}" - object does not exist.']}
                )
            instance["title"] = course.title
            instance["description"] = course.description
            instance["course"] = course.id

            channel_version = (
                ChannelMetadata.objects.filter(id=course.channel_id)
                .values_list("version", flat=True)
                .first()
            )
            instance["channel_version"] = channel_version
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
        # activate_test, close_test, and active_test all mutate or expose
        # internal session state; restrict to users who can manage the session
        # (can_update), not just read it.
        if view.action in ["activate_test", "close_test", "active_test"]:
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


def _activated_by_info(user):
    """Return a dict of user info for the activated_by field, or None."""
    if user:
        return {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
        }
    return None


def _compute_course_state(course_id, test, units=None):
    """
    Compute the unit phase and active unit ID from the most recent test
    and the course's unit structure.

    Args:
        course_id: UUID of the course ContentNode
        test: The most recent UnitTestAssignment, or None
        units: Optional pre-fetched ordered list of unit ContentNode ID strings for
               the course (ascending lft order). When None, queries the database.
               Pass from _fetch_unit_info to eliminate per-item DB queries.

    Returns:
        dict with 'unit_phase' and 'active_unit_id'
    """
    if units is None:
        units = [
            str(uid)
            for uid in ContentNode.objects.filter(
                parent_id=course_id,
                modality=modalities.UNIT,
            )
            .order_by("lft")
            .values_list("id", flat=True)
        ]

    first_unit_id = units[0] if units else None

    if not test:
        return {"unit_phase": UnitPhase.PreTestPending, "active_unit_id": first_unit_id}

    if not test.closed:
        unit_phase = (
            UnitPhase.PreTestActive
            if test.test_type == TestType.Pre
            else UnitPhase.PostTestActive
        )
        return {
            "unit_phase": unit_phase,
            "active_unit_id": str(test.unit_contentnode_id),
        }

    # Test is ended
    if test.test_type == TestType.Pre:
        # Pre-test ended = still on this unit (lessons/post-test phase)
        return {
            "unit_phase": UnitPhase.PostTestPending,
            "active_unit_id": str(test.unit_contentnode_id),
        }

    # Post-test ended = advance to next unit
    active_uid = str(test.unit_contentnode_id)
    try:
        active_idx = units.index(active_uid)
        next_unit_id = units[active_idx + 1] if active_idx + 1 < len(units) else None
    except ValueError:
        next_unit_id = None

    if not next_unit_id:
        return {
            "unit_phase": UnitPhase.Complete,
            "active_unit_id": None,
        }

    return {
        "unit_phase": UnitPhase.PreTestPending,
        "active_unit_id": next_unit_id,
    }


def _fetch_most_recent_tests(session_ids):
    tests_by_session = {}
    for t in (
        UnitTestAssignment.objects.filter(course_session_id__in=session_ids)
        .annotate(
            unit_lft=Subquery(
                ContentNode.objects.filter(id=OuterRef("unit_contentnode_id")).values(
                    "lft"
                )[:1]
            ),
            test_type_rank=Case(
                When(test_type=TestType.Post, then=Value(0)),
                When(test_type=TestType.Pre, then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            ),
        )
        # closed=False (open) sorts first; among closed, latest unit (highest lft) wins;
        # for the same unit, post-test (rank 0) beats pre-test (rank 1).
        .order_by("course_session_id", "closed", "-unit_lft", "test_type_rank")
        .values(
            "course_session_id",
            "unit_contentnode_id",
            "test_type",
            "closed",
        )
    ):
        sid = t["course_session_id"]
        tests_by_session.setdefault(
            sid,
            types.SimpleNamespace(
                unit_contentnode_id=t["unit_contentnode_id"],
                test_type=t["test_type"],
                closed=t["closed"],
            ),
        )
    return tests_by_session


def _fetch_unit_info(course_ids):
    unit_info = {}
    units_by_course = {}
    rows = (
        ContentNode.objects.filter(parent_id__in=course_ids, modality=modalities.UNIT)
        .order_by("parent_id", "lft")
        .values("id", "title", "parent_id")
    )
    for cid, group in itertools.groupby(rows, key=lambda u: u["parent_id"]):
        course_units = []
        for number, unit in enumerate(group, start=1):
            uid = str(unit["id"])
            unit_info[uid] = {"number": number, "title": unit["title"]}
            course_units.append(uid)
        units_by_course[str(cid)] = course_units
    return unit_info, units_by_course


def _fetch_group_memberships(group_ids):
    memberships_by_group = {}
    if not group_ids:
        return memberships_by_group
    for m in (
        Membership.objects.filter(collection_id__in=group_ids)
        .filter(FacilityUser.get_is_active_q())
        .values("collection_id", "user_id")
    ):
        gid = str(m["collection_id"])
        memberships_by_group.setdefault(gid, set()).add(m["user_id"])
    return memberships_by_group


def _assemble_learners(item, memberships_by_group):
    group_members = set()
    for gid in item.get("assignments", []):
        group_members.update(memberships_by_group.get(str(gid), set()))
    return group_members | set(item["learner_ids"])


def _fetch_mastery_logs_batch(items, tests_by_session, learners_by_session):
    content_ids = set()
    all_learner_ids = set()
    for item in items:
        test = tests_by_session.get(item["id"])
        if not test:
            continue
        content_ids.add(
            get_synthetic_content_id(
                str(item["id"]), str(test.unit_contentnode_id), test.test_type
            )
        )
        all_learner_ids.update(learners_by_session[item["id"]])

    if not content_ids:
        return {}

    mastery_by_content = {}
    for ml in MasteryLog.objects.filter(
        summarylog__content_id__in=content_ids,
        summarylog__user_id__in=all_learner_ids,
    ).values("summarylog__content_id", "summarylog__user_id", "complete"):
        cid = ml["summarylog__content_id"]
        uid = ml["summarylog__user_id"]
        if uid not in mastery_by_content.setdefault(cid, {}) or ml["complete"]:
            mastery_by_content[cid][uid] = ml["complete"]

    return mastery_by_content


def _compute_learner_progress(
    item, test, unit_info, all_learners, mastery_by_content, units_by_course
):
    units = units_by_course.get(str(item["course"]), [])
    course_state = _compute_course_state(str(item["course"]), test, units=units)

    item["unit_phase"] = course_state["unit_phase"]
    active_unit_id = course_state["active_unit_id"]

    item["active_unit_number"] = None
    item["active_unit_title"] = None
    if active_unit_id and active_unit_id in unit_info:
        info = unit_info[active_unit_id]
        item["active_unit_number"] = info["number"]
        item["active_unit_title"] = info["title"]

    total = len(all_learners)

    if course_state["unit_phase"] == UnitPhase.PreTestPending:
        item["test_learner_progress"] = None
        return

    content_id = get_synthetic_content_id(
        str(item["id"]),
        str(test.unit_contentnode_id),
        test.test_type,
    )
    learner_status = {
        uid: complete
        for uid, complete in mastery_by_content.get(content_id, {}).items()
        if uid in all_learners
    }

    completed = sum(1 for c in learner_status.values() if c)
    started = len(learner_status) - completed
    item["test_learner_progress"] = {
        "completed": completed,
        "started": started,
        "notStarted": total - completed - started,
        "total": total,
    }


class CourseSessionViewset(ValuesViewset):
    serializer_class = CourseSessionSerializer
    # These fields are populated by consolidate(), not annotated by the queryset.
    deferred_fields = (
        "learner_ids",
        "unit_phase",
        "active_unit_number",
        "active_unit_title",
        "test_learner_progress",
    )
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filterset_fields = ("collection", "id")
    permission_classes = (CourseSessionPermissions,)
    queryset = CourseSession.objects.all().order_by("-date_created")

    def consolidate(self, items, queryset):
        if not items:
            return items

        course_session_ids = [item["id"] for item in items]

        adhoc_assignments = CourseSessionAssignment.objects.filter(
            course_session_id__in=course_session_ids,
            collection__kind=ADHOCLEARNERSGROUP,
        )
        adhoc_assignments = annotate_array_aggregate(
            adhoc_assignments,
            # filter to active members only — deactivated users must not appear in learner_ids
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
                item["learner_ids"] = adhoc_assignment["learner_ids"]
                item["assignments"] = [
                    i
                    for i in item["assignments"]
                    if i != adhoc_assignment["collection"]
                ]
            else:
                item["learner_ids"] = []

        tests_by_session = _fetch_most_recent_tests(course_session_ids)
        course_ids = {str(item["course"]) for item in items}
        unit_info, units_by_course = _fetch_unit_info(course_ids)
        all_group_ids = set()
        for item in items:
            all_group_ids.update(str(gid) for gid in item.get("assignments", []))
        memberships_by_group = _fetch_group_memberships(all_group_ids)
        learners_by_session = {
            item["id"]: _assemble_learners(item, memberships_by_group) for item in items
        }
        mastery_by_content = _fetch_mastery_logs_batch(
            items, tests_by_session, learners_by_session
        )

        for item in items:
            _compute_learner_progress(
                item,
                tests_by_session.get(item["id"]),
                unit_info,
                learners_by_session[item["id"]],
                mastery_by_content,
                units_by_course,
            )

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

        with transaction.atomic():
            UnitTestAssignment.objects.filter(
                course_session=course_session, closed=False
            ).exclude(
                unit_contentnode_id=unit_contentnode_id, test_type=test_type
            ).update(closed=True)

            unit_test_assignment, created = UnitTestAssignment.objects.get_or_create(
                course_session=course_session,
                unit_contentnode_id=unit_contentnode_id,
                test_type=test_type,
                collection=course_session.collection,
                defaults={"activated_by": request.user, "closed": False},
            )

            if not created:
                unit_test_assignment.closed = False
                unit_test_assignment.activated_by = request.user
                unit_test_assignment.save()

        course_state = _compute_course_state(
            course_session.course, unit_test_assignment
        )

        return Response(
            {
                "id": unit_test_assignment.id,
                "unit_contentnode_id": str(unit_contentnode_id),
                "test_type": test_type,
                "activated_by": _activated_by_info(unit_test_assignment.activated_by),
                "closed": unit_test_assignment.closed,
                **course_state,
            },
            status=HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def close_test(self, request, pk=None):
        """
        Closes the currently active test for the course session.
        Sets closed=True for the active test.
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
                course_session=course_session, closed=False
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
        active_test.closed = True
        active_test.save()

        course_state = _compute_course_state(course_session.course, active_test)

        return Response(
            {
                "id": active_test.id,
                "unit_contentnode_id": str(active_test.unit_contentnode_id),
                "test_type": active_test.test_type,
                "activated_by": _activated_by_info(active_test.activated_by),
                "closed": active_test.closed,
                **course_state,
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
                course_session=course_session, closed=False
            )
        except UnitTestAssignment.DoesNotExist:
            return Response({"active_test": None}, status=HTTP_200_OK)

        #  then fetch the unit's ContentNode
        try:
            unit = ContentNode.objects.get(id=active_test.unit_contentnode_id)
            unit_title = unit.title
        except ContentNode.DoesNotExist:
            logger.error(
                "UnitTestAssignment {} references non-existent ContentNode {}. This is orphaned data.".format(
                    active_test.id, active_test.unit_contentnode_id
                )
            )
            unit_title = None

        # then get the details about the user who activated the test
        activated_by_info = _activated_by_info(active_test.activated_by)

        return Response(
            {
                "id": active_test.id,
                "unit_contentnode_id": str(active_test.unit_contentnode_id),
                "unit_title": unit_title,
                "test_type": active_test.test_type,
                "closed": active_test.closed,
                "activated_by": activated_by_info,
            },
            status=HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def last_unit_test(self, request, pk=None):
        """
        Returns the most recent test for the given course session. Priority:
        open tests first (closed=False < True), then unit tree position
        descending (latest unit first), then test_type ascending (post before
        pre within the same unit, because "post" < "pre" alphabetically).
        """
        course_session = self.get_object()

        test = (
            UnitTestAssignment.objects.filter(course_session=course_session)
            .annotate(
                b_lft=Subquery(
                    ContentNode.objects.filter(
                        id=OuterRef("unit_contentnode_id")
                    ).values("lft")[:1]
                ),
                test_type_rank=Case(
                    When(test_type=TestType.Post, then=Value(0)),
                    When(test_type=TestType.Pre, then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField(),
                ),
            )
            # open tests first (closed=False < True), then latest unit, post-test (rank 0) before pre
            .order_by("closed", "-b_lft", "test_type_rank")
            .first()
        )

        course_state = _compute_course_state(course_session.course, test)

        if not test:
            return Response(
                {
                    "id": None,
                    "unit_contentnode_id": None,
                    "test_type": None,
                    "closed": None,
                    "activated_by": None,
                    **course_state,
                },
                status=HTTP_200_OK,
            )

        return Response(
            {
                "id": test.id,
                "unit_contentnode_id": str(test.unit_contentnode_id),
                "test_type": test.test_type,
                "closed": test.closed,
                "activated_by": _activated_by_info(test.activated_by),
                **course_state,
            },
            status=HTTP_200_OK,
        )
