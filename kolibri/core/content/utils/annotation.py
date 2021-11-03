import datetime
import logging
import os
from itertools import groupby
from math import ceil

from django.db.models import Max
from django.db.models import Sum
from le_utils.constants import content_kinds
from sqlalchemy import and_
from sqlalchemy import case
from sqlalchemy import cast
from sqlalchemy import exists
from sqlalchemy import false
from sqlalchemy import func
from sqlalchemy import Integer
from sqlalchemy import or_
from sqlalchemy import select
from sqlalchemy import String
from sqlalchemy.sql.expression import literal

from .paths import get_content_file_name
from .paths import get_content_storage_file_path
from .paths import using_remote_storage
from .sqlalchemybridge import Bridge
from .sqlalchemybridge import filter_by_uuids
from kolibri.core.content.apps import KolibriContentConfig
from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.search import get_all_contentnode_label_metadata
from kolibri.core.content.utils.sqlalchemybridge import filter_by_checksums
from kolibri.core.content.utils.tree import get_channel_node_depth
from kolibri.core.device.models import ContentCacheKey
from kolibri.core.utils.lock import db_lock

logger = logging.getLogger(__name__)

CONTENT_APP_NAME = KolibriContentConfig.label

CHUNKSIZE = 10000


def _generate_MPTT_descendants_statement(mptt_values, ContentNodeTable):
    """
    This logic is modified from:
    https://github.com/django-mptt/django-mptt/blob/38d46c26ca362c471b097ab96a3616b9b20fb883/mptt/managers.py#L137
    in order to render the result as a SQL Alchemy expression that we can use
    in other queries.
    """
    queries = []

    # Group the resultant mptt data by tree_id and parent_id,
    # this will allow us to consolidate contiguous siblings to reduce
    # the total number of constraints.
    # This logic is verbatim from Django MPTT, only the query construction
    # has been translated from Django Q statements to SQL Alchemy and_ statements.
    for group in groupby(
        mptt_values,
        key=lambda n: (
            # tree id
            n[0],
            # parent id
            n[1],
        ),
    ):
        next_lft = None
        for node in list(group[1]):
            tree = node[0]
            lft = min_val = node[2]
            rght = max_val = node[3]

            if next_lft is None:
                next_lft = rght + 1
                min_max = {"min": min_val, "max": max_val}
            elif lft == next_lft:
                if min_val < min_max["min"]:
                    min_max["min"] = min_val
                if max_val > min_max["max"]:
                    min_max["max"] = max_val
                next_lft = rght + 1
            elif lft != next_lft:
                queries.append(
                    and_(
                        ContentNodeTable.c.tree_id == tree,
                        ContentNodeTable.c.lft >= min_max["min"],
                        ContentNodeTable.c.rght <= min_max["max"],
                    )
                )
                min_max = {"min": min_val, "max": max_val}
                next_lft = rght + 1
        queries.append(
            and_(
                ContentNodeTable.c.tree_id == tree,
                ContentNodeTable.c.lft >= min_max["min"],
                ContentNodeTable.c.rght <= min_max["max"],
            )
        )
    return queries


