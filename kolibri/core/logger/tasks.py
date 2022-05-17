import os

from django.core.management import call_command
from rest_framework import serializers

from kolibri.core.auth.models import Facility
from kolibri.core.logger.csv_export import CSV_EXPORT_FILENAMES
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.permissions import IsAdminForJob
from kolibri.core.tasks.validation import JobValidator
from kolibri.utils import conf


def get_logs_dir_and_filepath(log_type, facility):
    logs_dir = os.path.join(conf.KOLIBRI_HOME, "log_export")
    filepath = os.path.join(
        logs_dir,
        CSV_EXPORT_FILENAMES[log_type].format(facility.name, facility.id[:4]),
    )
    return logs_dir, filepath


class ExportLogCSVValidator(JobValidator):
    facility = serializers.PrimaryKeyRelatedField(
        queryset=Facility.objects.all(), required=False
    )
    log_type = serializers.ChoiceField(choices=list(CSV_EXPORT_FILENAMES.keys()))

    def validate(self, data):
        facility = data.get("facility", None)
        if facility is None and "user" in self.context:
            facility = self.context["user"].facility
        elif facility is None:
            raise serializers.ValidationError(
                "Facility must be specified when no user is available."
            )
        logs_dir, filepath = get_logs_dir_and_filepath(data["log_type"], facility)
        if not os.path.isdir(logs_dir):
            os.mkdir(logs_dir)

        return {
            "facility_id": facility.id,
            "args": [data["log_type"], filepath, facility.id],
        }


@register_task(
    validator=ExportLogCSVValidator,
    track_progress=True,
    permission_classes=[IsAdminForJob],
)
def exportlogcsv(
    log_type,
    filepath,
    facility_id,
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
        facility=facility_id,
        overwrite=True,
    )
