import json
import logging

import requests
from django.core.serializers.json import DjangoJSONEncoder
from django.db import connection
from requests.exceptions import ConnectionError
from requests.exceptions import RequestException
from requests.exceptions import Timeout

from .models import ErrorReports
from kolibri.core.tasks.decorators import register_task
from kolibri.core.utils.urls import join_url

logger = logging.getLogger(__name__)


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
                "no_of_errors": error.no_of_errors,
            }
        )
    return json.dumps(errors_list, cls=DjangoJSONEncoder)


@register_task
def ping_error_reports(server):
    try:
        errors = ErrorReports.get_unsent_errors()
        errors_json = serialize_error_reports_to_json_response(errors)
        requests.post(
            join_url(server, "/api/v1/errors/"),
            data=errors_json,
            headers={"Content-Type": "application/json"},
        )
        errors.update(sent=True)
    except ConnectionError:
        logger.warning("Reporting Error failed (could not connect).")
        raise
    except Timeout:
        logger.warning("Reporting Error failed (connection timed out).")
        raise
    except RequestException as e:
        logger.warning("Reporting Error failed ({})!".format(e))
        raise
    finally:
        connection.close()
