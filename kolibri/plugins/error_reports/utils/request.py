"""
Vendored and adapted from sentry-sdk's request extraction utilities.
Original source: https://github.com/getsentry/sentry-python
Original license: MIT License

This module provides utilities for safely extracting request data,
handling cases where the request body has already been read.
"""

import json
import logging

from django.http.request import RawPostDataException

from .scrubber import scrub_data

logger = logging.getLogger(__name__)

# Maximum body size to capture (in bytes)
MAX_BODY_SIZE = 65536  # 64KB


def get_request_body(request):
    """
    Safely extract the request body, handling cases where it has
    already been consumed by Django REST Framework or other middleware.

    Returns:
        The parsed body (dict for JSON), raw body (str), or None
    """
    content_type = request.headers.get("Content-Type", "").lower()

    # First, try to get raw body
    raw_body = _get_raw_body(request)

    # If raw body failed, try parsed body (DRF's .data)
    if raw_body is None:
        return _get_parsed_body(request)

    # Treat an empty body as no body
    if not raw_body:
        return None

    # If we have raw body and it's JSON, parse it
    if "application/json" in content_type:
        return _parse_json_body(raw_body)

    # For non-JSON, return as string (with size limit)
    if isinstance(raw_body, bytes):
        try:
            return raw_body.decode("utf-8")[:MAX_BODY_SIZE]
        except UnicodeDecodeError:
            return None

    return raw_body


def _get_raw_body(request):
    """
    Attempt to read the raw request body.
    Returns None if the body has already been consumed.
    """
    try:
        body = request.body
        if len(body) > MAX_BODY_SIZE:
            logger.debug("Request body exceeds size limit, truncating")
            return body[:MAX_BODY_SIZE]
        return body
    except RawPostDataException:
        # Body was already read by DRF or another component
        logger.debug("Request body already consumed, trying fallback")
        return None
    except Exception as e:
        logger.debug("Error reading request body: %s", e)
        return None


def _get_parsed_body(request):
    """
    Try to get the parsed body from DRF's .data attribute.
    Falls back to request.POST for form data.
    """
    # Try DRF's cached .data property
    try:
        data = request.data
        if isinstance(data, dict):
            return dict(data)
        return data
    except AttributeError:
        pass
    except Exception as e:
        logger.debug("Error accessing request.data: %s", e)

    # Fall back to POST data for form submissions
    try:
        if request.POST:
            return dict(request.POST)
    except Exception as e:
        logger.debug("Error accessing request.POST: %s", e)

    return None


def _parse_json_body(raw_body):
    """
    Parse raw body as JSON.
    """
    try:
        if isinstance(raw_body, bytes):
            raw_body = raw_body.decode("utf-8")
        return json.loads(raw_body)
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        logger.debug("Error parsing JSON body: %s", e)
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

    # Get body using safe extraction
    body = get_request_body(request)
    if body is not None:
        context["body"] = body

    # Scrub sensitive data
    scrub_data(context)

    return context
