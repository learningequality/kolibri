import logging
import traceback

from django.conf import settings
from django.db import IntegrityError

from .models import ErrorReports


class ErrorReportingMiddleware:
    """
    Middleware to log exceptions to the database.
    ref: https://docs.djangoproject.com/en/5.0/topics/http/middleware/#writing-your-own-middleware
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
        self.logger.error("Unexpected Error %s", error_message)
        # do not write to the database if dev's mode, development is a market for errors
        if not settings.DEVELOPER_MODE:
            try:
                self.logger.error("Saving error report to the database.")
                ErrorReports.insert_or_update_error(
                    "Backend", error_message, traceback_info
                )
                self.logger.info("Error report saved to the database.")
            except IntegrityError:
                self.logger.error(
                    "Error occurred while saving error report to the database."
                )
        else:
            self.logger.error(
                "Developer mode is enabled. Error report will not be saved to the database."
            )
