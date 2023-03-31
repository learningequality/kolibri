import os

from django.core.management import call_command
from rest_framework import serializers

from kolibri.core.auth.management.commands.bulkexportusers import (
    CSV_EXPORT_FILENAMES as USER_CSV_EXPORT_FILENAMES,
)
from kolibri.core.auth.models import Facility
from kolibri.core.logger.csv_export import CSV_EXPORT_FILENAMES
from kolibri.core.logger.models import GenerateCSVLogRequest
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.permissions import IsAdminForJob
from kolibri.core.tasks.validation import JobValidator
from kolibri.utils import conf

LOGS_CLEANUP_JOB_ID = "18"


def get_filepath(log_type, facility_id, start_date, end_date):
    facility = Facility.objects.get(id=facility_id)
    logs_dir = os.path.join(conf.KOLIBRI_HOME, "log_export")
    if not os.path.isdir(logs_dir):
        os.mkdir(logs_dir)
    filepath = os.path.join(
        logs_dir,
        CSV_EXPORT_FILENAMES[log_type].format(
            facility.name, facility.id[:4], start_date[:10], end_date[:10]
        ),
    )
    return filepath


def get_valid_logs_csv_filenames():
    """
    Returns a set of valid filenames that should exist
    based on the objects stored in GenerateCSVLogRequest.
    Any other files except these filenames should be removed.
    """
    valid_filenames_set = set()
    log_requests = GenerateCSVLogRequest.objects.all()
    for log_request in log_requests:
        full_path = get_filepath(
            log_request.log_type,
            log_request.facility_id,
            log_request.selected_start_date.strftime("%Y-%m-%d"),
            log_request.selected_end_date.strftime("%Y-%m-%d"),
        )
        valid_filenames_set.add(os.path.basename(full_path))
    return valid_filenames_set


def get_valid_users_csv_filenames():
    """
    Returns a set of valid filenames that should exist
    based on the objects stored in Facility.
    """
    valid_filenames_set = set()
    facilities = Facility.objects.values("id", "name").all()
    for facility in facilities:
        file_name = USER_CSV_EXPORT_FILENAMES["user"].format(
            facility["name"], facility["id"][:4]
        )
        valid_filenames_set.add(file_name)
    return valid_filenames_set


def get_valid_filenames():
    """
    Returns a union set of valid filenames
    for log exports and users csv exports.
    These filenames are valid and will not be
    cleaned from log_exports_cleanup.
    """
    valid_logs_filenames = get_valid_logs_csv_filenames()
    valid_users_filenames = get_valid_users_csv_filenames()
    valid_filenames_set = valid_logs_filenames.union(valid_users_filenames)
    return valid_filenames_set


class ExportLogCSVValidator(JobValidator):
    facility = serializers.PrimaryKeyRelatedField(
        queryset=Facility.objects.all(), required=False
    )
    start_date = serializers.CharField()
    end_date = serializers.CharField()
    locale = serializers.CharField(required=False)

    def validate(self, data):
        facility = data.get("facility", None)
        start_date = data.get("start_date", None)
        end_date = data.get("end_date", None)
        locale = data.get("locale", None)

        if facility is None and "user" in self.context:
            facility = self.context["user"].facility
        elif facility is None:
            raise serializers.ValidationError(
                "Facility must be specified when no user is available."
            )
        if not start_date or not end_date:
            raise serializers.ValidationError(
                "Start {} and End {} date values are required.".format(
                    start_date, end_date
                )
            )
        kwargs = {
            "facility": facility.id,
            "start_date": start_date,
            "end_date": end_date,
            "locale": locale,
        }
        return {
            "facility_id": facility.id,
            "kwargs": kwargs,
            "args": [facility.id],
        }


def _exportlogcsv(log_type, facility_id, start_date, end_date, locale):
    filepath = get_filepath(log_type, facility_id, start_date, end_date)
    call_command(
        "exportlogs",
        log_type=log_type,
        output_file=filepath,
        facility=facility_id,
        overwrite=True,
        start_date=start_date,
        end_date=end_date,
        locale=locale,
    )


@register_task(
    validator=ExportLogCSVValidator,
    track_progress=True,
    permission_classes=[IsAdminForJob],
)
def exportsessionlogcsv(facility_id, **kwargs):
    """
    Dumps in csv format the content session logs.

    :param: facility.
    """
    _exportlogcsv(
        "session",
        facility_id,
        kwargs.get("start_date"),
        kwargs.get("end_date"),
        kwargs.get("locale"),
    )


@register_task(
    validator=ExportLogCSVValidator,
    track_progress=True,
    permission_classes=[IsAdminForJob],
)
def exportsummarylogcsv(facility_id, **kwargs):
    """
    Dumps in csv format the content summary logs.

    :param: facility.
    """
    _exportlogcsv(
        "summary",
        facility_id,
        kwargs.get("start_date"),
        kwargs.get("end_date"),
        kwargs.get("locale"),
    )


@register_task(job_id=LOGS_CLEANUP_JOB_ID)
def log_exports_cleanup():
    """
    Cleanup log_exports csv files that does not have
    related reocord in GenerateCSVLogRequest model
    """
    logs_dir = os.path.join(conf.KOLIBRI_HOME, "log_export")
    if not os.path.isdir(logs_dir):
        return
    valid_filenames_set = get_valid_filenames()
    for filename in os.listdir(logs_dir):
        if filename not in valid_filenames_set:
            os.remove(os.path.join(logs_dir, filename))
