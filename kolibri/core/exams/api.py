import datetime

from django.http import Http404
from django.utils.timezone import now
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.decorators import action
from rest_framework.response import Response

from kolibri.core.api import ValuesViewset
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
from kolibri.core.content.models import ContentNode
from kolibri.core.content.utils.annotation import total_file_size
from kolibri.core.exams import models
from kolibri.core.exams import serializers
from kolibri.core.logger.models import MasteryLog
from kolibri.core.query import annotate_array_aggregate


class ExamFilter(FilterSet):
    class Meta:
        model = models.Exam
        fields = ["collection"]


def _ensure_raw_dict(d):
    if hasattr(d, "dict"):
        d = d.dict()
    return dict(d)


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
        validated_data["question_count"] = len(validated_data["question_sources"])
        validated_data["date_created"] = now()
        return request.user.can_create(model, validated_data)


class ExamViewset(ValuesViewset):
    serializer_class = serializers.ExamSerializer
    permission_classes = (ExamPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filterset_class = ExamFilter

    common_values = (
        "id",
        "title",
        "question_sources",
        "seed",
        "collection",
        "question_count",
        "creator",
        "data_model_version",
        "learners_see_fixed_order",
        "date_created",
    )

    values = common_values + (
        "active",
        "archive",
        "date_archived",
        "date_activated",
        "assignment_collections",
    )

    draft_values = common_values + ("assignments", "learner_ids")

    field_map = {"assignments": "assignment_collections"}

    def get_draft_queryset(self):
        return models.DraftExam.objects.all()

    def get_queryset(self):
        return models.Exam.objects.all()

    def annotate_queryset(self, queryset):
        return annotate_array_aggregate(
            queryset, assignment_collections="assignments__collection"
        )

    def serialize_draft(self, queryset):
        objects = queryset.values(*self.draft_values)
        for item in objects:
            # Set the draft flag to True
            item["draft"] = True
            # We need to set these values to match the Exam model
            item["active"] = False
            item["archive"] = False
            item["date_archived"] = None
            item["date_activated"] = None
        return objects

    def filter_querysets(self, exam_queryset, draft_queryset):
        # Vendored from django-filter rest_framework integration
        for backend in list(self.filter_backends):
            # Instiate the backend
            instantiated_backend = backend()
            # Filter the exam_queryset with the usual method
            exam_queryset = instantiated_backend.filter_queryset(
                self.request, exam_queryset, self
            )
            # Do some special handling if the backend has a get_filterset_class method
            # this is required, as the get_filterset_class makes an assertion based on
            # the model Meta of the FilterSet - which is set to Exam, so this will
            # fail if we try to use the ExamFilter on the DraftExam queryset
            # This is a workaround to allow the DraftExam queryset to be filtered
            if hasattr(instantiated_backend, "get_filterset_class"):
                # First get the filter class using the exam queryset
                filter_class = instantiated_backend.get_filterset_class(
                    self, exam_queryset
                )
                # If the filter class is not None, then we can use it to filter the draft_queryset
                if filter_class:
                    # We need to pass the queryset to the filter_class to ensure that the
                    # queryset is filtered correctly
                    draft_queryset = filter_class(
                        self.request.query_params,
                        queryset=draft_queryset,
                        request=self.request,
                    ).qs
            else:
                # If the backend doesn't have a get_filterset_class method, then we can just
                # filter the draft_queryset as normal
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
        dt_utc_aware = datetime.datetime.fromtimestamp(0, datetime.timezone.utc)
        all_objects = sorted(
            [*exam_objects, *draft_objects],
            key=lambda x: x["date_created"] or dt_utc_aware,
            reverse=True,
        )

        return Response(all_objects)

    def get_object(self):
        # First get the filtered exam_queryset and draft_queryset
        exam_queryset, draft_queryset = self.filter_querysets(
            self.get_queryset(), self.get_draft_queryset()
        )
        # Get the pk from the kwargs
        pk = self.kwargs["pk"]
        try:
            try:
                # The DraftExam pk is an integer
                # so we try to convert it to an integer
                pk = int(pk)
                # if it's an integer, then we try to get the DraftExam instance
                instance = draft_queryset.get(pk=pk)
            except ValueError:
                # If it's not an integer, then we try to get the Exam instance
                instance = exam_queryset.get(pk=pk)
        except (IndexError, ValueError, TypeError):
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
        try:
            try:
                # The DraftExam pk is an integer
                # so we try to convert it to an integer
                pk = int(pk)
                # if it's an integer, then we try to get the DraftExam instance
                draft_queryset = self.get_draft_queryset().filter(pk=pk)
                return self.serialize_draft(draft_queryset)[0]
            except ValueError:
                # If it's not an integer, then we try to get the Exam instance
                exam_queryset = self.get_queryset().filter(pk=pk)
                return self.serialize(exam_queryset)[0]
        except (IndexError, ValueError, TypeError):
            raise Http404("No Exam matches the given query.")

    def consolidate(self, items, queryset):
        if items:
            exam_ids = [e["id"] for e in items]
            adhoc_assignments = models.ExamAssignment.objects.filter(
                exam_id__in=exam_ids, collection__kind=ADHOCLEARNERSGROUP
            )
            adhoc_assignments = annotate_array_aggregate(
                adhoc_assignments, learner_ids="collection__membership__user_id"
            )
            adhoc_assignments = {
                a["exam"]: a
                for a in adhoc_assignments.values("collection", "exam", "learner_ids")
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
                # This is an Exam model, so set the draft flag to False
                item["draft"] = False

        return items

    def perform_update(self, serializer):
        if isinstance(serializer.instance, models.Exam):
            was_active = serializer.instance.active
            was_archived = serializer.instance.archive
        else:
            # If it's a DraftExam, then we need to set these values to False
            # as the values are not set on the DraftExam model
            was_active = False
            was_archived = False

        serializer.save()

        if isinstance(serializer.instance, models.Exam):
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
            quiz_size = {}

            quiz_nodes = ContentNode.objects.filter(
                id__in=[question["exercise_id"] for question in exam.get_questions()]
            )

            quiz_size[exam.id] = total_file_size(quiz_nodes)
            exams_sizes_set.append(quiz_size)

        return Response(exams_sizes_set)
