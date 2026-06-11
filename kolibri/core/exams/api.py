import datetime
import logging

from django.core.exceptions import ObjectDoesNotExist
from django.http import Http404
from django.utils.timezone import now
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.decorators import action
from rest_framework.response import Response

from kolibri.core.api import ValuesViewset
from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.permissions import KolibriAuthPermissionsFilter
from kolibri.core.auth.permissions import _ensure_raw_dict
from kolibri.core.content.models import ContentNode
from kolibri.core.content.utils.annotation import total_file_size
from kolibri.core.exams.models import DraftExam
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.exams.serializers import ExamSerializer
from kolibri.core.logger.models import MasteryLog
from kolibri.core.query import annotate_array_aggregate

logger = logging.getLogger(__name__)

# Sentinel used as sort key for exams/drafts with no date_created.
_EPOCH_UTC = datetime.datetime.fromtimestamp(0, datetime.timezone.utc)

# Fields present on Exam but not DraftExam; excluded when querying DraftExam.
_EXAM_ONLY_FIELDS = frozenset(
    {"active", "archive", "date_archived", "date_activated", "assignment_collections"}
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

    def annotate_queryset(self, queryset):
        return annotate_array_aggregate(
            queryset, assignment_collections="assignments__collection"
        )

    def _validate_output(self, items):
        # consolidate() pops assignment_collections and populates assignments instead,
        # so the schema (which expects assignment_collections) cannot validate the output.
        pass

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
            adhoc_assignments = ExamAssignment.objects.filter(
                exam_id__in=exam_ids, collection__kind=ADHOCLEARNERSGROUP
            )
            adhoc_assignments = annotate_array_aggregate(
                adhoc_assignments,
                learner_ids="collection__membership__user_id",
                filter=FacilityUser.get_is_active_q("collection__membership"),
            )
            adhoc_assignments = {
                a["exam"]: a
                for a in adhoc_assignments.values("collection", "exam", "learner_ids")
            }
            for item in items:
                assignment_collections = item.pop("assignment_collections", [])
                if item["id"] in adhoc_assignments:
                    adhoc_assignment = adhoc_assignments[item["id"]]
                    item["learner_ids"] = adhoc_assignment["learner_ids"]
                    item["assignments"] = [
                        i
                        for i in assignment_collections
                        if i != adhoc_assignment["collection"]
                    ]
                else:
                    item["learner_ids"] = []
                    item["assignments"] = assignment_collections
                # This is an Exam model, so set the draft flag to False
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
