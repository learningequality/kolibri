import os

from django.http.response import Http404

from kolibri.core.auth.models import Facility
from kolibri.core.logger.csv_export import CSV_EXPORT_FILENAMES
from kolibri.utils import conf


def get_logs_dir_and_filepath(log_type, facility):
    logs_dir = os.path.join(conf.KOLIBRI_HOME, "log_export")
    filepath = os.path.join(
        logs_dir,
        CSV_EXPORT_FILENAMES[log_type].format(facility.name, facility.id[:4]),
    )
    return logs_dir, filepath


def validate_startexportlogcsv(request):
    facility_id = request.data.get("facility", None)
    if facility_id:
        facility = Facility.objects.get(pk=facility_id)
    else:
        facility = request.user.facility

    log_type = request.data.get("logtype", "summary")

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
