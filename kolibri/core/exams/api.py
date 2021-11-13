from django.utils.timezone import now
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework import pagination

from kolibri.core.api import ValuesViewset
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
from kolibri.core.exams import models
from kolibri.core.exams import serializers
from kolibri.core.logger.models import MasteryLog
from kolibri.core.query import annotate_array_aggregate


class OptionalPageNumberPagination(pagination.PageNumberPagination):
    """
    Pagination class that allows for page number-style pagination, when requested.
    To activate, the `page_size` argument must be set. For example, to request the first 20 records:
    `?page_size=20&page=1`
    """

    page_size = None
    page_size_query_param = "page_size"


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
        return request.user.can_create(model, validated_data)


class ExamViewset(ValuesViewset):
    serializer_class = serializers.ExamSerializer
    pagination_class = OptionalPageNumberPagination
    permission_classes = (ExamPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filter_class = ExamFilter

    values = (
        "id",
        "title",
        "question_count",
        "question_sources",
        "seed",
        "active",
        "collection",
        "archive",
        "date_archived",
        "date_activated",
        "assignment_collections",
        "creator",
        "data_model_version",
        "learners_see_fixed_order",
    )

    field_map = {"assignments": "assignment_collections"}

    def get_queryset(self):
        return models.Exam.objects.all()

    def annotate_queryset(self, queryset):
        return annotate_array_aggregate(
            queryset, assignment_collections="assignments__collection"
        )

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

        return items

    def perform_update(self, serializer):
        was_active = serializer.instance.active
        was_archived = serializer.instance.archive
        serializer.save()

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
