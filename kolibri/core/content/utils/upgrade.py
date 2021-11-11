import logging
import os

from django.core.management import call_command
from le_utils.constants import content_kinds
from sqlalchemy import and_
from sqlalchemy import func
from sqlalchemy import or_
from sqlalchemy import select

from kolibri.core.content.constants.schema_versions import CURRENT_SCHEMA_VERSION
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils import annotation
from kolibri.core.content.utils import channel_import
from kolibri.core.content.utils.annotation import CONTENT_APP_NAME
from kolibri.core.content.utils.channels import CHANNEL_UPDATE_STATS_CACHE_KEY
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.content.utils.content_types_tools import (
    renderable_contentnodes_q_filter,
)
from kolibri.core.content.utils.content_types_tools import renderable_files_presets
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_disk,
)
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_peer,
)
from kolibri.core.content.utils.paths import get_annotated_content_database_file_path
from kolibri.core.content.utils.paths import get_upgrade_content_database_file_path
from kolibri.core.content.utils.sqlalchemybridge import Bridge
from kolibri.core.content.utils.sqlalchemybridge import coerce_key
from kolibri.core.content.utils.sqlalchemybridge import filter_by_uuids
from kolibri.core.tasks.exceptions import UserCancelledError
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.utils.cache import process_cache


logger = logging.getLogger(__name__)


def clear_diff_stats(channel_id):
    process_cache.delete(CHANNEL_UPDATE_STATS_CACHE_KEY.format(channel_id))


def diff_stats(channel_id, method, drive_id=None, baseurl=None):
    """
    Download the channel database to an upgraded path.
    Annotate the local file availability of the upgraded channel db.
    Calculate diff stats comparing default db and annotated channel db.
    """
    # upgraded content database path
    source_path = get_upgrade_content_database_file_path(channel_id)
    # annotated db to be used for calculating diff stats
    destination_path = get_annotated_content_database_file_path(channel_id)
    try:
        if method == "network":
            call_command(
                "importchannel", "network", channel_id, baseurl=baseurl, no_upgrade=True
            )
        elif method == "disk":
            drive = get_mounted_drive_by_id(drive_id)
            call_command(
                "importchannel", "disk", channel_id, drive.datafolder, no_upgrade=True
            )

        # create all fields/tables at the annotated destination db, based on the current schema version
        bridge = Bridge(
            sqlite_file_path=destination_path, schema_version=CURRENT_SCHEMA_VERSION
        )
        bridge.Base.metadata.create_all(bridge.engine)

        # initialize import manager based on annotated destination path, pulling from source db path
        import_manager = channel_import.initialize_import_manager(
            channel_id,
            cancel_check=False,
            source=source_path,
            destination=destination_path,
        )

        # import channel data from source db path
        import_manager.import_channel_data()
        import_manager.end()

        # annotate file availability on destination db
        annotation.set_local_file_availability_from_disk(destination=destination_path)
        # get the diff count between whats on the default db and the annotated db
        (
            new_resource_ids,
            new_resource_content_ids,
            new_resource_total_size,
        ) = get_new_resources_available_for_import(destination_path, channel_id)
        # get the count for leaf nodes which are in the default db, but not in the annotated db
        resources_to_be_deleted_count = count_removed_resources(
            destination_path, channel_id
        )
        # get the ids of leaf nodes which are now incomplete due to missing local files
        (
            updated_resource_ids,
            updated_resource_content_ids,
            updated_resource_total_size,
        ) = get_automatically_updated_resources(destination_path, channel_id)
        # remove the annotated database
        try:
            os.remove(destination_path)
        except OSError as e:
            logger.info(
                "Tried to remove {}, but exception {} occurred.".format(
                    destination_path, e
                )
            )
        # annotate job metadata with diff stats
        job = get_current_job()
        if job:
            job.extra_metadata["new_resources_count"] = len(new_resource_content_ids)
            job.extra_metadata[
                "deleted_resources_count"
            ] = resources_to_be_deleted_count
            job.extra_metadata["updated_resources_count"] = len(
                updated_resource_content_ids
            )
            job.save_meta()

        CACHE_KEY = CHANNEL_UPDATE_STATS_CACHE_KEY.format(channel_id)

        process_cache.set(
            CACHE_KEY,
            {
                "new_resource_ids": new_resource_ids,
                "new_resource_content_ids": new_resource_content_ids,
                "new_resource_total_size": new_resource_total_size,
                "updated_resource_ids": updated_resource_ids,
                "updated_resource_content_ids": updated_resource_content_ids,
                "updated_resource_total_size": updated_resource_total_size,
            },
            # Should persist until explicitly cleared (at content import)
            # or until server restart.
            None,
        )

    except UserCancelledError:
        # remove the annotated database
        try:
            os.remove(destination_path)
        except OSError:
            pass
        raise


