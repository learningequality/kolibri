from django.db import transaction
from rest_framework import serializers

from kolibri.core.attendance.models import AttendanceRecord
from kolibri.core.attendance.models import AttendanceSession
from kolibri.utils.time_utils import local_now


class AttendanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = ("id", "user", "present")
        read_only_fields = ("id",)


class AttendanceSessionSerializer(serializers.ModelSerializer):
    attendance_records = AttendanceRecordSerializer(many=True)
    session_start_datetime = serializers.DateTimeField(required=False)
    date_created = serializers.DateTimeField(read_only=True)
    date_modified = serializers.DateTimeField(read_only=True)

    class Meta:
        model = AttendanceSession
        fields = (
            "id",
            "collection",
            "created_by",
            "session_start_datetime",
            "date_created",
            "date_modified",
            "attendance_records",
        )
        read_only_fields = ("id", "date_created", "created_by")

    def create(self, validated_data):
        records_data = validated_data.pop("attendance_records")
        validated_data["created_by"] = self.context["request"].user
        with transaction.atomic():
            session = AttendanceSession.objects.create(**validated_data)
            for record_data in records_data:
                AttendanceRecord.objects.create(
                    attendance_session=session, **record_data
                )
        return session

    def update(self, instance, validated_data):
        records_data = validated_data.pop("attendance_records", None)
        instance.date_modified = local_now()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if records_data is not None:
            for record_data in records_data:
                AttendanceRecord.objects.update_or_create(
                    attendance_session=instance,
                    user=record_data["user"],
                    defaults={"present": record_data["present"]},
                )
        return instance
