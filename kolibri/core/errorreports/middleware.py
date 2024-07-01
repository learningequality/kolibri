import logging
import traceback
from sys import version

import pkg_resources
from django.db import IntegrityError

from .constants import BACKEND
from .models import ErrorReports


def get_request_info(request):
    return {
        "url": request.build_absolute_uri(),
        "method": request.method,
        "headers": dict(request.headers),
        "body": request.body.decode("utf-8"),
    }


def get_server_info(request):
    return {"host": request.get_host(), "port": request.get_port()}


def get_packages():
    return {dist.project_name: dist.version for dist in pkg_resources.working_set}


def get_python_version():
    return version.split()[0]


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
        }
        self.logger.error("Unexpected Error: %s", error_message)

        try:
            self.logger.error("Saving error report to the database.")
            ErrorReports.insert_or_update_error(
                BACKEND, error_message, traceback_info, context_backend=context
            )
            self.logger.info("Error report saved to the database.")
        except IntegrityError as e:
            self.logger.error(
                "Error occurred while saving error report to the database: %s", str(e)
            )