batch_size = 1000


def get_new_resources_available_for_import(destination, channel_id):
    """
    Queries the destination db to get leaf nodes.
    Subtract total number of leaf nodes by the count of leaf nodes on default db to get the number of new resources.
    """
    bridge = Bridge(app_name=CONTENT_APP_NAME, sqlite_file_path=destination)
    # SQL Alchemy reference to the content node table
    ContentNodeTable = bridge.get_table(ContentNode)
    # SQL Alchemy reference to the file table - a mapping from
    # contentnodes to the files that they use
    FileTable = bridge.get_table(File)
    # SQL Alchemy reference to the localfile table which tracks
    # information about the files on disk, such as availability
    LocalFileTable = bridge.get_table(LocalFile)
    connection = bridge.get_connection()

    # To efficiently get the node ids of all new nodes in the channel
    # we are going to iterate over the currently existing nodes for the
    # channel in the default database, and cache their existence in the
    # temporary upgrade database by flagging them as 'available' in there
    # We can then read out all of the unavailable ContentNodes in order
    # to get a complete list of the newly available ids.
    # We wrap this all in a transaction so that we can roll it back afterwards
    # but this is mostly just not to leave the upgrade DB in a messy state
    # and could be removed if it becomes a performance concern

    # Create a queryset for the node ids of resources currently in this channel
    # we will slice this later in a while loop in order to efficiently process this
    # this is necessary otherwise we would end up querying tens of thousands of node ids
    # for a large channel, which would then be impossible to pass into an update query
    # for the temporary upgrade DB without causing an excessively large query
    # greater than 1MB, which is the default max for SQLite
    current_resource_node_id_queryset = (
        ContentNode.objects.filter(channel_id=channel_id)
        .exclude(kind=content_kinds.TOPIC)
        .values_list("id", flat=True)
    )

    i = 0

    # start a transaction

    trans = connection.begin()

    # Set everything to False to start with
    connection.execute(
        ContentNodeTable.update()
        .where(ContentNodeTable.c.channel_id == channel_id)
        .values(available=False)
    )

    node_ids = current_resource_node_id_queryset[i : i + batch_size]
    while node_ids:
        # Set everything to False to start with
        connection.execute(
            ContentNodeTable.update()
            .where(
                and_(
                    filter_by_uuids(
                        ContentNodeTable.c.id, node_ids, vendor=bridge.engine.name
                    ),
                    ContentNodeTable.c.channel_id == channel_id,
                )
            )
            .values(available=True)
        )
        i += batch_size
        node_ids = current_resource_node_id_queryset[i : i + batch_size]

    renderable_contentnodes = (
        select([FileTable.c.contentnode_id])
        .where(FileTable.c.supplementary == False)  # noqa
        .where(
            or_(*(FileTable.c.preset == preset for preset in renderable_files_presets))
        )
    )

    contentnode_filter_expression = and_(
        ContentNodeTable.c.channel_id == channel_id,
        ContentNodeTable.c.kind != content_kinds.TOPIC,
        ContentNodeTable.c.available == False,  # noqa
        ContentNodeTable.c.id.in_(renderable_contentnodes),
    )

    new_resource_nodes_total_size = (
        connection.execute(
            # This does the first step in the many to many lookup for File
            select([func.sum(LocalFileTable.c.file_size)]).where(
                LocalFileTable.c.id.in_(
                    select([LocalFileTable.c.id])
                    .select_from(
                        # and LocalFile.
                        LocalFileTable.join(
                            FileTable.join(
                                ContentNodeTable,
                                FileTable.c.contentnode_id == ContentNodeTable.c.id,
                            ),  # This does the actual correlation between file and local file
                            FileTable.c.local_file_id == LocalFileTable.c.id,
                        )
                    )
                    .where(
                        and_(
                            # Filter only for files that are unavailable so we show
                            # the import size
                            LocalFileTable.c.available == False,  # noqa
                            contentnode_filter_expression,
                        )
                    )
                )
            )
        ).fetchone()[0]
        or 0
    )

    new_resource_node_ids_statement = select([ContentNodeTable.c.id]).where(
        and_(
            ContentNodeTable.c.channel_id == channel_id,
            ContentNodeTable.c.kind != content_kinds.TOPIC,
            ContentNodeTable.c.available == False,  # noqa
        )
    )

    new_resource_node_ids = [
        coerce_key(c[0])
        for c in connection.execute(new_resource_node_ids_statement).fetchall()
    ]

    trans.rollback()

    # Create a queryset for the content_ids of resources currently in this channel
    # we will slice this later in a while loop in order to efficiently process this
    # this is necessary otherwise we would end up querying tens of thousands of node ids
    # for a large channel, which would then be impossible to pass into an update query
    # for the temporary upgrade DB without causing an excessively large query
    # greater than 1MB, which is the default max for SQLite
    current_resource_content_id_queryset = (
        ContentNode.objects.filter(channel_id=channel_id)
        .exclude(kind=content_kinds.TOPIC)
        .values_list("content_id", flat=True)
    )

    i = 0

    # start a transaction

    trans = connection.begin()

    # Set everything to False to start with
    connection.execute(
        ContentNodeTable.update()
        .where(ContentNodeTable.c.channel_id == channel_id)
        .values(available=False)
    )

    content_ids = current_resource_content_id_queryset[i : i + batch_size]
    while content_ids:
        # Set everything to False to start with
        connection.execute(
            ContentNodeTable.update()
            .where(
                and_(
                    filter_by_uuids(
                        ContentNodeTable.c.content_id,
                        content_ids,
                        vendor=bridge.engine.name,
                    ),
                    ContentNodeTable.c.channel_id == channel_id,
                )
            )
            .values(available=True)
        )
        i += batch_size
        content_ids = current_resource_content_id_queryset[i : i + batch_size]

    new_resource_content_ids_statement = (
        select([ContentNodeTable.c.content_id])
        .where(
            and_(
                ContentNodeTable.c.channel_id == channel_id,
                ContentNodeTable.c.kind != content_kinds.TOPIC,
                ContentNodeTable.c.available == False,  # noqa
            )
        )
        .distinct()
    )

    new_resource_content_ids = [
        coerce_key(c[0])
        for c in connection.execute(new_resource_content_ids_statement).fetchall()
    ]

    trans.rollback()

    return (
        new_resource_node_ids,
        new_resource_content_ids,
        new_resource_nodes_total_size,
    )


