import hashlib
import itertools
import json
import os
from math import ceil

from django.db.models import Max
from django.db.models import Min
from django.db.models import Q
from le_utils.constants import content_kinds

from kolibri.core.content.models import ChannelMetadata
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
    FileNotFoundError
except NameError:
    FileNotFoundError = IOError

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
    node_ids=None,
    exclude_node_ids=None,
    available=None,
    drive_id=None,
    peer_id=None,
    renderable_only=True,
    topic_thumbnails=True,
):
    """
    Helper function that calls get_import_export_nodes followed by
    get_content_nodes_data.
    """

    nodes_queries_list = get_import_export_nodes(
        channel_id,
        node_ids,
        exclude_node_ids,
        available=available,
        drive_id=drive_id,
        peer_id=peer_id,
        renderable_only=renderable_only,
    )
    return get_content_nodes_data(
        channel_id,
        nodes_queries_list,
        available=available,
        topic_thumbnails=topic_thumbnails,
    )


def get_import_export_nodes(  # noqa: C901
    channel_id,
    node_ids=None,
    exclude_node_ids=None,
    available=None,
    drive_id=None,
    peer_id=None,
    renderable_only=True,
):
    """
    Returns a list of queries for ContentNode objects matching the given
    constraints. This can be used with get_content_nodes_data and with
    get_content_nodes_selectors.
    """

    nodes_queries_list = []
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

    while min_boundary < max_rght:
        max_boundary = min_boundary + dynamic_chunksize
        nodes_query = nodes_to_include

        # if requested, filter down to only include particular topics/nodes
        if node_ids:
            nodes_query = nodes_query.filter_by_uuids(
                _mptt_descendant_ids(
                    channel_id, node_ids, min_boundary, min_boundary + dynamic_chunksize
                )
            )

        # if requested, filter out nodes we're not able to render
        if renderable_only:
            nodes_query = nodes_query.filter(renderable_contentnodes_q_filter)

        # filter down the query to remove files associated with nodes we've specifically been asked to exclude
        if exclude_node_ids:
            nodes_query = nodes_query.order_by().exclude_by_uuids(
                _mptt_descendant_ids(
                    channel_id,
                    exclude_node_ids,
                    min_boundary,
                    max_boundary,
                )
            )

        min_boundary += dynamic_chunksize

        # Only bother with this query if there were any resources returned above.

        if nodes_query.count() > 0:
            nodes_queries_list.append(nodes_query)

    return nodes_queries_list


def get_content_nodes_data(
    channel_id, nodes_queries_list, available=None, topic_thumbnails=True
):
    """
    Returns a set of resources, file names, and a total size in bytes for all
    data files associated with the content nodes in nodes_queries_list.
    """

    queried_file_objects = {}
    number_of_resources = 0

    for nodes_query in nodes_queries_list:
        number_of_resources = number_of_resources + nodes_query.count()

        file_objects = LocalFile.objects.filter(
            files__contentnode__in=nodes_query
        ).values("id", "file_size", "extension")
        if available is not None:
            file_objects = file_objects.filter(available=available)
        for f in file_objects:
            queried_file_objects[f["id"]] = f

        if topic_thumbnails:
            # Do a query to get all the descendant and ancestor topics for this segment
            segment_boundaries = nodes_query.aggregate(
                min_boundary=Min("lft"), max_boundary=Max("rght")
            )
            segment_topics = ContentNode.objects.filter(
                channel_id=channel_id, kind=content_kinds.TOPIC
            ).filter(
                Q(
                    lft__lte=segment_boundaries["min_boundary"],
                    rght__gte=segment_boundaries["max_boundary"],
                )
                | Q(
                    lft__lte=segment_boundaries["max_boundary"],
                    rght__gte=segment_boundaries["min_boundary"],
                )
            )

            file_objects = LocalFile.objects.filter(
                files__contentnode__in=segment_topics,
            ).values("id", "file_size", "extension")
            if available is not None:
                file_objects = file_objects.filter(available=available)
            for f in file_objects:
                queried_file_objects[f["id"]] = f

    files_to_download = list(queried_file_objects.values())

    total_bytes_to_transfer = sum(map(lambda x: x["file_size"] or 0, files_to_download))
    return number_of_resources, files_to_download, total_bytes_to_transfer


def get_content_nodes_selectors(channel_id, nodes_queries_list):
    """
    Returns a dictionary with a set of include_node_ids and exclude_node_ids
    that can be used with the given channel_id to import the nodes contained
    in nodes_queries_list.
    """

    include_node_ids = list()
    exclude_node_ids = list()

    channel_metadata = ChannelMetadata.objects.get(id=channel_id)

    available_node_ids = set(
        itertools.chain.from_iterable(
            nodes_query.values_list("id", flat=True)
            for nodes_query in nodes_queries_list
        )
    )

    available_nodes_queue = [channel_metadata.root]

    while len(available_nodes_queue) > 0:
        node = available_nodes_queue.pop(0)

        # We could add nodes to exclude_node_ids when less than half of the
        # sibling nodes are missing. However, it is unclear if this would
        # be useful.

        if node.kind == "topic":
            leaf_node_ids = _get_leaf_node_ids(node)
            matching_leaf_nodes = leaf_node_ids.intersection(available_node_ids)
            missing_leaf_nodes = leaf_node_ids.difference(available_node_ids)
            if len(missing_leaf_nodes) == 0:
                assert node.id not in include_node_ids
                include_node_ids.append(node.id)
            elif len(matching_leaf_nodes) > 0:
                available_nodes_queue.extend(node.children.all())
        elif node.id in available_node_ids:
            assert node.id not in include_node_ids
            include_node_ids.append(node.id)

    return {
        "id": channel_id,
        "version": channel_metadata.version,
        "include_node_ids": include_node_ids,
        "exclude_node_ids": exclude_node_ids,
    }


def update_content_manifest(manifest_file, nodes_selectors):
    try:
        with open(manifest_file, "r") as fp:
            manifest_data = json.load(fp)
    except (FileNotFoundError, ValueError):
        # Use ValueError rather than JSONDecodeError for Py2 compatibility
        manifest_data = None

    if not isinstance(manifest_data, dict):
        manifest_data = {}

    channels = manifest_data.setdefault("channels", [])

    # TODO: If the channel is already listed, it would be nice to merge the
    #       new selectors instead of adding another entry for the same channel.

    if nodes_selectors not in channels:
        channels.append(nodes_selectors)

    manifest_data["channel_list_hash"] = hashlib.md5(
        json.dumps(channels).encode()
    ).hexdigest()

    os.makedirs(os.path.dirname(manifest_file), exist_ok=True)
    with open(manifest_file, "w") as fp:
        manifest_data = json.dump(manifest_data, fp, indent=4)


def _get_leaf_node_ids(node):
    return set(
        ContentNode.objects.filter(
            lft__gte=node.lft, lft__lte=node.rght, channel_id=node.channel_id
        )
        .exclude(kind="topic")
        .values_list("id", flat=True)
    )


def compare_checksums(file_name, file_id):
    hasher = hashlib.md5()
    with open(file_name, "rb") as f:
        # Read chunks of 4096 bytes for memory efficiency
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    checksum = hasher.hexdigest()
    return checksum == file_id
