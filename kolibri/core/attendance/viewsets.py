import django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from kolibri.core.attendance.models import AttendanceRecord
from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.attendance.serializers import AttendanceRecordSerializer
from kolibri.core.attendance.serializers import AttendanceSessionSerializer
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter


class AttendanceSessionFilter(django_filters.FilterSet):
    start_date = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    end_date = django_filters.DateFilter(field_name="date", lookup_expr="lte")

    class Meta:
        model = AttendanceSession
        fields = ["collection", "date", "start_date", "end_date"]


class AttendanceSessionPermissions(KolibriAuthPermissions):
    def has_object_permission(self, request, view, obj):
        if view.action == "submit_attendance":
            return request.user.can_update(obj)
        return super().has_object_permission(request, view, obj)

    def validator(self, request, view, datum):
        if view.action == "submit_attendance":
            return True
        return super().validator(request, view, datum)


class AttendanceSessionViewset(viewsets.ModelViewSet):
    serializer_class = AttendanceSessionSerializer
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filterset_class = AttendanceSessionFilter
    permission_classes = (AttendanceSessionPermissions,)
    queryset = AttendanceSession.objects.all().order_by("-date", "-session_number")

    @action(detail=True, methods=["post"], url_path="submit-attendance")
    def submit_attendance(self, request, pk=None):
        session = self.get_object()
        records_data = request.data.get("records", [])

        if not isinstance(records_data, list):
            raise ValidationError({"records": "Expected a list of records."})

        for record_data in records_data:
            if not isinstance(record_data, dict):
                raise ValidationError({"records": "Each record must be an object."})
            if "user" not in record_data or "present" not in record_data:
                raise ValidationError(
                    {"records": "Each record must have 'user' and 'present' fields."}
                )
            AttendanceRecord.objects.update_or_create(
                session=session,
                user_id=record_data["user"],
                defaults={"present": record_data["present"]},
            )

        records = AttendanceRecord.objects.filter(session=session)
        serializer = AttendanceRecordSerializer(records, many=True)
        return Response(serializer.data)


class AttendanceRecordViewset(viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filterset_fields = ("session",)
    permission_classes = (KolibriAuthPermissions,)
    queryset = AttendanceRecord.objects.all()
