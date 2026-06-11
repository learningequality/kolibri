import csv
import datetime
import logging
import math
import os
from collections import OrderedDict

from dateutil import parser
from django.core.cache import cache
from django.db.models import Case
from django.db.models import CharField
from django.db.models import F
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Subquery
from django.db.models import Value
from django.db.models import When
from django.utils.translation import gettext_lazy as _
from django.utils.translation import pgettext_lazy
from le_utils.constants import content_kinds

from kolibri.core.auth.constants import user_kinds
from kolibri.core.auth.models import Role
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.utils.csv import open_csv_for_writing
from kolibri.core.utils.csv import output_mapper
from kolibri.core.utils.csv import validate_open_csv_params

from .models import ContentSessionLog
from .models import ContentSummaryLog

logger = logging.getLogger(__name__)

CSV_EXPORT_FILENAMES = {
    "session": "log_export/{}_{}_content_session_logs_from_{}_to_{}.csv",
    "summary": "log_export/{}_{}_content_summary_logs_from_{}_to_{}.csv",
}

CACHE_TIMEOUT = 60 * 10


def _optional_node_id(item):
    if (
        "most_recent_session_log_extra_fields" in item
        and item["most_recent_session_log_extra_fields"]
        and "context" in item["most_recent_session_log_extra_fields"]
    ):
        return item["most_recent_session_log_extra_fields"]["context"].get("node_id")


def _key_gen(item, name):
    node_id = _optional_node_id(item)
    if node_id:
        return f"{node_id}_ContentNode_{name}"
    return f"{item['content_id']}_{item['channel_id']}_ContentNode_{name}"


def _title_key(item):
    return _key_gen(item, "title")


def _ancestors_key(item):
    return _key_gen(item, "ancestors")


def add_content_to_cache(item, title, ancestors):
    cache.set(_title_key(item), title, CACHE_TIMEOUT)
    cache.set(_ancestors_key(item), ancestors, CACHE_TIMEOUT)


def get_cached_content_data(item):
    title = cache.get(_title_key(item))
    ancestors = cache.get(_ancestors_key(item))

    if title is None or ancestors is None:
        node_id = _optional_node_id(item)
        if node_id:
            node = ContentNode.objects.filter(pk=node_id).first()
        else:
            node = ContentNode.objects.filter(
                content_id=item["content_id"], channel_id=item["channel_id"]
            ).first()
        if node:
            title = node.title
            ancestors = node.ancestors
        else:
            title = ""
            ancestors = []

        add_content_to_cache(item, title, ancestors)

    return title, ancestors


def get_cached_channel_name(obj):
    channel_id = obj["channel_id"]
    key = "{id}_ChannelMetadata_name".format(id=channel_id)
    channel_name = cache.get(key)
    if channel_name is None:
        try:
            channel_name = ChannelMetadata.objects.get(id=channel_id)
        except ChannelMetadata.DoesNotExist:
            channel_name = ""
        cache.set(key, channel_name, CACHE_TIMEOUT)
    return channel_name


def get_cached_content_title(obj):
    title, _ = get_cached_content_data(obj)
    return title


def get_cached_ancestors(content_id):
    _, ancestors = get_cached_content_data(content_id)
    return ancestors


mappings = {
    "channel_name": get_cached_channel_name,
    "content_title": get_cached_content_title,
    "time_spent": lambda x: "{:.1f}".format(round(x["time_spent"], 1)),
    "progress": lambda x: "{:.4f}".format(math.floor(x["progress"] * 10000.0) / 10000),
    "user_type": lambda x: user_kinds.labels.get(
        x.get("user_type"), x.get("user_type")
    ),
}

labels = OrderedDict(
    (
        ("user__facility__name", _("Facility name")),
        ("user__username", _("Username")),
        (
            "user_type",
            pgettext_lazy("CSV column header for the type of user", "User type"),
        ),
        ("channel_id", _("Channel id")),
        ("channel_name", _("Channel name")),
        ("content_id", _("Content id")),
        ("content_title", _("Content title")),
        (
            "start_timestamp",
            pgettext_lazy(
                "CSV column header for the time of the first interaction in the exported logs",
                "Time of first interaction",
            ),
        ),
        (
            "end_timestamp",
            pgettext_lazy(
                "CSV column header for the time of the last interaction in the exported logs",
                "Time of last interaction",
            ),
        ),
        (
            "completion_timestamp",
            pgettext_lazy(
                "CSV column header for the percentage of completion in the exported logs",
                "Time of completion",
            ),
        ),
        (
            "time_spent",
            pgettext_lazy(
                "CSV column header for the time spent in a resource in the exported logs",
                "Time Spent (sec)",
            ),
        ),
        ("progress", _("Progress (0-1)")),
        ("kind", _("Content kind")),
    )
)


