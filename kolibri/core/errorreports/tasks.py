import logging

from django.db import connection
from django.http import JsonResponse

from .models import ErrorReports
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationConnectionFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseTimeout
from kolibri.core.tasks.decorators import register_task

logger = logging.getLogger(__name__)

DEFAULT_SERVER_URL = "https://telemetry.learningequality.org"

DEFAULT_PING_JOB_ID = "10"  # Unsure about this value

client = NetworkClient(DEFAULT_SERVER_URL)


def serialize_error_reports_to_json_response(errors):
    errors_list = []
    for error in errors:
        errors_list.append(
            {
                "error_from": error.error_from,
                "error_message": error.error_message,
                "traceback": error.traceback,
                "first_occurred": error.first_occurred,
                "last_occurred": error.last_occurred,
                "sent": error.sent,
                "no_of_errors": error.no_of_errors,
            }
        )
    return JsonResponse(errors_list, safe=False)


def markErrorsAsSent(errors):
    for error in errors:
        error.mark_as_sent()


@register_task(job_id=DEFAULT_PING_JOB_ID)
def ping_error_reports():
    try:
        errors = ErrorReports.get_unsent_errors()
        errors_json = serialize_error_reports_to_json_response(errors)
        client.post(
            "/api/errorreports/",
            data=errors_json.content,
            headers={"Content-Type": "application/json"},
        )
        markErrorsAsSent(errors)
    except NetworkLocationConnectionFailure:
        logger.warning("Reporting Error failed (could not connect).")
        raise
    except NetworkLocationResponseTimeout:
        logger.warning("Reporting Error failed (connection timed out).")
        raise
    except NetworkLocationResponseFailure as e:
        logger.warning("Reporting Error failed ({})!".format(e))
        raise
    finally:
        connection.close()
