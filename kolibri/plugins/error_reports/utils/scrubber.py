"""
Vendored and modified from sentry-sdk's scrubber.py
Original source: https://github.com/getsentry/sentry-python
Original license: MIT License
"""

from urllib.parse import urlsplit
from urllib.parse import urlunsplit

# Bounds recursion on pathologically nested (attacker-controlled) bodies,
# while staying deeper than any context we construct.
MAX_SCRUB_DEPTH = 20

BREADCRUMB_URL_KEYS = ("url", "from", "to")


def _normalize_key(key):
    return key.lower().replace("-", "_")


_DENYLIST_SOURCE = [
    # stolen from relay
    "password",
    "passwd",
    "secret",
    "api_key",
    "apikey",
    "auth",
    "credentials",
    "mysql_pwd",
    "privatekey",
    "private_key",
    "token",
    "session",
    # django
    "csrftoken",
    "sessionid",
    # wsgi
    "x_csrftoken",
    "x_forwarded_for",
    "set_cookie",
    "cookie",
    "authorization",
    "x_api_key",
    # other common names used in the wild
    "aiohttp_session",  # aiohttp
    "connect.sid",  # Express
    "csrf_token",  # Pyramid
    "csrf",  # (this is a cookie name used in accepted answers on stack overflow)
    "_csrf",  # Express
    "_csrf_token",  # Bottle
    "PHPSESSID",  # PHP
    "_session",  # Sanic
    "symfony",  # Symfony
    "user_session",  # Vue
    "_xsrf",  # Tornado
    "XSRF-TOKEN",  # Angular, Laravel
    # kolibri
    "pin_code",
    "picture_password",
    "auth_token",
    # PII
    "x_real_ip",
    "ip_address",
    "remote_addr",
    "username",
    "full_name",
    "birth_year",
    "id_number",
    "gender",
    "extra_demographics",
    "search",  # FacilityUserViewSet searches username and full_name
    # PII in task extra_metadata
    "started_by_username",
    "user_full_name",
    "user_fullname",
]

# Normalize with the same transform applied to keys at match time, so
# uppercase/dashed entries (XSRF-TOKEN, PHPSESSID) aren't left dead.
DEFAULT_DENYLIST = frozenset(_normalize_key(key) for key in _DENYLIST_SOURCE)

FILTERED = "[filtered for security]"


def scrub_data(data, denylist=DEFAULT_DENYLIST, _depth=0):
    if _depth >= MAX_SCRUB_DEPTH:
        return
    if isinstance(data, dict):
        for key, value in list(data.items()):
            if isinstance(key, str) and _normalize_key(key) in denylist:
                data[key] = FILTERED
            else:
                scrub_data(value, denylist, _depth + 1)
    elif isinstance(data, list):
        for item in data:
            scrub_data(item, denylist, _depth + 1)


def sanitize_url(url):
    """
    Drop the userinfo, query string and fragment from a URL, keeping only the
    scheme, host and path. The scrubber filters dict keys but cannot redact
    sensitive values embedded in a URL string (credentials, a token in a query
    parameter, or in a hash route), so they are removed wholesale. For the page
    URL, the frontend route is captured separately in the report's route
    context.
    """
    if not isinstance(url, str):
        return url
    try:
        parts = urlsplit(url)
    except ValueError:
        return ""
    host = parts.netloc.rpartition("@")[2]
    return urlunsplit((parts.scheme, host, parts.path, "", ""))


def scrub_frontend_context(context):
    """
    Scrub a frontend-submitted context in place before it is stored. Frontend
    reports do not pass through the request scrubbing the backend path applies,
    so the same key-based scrub is run here, and the query string and fragment
    are dropped from the page and breadcrumb URLs where a token could otherwise
    be captured.
    """
    if not isinstance(context, dict):
        return context
    scrub_data(context)
    request = context.get("request")
    if isinstance(request, dict) and "url" in request:
        request["url"] = sanitize_url(request["url"])
    breadcrumbs = context.get("breadcrumbs")
    values = breadcrumbs.get("values") if isinstance(breadcrumbs, dict) else None
    for crumb in values if isinstance(values, list) else []:
        data = crumb.get("data") if isinstance(crumb, dict) else None
        if not isinstance(data, dict):
            continue
        for key in BREADCRUMB_URL_KEYS:
            if key in data:
                data[key] = sanitize_url(data[key])
    return context
