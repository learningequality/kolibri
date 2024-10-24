from rest_framework import serializers

from kolibri.core.error_reports.models import ErrorReport


class ErrorReportSerializer(serializers.ModelSerializer):
    context = serializers.JSONField()

    class Meta:
        model = ErrorReport
        fields = ["error_message", "traceback", "context"]
