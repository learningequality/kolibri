import json
import logging

from django.core.serializers.json import DjangoJSONEncoder
from django.db import connection

from .models import ErrorReport
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationConnectionFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseTimeout
from kolibri.core.tasks.decorators import register_task
from kolibri.core.utils.urls import join_url

logger = logging.getLogger(__name__)


def serialize_error_reports_to_json_response(errors, pingback_id):
    errors_list = []
    for error in errors:
        errors_list.append(
            {
                "category": error.category,
                "error_message": error.error_message,
                "traceback": error.traceback,
                "first_occurred": error.first_occurred,
                "last_occurred": error.last_occurred,
                "events": error.events,
                "context": error.context,
                "pingback_id": pingback_id,
            }
        )
    return json.dumps(errors_list, cls=DjangoJSONEncoder)


@register_task
def ping_error_reports(server, pingback_id):
    try:
        errors = ErrorReport.get_unreported_errors()

        errors_json = serialize_error_reports_to_json_response(errors, pingback_id)
        client = NetworkClient(server)
        client.post(
            join_url(server, "/api/v1/errors/report/"),
            data=errors_json,
            headers={"Content-Type": "application/json"},
        )

        errors.update(reported=True)

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
