from django.db.models import IntegerField
from django.db.models import Sum
from django.db.models import Value
from django.db.models.functions import Coalesce
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import UUIDFilter
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.permissions import KolibriAuthPermissionsFilter
from kolibri.core.content.api import OptionalPageNumberPagination
from kolibri.core.decorators import query_params_required

from ..evaluation import attempts_diff
from ..evaluation import LOG_ORDER_BY
from ..models import AttemptLog
from ..models import MasteryLog
from .attempt_log import AttemptLogDiffSerializer
from .attempt_log import AttemptLogViewSet
from .filters import BaseLogFilter


class _AttemptLogDiffViewSet(AttemptLogViewSet):
    serializer_class = AttemptLogDiffSerializer


class MasteryFilter(BaseLogFilter):
    content = UUIDFilter(field_name="summarylog__content_id")
    quiz = BooleanFilter(method="filter_by_quiz")

    def filter_by_quiz(self, queryset, name, value):
        if value:
            return queryset.filter(mastery_level__lt=0)
        return queryset.filter(mastery_level__gte=0)

    class Meta:
        model = MasteryLog
        fields = ["content", "user", "complete"]


class MasteryLogSerializer(serializers.ModelSerializer):
    # Annotation added by annotate_queryset. output_field=IntegerField() is
    # required for Postgres compatibility — cf2d54e5b1.
    correct = serializers.IntegerField(read_only=True)

    class Meta:
        model = MasteryLog
        fields = (
            "id",
            "mastery_criterion",
            "start_timestamp",
            "end_timestamp",
            "completion_timestamp",
            "complete",
            "correct",
            "time_spent",
        )


@query_params_required(content=str, user=str)
class MasteryLogViewSet(ReadOnlyValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
    )
    # order_by(LOG_ORDER_BY) orders by end_timestamp DESC NULLS LAST; the diff
    # action relies on this ordering for its positional slice [back:back+2] — 61cfd37257.
    queryset = MasteryLog.objects.all().order_by(LOG_ORDER_BY)
    pagination_class = OptionalPageNumberPagination
    filterset_class = MasteryFilter
    serializer_class = MasteryLogSerializer

    def annotate_queryset(self, queryset):
        return queryset.annotate(
            correct=Coalesce(
                Sum("attemptlogs__correct"), Value(0), output_field=IntegerField()
            )
        )

    @action(detail=True)
    def diff(self, request, pk=0):
        try:
            back = int(pk)
        except ValueError:
            return Response("Parameter must be an integer", status=404)

        tries = list(
            self.annotate_queryset(self.filter_queryset(self.get_queryset())).values(
                *self._values
            )[back : back + 2]
        )

        if not tries:
            return Response("No mastery log found", status=404)

        target_try = tries[0]
        previous_try = tries[1] if len(tries) > 1 else None

        target_try["diff"] = (
            {
                "correct": target_try["correct"] - previous_try["correct"],
                "time_spent": target_try["time_spent"] - previous_try["time_spent"],
            }
            if previous_try
            else None
        )

        attempt_logs = (
            attempts_diff(
                AttemptLog.objects.filter(masterylog=target_try["id"]),
                AttemptLog.objects.filter(masterylog=previous_try["id"]),
            )
            if previous_try
            else AttemptLog.objects.filter(masterylog=target_try["id"]).annotate(
                diff__correct=Value(None, output_field=IntegerField())
            )
        )

        diff_viewset = _AttemptLogDiffViewSet()
        diff_viewset.request = request
        attempt_data = list(diff_viewset.serialize_queryset(attempt_logs))
        for attempt in attempt_data:
            attempt["diff"] = {"correct": attempt.pop("diff__correct")}
        target_try["attemptlogs"] = attempt_data

        return Response(target_try)
