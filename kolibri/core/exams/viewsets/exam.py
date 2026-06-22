import datetime
import logging

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Q
from django.http import Http404
from django.utils.timezone import now
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import BooleanField
from rest_framework.serializers import CharField
from rest_framework.serializers import IntegerField
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
from kolibri.core.auth.utils.users import create_adhoc_group_for_learners
from kolibri.core.content.models import ContentNode
from kolibri.core.content.utils.annotation import total_file_size
from kolibri.core.exams.constants import MAX_QUESTIONS_PER_QUIZ_SECTION
from kolibri.core.exams.models import DraftExam
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.logger.models import MasteryLog
from kolibri.core.query import annotate_array_aggregate

logger = logging.getLogger(__name__)

# Sentinel used as sort key for exams/drafts with no date_created.
_EPOCH_UTC = datetime.datetime.fromtimestamp(0, datetime.timezone.utc)

# Fields present on Exam but not DraftExam; excluded when querying DraftExam.
_EXAM_ONLY_FIELDS = frozenset({"active", "archive", "date_archived", "date_activated"})


class QuestionSourceSerializer(Serializer):
    exercise_id = HexUUIDField(format="hex")
    question_id = HexUUIDField(format="hex")
    title = CharField(default="", allow_blank=True)
    counter_in_exercise = IntegerField()


class QuizSectionSerializer(Serializer):
    description = CharField(required=False, allow_blank=True)
    section_title = CharField(allow_blank=True, required=False)
    learners_see_fixed_order = BooleanField(default=False)
    questions = QuestionSourceSerializer(
        many=True,
        required=False,
        max_length=MAX_QUESTIONS_PER_QUIZ_SECTION,
    )


