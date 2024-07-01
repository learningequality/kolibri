from rest_framework import serializers

from .schemas import context_frontend_schema
from kolibri.core.utils.validators import JSON_Schema_Validator


class ErrorReportSerializer(serializers.Serializer):
    error_message = serializers.CharField(max_length=255)
    traceback = serializers.CharField()
    context = serializers.JSONField(
        validators=[JSON_Schema_Validator(context_frontend_schema)]
    )
