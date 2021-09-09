import hashlib
from math import ceil

from django.db.models import Max
from django.db.models import Q
from le_utils.constants import content_kinds
from requests.exceptions import ChunkedEncodingError
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError
from requests.exceptions import Timeout

from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.content_types_tools import (
    renderable_contentnodes_q_filter,
)
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_disk,
)
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_peer,
)

try:
    import OpenSSL

    SSLERROR = OpenSSL.SSL.Error
except ImportError:
    import requests

    SSLERROR = requests.exceptions.SSLError

RETRY_STATUS_CODE = [502, 503, 504, 521, 522, 523, 524]


CHUNKSIZE = 10000


def _calculate_batch_params(channel_id, node_ids, exclude_node_ids):
    # To chunk the tree, we first find the full extent of the tree - this gives the
    # highest rght value for this channel.
    max_rght = ContentNode.objects.filter(channel_id=channel_id).aggregate(Max("rght"))[
        "rght__max"
    ]

    # Count the total number of constraints
    constraint_count = len(node_ids or []) + len(exclude_node_ids or [])

    # Aim for a constraint per batch count of about 250 on average
    # This means that there will be at most 750 parameters from the constraints
    # and should therefore also limit the overall SQL expression size.
    dynamic_chunksize = int(
        min(CHUNKSIZE, ceil(250 * max_rght / (constraint_count or 1)))
    )

    return max_rght, dynamic_chunksize


def _mptt_descendant_ids(channel_id, node_ids, min_boundary, max_boundary):
    non_topic_nodes = (
        ContentNode.objects.filter(
            channel_id=channel_id, rght__gte=min_boundary, rght__lte=max_boundary
        )
        .exclude(kind=content_kinds.TOPIC)
        .filter_by_uuids(node_ids)
        .order_by()
    )

    descendants_queryset = (
        ContentNode.objects.filter(
            channel_id=channel_id,
            # We are only interested in nodes that are ancestors of
            # the nodes in the range, but they could be ancestors of any node
            # in this range, so we filter the lft value by being less than
            # or equal to the max_boundary, and the rght value by being
            # greater than or equal to the min_boundary.
            lft__lte=max_boundary,
            rght__gte=min_boundary,
            kind=content_kinds.TOPIC,
        )
        .filter_by_uuids(node_ids)
        .get_descendants(include_self=False)
        .filter(rght__gte=min_boundary, rght__lte=max_boundary)
        .exclude(kind=content_kinds.TOPIC)
        .order_by()
    )

    return list(
        non_topic_nodes.union(descendants_queryset).values_list("pk", flat=True)
    )


def filter_by_file_availability(nodes_to_include, channel_id, drive_id, peer_id):
    # By default don't filter node ids by their underlying file importability
    file_based_node_id_list = None
    if drive_id:
        file_based_node_id_list = get_channel_stats_from_disk(
            channel_id, drive_id
        ).keys()

    if peer_id:
        file_based_node_id_list = get_channel_stats_from_peer(
            channel_id, peer_id
        ).keys()

    if file_based_node_id_list is not None:
        nodes_to_include = nodes_to_include.filter_by_uuids(file_based_node_id_list)

    return nodes_to_include


def get_import_export_data(  # noqa: C901
    channel_id,
    node_ids,
    exclude_node_ids,
    available,
    drive_id=None,
    peer_id=None,
    renderable_only=True,
    topic_thumbnails=True,
):

    min_boundary = 1

    max_rght, dynamic_chunksize = _calculate_batch_params(
        channel_id, node_ids, exclude_node_ids
    )

    nodes_to_include = ContentNode.objects.filter(channel_id=channel_id).exclude(
        kind=content_kinds.TOPIC
    )

    if available is not None:
        nodes_to_include = nodes_to_include.filter(available=available)

    nodes_to_include = filter_by_file_availability(
        nodes_to_include, channel_id, drive_id, peer_id
    )

    queried_file_objects = {}

    content_ids = set()

    while min_boundary < max_rght:

        max_boundary = min_boundary + dynamic_chunksize

        nodes_segment = nodes_to_include

        # if requested, filter down to only include particular topics/nodes
        if node_ids:
            nodes_segment = nodes_segment.filter_by_uuids(
                _mptt_descendant_ids(
                    channel_id, node_ids, min_boundary, min_boundary + dynamic_chunksize
                )
            )

        # if requested, filter out nodes we're not able to render
        if renderable_only:
            nodes_segment = nodes_segment.filter(renderable_contentnodes_q_filter)

        # filter down the query to remove files associated with nodes we've specifically been asked to exclude
        if exclude_node_ids:
            nodes_segment = nodes_segment.order_by().exclude_by_uuids(
                _mptt_descendant_ids(
                    channel_id,
                    exclude_node_ids,
                    min_boundary,
                    max_boundary,
                )
            )

        included_content_ids = nodes_segment.values_list(
            "content_id", flat=True
        ).distinct()

        # Only bother with this query if there were any resources returned above.
        if included_content_ids:
            content_ids.update(included_content_ids)
            file_objects = LocalFile.objects.filter(
                files__contentnode__in=nodes_segment
            ).values("id", "file_size", "extension")
            if available is not None:
                file_objects = file_objects.filter(available=available)
            for f in file_objects:
                queried_file_objects[f["id"]] = f

            if topic_thumbnails:
                # Do a query to get all the descendant and ancestor topics for this segment
                segment_topics = ContentNode.objects.filter(
                    channel_id=channel_id, kind=content_kinds.TOPIC
                ).filter(
                    Q(rght__gte=min_boundary, rght__lte=max_boundary)
                    | Q(lft__lte=max_boundary, rght__gte=min_boundary)
                )

                file_objects = LocalFile.objects.filter(
                    files__contentnode__in=segment_topics,
                ).values("id", "file_size", "extension")
                if available is not None:
                    file_objects = file_objects.filter(available=available)
                for f in file_objects:
                    queried_file_objects[f["id"]] = f

        min_boundary += dynamic_chunksize

    files_to_download = list(queried_file_objects.values())

    total_bytes_to_transfer = sum(map(lambda x: x["file_size"] or 0, files_to_download))

    return len(content_ids), files_to_download, total_bytes_to_transfer


def retry_import(e):
    """
    When an exception occurs during channel/content import, if
        * there is an Internet connection error or timeout error,
          or HTTPError where the error code is one of the RETRY_STATUS_CODE,
          return return True to retry the file transfer
    return value:
        * True - needs retry.
        * False - Does not need retry.
    """

    if (
        isinstance(e, ConnectionError)
        or isinstance(e, Timeout)
        or isinstance(e, ChunkedEncodingError)
        or (isinstance(e, HTTPError) and e.response.status_code in RETRY_STATUS_CODE)
        or (isinstance(e, SSLERROR) and "decryption failed or bad record mac" in str(e))
    ):
        return True

    return False


def compare_checksums(file_name, file_id):
    hasher = hashlib.md5()
    with open(file_name, "rb") as f:
        # Read chunks of 4096 bytes for memory efficiency
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    checksum = hasher.hexdigest()
    return checksum == file_id
