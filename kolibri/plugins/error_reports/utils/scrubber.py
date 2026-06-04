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
    # PII
    "x_real_ip",
    "ip_address",
    "remote_addr",
]

# Normalize with the same transform applied to keys at match time, so
# uppercase/dashed entries (XSRF-TOKEN, PHPSESSID) aren't left dead.
DEFAULT_DENYLIST = frozenset(_normalize_key(key) for key in _DENYLIST_SOURCE)


def scrub_data(data, denylist=DEFAULT_DENYLIST, _depth=0):
    if _depth >= MAX_SCRUB_DEPTH:
        return
    if isinstance(data, dict):
        for key, value in list(data.items()):
            if isinstance(key, str) and _normalize_key(key) in denylist:
                data[key] = "[filtered for security]"
            else:
                scrub_data(value, denylist, _depth + 1)
    elif isinstance(data, list):
        for item in data:
            scrub_data(item, denylist, _depth + 1)


def sanitize_url(url):
    """
    Drop the query string and fragment from a URL, keeping only the scheme,
    host and path. The scrubber filters dict keys but cannot redact sensitive
    values embedded in a URL string (a token in a query parameter, or in a
    hash route), so they are removed wholesale. The frontend route is captured
    separately in the report's route context, so nothing is lost here.
    """
    if not isinstance(url, str):
        return url
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def scrub_frontend_context(context):
    """
    Scrub a frontend-submitted context in place before it is stored. Frontend
    reports do not pass through the request scrubbing the backend path applies,
    so the same key-based scrub is run here, and the query string and fragment
    are dropped from the page URL where a token could otherwise be captured.
    """
    if not isinstance(context, dict):
        return context
    scrub_data(context)
    request = context.get("request")
    if isinstance(request, dict) and "url" in request:
        request["url"] = sanitize_url(request["url"])
    return context
