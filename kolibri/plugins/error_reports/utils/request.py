"""
Vendored and adapted from sentry-sdk's request extraction utilities.
Original source: https://github.com/getsentry/sentry-python
Original license: MIT License

This module provides utilities for safely extracting request data,
handling cases where the request body has already been read.
"""

import json
import logging
import weakref

from django.http.request import RawPostDataException
from rest_framework.views import APIView

from ..serializers import bounded_json_or_none
from .scrubber import sanitize_url
from .scrubber import scrub_data

logger = logging.getLogger(__name__)

# Maximum body size to capture (in bytes)
MAX_BODY_SIZE = 65536  # 64KB

DRF_REQUEST_BACKREF = "_error_reports_drf_request"

FILE_PLACEHOLDER = "[file]"

FORM_CONTENT_TYPES = ("application/x-www-form-urlencoded", "multipart/form-data")


def patch_drf_request_backref():
    """
    Adapted from sentry-sdk's ``_patch_drf`` in
    sentry_sdk/integrations/django/__init__.py. got_request_exception receives
    the Django request, whose body DRF has already consumed; the backref lets
    the parsed ``.data`` be read from the DRF request instead.
    """
    original_initial = APIView.initial

    def initial(self, request, *args, **kwargs):
        setattr(request._request, DRF_REQUEST_BACKREF, weakref.ref(request))
        return original_initial(self, request, *args, **kwargs)

    APIView.initial = initial


def get_request_body(request):
    """
    Extract the request body as structured data the key-based scrubber can
    redact: parsed JSON, or form fields with uploaded files replaced by a
    placeholder. Any other body is not captured, as values inside a raw
    string cannot be scrubbed.
    """
    content_type = request.headers.get("Content-Type", "").lower()
    if "application/json" in content_type:
        body = _get_json_body(request)
    elif content_type.startswith(FORM_CONTENT_TYPES):
        body = _get_form_body(request)
    else:
        return None
    body = bounded_json_or_none(body)
    if body is not None and len(json.dumps(body)) > MAX_BODY_SIZE:
        return None
    return body


def _get_json_body(request):
    try:
        raw_body = request.body
    except RawPostDataException:
        return _get_drf_data(request)
    except Exception:
        logger.debug("Error reading request body.", exc_info=True)
        return None
    if not raw_body or len(raw_body) > MAX_BODY_SIZE:
        return None
    return _parse_json_body(raw_body)


def _get_drf_data(request):
    backref = getattr(request, DRF_REQUEST_BACKREF, None)
    drf_request = backref() if backref is not None else None
    if drf_request is None:
        return None
    try:
        return drf_request.data
    except Exception:
        logger.debug("Error accessing DRF request data.", exc_info=True)
        return None


def _get_form_body(request):
    try:
        body = dict(request.POST)
        body.update(dict.fromkeys(request.FILES, FILE_PLACEHOLDER))
    except Exception:
        logger.debug("Error reading form data.", exc_info=True)
        return None
    return body or None


def _parse_json_body(raw_body):
    """
    Parse raw body as JSON.
    """
    try:
        if isinstance(raw_body, bytes):
            raw_body = raw_body.decode("utf-8")
        return json.loads(raw_body)
    except (json.JSONDecodeError, UnicodeDecodeError, RecursionError):
        logger.debug("Error parsing JSON body.", exc_info=True)
        return None


def extract_request_info(request):
    """
    Extract complete request information for error reporting.
    This is the main entry point for request data extraction.

    Returns:
        dict: Request information with sensitive data scrubbed
    """
    context = {
        # The query string is deliberately excluded from the url - the
        # scrubber only filters dict keys, so sensitive values would
        # survive embedded in the url string. Query params are captured
        # (and scrubbed) separately in query_params.
        "url": request.build_absolute_uri(request.path),
        "method": request.method,
        "headers": dict(request.headers),
        "query_params": dict(request.GET),
        "body": None,
    }
    if "Referer" in context["headers"]:
        context["headers"]["Referer"] = sanitize_url(context["headers"]["Referer"])

    # Get body using safe extraction
    body = get_request_body(request)
    if body is not None:
        context["body"] = body

    # Scrub sensitive data
    scrub_data(context)

    return context
