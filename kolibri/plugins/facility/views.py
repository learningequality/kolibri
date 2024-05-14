import io
import json
import os
from datetime import datetime as dt

from django.core.exceptions import PermissionDenied
from django.http import Http404
from django.http import HttpResponse
from django.http.response import FileResponse
from django.shortcuts import get_object_or_404
from django.template.defaultfilters import slugify
from django.utils import translation
from django.utils.decorators import method_decorator
from django.utils.translation import get_language_from_request
from django.utils.translation import pgettext
from django.views.generic.base import TemplateView
from le_utils.constants import content_kinds

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.management.commands.bulkexportusers import (
    CSV_EXPORT_FILENAMES as USER_CSV_EXPORT_FILENAMES,
)
from kolibri.core.auth.models import Facility
from kolibri.core.decorators import cache_no_user_data
from kolibri.core.logger.csv_export import (
    CSV_EXPORT_FILENAMES as LOGGER_CSV_EXPORT_FILENAMES,
)
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import GenerateCSVLogRequest
from kolibri.utils import conf


CSV_EXPORT_FILENAMES = {}
CSV_EXPORT_FILENAMES.update(LOGGER_CSV_EXPORT_FILENAMES)
CSV_EXPORT_FILENAMES.update(USER_CSV_EXPORT_FILENAMES)

content_kinds.QUIZ = "quiz"


@method_decorator(cache_no_user_data, name="dispatch")
class FacilityManagementView(TemplateView):
    template_name = "facility_management.html"


def _get_log_request(log_type, facility_id):
    try:
        log_request = GenerateCSVLogRequest.objects.get(
            log_type=log_type, facility=facility_id
        )
    except GenerateCSVLogRequest.DoesNotExist:
        log_request = None
    return log_request


def _get_facility_check_permissions(request, facility_id):
    if request.user.is_anonymous:
        raise PermissionDenied("You must be logged in to download this file")

    if facility_id:
        facility = get_object_or_404(Facility, pk=facility_id)
    else:
        facility = request.user.facility

    if not request.user.has_role_for_collection(role_kinds.ADMIN, facility):
        raise PermissionDenied(
            "You must be logged in as an admin for this facility or a superadmin to download this file"
        )
    return facility


def first_log_date(request, facility_id):
    """
    Get the first date that data exists for summary and session logs

    :returns: An object with the first summary and session log dates
    """
    facility = _get_facility_check_permissions(request, facility_id)
    dataset_id = facility.dataset_id
    first_log = (
        ContentSessionLog.objects.filter(dataset_id=dataset_id)
        .exclude(kind=content_kinds.QUIZ)
        .order_by("start_timestamp")
        .first()
    )
    first_log_date = first_log.start_timestamp if first_log is not None else dt.utcnow()
    response = {
        "first_log_date": first_log_date.isoformat(),
    }
    return HttpResponse(json.dumps(response), content_type="application/json")


def exported_csv_info(request, facility_id):
    """
    Get the last modification timestamp of the summary logs exported

    :returns: An object with the files informatin
    """
    facility = _get_facility_check_permissions(request, facility_id)

    logs_dir = os.path.join(conf.KOLIBRI_HOME, "log_export")
    csv_statuses = {}

    for log_type in CSV_EXPORT_FILENAMES:
        if log_type in ("summary", "session"):
            log_request = _get_log_request(log_type, facility_id)
            if log_request is not None:
                start = log_request.selected_start_date.isoformat()
                end = log_request.selected_end_date.isoformat()
            else:
                start = ""
                end = ""
            log_path = os.path.join(
                logs_dir,
                CSV_EXPORT_FILENAMES[log_type].format(
                    facility.name, facility.id[:4], start[:10], end[:10]
                ),
            )
        else:
            log_path = os.path.join(
                logs_dir,
                CSV_EXPORT_FILENAMES[log_type].format(facility.name, facility.id[:4]),
            )
        if os.path.exists(log_path):
            csv_statuses[log_type] = os.path.getmtime(log_path)
        else:
            csv_statuses[log_type] = None

    return HttpResponse(json.dumps(csv_statuses), content_type="application/json")


def download_csv_file(request, csv_type, facility_id):

    facility = _get_facility_check_permissions(request, facility_id)

    locale = get_language_from_request(request)
    translation.activate(locale)

    start = None
    end = None

    csv_translated_filenames = {
        "session": (
            "{}_{}_"
            + slugify(
                pgettext(
                    "Default name for the exported CSV file with content session logs. Please keep the underscores between words in the translation",
                    "content_session_logs_from_",
                )
            )
            + "{}_"
            + slugify(
                pgettext(
                    "Default name for the exported CSV file with content summary logs. Please keep the underscores between words in the translation",
                    "to_",
                )
            )
            + "{}"
            + ".csv"
        ),
        "summary": (
            "{}_{}_"
            + slugify(
                pgettext(
                    "Default name for the exported CSV file with content summary logs. Please keep the underscores between words in the translation",
                    "content_summary_logs_from_",
                )
            )
            + "{}_"
            + slugify(
                pgettext(
                    "Default name for the exported CSV file with content summary logs. Please keep the underscores between words in the translation",
                    "to_",
                )
            )
            + "{}"
            + ".csv"
        ),
        "user": (
            "{}_{}_"
            + slugify(
                pgettext(
                    "Default name for the exported CSV file of facility user data. Please keep the underscore between words in the translation",
                    "users",
                )
            )
            + ".csv"
        ).replace("-", "_"),
    }

    if csv_type in CSV_EXPORT_FILENAMES.keys():
        if csv_type == "user":
            filepath = os.path.join(
                conf.KOLIBRI_HOME,
                "log_export",
                CSV_EXPORT_FILENAMES[csv_type].format(facility.name, facility.id[:4]),
            )
        else:
            log_request = _get_log_request(csv_type, facility_id)
            if log_request:
                start = log_request.selected_start_date.isoformat()
                end = log_request.selected_end_date.isoformat()
            filepath = os.path.join(
                conf.KOLIBRI_HOME,
                "log_export",
                CSV_EXPORT_FILENAMES[csv_type].format(
                    facility.name, facility.id[:4], start[:10], end[:10]
                ),
            )
    else:
        filepath = None

    # if the file does not exist on disk, return a 404
    if filepath is None or not os.path.exists(filepath):
        raise Http404("There is no csv export file for {} available".format(csv_type))

    # generate a file response
    response = FileResponse(io.open(filepath, "rb"))
    # set the content-type by guessing from the filename
    response.headers["Content-Type"] = "text/csv"

    # set the content-disposition as attachment to force download
    if csv_type == "user":
        response.headers["Content-Disposition"] = "attachment; filename={}".format(
            str(csv_translated_filenames[csv_type]).format(
                facility.name, facility.id[:4]
            )
        )
    else:
        response.headers["Content-Disposition"] = "attachment; filename={}".format(
            str(csv_translated_filenames[csv_type]).format(
                facility.name, facility.id[:4], start[:10], end[:10]
            )
        )
    translation.deactivate()

    # set the content-length to the file size
    response.headers["Content-Length"] = os.path.getsize(filepath)

    return response
