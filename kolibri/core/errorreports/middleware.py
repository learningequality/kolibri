import logging
import time
import traceback
from sys import version_info

if version_info < (3, 10):
    from importlib_metadata import distributions
else:
    from importlib.metadata import distributions

from django.core.exceptions import ValidationError
from django.db import IntegrityError

from .constants import BACKEND
from .models import ErrorReports


def get_request_info(request):
    # checked the codebase and found these are the sensitive headers
    request_headers = dict(request.headers)
    request_headers.pop("X-Csrftoken", None)
    request_headers.pop("Cookie", None)

    request_get = dict(request.GET)
    request_get.pop("token", None)

    return {
        "url": request.build_absolute_uri(),
        "method": request.method,
        "headers": request_headers,
        "body": request.body.decode("utf-8"),
        "query_params": request_get,
    }


def get_server_info(request):
    return {"host": request.get_host(), "port": request.get_port()}


def get_packages():
    packages = [f"{dist.metadata['Name']}=={dist.version}" for dist in distributions()]
    return packages


def get_python_version():
    return "{major}.{minor}.{micro}".format(
        major=version_info.major, minor=version_info.minor, micro=version_info.micro
    )


def get_request_time_to_error(request):
    return time.time() - request.start_time


class ErrorReportingMiddleware:
    """
    Middleware to log exceptions to the database.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logging.getLogger(__name__)

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_exception(self, request, exception):
        error_message = str(exception)
        traceback_info = traceback.format_exc()
        context = {
            "request_info": get_request_info(request),
            "server": get_server_info(request),
            "packages": get_packages(),
            "python_version": get_python_version(),
            "avg_request_time_to_error": get_request_time_to_error(request),
        }
        self.logger.error("Unexpected Error: %s", error_message)
        try:
            self.logger.error("Saving error report to the database.")
            ErrorReports.insert_or_update_error(
                BACKEND,
                error_message,
                traceback_info,
                context,
            )
        except (IntegrityError, ValidationError) as e:
            self.logger.error(
                "Error occurred while saving error report to the database: %s", str(e)
            )


class PreRequestMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        request.start_time = time.time()
