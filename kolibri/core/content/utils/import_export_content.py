from math import ceil

from django.db.models import Max
from django.db.models import Min
from django.db.models import Q
from le_utils.constants import content_kinds

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
from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_INSTANCE_ID


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

    if peer_id and peer_id != CENTRAL_CONTENT_BASE_INSTANCE_ID:
        file_based_node_id_list = get_channel_stats_from_peer(
            channel_id, peer_id
        ).keys()

    if file_based_node_id_list is not None:
        nodes_to_include = nodes_to_include.filter_by_uuids(file_based_node_id_list)

    return nodes_to_include


def get_import_export_data(
    channel_id,
    node_ids=None,
    exclude_node_ids=None,
    available=None,
    drive_id=None,
    peer_id=None,
    renderable_only=True,
    topic_thumbnails=True,
    all_thumbnails=False,
    check_file_availability=True,
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
        check_file_availability=check_file_availability,
    )
    return get_content_nodes_data(
        channel_id,
        nodes_queries_list,
        available=available,
        topic_thumbnails=topic_thumbnails,
        all_thumbnails=all_thumbnails,
    )


def get_import_export_nodes(  # noqa: C901
    channel_id,
    node_ids=None,
    exclude_node_ids=None,
    available=None,
    drive_id=None,
    peer_id=None,
    renderable_only=True,
    check_file_availability=True,
):
    """
    Returns a list of queries for ContentNode objects matching the given
    constraints. This can be used with get_content_nodes_data and with
    ContentManifest.add_content_nodes.

    There is a distinction between calling this function with node_ids=[] and
    with node_ids=None. With an empty list, no nodes will be selected. With a
    value of None, all nodes will be selected.
    """

    nodes_queries_list = []
    min_boundary = 1

    max_rght, dynamic_chunksize = _calculate_batch_params(
        channel_id, node_ids, exclude_node_ids
    )

    nodes_to_include = ContentNode.objects.filter(channel_id=channel_id).exclude(
        kind=content_kinds.TOPIC
    )

    # When exporting, only include available nodes. When importing, include any
    # nodes that are missing files in case they have missing supplementary
    # files and would be considered available.
    if available is True:
        nodes_to_include = nodes_to_include.filter(available=True)
    elif available is False:
        nodes_to_include = nodes_to_include.filter(files__local_file__available=False)

    if check_file_availability:
        nodes_to_include = filter_by_file_availability(
            nodes_to_include, channel_id, drive_id, peer_id
        )

    while min_boundary < max_rght:
        max_boundary = min_boundary + dynamic_chunksize
        nodes_query = nodes_to_include

        # if requested, filter down to only include particular topics/nodes
        if node_ids is not None:
            nodes_query = nodes_query.filter_by_uuids(
                _mptt_descendant_ids(
                    channel_id, node_ids, min_boundary, min_boundary + dynamic_chunksize
                )
            )

        # if requested, filter out nodes we're not able to render
        if renderable_only:
            nodes_query = nodes_query.filter(renderable_contentnodes_q_filter)

        # filter down the query to remove files associated with nodes we've specifically been asked to exclude
        if exclude_node_ids is not None:
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
            nodes_queries_list.append(nodes_query.distinct())

    return nodes_queries_list


def get_content_nodes_data(  # noqa: C901
    channel_id,
    nodes_queries_list,
    available=None,
    topic_thumbnails=True,
    all_thumbnails=False,
):
    """
    Returns a set of resources, file names, and a total size in bytes for all
    data files associated with the content nodes in nodes_queries_list.
    """

    queried_file_objects = {}
    number_of_resources = 0

    if all_thumbnails:
        file_objects = LocalFile.objects.filter(
            files__thumbnail=True,
            files__contentnode__channel_id=channel_id,
        ).values("id", "file_size", "extension")
        if available is not None:
            file_objects = file_objects.filter(available=available)
        for f in file_objects:
            queried_file_objects[f["id"]] = f

    for nodes_query in nodes_queries_list:
        number_of_resources = number_of_resources + nodes_query.count()

        file_objects = LocalFile.objects.filter(
            files__contentnode__in=nodes_query
        ).values("id", "file_size", "extension")
        if available is not None:
            file_objects = file_objects.filter(available=available)
        if all_thumbnails:
            file_objects = file_objects.filter(files__thumbnail=False)
        for f in file_objects:
            queried_file_objects[f["id"]] = f

        if topic_thumbnails and not all_thumbnails:
            # Do a query to get all the descendant and ancestor topics for this segment
            segment_boundaries = nodes_query.aggregate(
                min_boundary=Min("lft"), max_boundary=Max("rght")
            )
            # If the nodes_query queryset was empty, these aggregated values will be None
            # and Django does not let us do lte and gte queries against None,
            # plus even trying is a waste of our time, because the query should return nothing.
            if (
                segment_boundaries["min_boundary"] is not None
                and segment_boundaries["max_boundary"] is not None
            ):
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
