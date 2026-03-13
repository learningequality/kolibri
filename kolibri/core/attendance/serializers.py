from django.db import transaction
from rest_framework.serializers import BooleanField
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import PrimaryKeyRelatedField

from kolibri.core.attendance.models import AttendanceRecord
from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.serializers import DateTimeTzField


class AttendanceRecordSerializer(ModelSerializer):
    user = PrimaryKeyRelatedField(queryset=FacilityUser.objects.all())
    present = BooleanField(default=False)

    class Meta:
        model = AttendanceRecord
        fields = ("id", "user", "present")


class AttendanceSessionSerializer(ModelSerializer):
    attendance_records = AttendanceRecordSerializer(many=True, required=False)
    collection = PrimaryKeyRelatedField(queryset=Collection.objects.all())
    session_start_datetime = DateTimeTzField(required=False)

    class Meta:
        model = AttendanceSession
        fields = (
            "id",
            "collection",
            "created_by",
            "session_start_datetime",
            "attendance_records",
        )
        read_only_fields = ("created_by",)

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
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            if records_data is not None:
                for record_data in records_data:
                    AttendanceRecord.objects.update_or_create(
                        attendance_session=instance,
                        user=record_data["user"],
                        defaults={"present": record_data.get("present", False)},
                    )
        return instance
