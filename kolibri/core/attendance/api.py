import datetime

from django.db.models import Count
from django.db.models import Q
from django.utils import timezone
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
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
    start_date = CharFilter(method="filter_start_date")
    end_date = CharFilter(method="filter_end_date")

    def _parse_date(self, value):
        try:
            date = datetime.datetime.strptime(value, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return None
        return timezone.make_aware(datetime.datetime.combine(date, datetime.time.min))

    def filter_start_date(self, queryset, name, value):
        date = self._parse_date(value)
        if date is None:
            return queryset
        return queryset.filter(session_start_datetime__gte=date)

    def filter_end_date(self, queryset, name, value):
        date = self._parse_date(value)
        if date is None:
            return queryset
        end_date = date + datetime.timedelta(days=1)
        return queryset.filter(session_start_datetime__lt=end_date)

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
        queryset = queryset.annotate(
            present_count=Count(
                "attendance_records", filter=Q(attendance_records__present=True)
            ),
            total_count=Count("attendance_records"),
        )[:limit]
        data = queryset.values(
            "id",
            "collection",
            "created_by",
            "session_start_datetime",
            "present_count",
            "total_count",
        )
        return Response(list(data))
