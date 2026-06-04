import json

from rest_framework import serializers
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.decorators import throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from .constants import FRONTEND
from .models import ErrorReport
from .serializers import FrontendContextSerializer
from .utils.scrubber import scrub_frontend_context

MAX_CONTEXT_SIZE = 64 * 1024

MAX_OCCURRENCES_PER_REPORT = 1000


def _encoded_size(value):
    return len(json.dumps(value, ensure_ascii=False).encode("utf-8"))


class ErrorReportSerializer(serializers.Serializer):
    context = FrontendContextSerializer()
    submission_id = serializers.UUIDField(required=False)

    def validate_context(self, value):
        breadcrumbs = value.get("breadcrumbs", {}).get("values", [])
        size = _encoded_size(value)
        while size > MAX_CONTEXT_SIZE and breadcrumbs:
            size -= _encoded_size(breadcrumbs.pop(0))
        if _encoded_size(value) > MAX_CONTEXT_SIZE:
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
    serializer.is_valid(raise_exception=True)
    context = scrub_frontend_context(serializer.validated_data["context"])
    deduplication = context.pop("deduplication", None)
    occurrences = (
        min(deduplication["count"], MAX_OCCURRENCES_PER_REPORT) if deduplication else 1
    )
    error = ErrorReport.insert_or_update_error(
        FRONTEND,
        context,
        occurrences=occurrences,
        submission_id=serializer.validated_data.get("submission_id"),
    )
    return Response(
        {"error_id": error.id if error else None}, status=status.HTTP_200_OK
    )
