import logging
from datetime import timedelta
from typing import ClassVar

from django.db.models import Case
from django.db.models import F
from django.db.models import When
from rest_framework import serializers
from rest_framework.renderers import JSONRenderer

from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkClientError
from kolibri.core.serializers import KolibriModelSerializer
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.utils import get_current_job
from kolibri.utils.time_utils import local_now

from .models import ErrorReport
from .models import ServerRun

logger = logging.getLogger(__name__)

# How long to wait before retrying a submission that failed because the
# telemetry server was unreachable.
RETRY_INTERVAL = timedelta(minutes=5)

# Cap on the number of reports submitted per pingback - each report's context
# is individually bounded, but after a long offline period the unreported set
# can be large, and the whole batch is serialized into one in-memory POST.
# Any remainder is sent on the next pingback.
MAX_REPORTS_PER_SUBMISSION = 100

ERROR_REPORTS_SUBMISSION_JOB_ID = "error_reports_submission"


class ErrorReportSubmissionSerializer(KolibriModelSerializer):
    context = serializers.JSONField()

    class Meta:
        model = ErrorReport
        fields: ClassVar[list] = [
            "category",
            "kolibri_version",
            "fingerprint",
            "first_occurred",
            "last_occurred",
            "first_occurred_run",
            "first_occurred_uptime",
            "last_occurred_run",
            "last_occurred_uptime",
            "events",
            "events_since_reported",
            "context",
        ]


class SnapshotSerializer(serializers.Serializer):
    """
    A snapshot of the device clocks at submission time, allowing the
    telemetry server to calibrate the run/uptime anchors on the error
    reports against the time it received this submission.
    """

    run_counter = serializers.IntegerField(allow_null=True)
    run_uptime = serializers.FloatField(allow_null=True)
    device_time = serializers.DateTimeField()


class ErrorReportPayloadSerializer(serializers.Serializer):
    version = serializers.IntegerField()
    pingback_id = serializers.CharField()
    snapshot = SnapshotSerializer()
    errors = ErrorReportSubmissionSerializer(many=True)


def serialize_error_reports_to_json_response(errors, pingback_id):
    run_counter, run_uptime = ServerRun.get_current_anchor()
    serializer = ErrorReportPayloadSerializer(
        {
            "version": 1,
            "pingback_id": pingback_id,
            "snapshot": {
                "run_counter": run_counter,
                "run_uptime": run_uptime,
                "device_time": local_now(),
            },
            "errors": errors,
        }
    )
    return JSONRenderer().render(serializer.data)


@register_task(job_id=ERROR_REPORTS_SUBMISSION_JOB_ID)
def ping_error_reports(server, pingback_id):
    errors = []
    try:
        errors = list(
            ErrorReport.get_unreported_errors().order_by("id")[
                :MAX_REPORTS_PER_SUBMISSION
            ]
        )
        if not errors:
            return

        errors_json = serialize_error_reports_to_json_response(errors, pingback_id)
        client = NetworkClient(server)
        # NetworkClient joins the path onto its base_url, so pass the path
        # alone rather than re-joining it with the server here.
        client.post(
            "/api/v1/errors/report/",
            data=errors_json,
            headers={"Content-Type": "application/json"},
        )

        error_ids = [error.id for error in errors]
        ErrorReport.objects.filter(id__in=error_ids).update(
            events_since_reported=Case(
                *[
                    When(
                        id=error.id,
                        then=F("events_since_reported") - error.events_since_reported,
                    )
                    for error in errors
                ],
                default=F("events_since_reported"),
            )
        )
        ErrorReport.objects.filter(id__in=error_ids, events_since_reported=0).update(
            reported=True
        )

    except NetworkClientError as e:
        status_code = getattr(getattr(e, "response", None), "status_code", None)
        if status_code is not None and 400 <= status_code < 500 and status_code != 429:
            logger.error(
                "Error report submission rejected with status %s; dropping batch.",
                status_code,
            )
            ErrorReport.objects.filter(id__in=[error.id for error in errors]).update(
                reported=True, events_since_reported=0
            )
        else:
            logger.warning("Reporting error reports failed; will retry.", exc_info=True)
            current_job = get_current_job()
            if current_job:
                current_job.retry_in(RETRY_INTERVAL)