def get_max_ancestor_depth(queryset):
    """
    Returns one less than the maximum depth of the ancestors of all content nodes.
    Because we are maxing the level attribute, we don't need to subtract 1 from the result,
    as it is zero indexed.
    """
    content_ids = queryset.values_list("content_id", flat=True)
    nodes = ContentNode.objects.filter(content_id__in=content_ids).only(
        "content_id", "title", "ancestors"
    )
    return (nodes.aggregate(max_depth=Max("level"))["max_depth"] or 1) - 1


def add_ancestors_info(row, ancestors, max_depth):
    ancestors = ancestors[1:]
    row.update(
        {
            f"Folder level {level + 1}": ancestors[level]["title"]
            if level < len(ancestors)
            else ""
            for level in range(max_depth)
        }
    )


def map_object(item, topic_headers_length):
    mapped_item = output_mapper(item, labels=labels, output_mappings=mappings)
    ancestors = get_cached_ancestors(item)
    add_ancestors_info(mapped_item, ancestors, topic_headers_length)
    return mapped_item


user_type_annotations = {
    "user_facility_role_kind": Subquery(
        Role.objects.filter(
            user=OuterRef("user"),
            collection=OuterRef("user__facility"),
        ).values("kind")[:1]
    ),
    "user_type": Case(
        When(
            user__devicepermissions__is_superuser=True, then=Value(user_kinds.SUPERUSER)
        ),
        When(user__roles__isnull=True, then=Value(user_kinds.LEARNER)),
        When(user_facility_role_kind__isnull=False, then=F("user_facility_role_kind")),
        When(
            user__roles__kind=user_kinds.COACH, then=Value(user_kinds.ASSIGNABLE_COACH)
        ),
        default=Value(user_kinds.LEARNER),
        output_field=CharField(),
    ),
}

classes_info = {
    "session": {
        "queryset": ContentSessionLog.objects.exclude(kind=content_kinds.QUIZ).annotate(
            most_recent_session_log_extra_fields=F("extra_fields"),
            **user_type_annotations,
        ),
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
            "most_recent_session_log_extra_fields",
            "user_type",
        ),
    },
    "summary": {
        "queryset": ContentSummaryLog.objects.exclude(kind=content_kinds.QUIZ).annotate(
            most_recent_session_log_extra_fields=Subquery(
                ContentSessionLog.objects.filter(
                    user=OuterRef("user"),
                    content_id=OuterRef("content_id"),
                    channel_id=OuterRef("channel_id"),
                )
                .order_by("-end_timestamp")
                .values("extra_fields")[:1]
            ),
            **user_type_annotations,
        ),
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
            "most_recent_session_log_extra_fields",
            "user_type",
        ),
    },
}


def csv_file_generator(
    facility,
    log_type,
    start_date,
    end_date,
    overwrite=False,
    storage_filepath=None,
    local_filepath=None,
):
    validate_open_csv_params(storage_filepath, local_filepath)

    if local_filepath and not overwrite and os.path.exists(local_filepath):
        raise ValueError("{} already exists".format(local_filepath))

    if log_type not in ("summary", "session"):
        raise ValueError(
            "Impossible to create a csv export file for {}".format(log_type)
        )

    log_info = classes_info[log_type]
    start = start_date if start_date is None else parser.parse(start_date)
    end = (
        end_date
        if end_date is None
        else parser.parse(end_date) + datetime.timedelta(days=1)
    )

    queryset = log_info["queryset"].filter(
        dataset_id=facility.dataset_id,
    )

    if start:
        queryset = queryset.filter(start_timestamp__gte=start)

    if end:
        queryset = queryset.filter(start_timestamp__lte=end)

    # Exclude completion timestamp for the sessionlog CSV
    header_labels = list(
        label
        for label in labels.values()
        if log_type == "summary" or label != labels["completion_timestamp"]
    )
    # len of topic headers should be equal to the max depth of the content node
    topic_headers = [
        (f"Folder level {i + 1}", _(f"Folder level {i + 1}"))
        for i in range(get_max_ancestor_depth(queryset))
    ]

    content_id_index = header_labels.index(labels["content_id"])
    header_labels[content_id_index:content_id_index] = [
        label for _, label in topic_headers
    ]

    with open_csv_for_writing(
        storage_filepath=storage_filepath,
        local_filepath=local_filepath,
    ) as f:
        writer = csv.DictWriter(f, header_labels)
        writer.writeheader()
        for item in (
            queryset.select_related("user", "user__facility")
            .prefetch_related("user__roles")
            .values(*log_info["db_columns"])
        ):
            writer.writerow(map_object(item, len(topic_headers)))
            yield