def count_removed_resources(destination, channel_id):
    """
    Queries the destination db to get the leaf node content_ids.
    Subtract available leaf nodes count on default db by available
    leaf nodes based on destination db leaf node content_ids.
    """
    bridge = Bridge(app_name=CONTENT_APP_NAME, sqlite_file_path=destination)
    connection = bridge.get_connection()
    ContentNodeTable = bridge.get_table(ContentNode)
    resource_node_ids_statement = (
        select([ContentNodeTable.c.id])
        .where(
            and_(
                ContentNodeTable.c.channel_id == channel_id,
                ContentNodeTable.c.kind != content_kinds.TOPIC,
            )
        )
        .limit(batch_size)
    )

    i = 0

    resource_node_ids = [
        coerce_key(cid[0])
        for cid in connection.execute(resource_node_ids_statement.offset(i)).fetchall()
    ]

    content_ids_after_upgrade = set()

    # Batch the query here, as passing too many uuids into Django could cause
    # the a SQL query too large error. This will happen around about 30000+ uuids.
    # Could probably batch at 10000 rather than 1000 - but using 1000 to be defensive.

    while resource_node_ids:
        content_ids_after_upgrade.update(
            (
                ContentNode.objects.filter_by_uuids(resource_node_ids, validate=False)
                .exclude(kind=content_kinds.TOPIC)
                .filter(available=True, channel_id=channel_id)
                .values_list("content_id", flat=True)
                .distinct()
            )
        )

        i += batch_size
        resource_node_ids = [
            coerce_key(cid[0])
            for cid in connection.execute(
                resource_node_ids_statement.offset(i)
            ).fetchall()
        ]

    total_resources_after_upgrade = len(content_ids_after_upgrade)

    return (
        ContentNode.objects.filter(channel_id=channel_id, available=True)
        .exclude(kind=content_kinds.TOPIC)
        .values("content_id")
        .distinct()
        .count()
        - total_resources_after_upgrade
    )


