import os

from django.core.management import call_command
from rest_framework import serializers

from kolibri.core.auth.models import Facility
from kolibri.core.logger.csv_export import CSV_EXPORT_FILENAMES
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.permissions import IsAdminForJob
from kolibri.core.tasks.validation import JobValidator
from kolibri.utils import conf


def get_filepath(log_type, facility_id):
    facility = Facility.objects.get(id=facility_id)
    logs_dir = os.path.join(conf.KOLIBRI_HOME, "log_export")
    if not os.path.isdir(logs_dir):
        os.mkdir(logs_dir)
    filepath = os.path.join(
        logs_dir,
        CSV_EXPORT_FILENAMES[log_type].format(facility.name, facility.id[:4]),
    )
    return filepath


class ExportLogCSVValidator(JobValidator):
    facility = serializers.PrimaryKeyRelatedField(
        queryset=Facility.objects.all(), required=False
    )

    def validate(self, data):
        facility = data.get("facility", None)
        if facility is None and "user" in self.context:
            facility = self.context["user"].facility
        elif facility is None:
            raise serializers.ValidationError(
                "Facility must be specified when no user is available."
            )

        return {
            "facility_id": facility.id,
            "args": [facility.id],
        }


def _exportlogcsv(log_type, facility_id):
    filepath = get_filepath(log_type, facility_id)
    call_command(
        "exportlogs",
        log_type=log_type,
        output_file=filepath,
        facility=facility_id,
        overwrite=True,
    )


@register_task(
    validator=ExportLogCSVValidator,
    track_progress=True,
    permission_classes=[IsAdminForJob],
)
def exportsessionlogcsv(
    facility_id,
):
    """
    Dumps in csv format the content session logs.

    :param: facility.
    """
    _exportlogcsv("session", facility_id)


@register_task(
    validator=ExportLogCSVValidator,
    track_progress=True,
    permission_classes=[IsAdminForJob],
)
def exportsummarylogcsv(
    facility_id,
):
    """
    Dumps in csv format the content summary logs.

    :param: facility.
    """
    _exportlogcsv("summary", facility_id)
