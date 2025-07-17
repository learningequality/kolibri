"""
Vendored and modified from sentry-sdk's scrubber.py
Original source: https://github.com/getsentry/sentry-python
Original license: MIT License
"""

DEFAULT_DENYLIST = [
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
    "x_forwarded_for",
    "x_real_ip",
    "ip_address",
    "remote_addr",
]


def scrub_data(data, denylist=DEFAULT_DENYLIST):
    if isinstance(data, dict):
        for key, value in list(data.items()):
            if isinstance(key, str) and key.lower().replace("-", "_") in denylist:
                data[key] = "[filtered for security]"
            else:
                scrub_data(value, denylist)
    elif isinstance(data, list):
        for item in data:
            scrub_data(item, denylist)
