import logging

from django.db import transaction
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import BooleanField
from rest_framework.serializers import CharField
from rest_framework.serializers import ListSerializer
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import Serializer
from rest_framework.serializers import ValidationError

from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.attendance.models import AttendanceRecord
from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.permissions import KolibriAuthPermissionsFilter
from kolibri.core.serializers import HexOnlyUUIDField

logger = logging.getLogger(__name__)


class AttendanceRecordReadSerializer(ModelSerializer):
    user_name = CharField(source="user__full_name", read_only=True)
    user_username = CharField(source="user__username", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = (
            "id",
            "user",
            "present",
            "attendance_session",
            "user_name",
            "user_username",
        )


class AttendanceRecordFilter(FilterSet):
    attendance_session = CharFilter(field_name="attendance_session_id")

    class Meta:
        model = AttendanceRecord
        fields = ["attendance_session"]


class BulkUpdateRecordSerializer(Serializer):
    user = HexOnlyUUIDField()
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
        missing = user_ids - existing_ids
        if missing:
            raise ValidationError(
                {"records": f"Invalid user IDs: {', '.join(sorted(missing))}"}
            )
        return data


class AttendanceRecordViewSet(ReadOnlyValuesViewset):
    serializer_class = AttendanceRecordReadSerializer
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filterset_class = AttendanceRecordFilter

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
                        # bulk_create skips pre_save, so dataset_id must be set explicitly for Morango partitioning (#14242)
                        dataset_id=session.dataset_id,
                    )
                    # bulk_create skips pre_save, so Morango sync UUID must be generated manually (#14242)
                    record.id = record.calculate_uuid()
                    records_to_create.append(record)
            if records_to_create:
                AttendanceRecord.objects.bulk_create(records_to_create)
        all_records = AttendanceRecord.objects.filter(
            attendance_session=session, user_id__in=user_ids
        )
        return Response(self.serialize(all_records))