def get_automatically_updated_resources(destination, channel_id):
    """
    Queries the destination db to get the leaf node ids, where local file objects are unavailable.
    Get the available node ids related to those missing file objects.
    """
    bridge = Bridge(app_name=CONTENT_APP_NAME, sqlite_file_path=destination)
    connection = bridge.get_connection()
    ContentNodeTable = bridge.get_table(ContentNode)
    # SQL Alchemy reference to the file table - a mapping from
    # contentnodes to the files that they use
    FileTable = bridge.get_table(File)
    # SQL Alchemy reference to the localfile table which tracks
    # information about the files on disk, such as availability
    LocalFileTable = bridge.get_table(LocalFile)
    # get unavailable local file ids on the destination db
    unavailable_local_file_ids_statement = select([LocalFileTable.c.id]).where(
        LocalFileTable.c.available == False  # noqa
    )
    # get the Contentnode ids where File objects are missing in the destination db
    contentnode_ids_statement = (
        select([FileTable.c.contentnode_id])
        .where(
            and_(
                FileTable.c.local_file_id.in_(unavailable_local_file_ids_statement),
                FileTable.c.supplementary == False,  # noqa
                or_(
                    *(
                        FileTable.c.preset == preset
                        for preset in renderable_files_presets
                    )
                ),
            )
        )
        .limit(batch_size)
    )

    i = 0

    updated_resource_ids = set()

    updated_resource_content_ids = set()

    contentnode_ids = [
        coerce_key(cid[0])
        for cid in connection.execute(contentnode_ids_statement.offset(i)).fetchall()
    ]

    while contentnode_ids:
        # Exclude topics from here to prevent erroneous imports of their children
        # This should already be excluded as we are filtering to renderable files
        # so this is more of a sanity check
        for c in (
            ContentNode.objects.filter_by_uuids(contentnode_ids, validate=False)
            .filter(available=True, channel_id=channel_id)
            .exclude(kind=content_kinds.TOPIC)
            .values_list("id", "content_id")
        ):
            updated_resource_ids.add(c[0])
            updated_resource_content_ids.add(c[1])

        i += batch_size

        contentnode_ids = [
            coerce_key(cid[0])
            for cid in connection.execute(
                contentnode_ids_statement.offset(i)
            ).fetchall()
        ]

    # Do this after we have fetched all the ids and made them unique
    # otherwise, because we are getting our ids from the File table, we could
    # end up with a duplicate count of file sizes

    updated_resources_total_size = 0

    i = 0

    # Coerce to lists
    updated_resource_ids = list(updated_resource_ids)
    updated_resource_content_ids = list(updated_resource_content_ids)

    ids_batch = updated_resource_ids[i : i + batch_size]

    while ids_batch:

        contentnode_filter_expression = filter_by_uuids(
            ContentNodeTable.c.id, ids_batch, vendor=bridge.engine.name
        )

        # This does the first step in the many to many lookup for File
        updated_resources_total_size += connection.execute(
            select([func.sum(LocalFileTable.c.file_size)]).where(
                LocalFileTable.c.id.in_(
                    select([LocalFileTable.c.id])
                    .select_from(
                        # and LocalFile.
                        LocalFileTable.join(
                            FileTable.join(
                                ContentNodeTable,
                                FileTable.c.contentnode_id == ContentNodeTable.c.id,
                            ),  # This does the actual correlation between file and local file
                            FileTable.c.local_file_id == LocalFileTable.c.id,
                        )
                    )
                    .where(
                        and_(
                            # Filter only for files that are unavailable so we show
                            # the import size
                            LocalFileTable.c.available == False,  # noqa
                            contentnode_filter_expression,
                        )
                    )
                )
            )
        ).fetchone()[0]

        i += batch_size

        ids_batch = updated_resource_ids[i : i + batch_size]

    return (
        updated_resource_ids,
        updated_resource_content_ids,
        updated_resources_total_size,
    )


