import ipaddress
import json

from rest_framework import serializers
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.decorators import throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from kolibri.utils import conf

from .constants import FRONTEND
from .models import ErrorReport
from .serializers import FrontendContextSerializer
from .utils.request import content_length
from .utils.scrubber import scrub_frontend_context

MAX_CONTEXT_SIZE = 64 * 1024

# Headroom over MAX_CONTEXT_SIZE for the breadcrumbs dropped to fit it.
MAX_REQUEST_BODY_SIZE = 4 * MAX_CONTEXT_SIZE

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


def _is_loopback(address):
    try:
        return ipaddress.ip_address(address).is_loopback
    except ValueError:
        return False


def _client_address(request):
    # DRF's get_ident trusts client-supplied X-Forwarded-For unless NUM_PROXIES
    # is set. nginx proxy_pass connects from loopback and appends the client
    # address as the last X-Forwarded-For entry.
    remote_addr = request.META.get("REMOTE_ADDR")
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for and _is_loopback(remote_addr):
        return forwarded_for.split(",")[-1].strip()
    return remote_addr


class ErrorReportThrottle(SimpleRateThrottle):
    """
    Throttle error report submissions by client address - the endpoint is
    deliberately unauthenticated, so this bounds abuse. The default rate
    allows a full flush of the frontend error queue (50 entries) with
    headroom.
    """

    scope = "error_reports"

    def get_rate(self):
        return conf.OPTIONS["ErrorReports"]["SUBMISSION_RATE"]

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": _client_address(request),
        }


@api_view(["POST"])
@throttle_classes([ErrorReportThrottle])
def report(request):
    # DRF reads the body straight from the WSGI stream, so Django's
    # DATA_UPLOAD_MAX_MEMORY_SIZE does not bound it.
    if content_length(request) > MAX_REQUEST_BODY_SIZE:
        return Response(status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
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
