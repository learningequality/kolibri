from rest_framework import serializers

from .models import ErrorReports


class ErrorReportSerializer(serializers.ModelSerializer):
    context = serializers.JSONField()

    class Meta:
        model = ErrorReports
        fields = ["error_message", "traceback", "context"]
