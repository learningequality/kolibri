from django_filters.rest_framework import DateTimeFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.attendance.serializers import AttendanceSessionSerializer
from kolibri.core.auth.api import _ensure_raw_dict
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.content.api import OptionalPageNumberPagination

RECENT_SESSIONS_MAX_LIMIT = 50


class AttendanceSessionPermissions(KolibriAuthPermissions):
    def validator(self, request, view, datum):
        if request.user.is_anonymous:
            return False
        model = view.get_serializer_class().Meta.model
        validated_data = view.get_serializer().to_internal_value(
            _ensure_raw_dict(datum)
        )
        validated_data.pop("attendance_records", [])
        validated_data["created_by"] = request.user
        return request.user.can_create(model, validated_data)


class AttendanceSessionFilter(FilterSet):
    start_date = DateTimeFilter(field_name="session_start_datetime", lookup_expr="gte")
    end_date = DateTimeFilter(field_name="session_start_datetime", lookup_expr="lte")

    class Meta:
        model = AttendanceSession
        fields = ["collection"]


class AttendanceSessionViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSessionSerializer
    permission_classes = (AttendanceSessionPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filterset_class = AttendanceSessionFilter
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        return (
            AttendanceSession.objects.all()
            .prefetch_related("attendance_records")
            .order_by("-session_start_datetime")
        )

    @action(detail=False, methods=["get"])
    def recent(self, request):
        collection_id = request.query_params.get("collection")
        try:
            limit = int(request.query_params.get("limit", 5))
            if limit < 1:
                raise ValueError
        except ValueError:
            raise ValidationError("limit query parameter must be a positive integer")

        limit = min(limit, RECENT_SESSIONS_MAX_LIMIT)

        queryset = self.filter_queryset(self.get_queryset())
        if collection_id:
            queryset = queryset.filter(collection=collection_id)

        sessions = queryset[:limit]

        data = []
        for session in sessions:
            all_records = list(session.attendance_records.all())
            present_count = sum(1 for r in all_records if r.present)
            data.append(
                {
                    "id": str(session.id),
                    "session_start_datetime": session.session_start_datetime,
                    "present_count": present_count,
                    "total_count": len(all_records),
                }
            )

        return Response(data)
