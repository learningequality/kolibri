import logging
import traceback

from django.db import IntegrityError

from .constants import BACKEND
from .models import ErrorReports


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
        self.logger.error("Unexpected Error: %s", error_message)

        try:
            self.logger.error("Saving error report to the database.")
            ErrorReports.insert_or_update_error(BACKEND, error_message, traceback_info)
            self.logger.info("Error report saved to the database.")
        except IntegrityError:
            self.logger.error(
                "Error occurred while saving error report to the database."
            )
