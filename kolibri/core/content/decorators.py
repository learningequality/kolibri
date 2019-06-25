from six.moves.urllib.parse import urlparse
from six.moves.urllib.parse import urlunparse

from kolibri.utils.conf import OPTIONS


def add_security_headers(some_func):
    """
    Decorator for adding security headers to zipcontent endpoints
    """

    def wrapper_func(request, *args, **kwargs):

        response = some_func(request, *args, **kwargs)

        try:
            request = args[0]
            request = kwargs.get("request", request)
        except IndexError:
            request = kwargs.get("request", None)

        if request and response:
            _add_access_control_headers(request, response)
            _add_content_security_policy_header(request, response)

        return response

    return wrapper_func


def _add_access_control_headers(request, response):
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    requested_headers = request.META.get("HTTP_ACCESS_CONTROL_REQUEST_HEADERS", "")
    if requested_headers:
        response["Access-Control-Allow-Headers"] = requested_headers


def _add_content_security_policy_header(request, response):
    # restrict CSP to only allow resources to be loaded from the Kolibri host, to prevent info leakage
    # (e.g. via passing user info out as GET parameters to an attacker's server), or inadvertent data usage
    host = get_host(request)
    response["Content-Security-Policy"] = (
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: " + host
    )


def get_host(request):
    parsed_referrer_url = get_referrer_url(request)
    if parsed_referrer_url:
        host = urlunparse(
            (parsed_referrer_url[0], parsed_referrer_url[1], "", "", "", "")
        )
    else:
        host = request.build_absolute_uri(OPTIONS["Deployment"]["URL_PATH_PREFIX"])
    return host.strip("/")


def get_referrer_url(request):
    if request.META.get("HTTP_REFERER"):
        # If available use HTTP_REFERER to infer the host as that will give us more
        # information if Kolibri is behind a proxy.
        return urlparse(request.META.get("HTTP_REFERER"))
