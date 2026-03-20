from django.db import transaction
from django.db.models import Count
from django.db.models import F
from django.db.models import Q
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import IsoDateTimeFilter
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import BooleanField
from rest_framework.serializers import CharField
from rest_framework.serializers import ListSerializer
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import Serializer
from rest_framework.serializers import ValidationError

from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.api import ValuesViewset
from kolibri.core.attendance.models import AttendanceRecord
from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.attendance.serializers import AttendanceSessionSerializer
from kolibri.core.auth.api import _ensure_raw_dict
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.api import OptionalPageNumberPagination
from kolibri.core.auth.models import FacilityUser


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


class AttendanceRecordFilter(FilterSet):
    attendance_session = CharFilter(field_name="attendance_session_id")

    class Meta:
        model = AttendanceRecord
        fields = ["attendance_session"]


class BulkUpdateRecordSerializer(Serializer):
    user = CharField()
    present = BooleanField()


class BulkUpdateSerializer(Serializer):
    attendance_session = PrimaryKeyRelatedField(
        queryset=AttendanceSession.objects.all()
    )
    records = ListSerializer(child=BulkUpdateRecordSerializer())

    def validate(self, data):
        records = data.get("records", [])
        user_ids = {r["user"] for r in records}
        existing_ids = set(
            FacilityUser.objects.filter(id__in=user_ids).values_list("id", flat=True)
        )
        missing = user_ids - {str(uid) for uid in existing_ids}
        if missing:
            raise ValidationError(
                {"records": f"Invalid user IDs: {', '.join(sorted(missing))}"}
            )
        return data


class AttendanceRecordViewSet(ReadOnlyValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filterset_class = AttendanceRecordFilter

    values = (
        "id",
        "user",
        "present",
        "attendance_session",
        "user_name",
        "user_username",
    )

    def annotate_queryset(self, queryset):
        return queryset.annotate(
            user_name=F("user__full_name"),
            user_username=F("user__username"),
        )

    def get_queryset(self):
        return AttendanceRecord.objects.all()

    def get_permissions(self):
        if self.action == "bulk_update":
            return [IsAuthenticated()]
        return super().get_permissions()

    @action(detail=False, methods=["post"])
    def bulk_update(self, request):
        serializer = BulkUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = serializer.validated_data["attendance_session"]
        if not request.user.can_update(session):
            self.permission_denied(request)
        records_data = serializer.validated_data["records"]
        user_to_present = {r["user"]: r["present"] for r in records_data}
        user_ids = list(user_to_present.keys())
        with transaction.atomic():
            existing = {
                str(uid)
                for uid in AttendanceRecord.objects.filter(
                    attendance_session=session, user_id__in=user_ids
                ).values_list("user_id", flat=True)
            }
            for present_val in (True, False):
                batch_user_ids = [
                    uid
                    for uid, p in user_to_present.items()
                    if p == present_val and uid in existing
                ]
                if batch_user_ids:
                    AttendanceRecord.objects.filter(
                        attendance_session=session, user_id__in=batch_user_ids
                    ).update(present=present_val)
            records_to_create = []
            for user_id, present in user_to_present.items():
                if user_id not in existing:
                    record = AttendanceRecord(
                        attendance_session=session,
                        user_id=user_id,
                        present=present,
                        dataset_id=session.dataset_id,
                    )
                    record.id = record.calculate_uuid()
                    records_to_create.append(record)
            if records_to_create:
                AttendanceRecord.objects.bulk_create(records_to_create)
        all_records = self.annotate_queryset(
            AttendanceRecord.objects.filter(
                attendance_session=session, user_id__in=user_ids
            )
        ).values(*self.values)
        return Response(list(all_records))