class ExamSerializer(ModelSerializer):
    """
    Serializer for Exam and DraftExam. Used with ValuesViewset: read-path fields
    are derived by derive_values_from_serializer; write-path (create/update)
    uses to_internal_value as usual.
    """

    # assignments, learner_ids, and draft are excluded from the DB values() query
    # via deferred_fields on ExamViewset. They are populated post-query by
    # consolidate() (for Exam) and serialize_draft() (for DraftExam).
    assignments = ListField(
        child=PrimaryKeyRelatedField(queryset=Collection.objects.all()),
    )
    learner_ids = ListField(
        child=PrimaryKeyRelatedField(queryset=FacilityUser.objects.all()),
        required=False,
    )
    question_sources = QuizSectionSerializer(many=True, required=False)
    draft = BooleanField(default=True, required=False)

    class Meta:
        model = Exam
        fields = (
            "id",
            "title",
            "question_sources",
            "seed",
            "active",
            "collection",
            "archive",
            "assignments",
            "learners_see_fixed_order",
            "instant_report_visibility",
            "learner_ids",
            "draft",
            "question_count",
            "creator",
            "data_model_version",
            "date_created",
            "date_archived",
            "date_activated",
        )
        extra_kwargs = {
            "seed": {"read_only": True},
            "question_count": {"read_only": True},
            "creator": {"read_only": True},
            "data_model_version": {"read_only": True},
            "date_created": {"read_only": True},
            "date_archived": {"read_only": True},
            "date_activated": {"read_only": True},
        }

    def _validate_learner_ids(self, collection):
        if "learner_ids" in self.initial_data and self.initial_data["learner_ids"]:
            learner_ids = list(set(self.initial_data["learner_ids"]))
            if (
                len(learner_ids)
                != FacilityUser.objects.filter(
                    memberships__collection=collection,
                    id__in=learner_ids,
                ).count()
            ):
                raise ValidationError(
                    "Some learner_ids are not members of the collection that this quiz is contained in",
                    code=error_constants.INVALID,
                )

    def _validate_disallowed_draft_fields(self, attrs):
        if (not self.instance or isinstance(self.instance, DraftExam)) and attrs.get(
            "draft", True
        ):
            # If we are creating or updating a draft we cannot set active or archive
            # raise validation errors if trying to set to true, otherwise pop the field
            # to ignore it.
            for field in ("active", "archive"):
                if field in attrs:
                    if attrs[field]:
                        raise ValidationError(
                            f"Cannot update {field} to true on a DraftExam object",
                            code=error_constants.INVALID,
                        )
                    attrs.pop(field)

    def _validate_title_unique_in_collection(self, title, collection):
        # Check that the title is unique in the collection
        exam_queryset = Exam.objects.filter(title__iexact=title, collection=collection)
        draft_exam_queryset = DraftExam.objects.filter(
            title__iexact=title, collection=collection
        )
        if self.instance:
            # In this case, we are updating an existing model, so we just need to check that the title is unique
            # but exclude the current instance from the check
            if isinstance(self.instance, Exam):
                exam_queryset = exam_queryset.exclude(id=self.instance.id)
            else:
                draft_exam_queryset = draft_exam_queryset.exclude(id=self.instance.id)

        if exam_queryset.exists() or draft_exam_queryset.exists():
            raise ValidationError(
                "The fields title, collection must make a unique set.",
                code=error_constants.UNIQUE,
            )

    def validate(self, attrs):
        title = attrs.get("title")
        # first condition is for creating object, second is for updating
        collection = attrs.get("collection") or getattr(self.instance, "collection")
        self._validate_learner_ids(collection)

        self._validate_disallowed_draft_fields(attrs)

        if title is not None:
            self._validate_title_unique_in_collection(title, collection)

        if not self.instance and "request" in self.context:
            # If we are creating a new exam, then we need to set the creator to the current user
            attrs["creator"] = self.context["request"].user

        is_non_draft_exam = self.instance and isinstance(self.instance, Exam)

        if "question_sources" in attrs:
            if is_non_draft_exam:
                raise ValidationError(
                    "Cannot update question_sources on an Exam object",
                    code=error_constants.INVALID,
                )
            if not self.instance and not attrs["draft"]:
                if not attrs["question_sources"]:
                    raise ValidationError(
                        "Cannot create an Exam without any question_sources",
                        code=error_constants.INVALID,
                    )
                if all(
                    not section["questions"] for section in attrs["question_sources"]
                ):
                    raise ValidationError(
                        "Cannot create an Exam without any questions",
                        code=error_constants.INVALID,
                    )

        return attrs

    def create(self, validated_data):
        draft = validated_data.pop("draft", True)
        # The kind of object we create depends on whether this is a draft or not, set that here.
        model_class = DraftExam if draft else Exam
        if draft:
            if "assignments" in validated_data:
                validated_data["assignments"] = [
                    collection.id for collection in validated_data["assignments"]
                ]
            if "learner_ids" in validated_data:
                validated_data["learner_ids"] = [
                    learner.id for learner in validated_data["learner_ids"]
                ]
        else:
            collections = validated_data.pop("assignments")
            learners = validated_data.pop("learner_ids", [])
            # Because we need be able to override the Exam date_created with the date_created
            # of the DraftExam, we need to set the date_created here, as we can't use auto_now_add
            validated_data["date_created"] = now()

        # Create the new object
        new_exam = model_class.objects.create(**validated_data)

        if not draft:
            # Create all of the new ExamAssignment objects for the new Exam
            # otherwise, this has already been set in the JSON fields above
            for collection in collections:
                self._create_exam_assignment(exam=new_exam, collection=collection)

            if learners:
                adhoc_group = create_adhoc_group_for_learners(
                    new_exam.collection, learners
                )
                self._create_exam_assignment(exam=new_exam, collection=adhoc_group)

        return new_exam

    def _create_exam_assignment(self, **params):
        return ExamAssignment.objects.create(
            assigned_by=self.context["request"].user, **params
        )

    def update(self, instance, validated_data):
        # Out of an abundance of caution, handle the saving of the new instance and deletion of the old instance
        # in a transaction, so that if an error occurs in either, we don't end up with a mismatched state
        # to make this simpler, we wrap the whole update in a transaction
        with transaction.atomic():
            # Check if the instance we are updating is a draft.
            instance_is_draft = isinstance(instance, DraftExam)
            # Check if the update is updating whether this should be a draft or not
            # default to the current state of the instance
            new_draft_value = validated_data.pop("draft", instance_is_draft)
            if not instance_is_draft and new_draft_value:
                # Don't allow a non draft Exam to be turned into a DraftExam
                raise ValidationError(
                    "Cannot change an Exam to a DraftExam", code=error_constants.INVALID
                )
            elif instance_is_draft and not new_draft_value:
                instance = self._publish_draft(instance, validated_data)
                instance_is_draft = False
            # Update the scalar fields
            for field in (
                "title",
                "learners_see_fixed_order",
                "instant_report_visibility",
            ):
                setattr(
                    instance, field, validated_data.pop(field, getattr(instance, field))
                )
            if not instance_is_draft:
                # Update the non-draft specific fields
                instance.active = validated_data.pop("active", instance.active)
                instance.archive = validated_data.pop("archive", instance.archive)

            else:
                # Update the draft specific fields
                # note that this means that you cannot update the question sources
                # in the same API request as you publish a draft exam to be an exam
                # as by this point instance_is_draft is False if we are publishing a draft
                instance.question_sources = validated_data.pop(
                    "question_sources", instance.question_sources
                )

            # Add/delete any new/removed Assignments
            if "assignments" in validated_data:
                collections = validated_data.pop("assignments")

                collections = [
                    collection
                    for collection in collections
                    if collection.kind != ADHOCLEARNERSGROUP
                ]

                if instance_is_draft:
                    # If this is a draft exam, then we need to update the assignments
                    # directly on the instance
                    instance.assignments = [collection.id for collection in collections]
                else:
                    # If this is an exam, then we need to update the ExamAssignment objects
                    current_group_ids = set(
                        instance.assignments.exclude(
                            collection__kind=ADHOCLEARNERSGROUP
                        ).values_list("collection__id", flat=True)
                    )

                    for collection in collections:
                        if collection.id not in current_group_ids:
                            self._create_exam_assignment(
                                exam=instance, collection=collection
                            )

                    # Clean up any exam assignments that were previously made but are no longer needed
                    # based on the new list of collections
                    ExamAssignment.objects.filter(
                        exam_id=instance.id,
                        collection_id__in=(
                            current_group_ids - set(c.id for c in collections)
                        ),
                    ).exclude(collection__kind=ADHOCLEARNERSGROUP).delete()

            # Update adhoc assignment
            if "learner_ids" in validated_data:
                learner_ids = validated_data.pop("learner_ids")
                self._update_learner_ids(instance, learner_ids)

            instance.save()

        return instance

    def _publish_draft(self, instance, validated_data):
        """Convert a DraftExam to an Exam, populating any missing assignments/learner_ids from the draft."""
        if not instance.question_count:
            raise ValidationError(
                "Cannot publish a draft exam with no questions",
                code=error_constants.INVALID,
            )
        if "assignments" not in validated_data:
            # Silently ignores assignments for collections deleted since draft was created
            validated_data["assignments"] = Collection.objects.filter(
                id__in=instance.assignments
            )
        if "learner_ids" not in validated_data:
            # Silently ignores learners deleted since draft was created
            validated_data["learner_ids"] = FacilityUser.objects.filter(
                id__in=instance.learner_ids
            )
        new_instance = instance.to_exam()
        new_instance.save()
        instance.delete()
        return new_instance

    def _update_learner_ids(self, instance, learners):
        if isinstance(instance, DraftExam):
            instance.learner_ids = [learner.id for learner in learners]
            return
        try:
            adhoc_group_assignment = ExamAssignment.objects.select_related(
                "collection"
            ).get(exam=instance, collection__kind=ADHOCLEARNERSGROUP)
        except ExamAssignment.DoesNotExist:
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
                self._create_exam_assignment(exam=instance, collection=adhoc_group)
            else:
                # There is an adhoc group, so we need to potentially update its membership
                original_learner_ids_set = set(
                    Membership.objects.filter(
                        collection=adhoc_group_assignment.collection
                    ).values_list("user_id", flat=True)
                )
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

                    Membership.objects.bulk_create(
                        [
                            Membership(
                                user_id=new_learner_id,
                                collection=adhoc_group_assignment.collection,
                            )
                            for new_learner_id in new_learner_ids
                        ]
                    )