def _MPTT_descendant_ids_statement(
    bridge, channel_id, node_ids, min_boundary, max_boundary
):
    ContentNodeTable = bridge.get_table(ContentNode)
    connection = bridge.get_connection()
    # Setup list to collect queries
    or_queries = []

    # First we fetch a list of non-topic ids from the specified node ids
    # that match the specified tree boundary ranges
    non_topic_results = connection.execute(
        select([ContentNodeTable.c.id]).where(
            and_(
                ContentNodeTable.c.channel_id == channel_id,
                filter_by_uuids(ContentNodeTable.c.id, node_ids),
                # Also filter by the boundary conditions
                # We are only interested in non-topic nodes that
                # are inside the range
                ContentNodeTable.c.rght >= min_boundary,
                ContentNodeTable.c.rght <= max_boundary,
                # Produce an id list for non topics
                ContentNodeTable.c.kind != content_kinds.TOPIC,
            )
        )
    ).fetchall()

    non_topic_node_ids = [result[0] for result in non_topic_results]

    # If we have any node ids that are for non-topics, then we add an explicit query
    # to match against those node ids
    if non_topic_node_ids:
        or_queries.append(filter_by_uuids(ContentNodeTable.c.id, non_topic_node_ids))

    # Now get the relevant MPTT values from the database for the specified node_ids
    # for topic nodes in the specified lft/rght range.
    # Query modified from:
    # https://github.com/django-mptt/django-mptt/blob/38d46c26ca362c471b097ab96a3616b9b20fb883/mptt/managers.py#L123
    mptt_values = connection.execute(
        select(
            [
                ContentNodeTable.c.tree_id,
                ContentNodeTable.c.parent_id,
                ContentNodeTable.c.lft,
                ContentNodeTable.c.rght,
            ]
        )
        .order_by(
            ContentNodeTable.c.tree_id,
            ContentNodeTable.c.parent_id,
            ContentNodeTable.c.lft,
        )
        .where(
            and_(
                ContentNodeTable.c.channel_id == channel_id,
                filter_by_uuids(ContentNodeTable.c.id, node_ids),
                # Add constraints specific to our requirements, in terms of batching:
                # Also filter by the boundary conditions
                # We are only interested in nodes that are ancestors of
                # the nodes in the range, but they could be ancestors of any node
                # in this range, so we filter the lft value by being less than
                # or equal to the max_boundary, and the rght value by being
                # greater than or equal to the min_boundary.
                ContentNodeTable.c.lft <= max_boundary,
                ContentNodeTable.c.rght >= min_boundary,
                # And topics:
                # Only select values for descendant constraints from topics
                ContentNodeTable.c.kind == content_kinds.TOPIC,
            )
        )
    ).fetchall()

    # Extend the constraints we are filtering by with ones generated from the relevant
    # MPTT values we have queried above.
    or_queries.extend(
        _generate_MPTT_descendants_statement(mptt_values, ContentNodeTable)
    )

    if not or_queries:
        # No constraints that apply in this range, so therefore this query should always
        # evaluate to False, because nothing can match it.
        return select([ContentNodeTable.c.id]).where(false())

    # Return a query that ors each of the constraints
    return select([ContentNodeTable.c.id]).where(or_(*or_queries))


def _create_batch_update_statement(
    bridge, channel_id, min_boundary, max_boundary, node_ids, exclude_node_ids
):
    ContentNodeTable = bridge.get_table(ContentNode)

    # Restrict the update statement to nodes falling within the boundaries
    batch_statement = ContentNodeTable.update().where(
        and_(
            # Only update leaf nodes (non topics)
            ContentNodeTable.c.kind != content_kinds.TOPIC,
            # Only update nodes in the channel we specified
            ContentNodeTable.c.channel_id == channel_id,
            # Only select nodes inside the boundary conditions
            ContentNodeTable.c.rght >= min_boundary,
            ContentNodeTable.c.rght <= max_boundary,
        )
    )
    if node_ids is not None:
        # Construct a statement that restricts which nodes we update
        # in this batch by the specified inclusion constraints
        node_ids_statement = _MPTT_descendant_ids_statement(
            bridge, channel_id, node_ids, min_boundary, max_boundary
        )
        # Add this statement to the query
        batch_statement = batch_statement.where(
            ContentNodeTable.c.id.in_(node_ids_statement)
        )

    if exclude_node_ids is not None:
        # Construct a statement that restricts nodes we update
        # in this batch by the specified exclusion constraints
        exclude_node_ids_statement = _MPTT_descendant_ids_statement(
            bridge, channel_id, exclude_node_ids, min_boundary, max_boundary
        )
        # Add this statement to the query
        batch_statement = batch_statement.where(
            ~ContentNodeTable.c.id.in_(exclude_node_ids_statement)
        )
    return batch_statement


