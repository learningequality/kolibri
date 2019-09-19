from __future__ import unicode_literals

import csv
import io
import json
import logging
import math
import os
import sys
from collections import OrderedDict

from django.core.cache import cache
from django.http import Http404
from django.http import HttpResponse
from django.http.response import FileResponse

from .models import ContentSessionLog
from .models import ContentSummaryLog
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.utils import conf


logger = logging.getLogger(__name__)


def cache_channel_name(obj):
    channel_id = obj["channel_id"]
    key = "{id}_ChannelMetadata_name".format(id=channel_id)
    channel_name = cache.get(key)
    if channel_name is None:
        try:
            channel_name = ChannelMetadata.objects.get(id=channel_id)
        except ChannelMetadata.DoesNotExist:
            channel_name = ""
        cache.set(key, channel_name, 60 * 10)
    return channel_name


def cache_content_title(obj):
    content_id = obj["content_id"]
    key = "{id}_ContentNode_title".format(id=content_id)
    title = cache.get(key)
    if title is None:
        node = ContentNode.objects.filter(content_id=content_id).first()
        if node:
            title = node.title
        else:
            title = ""
        cache.set(key, title, 60 * 10)
    return title


mappings = {
    "channel_name": cache_channel_name,
    "content_title": cache_content_title,
    "time_spent": lambda x: "{:.1f}".format(round(x["time_spent"], 1)),
    "progress": lambda x: "{:.4f}".format(math.floor(x["progress"] * 10000.0) / 10000),
}

labels = OrderedDict(
    (
        ("user__facility__name", "Facility name"),
        ("user__username", "Username"),
        ("channel_id", "Channel id"),
        ("channel_name", "Channel name"),
        ("content_id", "Content id"),
        ("content_title", "Content title"),
        ("start_timestamp", "Time of first interaction"),
        ("end_timestamp", "Time of last interaction"),
        ("completion_timestamp", "Time of completion"),
        ("time_spent", "Time Spent (sec)"),
        ("progress", "Progress (0-1)"),
        ("kind", "Content kind"),
    )
)


def map_object(obj):
    mapped_obj = {}
    for header, label in labels.items():
        if header in mappings:
            mapped_obj[label] = mappings[header](obj)
        elif header in obj:
            mapped_obj[label] = obj[header]
    return mapped_obj


classes_info = {
    "session": {
        "queryset": ContentSessionLog.objects.all(),
        "filename": "content_session_logs.csv",
        "db_columns": (
            "user__username",
            "user__facility__name",
            "channel_id",
            "content_id",
            "start_timestamp",
            "end_timestamp",
            "time_spent",
            "progress",
            "kind",
        ),
    },
    "summary": {
        "queryset": ContentSummaryLog.objects.all(),
        "filename": "content_summary_logs.csv",
        "db_columns": (
            "user__username",
            "user__facility__name",
            "content_id",
            "channel_id",
            "start_timestamp",
            "end_timestamp",
            "completion_timestamp",
            "time_spent",
            "progress",
            "kind",
        ),
    },
}


def csv_file_generator(log_type, filepath, overwrite=False):
    if log_type not in ("summary", "session"):
        raise ValueError(
            "Impossible to create a csv export file for {}".format(log_type)
        )

    log_info = classes_info[log_type]

    if not overwrite and os.path.exists(filepath):
        raise ValueError("{} already exists".format(filepath))
    queryset = log_info["queryset"]

    # Exclude completion timestamp for the sessionlog CSV
    header_labels = tuple(
        label
        for label in labels.values()
        if log_type == "summary" or label != "completion_timestamp"
    )

    if sys.version_info[0] < 3:
        csv_file = io.open(filepath, "wb")
    else:
        csv_file = io.open(filepath, "w", newline="")

    with csv_file as f:
        writer = csv.DictWriter(f, header_labels)
        logger.info("Creating csv file {filename}".format(filename=filepath))
        writer.writeheader()
        for item in queryset.select_related("user", "user__facility").values(
            *log_info["db_columns"]
        ):
            writer.writerow(map_object(item))
            yield


def exported_logs_info(request):
    """
    Get the last modification timestamp of the summary logs exported

    :returns: An object with the files informatin
    """

    logs_dir = os.path.join(conf.KOLIBRI_HOME, "log_export")
    csv_statuses = {}
    csv_export_filenames = {
        "session": "content_session_logs.csv",
        "summary": "content_summary_logs.csv",
    }
    for log_type in csv_export_filenames.keys():
        log_path = os.path.join(logs_dir, csv_export_filenames[log_type])
        if os.path.exists(log_path):
            csv_statuses[log_type] = os.path.getmtime(log_path)
        else:
            csv_statuses[log_type] = None

    return HttpResponse(json.dumps(csv_statuses), content_type="application/json")


def download_csv_file(request, log_type):
    csv_export_filenames = {
        "session": "content_session_logs.csv",
        "summary": "content_summary_logs.csv",
    }
    if log_type in csv_export_filenames.keys():
        filepath = os.path.join(
            conf.KOLIBRI_HOME, "log_export", csv_export_filenames[log_type]
        )
    else:
        filepath = None

    # if the file does not exist on disk, return a 404
    if filepath is None or not os.path.exists(filepath):
        raise Http404("There is no csv export file for {} available".format(log_type))

    # generate a file response
    response = FileResponse(io.open(filepath, "rb"))
    # set the content-type by guessing from the filename
    response["Content-Type"] = "text/csv"

    # set the content-disposition as attachment to force download
    response["Content-Disposition"] = "attachment; filename={}".format(
        csv_export_filenames[log_type]
    )

    # set the content-length to the file size
    response["Content-Length"] = os.path.getsize(filepath)

    return response
