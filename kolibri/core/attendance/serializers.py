from collections import OrderedDict

from rest_framework import serializers

from kolibri.core.attendance.models import AttendanceRecord
from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.auth.models import FacilityUser


class AttendanceSessionSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(
        read_only=False,
        queryset=FacilityUser.objects.all(),
    )

    class Meta:
        model = AttendanceSession
        fields = (
            "id",
            "collection",
            "date",
            "session_number",
            "created_by",
            "date_created",
        )
        read_only_fields = ("id", "session_number", "date_created")

    def to_internal_value(self, data):
        data = OrderedDict(data)
        data["created_by"] = self.context["request"].user.id
        return super().to_internal_value(data)


class AttendanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = (
            "id",
            "session",
            "user",
            "present",
        )
        read_only_fields = ("id",)