def _calculate_batch_params(bridge, channel_id, node_ids, exclude_node_ids):
    ContentNodeTable = bridge.get_table(ContentNode)
    connection = bridge.get_connection()
    # To chunk the tree, we first find the full extent of the tree - this gives the
    # highest rght value for this channel.
    max_rght = connection.execute(
        select([func.max(ContentNodeTable.c.rght)]).where(
            ContentNodeTable.c.channel_id == channel_id
        )
    ).scalar()

    # Count the total number of constraints
    constraint_count = len(node_ids or []) + len(exclude_node_ids or [])

    # Aim for a constraint per batch count of about 250 on average
    # This means that there will be at most 750 parameters from the constraints
    # and should therefore also limit the overall SQL expression size.
    dynamic_chunksize = int(
        min(CHUNKSIZE, ceil(250 * max_rght / (constraint_count or 1)))
    )

    return max_rght, dynamic_chunksize


def set_leaf_nodes_invisible(channel_id, node_ids=None, exclude_node_ids=None):
    """
    Set nodes in a channel as unavailable.
    With no additional arguments, this will hide an entire channel.
    With the additional nodes arguments, it will selectively flag nodes
    as unavailable, based on the passed in ids, setting them as unavailable if
    they are in node_ids, or descendants of those nodes, but not in
    exclude_node_ids or descendants of those nodes.
    """
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    connection = bridge.get_connection()

    # Start a counter for the while loop
    min_boundary = 1

    # Calculate batch parameters
    max_rght, dynamic_chunksize = _calculate_batch_params(
        bridge, channel_id, node_ids, exclude_node_ids
    )

    logger.info(
        "Removing availability of non-topic ContentNode objects in {} batches of {}".format(
            int(ceil(max_rght / dynamic_chunksize)), dynamic_chunksize
        )
    )

    while min_boundary < max_rght:
        batch_statement = _create_batch_update_statement(
            bridge,
            channel_id,
            min_boundary,
            min_boundary + dynamic_chunksize,
            node_ids,
            exclude_node_ids,
        )

        # Execute the update for this batch
        connection.execute(
            batch_statement.values(available=False).execution_options(autocommit=True)
        )

        min_boundary += dynamic_chunksize

    bridge.end()


def set_leaf_node_availability_from_local_file_availability(
    channel_id, node_ids=None, exclude_node_ids=None
):
    """
    Set nodes in a channel as available, based on their required files.
    With no additional arguments, this will make every node in the channel
    available or unavailable based on whether the files needed to render
    those nodes are present on disk.
    With the additional nodes arguments, it will selectively flag nodes
    based on the passed in ids, marking their availability if
    they are in node_ids, or descendants of those nodes, but not in
    exclude_node_ids or descendants of those nodes.
    Nodes in the channel not captured by the constraints will not have
    their availability changed either way.
    """
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    # SQL Alchemy reference to the content node table
    ContentNodeTable = bridge.get_table(ContentNode)
    # SQL Alchemy reference to the file table - a mapping from
    # contentnodes to the files that they use
    FileTable = bridge.get_table(File)
    # SQL Alchemy reference to the localfile table which tracks
    # information about the files on disk, such as availability
    LocalFileTable = bridge.get_table(LocalFile)

    connection = bridge.get_connection()

    # This statement defines the update condition for the contentnode
    # running exists on this (as it is used below) will produce either
    # True, in the case when the contentnode has the required files
    # available for rendering, or False otherwise.
    contentnode_statement = (
        # We could select any property here, as it's the exist that matters.
        select([1]).select_from(
            # This does the first step in the many to many lookup for File
            # and LocalFile.
            FileTable.join(
                LocalFileTable,
                and_(
                    # This does the actual correlation between file and local file
                    FileTable.c.local_file_id == LocalFileTable.c.id,
                    # This only joins on LocalFile objects that we know
                    # have associated files on disk.
                    LocalFileTable.c.available == True,  # noqa
                ),
            )
        )
        # Only look at files that are required (not supplementary)
        .where(FileTable.c.supplementary == False)  # noqa
        # Correlate between the contentnode id and the foreign key
        # to the content node on the file table to complete the
        # many to many lookup
        .where(ContentNodeTable.c.id == FileTable.c.contentnode_id)
    )

    # Start a counter for the while loop
    min_boundary = 1

    # Calculate batch parameters
    max_rght, dynamic_chunksize = _calculate_batch_params(
        bridge, channel_id, node_ids, exclude_node_ids
    )

    logger.info(
        "Setting availability of non-topic ContentNode objects based on LocalFile availability in {} batches of {}".format(
            int(ceil(max_rght / dynamic_chunksize)), dynamic_chunksize
        )
    )

    while min_boundary < max_rght:
        batch_statement = _create_batch_update_statement(
            bridge,
            channel_id,
            min_boundary,
            min_boundary + dynamic_chunksize,
            node_ids,
            exclude_node_ids,
        )

        # Execute the update for this batch
        connection.execute(
            batch_statement.values(
                available=exists(contentnode_statement)
            ).execution_options(autocommit=True)
        )
        min_boundary += dynamic_chunksize

    bridge.end()


