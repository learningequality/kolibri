from __future__ import unicode_literals

import csv
import logging
import math
import os
from collections import OrderedDict
from functools import partial

from django.core.cache import cache
from le_utils.constants import content_kinds

from .models import ContentSessionLog
from .models import ContentSummaryLog
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.utils.csv import open_csv_for_writing
from kolibri.core.utils.csv import output_mapper


logger = logging.getLogger(__name__)

CSV_EXPORT_FILENAMES = {
    "session": "{}_{}_content_session_logs.csv",
    "summary": "{}_{}_content_summary_logs.csv",
}


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

map_object = partial(output_mapper, labels=labels, output_mappings=mappings)


classes_info = {
    "session": {
        "queryset": ContentSessionLog.objects.exclude(kind=content_kinds.QUIZ),
        "filename": CSV_EXPORT_FILENAMES["session"],
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
        "queryset": ContentSummaryLog.objects.exclude(kind=content_kinds.QUIZ),
        "filename": CSV_EXPORT_FILENAMES["summary"],
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


def csv_file_generator(facility, log_type, filepath, overwrite=False):

    if log_type not in ("summary", "session"):
        raise ValueError(
            "Impossible to create a csv export file for {}".format(log_type)
        )

    log_info = classes_info[log_type]

    if not overwrite and os.path.exists(filepath):
        raise ValueError("{} already exists".format(filepath))
    queryset = log_info["queryset"].filter(dataset_id=facility.dataset_id)

    # Exclude completion timestamp for the sessionlog CSV
    header_labels = tuple(
        label
        for label in labels.values()
        if log_type == "summary" or label != labels["completion_timestamp"]
    )

    csv_file = open_csv_for_writing(filepath)

    with csv_file as f:
        writer = csv.DictWriter(f, header_labels)
        logger.info("Creating csv file {filename}".format(filename=filepath))
        writer.writeheader()
        for item in queryset.select_related("user", "user__facility").values(
            *log_info["db_columns"]
        ):
            writer.writerow(map_object(item))
            yield
