import logging

from django.db import transaction
from django.db.models import Count
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import IsoDateTimeFilter
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import BooleanField
from rest_framework.serializers import IntegerField
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import PrimaryKeyRelatedField

from kolibri.core.api import ValuesViewset
from kolibri.core.attendance.models import AttendanceRecord
from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions import _ensure_raw_dict
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.permissions import KolibriAuthPermissionsFilter
from kolibri.core.serializers import DateTimeTzField
from kolibri.core.utils.pagination import OptionalPageNumberPagination

logger = logging.getLogger(__name__)


class AttendanceRecordSerializer(ModelSerializer):
    user = PrimaryKeyRelatedField(queryset=FacilityUser.objects.all())
    present = BooleanField(default=False)

    class Meta:
        model = AttendanceRecord
        fields = ("id", "user", "present")


class AttendanceSessionSerializer(ModelSerializer):
    attendance_records = AttendanceRecordSerializer(
        many=True, required=False, write_only=True
    )
    collection = PrimaryKeyRelatedField(queryset=Collection.objects.all())
    session_start_datetime = DateTimeTzField(required=False)
    present_count = IntegerField(read_only=True)
    total_count = IntegerField(read_only=True)

    class Meta:
        model = AttendanceSession
        fields = (
            "id",
            "collection",
            "created_by",
            "session_start_datetime",
            "attendance_records",
            "date_created",
            "date_modified",
            "present_count",
            "total_count",
        )
        read_only_fields = ("created_by", "date_created", "date_modified")

    def validate(self, attrs):
        if not self.instance and "request" in self.context:
            attrs["created_by"] = self.context["request"].user
        return attrs

    def create(self, validated_data):
        records_data = validated_data.pop("attendance_records", [])
        with transaction.atomic():
            session = AttendanceSession.objects.create(**validated_data)
            for record_data in records_data:
                AttendanceRecord.objects.create(
                    attendance_session=session, **record_data
                )
        return session

    def update(self, instance, validated_data):
        records_data = validated_data.pop("attendance_records", None)
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            if records_data is not None:
                for record_data in records_data:
                    AttendanceRecord.objects.update_or_create(
                        attendance_session=instance,
                        user=record_data["user"],
                        defaults={"present": record_data.get("present", False)},
                    )
        return instance


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
        # Guard ensures anonymous users always get 403, not 400 from to_internal_value (#14230)
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
        return Response(self.serialize_queryset(queryset))