def mark_local_files_as_unavailable(checksums, destination=None):
    mark_local_files_availability(checksums, False, destination=destination)


def mark_local_files_as_available(checksums, destination=None):
    """
    Shortcut method to update database if we are sure that the files are available.
    Can be used after successful downloads to flag availability without having to do expensive disk reads.
    """
    mark_local_files_availability(checksums, True, destination=destination)


def mark_local_files_availability(checksums, availability, destination=None):
    if checksums:
        bridge = Bridge(app_name=CONTENT_APP_NAME, sqlite_file_path=destination)

        LocalFileTable = bridge.get_table(LocalFile)

        logger.info(
            "Setting availability to {availability} of {number} LocalFile objects based on passed in checksums".format(
                number=len(checksums), availability=availability
            )
        )

        connection = bridge.get_connection()

        trans = connection.begin()

        for i in range(0, len(checksums), CHUNKSIZE):
            connection.execute(
                LocalFileTable.update()
                .where(
                    filter_by_checksums(
                        LocalFileTable.c.id, checksums[i : i + CHUNKSIZE]
                    )
                )
                .values(available=availability)
            )

        trans.commit()

        bridge.end()


def _check_file_availability(files):
    checksums_to_set_available = []
    checksums_to_set_unavailable = []
    for file in files:
        try:
            # Update if the file exists, *and* the localfile is set as unavailable.
            if using_remote_storage() or os.path.exists(
                get_content_storage_file_path(
                    get_content_file_name({"id": file[0], "extension": file[2]})
                )
            ):
                if not file[1]:
                    checksums_to_set_available.append(file[0])
            # Update if the file does not exist, *and* the localfile is set as available.
            else:
                if file[1]:
                    checksums_to_set_unavailable.append(file[0])
        except InvalidStorageFilenameError:
            continue

    return checksums_to_set_available, checksums_to_set_unavailable


def set_local_file_availability_from_disk(checksums=None, destination=None):
    if type(checksums) == list and len(checksums) > CHUNKSIZE:
        for i in range(0, len(checksums), CHUNKSIZE):
            set_local_file_availability_from_disk(
                checksums=checksums[i : i + CHUNKSIZE], destination=destination
            )
        return

    bridge = Bridge(app_name=CONTENT_APP_NAME, sqlite_file_path=destination)

    LocalFileTable = bridge.get_table(LocalFile)

    query = select(
        [LocalFileTable.c.id, LocalFileTable.c.available, LocalFileTable.c.extension]
    )

    if checksums is None:
        logger.info(
            "Setting availability of LocalFile objects based on disk availability"
        )
    elif type(checksums) == list:
        logger.info(
            "Setting availability of {number} LocalFile objects based on disk availability".format(
                number=len(checksums)
            )
        )
        query = query.where(filter_by_checksums(LocalFileTable.c.id, checksums))
    else:
        logger.info(
            "Setting availability of LocalFile object with checksum {checksum} based on disk availability".format(
                checksum=checksums
            )
        )
        query = query.where(LocalFileTable.c.id == checksums)

    connection = bridge.get_connection()

    files = connection.execute(query).fetchall()

    checksums_to_set_available, checksums_to_set_unavailable = _check_file_availability(
        files
    )

    bridge.end()

    mark_local_files_as_available(checksums_to_set_available, destination=destination)
    mark_local_files_as_unavailable(
        checksums_to_set_unavailable, destination=destination
    )


