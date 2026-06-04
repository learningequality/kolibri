import logging
from datetime import timedelta
from typing import ClassVar

from django.db import connections
from django.db.models import Case
from django.db.models import F
from django.db.models import When
from rest_framework import serializers
from rest_framework.renderers import JSONRenderer

from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkClientError
from kolibri.core.serializers import KolibriModelSerializer
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.permissions import IsSuperAdmin
from kolibri.core.tasks.utils import get_current_job
from kolibri.utils.time_utils import local_now

from .models import ErrorReport
from .models import ServerRun

logger = logging.getLogger(__name__)

# How long to wait before retrying a submission that failed because the
# telemetry server was unreachable, throttled, or failing.
RETRY_INTERVAL = timedelta(minutes=5)

MAX_SUBMISSION_RETRIES = 3

# Cap on the number of reports in one POST - each report's context is
# individually bounded, but after a long offline period the unreported set can
# be large, and each batch is serialized into one in-memory POST. The run sends
# further batches until every unreported report has been sent once.
MAX_REPORTS_PER_SUBMISSION = 100

# Below nginx's default client_max_body_size of 1MB.
MAX_SUBMISSION_SIZE = 512 * 1024

REJECTED_PAYLOAD_STATUSES = frozenset({400, 413, 422})

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


def serialize_submission(errors, pingback_id):
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


def _within_size_budget(errors):
    batch = []
    size = 0
    for error in errors:
        size += len(JSONRenderer().render(ErrorReportSubmissionSerializer(error).data))
        if batch and size > MAX_SUBMISSION_SIZE:
            break
        batch.append(error)
    return batch


def _mark_submitted(errors):
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


@register_task(
    job_id=ERROR_REPORTS_SUBMISSION_JOB_ID, permission_classes=[IsSuperAdmin]
)
def ping_error_reports(server, pingback_id):
    # Each report is sent at most once per run, in id order, so reports that
    # recur while the run is in progress cannot keep later ones from being sent.
    last_sent_id = 0
    while True:
        errors = _within_size_budget(
            ErrorReport.get_unreported_errors()
            .filter(id__gt=last_sent_id)
            .order_by("id")[:MAX_REPORTS_PER_SUBMISSION]
        )
        if not errors or not _submit(server, pingback_id, errors):
            return
        last_sent_id = errors[-1].id


def _submit(server, pingback_id, errors):
    try:
        errors_json = serialize_submission(errors, pingback_id)
        client = NetworkClient(server)
        with client:
            # NetworkClient joins the path onto its base_url, so pass the path
            # alone rather than re-joining it with the server here.
            client.post(
                "/api/v1/errors/report/",
                data=errors_json,
                headers={"Content-Type": "application/json"},
            )
        _mark_submitted(errors)
        return True

    except NetworkClientError as e:
        status_code = getattr(getattr(e, "response", None), "status_code", None)
        if status_code in REJECTED_PAYLOAD_STATUSES:
            logger.error(
                "Error report submission rejected with status %s; dropping batch.",
                status_code,
            )
            _mark_submitted(errors)
        elif (
            status_code is not None and 400 <= status_code < 500 and status_code != 429
        ):
            logger.warning(
                "Error report submission failed with status %s; will retry after the next pingback.",
                status_code,
            )
        else:
            _retry_or_wait_for_next_pingback(e)
        return False
    finally:
        # Close every connection this worker thread opened - the task reads
        # and writes the plugin's own database, not just the default one.
        connections.close_all()


def _retry_or_wait_for_next_pingback(error):
    current_job = get_current_job()
    retries = current_job.extra_metadata.get("retries", 0) if current_job else 0
    if current_job is None or retries >= MAX_SUBMISSION_RETRIES:
        logger.warning(
            "Reporting error reports failed (%s); will retry after the next pingback.",
            error,
        )
        return
    logger.warning(
        "Reporting error reports failed (%s); retrying in %s.", error, RETRY_INTERVAL
    )
    current_job.update_metadata(retries=retries + 1)
    current_job.retry_in(RETRY_INTERVAL)
