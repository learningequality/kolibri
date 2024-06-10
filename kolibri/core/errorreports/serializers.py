from rest_framework import serializers


class ErrorReportSerializer(serializers.Serializer):
    error_message = serializers.CharField(max_length=255)
    traceback = serializers.CharField()