def recurse_annotation_up_tree(channel_id):
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    ContentNodeTable = bridge.get_table(ContentNode)

    connection = bridge.get_connection()

    node_depth = get_channel_node_depth(bridge, channel_id)

    logger.info(
        "Annotating ContentNode objects with children for {levels} levels".format(
            levels=node_depth
        )
    )

    child = ContentNodeTable.alias()

    # start a transaction

    trans = connection.begin()
    start = datetime.datetime.now()

    # Update all leaf ContentNodes to have num_coach_content to 1 or 0
    # Update all leaf ContentNodes to have on_device_resources to 1 or 0
    connection.execute(
        ContentNodeTable.update()
        .where(
            and_(
                # In this channel
                ContentNodeTable.c.channel_id == channel_id,
                # That are not topics
                ContentNodeTable.c.kind != content_kinds.TOPIC,
            )
        )
        .values(
            num_coach_contents=cast(ContentNodeTable.c.coach_content, Integer()),
            on_device_resources=cast(ContentNodeTable.c.available, Integer()),
        )
    )

    # Before starting set availability to False on all topics.
    connection.execute(
        ContentNodeTable.update()
        .where(
            and_(
                # In this channel
                ContentNodeTable.c.channel_id == channel_id,
                # That are topics
                ContentNodeTable.c.kind == content_kinds.TOPIC,
            )
        )
        .values(
            available=False,
            on_device_resources=0,
        )
    )

    # Expression to capture all available child nodes of a contentnode
    available_nodes = select([child.c.available]).where(
        and_(
            child.c.available == True,  # noqa
            ContentNodeTable.c.id == child.c.parent_id,
        )
    )

    # Expressions for annotation of coach content

    # Expression that will resolve a boolean value for all the available children
    # of a content node, whereby if they all have coach_content flagged on them, it will be true,
    # but otherwise false.
    # Everything after the select statement should be identical to the available_nodes expression above.
    if bridge.engine.name == "sqlite":
        # Use a min function to simulate an AND.
        coach_content_nodes = select([func.min(child.c.coach_content)]).where(
            and_(
                child.c.available == True,  # noqa
                ContentNodeTable.c.id == child.c.parent_id,
            )
        )
    elif bridge.engine.name == "postgresql":
        # Use the postgres boolean AND operator
        coach_content_nodes = select([func.bool_and(child.c.coach_content)]).where(
            and_(
                child.c.available == True,  # noqa
                ContentNodeTable.c.id == child.c.parent_id,
            )
        )

    # Expression that sums the total number of coach contents for each child node
    # of a contentnode
    coach_content_num = select([func.sum(child.c.num_coach_contents)]).where(
        and_(
            child.c.available == True,  # noqa
            ContentNodeTable.c.id == child.c.parent_id,
        )
    )

    # Expression that sums the total number of on_device_resources for each child node
    # of a contentnode
    on_device_num = select([func.sum(child.c.on_device_resources)]).where(
        and_(
            child.c.available == True,  # noqa
            ContentNodeTable.c.id == child.c.parent_id,
        )
    )

    # Go from the deepest level to the shallowest
    for level in range(node_depth, 0, -1):

        logger.info(
            "Annotating ContentNode objects with children for level {level}".format(
                level=level
            )
        )
        # Only modify topic availability here
        connection.execute(
            ContentNodeTable.update()
            .where(
                and_(
                    ContentNodeTable.c.level == level - 1,
                    ContentNodeTable.c.channel_id == channel_id,
                    ContentNodeTable.c.kind == content_kinds.TOPIC,
                )
            )
            # Because we have set availability to False on all topics as a starting point
            # we only need to make updates to topics with available children.
            .where(exists(available_nodes))
            .values(
                available=exists(available_nodes),
                coach_content=coach_content_nodes,
                num_coach_contents=coach_content_num,
                on_device_resources=on_device_num,
            )
        )

    # commit the transaction
    trans.commit()

    elapsed = datetime.datetime.now() - start
    logger.debug(
        "Recursive topic tree annotation took {} seconds".format(elapsed.seconds)
    )

    bridge.end()


