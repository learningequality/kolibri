from django.db.models import Count
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import IsoDateTimeFilter
from rest_framework.decorators import action
from rest_framework.response import Response

from kolibri.core.api import ValuesViewset
from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.attendance.serializers import AttendanceSessionSerializer
from kolibri.core.auth.api import _ensure_raw_dict
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.api import OptionalPageNumberPagination


class AttendanceSessionFilter(FilterSet):
    start_date = IsoDateTimeFilter(
        field_name="session_start_datetime", lookup_expr="gte"
    )
    end_date = IsoDateTimeFilter(field_name="session_start_datetime", lookup_expr="lt")

    class Meta:
        model = AttendanceSession
        fields = ["collection", "start_date", "end_date"]


class AttendanceSessionPermissions(KolibriAuthPermissions):
    def validator(self, request, view, datum):
        if request.user.is_anonymous:
            return False
        model = view.get_serializer_class().Meta.model
        datum = _ensure_raw_dict(datum)
        validated_data = view.get_serializer().to_internal_value(datum)
        validated_data.pop("attendance_records", None)
        validated_data["created_by"] = request.user
        return request.user.can_create(model, validated_data)


class AttendanceSessionViewSet(ValuesViewset):
    serializer_class = AttendanceSessionSerializer
    permission_classes = (AttendanceSessionPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filterset_class = AttendanceSessionFilter
    pagination_class = OptionalPageNumberPagination

    values = (
        "id",
        "collection",
        "created_by",
        "session_start_datetime",
        "date_created",
        "date_modified",
        "present_count",
        "total_count",
    )

    def annotate_queryset(self, queryset):
        return queryset.annotate(
            present_count=Count(
                "attendance_records", filter=Q(attendance_records__present=True)
            ),
            total_count=Count("attendance_records"),
        )

    def get_queryset(self):
        return AttendanceSession.objects.order_by("-session_start_datetime")

    @action(detail=False, methods=["get"])
    def recent(self, request):
        try:
            limit = max(1, min(int(request.query_params.get("limit", 5)), 50))
        except (ValueError, TypeError):
            limit = 5
        queryset = self.filter_queryset(self.get_queryset())
        queryset = self.annotate_queryset(queryset)[:limit]
        data = queryset.values(*self.values)
        return Response(list(data))