class ExamFilter(FilterSet):
    class Meta:
        model = Exam
        fields = ["collection"]


class DraftExamFilter(FilterSet):
    class Meta:
        model = DraftExam
        fields = ["collection"]


class ExamPermissions(KolibriAuthPermissions):
    # Overrides the default validator to sanitize the Exam POST Payload
    # before validation
    def validator(self, request, view, datum):
        model = view.get_serializer_class().Meta.model
        validated_data = view.get_serializer().to_internal_value(
            _ensure_raw_dict(datum)
        )
        # Cannot have create assignments without creating the Exam first,
        # so this doesn't try to validate the Exam with a non-empty assignments list
        validated_data.pop("assignments", [])
        validated_data.pop("learner_ids", [])
        # Handle data that comes from the serializer but that we don't want to set
        validated_data.pop("draft", False)
        # Handle data that doesn't come from the serializer but that we need to set
        # in order to instantiate the model for the can_create method
        validated_data["creator"] = request.user
        validated_data["question_count"] = len(
            validated_data.get("question_sources", [])
        )
        validated_data["date_created"] = now()
        return request.user.can_create(model, validated_data)


class ExamViewset(ValuesViewset):
    serializer_class = ExamSerializer
    permission_classes = (ExamPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filterset_class = ExamFilter
    deferred_fields = ("assignments", "learner_ids", "draft")

    def get_draft_queryset(self):
        return DraftExam.objects.all()

    def get_queryset(self):
        return Exam.objects.all()

    def serialize_draft(self, queryset):
        # Derive the values to fetch for DraftExam from the serializer-derived _values.
        # Exclude Exam-only fields not present on DraftExam, and the assignment_collections
        # annotation (not available for DraftExam). Add DraftExam-specific JSONFields.
        draft_values = tuple(v for v in self._values if v not in _EXAM_ONLY_FIELDS) + (
            "assignments",
            "learner_ids",
        )
        objects = list(queryset.values(*draft_values))

        all_exam_learners_set = {
            learner_id for obj in objects for learner_id in obj.get("learner_ids", [])
        }
        non_deleted_learners = set(
            FacilityUser.objects.filter(id__in=all_exam_learners_set).values_list(
                "id", flat=True
            )
        )

        _draft_defaults = {
            "draft": True,
            "active": False,
            "archive": False,
            "date_archived": None,
            "date_activated": None,
        }
        for item in objects:
            item.update(_draft_defaults)
            # Filter out any deleted learners
            item["learner_ids"] = [
                learner_id
                for learner_id in item.get("learner_ids", [])
                if learner_id in non_deleted_learners
            ]
            # Map NULL instant_report_visibility to True (NULL means unrestricted)
            if item.get("instant_report_visibility") is None:
                item["instant_report_visibility"] = True
        return objects

    def _is_draft_pk(self, pk):
        """Return (is_draft, coerced_pk). DraftExam PKs are integers; Exam PKs are UUIDs."""
        try:
            return True, int(pk)
        except (TypeError, ValueError):
            return False, pk

    def filter_querysets(self, exam_queryset, draft_queryset):
        for backend in list(self.filter_backends):
            instantiated_backend = backend()
            exam_queryset = instantiated_backend.filter_queryset(
                self.request, exam_queryset, self
            )
            # ExamFilter.Meta.model = Exam, so we cannot pass it a DraftExam queryset.
            # DraftExamFilter has the same fields but is bound to DraftExam.
            if isinstance(instantiated_backend, DjangoFilterBackend):
                draft_queryset = DraftExamFilter(
                    self.request.query_params,
                    queryset=draft_queryset,
                    request=self.request,
                ).qs
            else:
                draft_queryset = instantiated_backend.filter_queryset(
                    self.request, draft_queryset, self
                )
        return exam_queryset, draft_queryset

    def list(self, request, *args, **kwargs):
        # First get the filtered exam_queryset and draft_queryset
        exam_queryset, draft_queryset = self.filter_querysets(
            self.get_queryset(), self.get_draft_queryset()
        )
        # Serialize the exam_queryset and draft_queryset
        exam_objects = self.serialize(exam_queryset)
        draft_objects = self.serialize_draft(draft_queryset)

        # Consolidate the exam_queryset and draft_queryset
        # and sort them by reverse date_created
        all_objects = sorted(
            [*exam_objects, *draft_objects],
            key=lambda x: x["date_created"] or _EPOCH_UTC,
            reverse=True,
        )

        return Response(all_objects)

    def get_object(self):
        # First get the filtered exam_queryset and draft_queryset
        exam_queryset, draft_queryset = self.filter_querysets(
            self.get_queryset(), self.get_draft_queryset()
        )
        is_draft, pk = self._is_draft_pk(self.kwargs["pk"])
        try:
            instance = (
                draft_queryset.get(pk=pk) if is_draft else exam_queryset.get(pk=pk)
            )
        except (IndexError, ValueError, TypeError, ObjectDoesNotExist):
            raise Http404("No Exam matches the given query.")

        # May raise a permission denied
        self.check_object_permissions(self.request, instance)
        return instance

    def update(self, request, *args, **kwargs):
        # Override the update method to handle the model instance potentially changing
        # during the update.
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Once the update has been performed, the serializer instance may have changed
        # so we need to re-serialize the object to return the correct data
        return Response(self.serialize_object(pk=serializer.instance.pk))

    def serialize_object(self, pk=None):
        pk = pk or self.kwargs.get("pk")
        is_draft, pk = self._is_draft_pk(pk)
        try:
            if is_draft:
                return self.serialize_draft(self.get_draft_queryset().filter(pk=pk))[0]
            else:
                return self.serialize(self.get_queryset().filter(pk=pk))[0]
        except (IndexError, ValueError, TypeError):
            raise Http404("No Exam matches the given query.")

    def consolidate(self, items, queryset):
        if items:
            exam_ids = [e["id"] for e in items]
            all_assignments_qs = ExamAssignment.objects.filter(exam_id__in=exam_ids)
            all_assignments = annotate_array_aggregate(
                all_assignments_qs,
                learner_ids="collection__membership__user_id",
                filter=Q(collection__kind=ADHOCLEARNERSGROUP)
                & FacilityUser.get_is_active_q("collection__membership"),
            )
            exam_regular = {}
            exam_adhoc = {}
            for a in all_assignments.values(
                "collection", "exam", "collection__kind", "learner_ids"
            ):
                if a["collection__kind"] == ADHOCLEARNERSGROUP:
                    exam_adhoc[a["exam"]] = a
                else:
                    exam_regular.setdefault(a["exam"], []).append(a["collection"])

            for item in items:
                exam_id = item["id"]
                item["assignments"] = exam_regular.get(exam_id, [])
                item["learner_ids"] = (
                    (exam_adhoc[exam_id]["learner_ids"] or [])
                    if exam_id in exam_adhoc
                    else []
                )
                item["draft"] = False
                # Map NULL instant_report_visibility to True (NULL means unrestricted)
                if item["instant_report_visibility"] is None:
                    item["instant_report_visibility"] = True

        return items

    def perform_update(self, serializer):
        if isinstance(serializer.instance, Exam):
            was_active = serializer.instance.active
            was_archived = serializer.instance.archive
        else:
            # If it's a DraftExam, then we need to set these values to False
            # as the values are not set on the DraftExam model
            was_active = False
            was_archived = False

        serializer.save()

        if isinstance(serializer.instance, Exam):
            masterylog_queryset = MasteryLog.objects.filter(
                summarylog__content_id=serializer.instance.id
            )

            if was_active and not serializer.instance.active:
                # Has changed from active to not active, set completion_timestamps on all non complete masterylogs
                masterylog_queryset.filter(completion_timestamp__isnull=True).update(
                    completion_timestamp=now()
                )

            if not was_archived and serializer.instance.archive:
                # It was not archived (closed), but now it is - so we set all MasteryLogs as complete
                masterylog_queryset.update(complete=True)

    @action(detail=False)
    def size(self, request, **kwargs):
        exams, draft_exams = self.filter_querysets(
            self.get_queryset(), self.get_draft_queryset()
        )
        exams_sizes_set = []
        for exam in list(exams) + list(draft_exams):
            quiz_nodes = ContentNode.objects.filter(
                id__in=[question["exercise_id"] for question in exam.get_questions()]
            )
            exams_sizes_set.append({exam.id: total_file_size(quiz_nodes)})

        return Response(exams_sizes_set)