def calculate_dummy_progress_for_annotation(node_ids, exclude_node_ids, total_progress):
    num_annotation_constraints = len(node_ids or []) + len(exclude_node_ids or [])

    # Calculate a percentage of the total progress to denote to annotation
    # between 1 and 10
    annotation_proportion = min(10, max(1, int(num_annotation_constraints / 500)))

    # Create some progress proportional to annotation task
    return int(annotation_proportion * total_progress / (100 - annotation_proportion))


def propagate_forced_localfile_removal(localfiles_dict_list):
    total = len(localfiles_dict_list)
    i = 0
    # Even thought we are using the filter_by_uuids method below
    # which prevents too many SQL parameters from being passed in to the query
    # if we have too many UUIDs it is possible we might still generate too much SQL
    # and cause issues - so we batch the ids here.
    batch_size = 10000
    while i < total:
        file_slice = localfiles_dict_list[i : i + batch_size]
        files = File.objects.filter(
            supplementary=False,
            local_file__in=LocalFile.objects.filter_by_uuids(
                [f["id"] for f in file_slice]
            ),
        )
        ContentNode.objects.filter(files__in=files).update(available=False)
        i += batch_size


def reannotate_all_channels():
    for channel_id in ChannelMetadata.objects.all().values_list("id", flat=True):
        recurse_annotation_up_tree(channel_id)


def update_content_metadata(
    channel_id, node_ids=None, exclude_node_ids=None, public=None
):
    set_leaf_node_availability_from_local_file_availability(
        channel_id, node_ids=node_ids, exclude_node_ids=exclude_node_ids
    )
    recurse_annotation_up_tree(channel_id)
    set_channel_metadata_fields(channel_id, public=public)
    ContentCacheKey.update_cache_key()
    # Do this call after refreshing the content cache key
    # as the caching is dependent on the key.
    get_all_contentnode_label_metadata()


def set_content_visibility(
    channel_id, checksums, node_ids=None, exclude_node_ids=None, public=None
):
    mark_local_files_as_available(checksums)
    update_content_metadata(
        channel_id, node_ids=node_ids, exclude_node_ids=exclude_node_ids, public=public
    )


def set_content_visibility_from_disk(channel_id):
    set_local_file_availability_from_disk()
    update_content_metadata(channel_id)


def set_content_invisible(channel_id, node_ids, exclude_node_ids):
    set_leaf_nodes_invisible(channel_id, node_ids, exclude_node_ids)
    recurse_annotation_up_tree(channel_id)
    set_channel_metadata_fields(channel_id)
    ContentCacheKey.update_cache_key()
    # Do this call after refreshing the content cache key
    # as the caching is dependent on the key.
    get_all_contentnode_label_metadata()


def set_channel_metadata_fields(channel_id, public=None):
    with db_lock():
        channel = ChannelMetadata.objects.get(id=channel_id)
        calculate_published_size(channel)
        calculate_total_resource_count(channel)
        calculate_included_languages(channel)
        calculate_next_order(channel)

        if public is not None:
            channel.public = public
            channel.save()


def files_for_nodes(nodes):
    return LocalFile.objects.filter(files__contentnode__in=nodes)


