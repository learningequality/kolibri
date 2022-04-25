import os

from django.core.management import call_command
from django.http.response import Http404

from kolibri.core.auth.models import Facility
from kolibri.core.content.permissions import CanExportLogs
from kolibri.core.logger.csv_export import CSV_EXPORT_FILENAMES
from kolibri.core.tasks.decorators import register_task
from kolibri.utils import conf


def get_logs_dir_and_filepath(log_type, facility):
    logs_dir = os.path.join(conf.KOLIBRI_HOME, "log_export")
    filepath = os.path.join(
        logs_dir,
        CSV_EXPORT_FILENAMES[log_type].format(facility.name, facility.id[:4]),
    )
    return logs_dir, filepath


def validate_startexportlogcsv(request, request_data):
    facility_id = request_data.get("facility", None)
    if facility_id:
        facility = Facility.objects.get(pk=facility_id)
    else:
        facility = request.user.facility

    log_type = request_data.get("logtype", "summary")

    if log_type in CSV_EXPORT_FILENAMES.keys():
        logs_dir, filepath = get_logs_dir_and_filepath(log_type, facility)
    else:
        raise Http404("Impossible to create a csv export file for {}".format(log_type))

    if not os.path.isdir(logs_dir):
        os.mkdir(logs_dir)

    job_type = "EXPORTSUMMARYLOGCSV" if log_type == "summary" else "EXPORTSESSIONLOGCSV"

    job_metadata = {
        "type": job_type,
        "started_by": request.user.pk,
        "facility": facility.id,
    }

    return {
        "log_type": log_type,
        "filepath": filepath,
        "facility": facility,
        "extra_metadata": job_metadata,
    }


@register_task(
    validator=validate_startexportlogcsv,
    track_progress=True,
    permission_classes=[CanExportLogs],
)
def startexportlogcsv(
    log_type=None,
    filepath=None,
    facility=None,
):
    """
    Dumps in csv format the required logs.
    By default it will be dump contentsummarylog.

    :param: logtype: Kind of log to dump, summary or session.
    :param: facility.
    """
    call_command(
        "exportlogs",
        log_type=log_type,
        output_file=filepath,
        facility=facility.id,
        overwrite="true",
    )
