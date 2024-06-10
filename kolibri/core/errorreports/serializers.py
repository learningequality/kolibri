from rest_framework import serializers

from .models import ErrorReports


class ErrorReportSerializer(serializers.Serializer):
    error_from = serializers.ChoiceField(choices=ErrorReports.POSSIBLE_ERRORS)
    error_message = serializers.CharField(max_length=255)
    traceback = serializers.CharField()