def total_file_size(files_or_nodes):
    if issubclass(files_or_nodes.model, LocalFile):
        localfiles = files_or_nodes
    elif issubclass(files_or_nodes.model, ContentNode):
        localfiles = files_for_nodes(files_or_nodes)
    else:
        raise TypeError("Expected queryset for LocalFile or ContentNode")
    return localfiles.distinct().aggregate(Sum("file_size"))["file_size__sum"] or 0


def calculate_published_size(channel):
    content_nodes = ContentNode.objects.filter(channel_id=channel.id)
    channel.published_size = total_file_size(
        files_for_nodes(content_nodes).filter(available=True)
    )
    channel.save()


def calculate_total_resource_count(channel):
    content_nodes = ContentNode.objects.filter(channel_id=channel.id)
    channel.total_resource_count = (
        content_nodes.filter(available=True)
        .exclude(kind=content_kinds.TOPIC)
        .dedupe_by_content_id()
        .count()
    )
    channel.save()


def calculate_included_languages(channel):
    content_nodes = ContentNode.objects.filter(
        channel_id=channel.id, available=True
    ).exclude(lang=None)
    languages = content_nodes.order_by("lang").values_list("lang", flat=True).distinct()
    channel.included_languages.add(*list(languages))


def calculate_next_order(channel, model=ChannelMetadata):
    if channel.order is None or channel.order == 0:
        max_order = model.objects.aggregate(Max("order")).get("order__max", 0)
        if max_order is None:
            max_order = 0
        channel.order = max_order + 1

    channel.save()


def set_channel_ancestors(channel_id):
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    ContentNodeTable = bridge.get_table(ContentNode)

    connection = bridge.get_connection()

    node_depth = get_channel_node_depth(bridge, channel_id)

    parent = ContentNodeTable.alias()

    # start a transaction

    trans = connection.begin()
    start = datetime.datetime.now()

    connection.execute(
        ContentNodeTable.update()
        .where(
            and_(
                ContentNodeTable.c.level == 0,
                ContentNodeTable.c.channel_id == channel_id,
            )
        )
        .values(ancestors="[]")
    )

    # Go from the shallowest to deepest
    for level in range(1, node_depth + 1):

        if bridge.engine.name == "sqlite":
            parent_id_expression = ContentNodeTable.c.parent_id
        elif bridge.engine.name == "postgresql":
            parent_id_expression = func.replace(
                cast(ContentNodeTable.c.parent_id, String(length=36)), "-", ""
            )

        # Statement to generate the ancestors JSON using SQL, to avoid having to load data
        # into Python in order to do this.
        ancestors = select(
            [
                # Get all of the JSON from the parent's ancestors field, but remove the
                # closing ]
                func.substr(
                    parent.c.ancestors, 1, func.length(parent.c.ancestors) - literal(1)
                )
                # Conditionalize how we add new elements depending on whether the parent's
                # ancestors are empty or not.
                + case(
                    [
                        (
                            # If the last (and presumably first) character of the parent's
                            # ancestors field is literal '[' then this is an empty ancestors list
                            func.substr(
                                parent.c.ancestors,
                                func.length(parent.c.ancestors) - literal(1),
                                1,
                            )
                            == literal("["),
                            # In this case we just open the object without having to prepend a comma.
                            '{"id": "',
                        )
                    ],
                    # Otherwise we are adding a new element to a JSON list that already has elements in it
                    # so we prepend with a comma in order to separate.
                    else_=',{"id": "',
                )
                + parent_id_expression
                + '","title": "'
                + func.replace(parent.c.title, '"', '\\"')
                + '"}]'
            ]
        ).where(
            and_(
                ContentNodeTable.c.parent_id == parent.c.id,
            )
        )

        connection.execute(
            ContentNodeTable.update()
            .where(
                and_(
                    ContentNodeTable.c.level == level,
                    ContentNodeTable.c.channel_id == channel_id,
                )
            )
            .values(
                ancestors=ancestors,
            )
        )

    # commit the transaction
    trans.commit()

    elapsed = datetime.datetime.now() - start
    logger.debug(
        "Recursive ancestor annotation took {} seconds".format(elapsed.seconds)
    )

    bridge.end()