def get_import_data_for_update(
    channel_id, drive_id=None, peer_id=None, renderable_only=True
):
    update_stats = process_cache.get(CHANNEL_UPDATE_STATS_CACHE_KEY.format(channel_id))
    if not update_stats:
        raise ValueError(
            "Tried to get update content nodes for channel {} that has no precalculated update stats".format(
                channel_id
            )
        )

    # By default don't filter node ids by their underlying file importability
    file_based_node_id_dict = None
    if drive_id:
        file_based_node_id_dict = get_channel_stats_from_disk(channel_id, drive_id)

    if peer_id:
        file_based_node_id_dict = get_channel_stats_from_peer(channel_id, peer_id)

    updated_resource_ids = update_stats.get("updated_resource_ids", [])

    i = 0

    updated_ids_slice = updated_resource_ids[i : i + batch_size]

    nodes_to_include = ContentNode.objects.filter(channel_id=channel_id)

    # if requested, filter out nodes we're not able to render
    if renderable_only:
        nodes_to_include = nodes_to_include.filter(renderable_contentnodes_q_filter)

    queried_file_objects = []

    content_ids = set()

    while updated_ids_slice:
        if file_based_node_id_dict is not None:
            # If we have a list of limited node id availability limit our slice here
            updated_ids_slice = list(
                filter(lambda x: x in file_based_node_id_dict, updated_ids_slice)
            )

        # Possible that the above filtering rendered our list empty, so skip queries
        # in that case

        if updated_ids_slice:

            batch_nodes = nodes_to_include.filter_by_uuids(updated_ids_slice)

            content_ids.update(
                batch_nodes.values_list("content_id", flat=True).distinct()
            )

            files_to_transfer = LocalFile.objects.filter(
                available=False, files__contentnode__in=batch_nodes
            ).values("id", "file_size", "extension")

            queried_file_objects.extend(files_to_transfer)

        i += batch_size
        updated_ids_slice = updated_resource_ids[i : i + batch_size]

    # Get all nodes that are marked as available but have missing files.
    # This will ensure that we update thumbnails, and other files.
    queried_file_objects.extend(
        LocalFile.objects.filter(
            available=False,
            files__contentnode__in=ContentNode.objects.filter(
                available=True, channel_id=channel_id
            ),
        ).values("id", "file_size", "extension")
    )

    checksums = set()

    total_bytes_to_transfer = 0

    files_to_download = []

    for file in queried_file_objects:
        if file["id"] not in checksums:
            checksums.add(file["id"])
            total_bytes_to_transfer += file["file_size"]
            files_to_download.append(file)

    return len(content_ids), files_to_download, total_bytes_to_transfer
