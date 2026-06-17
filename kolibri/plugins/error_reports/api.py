import json
import logging

from django.core.exceptions import ValidationError
from rest_framework import serializers
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.decorators import throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from .constants import FRONTEND
from .models import ErrorReport
from .utils.scrubber import scrub_frontend_context

logger = logging.getLogger(__name__)

# Cap on the serialized size of a submitted context - the endpoint is
# unauthenticated and the whole report now lives in the context, which is
# stored as-is, so without this the row cap bounds the number of stored
# reports but not their size. Far above any legitimate frontend context
# (breadcrumbs are capped client-side at 30 entries of ~300 bytes).
MAX_CONTEXT_SIZE = 64 * 1024


class ErrorReportSerializer(serializers.Serializer):
    # The frontend submits a Sentry-event-shaped context; the exception
    # message, type and stack live inside it, so there are no top-level
    # identity fields. The model derives the dedup identity from the context.
    context = serializers.JSONField()

    def validate_context(self, value):
        if len(json.dumps(value)) > MAX_CONTEXT_SIZE:
            raise serializers.ValidationError("Context too large.")
        return value


class ErrorReportThrottle(SimpleRateThrottle):
    """
    Throttle error report submissions by client address - the endpoint is
    deliberately unauthenticated, so this bounds abuse. The rate allows a
    full flush of the frontend error queue (50 entries) with headroom.
    """

    scope = "error_reports"
    rate = "100/min"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


@api_view(["POST"])
@throttle_classes([ErrorReportThrottle])
def report(request):
    serializer = ErrorReportSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data
        # The frontend context does not pass through the request scrubbing the
        # backend path applies, so scrub it here at the trust boundary before
        # it is stored and later submitted off-device.
        context = scrub_frontend_context(data["context"])
        try:
            error = ErrorReport.insert_or_update_error(FRONTEND, context)
            return Response(
                {"error_id": error.id if error else None}, status=status.HTTP_200_OK
            )

        except ValidationError:
            logger.error("Error while saving error report.", exc_info=True)
            return Response(
                {"error": "An error occurred while saving errors."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
