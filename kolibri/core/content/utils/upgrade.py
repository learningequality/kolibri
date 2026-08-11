import logging
import os

from django.db import transaction
from django.db.models import Q
from le_utils.constants import content_kinds
from le_utils.constants import modalities

from kolibri.core.content.constants.transfer_types import COPY_METHOD
from kolibri.core.content.constants.transfer_types import DOWNLOAD_METHOD
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils import annotation
from kolibri.core.content.utils import channel_import
from kolibri.core.content.utils.channel_transfer import transfer_channel
from kolibri.core.content.utils.channels import CHANNEL_UPDATE_STATS_CACHE_KEY
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.content.utils.channels import read_channel_metadata_from_db_file
from kolibri.core.content.utils.content_db import content_db
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
from kolibri.core.tasks.exceptions import UserCancelledError
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.utils.cache import process_cache

logger = logging.getLogger(__name__)


def clear_diff_stats(channel_id):
    process_cache.delete(CHANNEL_UPDATE_STATS_CACHE_KEY.format(channel_id))


def _get_channel_version_for_diff(token, new_channel_version):
    if not token or new_channel_version is None:
        return None
    return "next" if new_channel_version == 0 else new_channel_version


def diff_stats(
    channel_id,
    method,
    drive_id=None,
    baseurl=None,
    token=None,
    new_channel_version=None,
):
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
            transfer_channel(
                channel_id=channel_id,
                method=DOWNLOAD_METHOD,
                no_upgrade=True,
                baseurl=baseurl,
                token=token,
                version=_get_channel_version_for_diff(token, new_channel_version),
            )
        elif method == "disk":
            drive = get_mounted_drive_by_id(drive_id)
            transfer_channel(
                channel_id=channel_id,
                method=COPY_METHOD,
                source_path=drive.datafolder,
                no_upgrade=True,
            )

        # initialize import manager based on annotated destination path, pulling from
        # source db path. It creates the content tables in that file itself.
        channel_metadata = read_channel_metadata_from_db_file(source_path)
        # The importer's alias must be released before the annotation below opens its
        # own on the same file: two write connections to one SQLite file lock out.
        with channel_import.initialize_import_manager(
            channel_metadata,
            source_path,
            cancel_check=False,
            destination=destination_path,
            version_requested=True,
        ) as import_manager:
            # import channel data from source db path
            import_manager.import_channel_data()

        # annotate file availability on destination db
        annotation.set_local_file_availability_from_disk(destination=destination_path)
        # get the ids of leaf nodes which are now incomplete due to missing local files,
        # including new descendants of already-available courses; must run first so the
        # exclusion set can be passed to get_new_resources_available_for_import
        (
            updated_resource_ids,
            updated_resource_content_ids,
            updated_resource_total_size,
        ) = get_automatically_updated_resources(destination_path, channel_id)

        # get the diff count between whats on the default db and the annotated db,
        # excluding nodes that will be auto-imported via the course-update path
        (
            new_resource_ids,
            new_resource_content_ids,
            new_resource_total_size,
        ) = get_new_resources_available_for_import(
            destination_path,
            channel_id,
            exclude_node_ids=set(updated_resource_ids),
            exclude_content_ids=set(updated_resource_content_ids),
        )
        # get the count for leaf nodes which are in the default db, but not in the annotated db
        resources_to_be_deleted_count = count_removed_resources(
            destination_path, channel_id
        )
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
            job.extra_metadata["deleted_resources_count"] = (
                resources_to_be_deleted_count
            )
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


def _batches(sliceable):
    """
    Yield successive batch_size slices of a queryset or list, until it runs dry.

    Each slice is materialised: a queryset handed on to filter_by_uuids goes over as
    a subquery instead, run against whichever database that queryset belongs to.
    """
    i = 0
    while True:
        batch = list(sliceable[i : i + batch_size])
        if not batch:
            return
        yield batch
        i += batch_size


def _destination_nodes(alias):
    # ContentNodeManager forces an order_by(tree_id, lft) onto every queryset, which
    # corrupts a distinct values_list and leaks columns into a subquery.
    return ContentNode.objects.using(alias).order_by()


def _unavailable_file_size(alias, nodes):
    """
    The total size of the local files these nodes need and the device does not have.
    """
    return annotation.total_file_size(
        LocalFile.objects.using(alias).filter(
            available=False, files__contentnode__in=nodes
        )
    )


def get_new_resources_available_for_import(
    destination, channel_id, exclude_node_ids=None, exclude_content_ids=None
):
    """
    Queries the destination db to get leaf nodes.
    Subtract total number of leaf nodes by the count of leaf nodes on default db to get the number of new resources.
    """
    with content_db(destination) as alias:
        # To efficiently get the node ids of all new nodes in the channel
        # we are going to iterate over the currently existing nodes for the
        # channel in the default database, and cache their existence in the
        # temporary upgrade database by flagging them as 'available' in there
        # We can then read out all of the unavailable ContentNodes in order
        # to get a complete list of the newly available ids.
        # We wrap this all in a transaction so that we can roll it back afterwards
        # but this is mostly just not to leave the upgrade DB in a messy state
        # and could be removed if it becomes a performance concern

        channel_nodes = _destination_nodes(alias).filter(channel_id=channel_id)

        # Create a queryset for the node ids of resources currently in this channel
        # we will slice this later in batches in order to efficiently process this
        # this is necessary otherwise we would end up querying tens of thousands of node ids
        # for a large channel, which would then be impossible to pass into an update query
        # for the temporary upgrade DB without causing an excessively large query
        # greater than 1MB, which is the default max for SQLite
        current_resource_node_id_queryset = (
            ContentNode.objects.filter(channel_id=channel_id)
            .exclude(kind=content_kinds.TOPIC)
            .values_list("id", flat=True)
        )

        with transaction.atomic(using=alias):
            # Set everything to False to start with
            channel_nodes.update(available=False)

            for node_ids in _batches(current_resource_node_id_queryset):
                channel_nodes.filter_by_uuids(node_ids, validate=False).update(
                    available=True
                )

            new_resource_nodes = channel_nodes.exclude(kind=content_kinds.TOPIC).filter(
                available=False
            )

            renderable_new_resource_nodes = new_resource_nodes.filter(
                # File orders by priority, which a subquery would have to select.
                id__in=File.objects.using(alias)
                .order_by()
                .filter(supplementary=False, preset__in=renderable_files_presets)
                .values("contentnode_id")
            )

            if exclude_node_ids:
                renderable_new_resource_nodes = renderable_new_resource_nodes.exclude(
                    id__in=list(exclude_node_ids)
                )

            new_resource_nodes_total_size = _unavailable_file_size(
                alias, renderable_new_resource_nodes
            )

            new_resource_node_ids = list(
                new_resource_nodes.values_list("id", flat=True)
            )

            if exclude_node_ids:
                new_resource_node_ids = [
                    nid for nid in new_resource_node_ids if nid not in exclude_node_ids
                ]

            # The availability flags written above are scratch state. Django refuses
            # to run further queries once this is set, so it has to come last.
            transaction.set_rollback(True, using=alias)

        # Create a queryset for the content_ids of resources currently in this channel
        # we will slice this later in batches in order to efficiently process this
        # this is necessary otherwise we would end up querying tens of thousands of node ids
        # for a large channel, which would then be impossible to pass into an update query
        # for the temporary upgrade DB without causing an excessively large query
        # greater than 1MB, which is the default max for SQLite
        current_resource_content_id_queryset = (
            ContentNode.objects.filter(channel_id=channel_id)
            .exclude(kind=content_kinds.TOPIC)
            .values_list("content_id", flat=True)
        )

        with transaction.atomic(using=alias):
            # Set everything to False to start with
            channel_nodes.update(available=False)

            for content_ids in _batches(current_resource_content_id_queryset):
                channel_nodes.filter_by_content_ids(content_ids, validate=False).update(
                    available=True
                )

            new_resource_content_ids = list(
                channel_nodes.exclude(kind=content_kinds.TOPIC)
                .filter(available=False)
                .values_list("content_id", flat=True)
                .distinct()
            )

            if exclude_content_ids:
                new_resource_content_ids = [
                    cid
                    for cid in new_resource_content_ids
                    if cid not in exclude_content_ids
                ]

            transaction.set_rollback(True, using=alias)

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
    with content_db(destination) as alias:
        # Ordered explicitly: an OFFSET without an ORDER BY may repeat or skip rows
        # between batches.
        resource_node_id_queryset = (
            ContentNode.objects.using(alias)
            .order_by("id")
            .filter(channel_id=channel_id)
            .exclude(kind=content_kinds.TOPIC)
            .values_list("id", flat=True)
        )

        content_ids_after_upgrade = set()

        # Batch the query here, as passing too many uuids into Django could cause
        # the a SQL query too large error. This will happen around about 30000+ uuids.
        # Could probably batch at 10000 rather than 1000 - but using 1000 to be defensive.

        for resource_node_ids in _batches(resource_node_id_queryset):
            content_ids_after_upgrade.update(
                (
                    ContentNode.objects.filter_by_uuids(
                        resource_node_ids, validate=False
                    )
                    .exclude(kind=content_kinds.TOPIC)
                    .filter(available=True, channel_id=channel_id)
                    .values_list("content_id", flat=True)
                    .distinct()
                )
            )

    total_resources_after_upgrade = len(content_ids_after_upgrade)

    return (
        ContentNode.objects.filter(channel_id=channel_id, available=True)
        .exclude(kind=content_kinds.TOPIC)
        .values("content_id")
        .distinct()
        .count()
        - total_resources_after_upgrade
    )


def _get_available_course_bounds(alias, channel_id):
    # Resolve courses available on the device and their upgrade-DB tree bounds once,
    # before the batching loop.
    courses_on_destination = {
        node_id: (lft, rght)
        for node_id, lft, rght in _destination_nodes(alias)
        .filter(
            channel_id=channel_id,
            options__contains='"modality": "{}"'.format(modalities.COURSE),
        )
        .values_list("id", "lft", "rght")
    }

    available_course_ids = set(
        ContentNode.objects.filter(channel_id=channel_id, available=True)
        .filter(modality=modalities.COURSE)
        .values_list("id", flat=True)
    )

    # lft/rght bounds from the upgrade DB for courses that exist on both sides
    available_course_bounds = [
        courses_on_destination[cid]
        for cid in available_course_ids
        if cid in courses_on_destination
    ]

    return available_course_bounds


def get_automatically_updated_resources(destination, channel_id):
    """
    Queries the destination db to get the leaf node ids, where local file objects are unavailable.
    Get the available node ids related to those missing file objects.
    """
    with content_db(destination) as alias:
        # the ContentNode ids where File objects are missing in the destination db,
        # along with lft/rght for course-descendant detection. Ordered explicitly: an
        # OFFSET without an ORDER BY may repeat or skip rows between batches.
        contentnode_queryset = (
            ContentNode.objects.using(alias)
            .order_by("id")
            .filter(
                files__local_file_id__in=LocalFile.objects.using(alias)
                .filter(available=False)
                .values("id"),
                files__supplementary=False,
                files__preset__in=renderable_files_presets,
            )
            .values_list("id", "lft", "rght")
            .distinct()
        )

        available_course_bounds = _get_available_course_bounds(alias, channel_id)

        updated_resource_ids = set()

        updated_resource_content_ids = set()

        pending_course_node_ids = set()

        for contentnodes in _batches(contentnode_queryset):
            node_ids_in_upgrade = [row[0] for row in contentnodes]
            contentnodes_tree_values = {
                row[0]: (row[1], row[2]) for row in contentnodes
            }

            for c in (
                ContentNode.objects.filter_by_uuids(node_ids_in_upgrade, validate=False)
                .filter(available=True, channel_id=channel_id)
                .values_list("id", "content_id")
            ):
                updated_resource_ids.add(c[0])
                updated_resource_content_ids.add(c[1])
                contentnodes_tree_values.pop(c[0], None)

            # Add it to a pending array so that we can fetch its ids and content ids later
            # against the destination db.
            if available_course_bounds and contentnodes_tree_values:
                for node_id, (
                    contentnode_lft,
                    contentnode_rght,
                ) in contentnodes_tree_values.items():
                    if any(
                        contentnode_lft > course_lft and contentnode_rght < course_rght
                        for (course_lft, course_rght) in available_course_bounds
                    ):
                        pending_course_node_ids.add(node_id)

        if pending_course_node_ids:
            for nid, cid in (
                _destination_nodes(alias)
                .filter_by_uuids(list(pending_course_node_ids), validate=False)
                .values_list("id", "content_id")
            ):
                updated_resource_ids.add(nid)
                updated_resource_content_ids.add(cid)

        # Do this after we have fetched all the ids and made them unique
        # otherwise, because we are getting our ids from the File table, we could
        # end up with a duplicate count of file sizes

        updated_resources_total_size = 0

        # Coerce to lists
        updated_resource_ids = list(updated_resource_ids)
        updated_resource_content_ids = list(updated_resource_content_ids)

        for ids_batch in _batches(updated_resource_ids):
            batch_nodes = _destination_nodes(alias).filter_by_uuids(
                ids_batch, validate=False
            )

            updated_resources_total_size += _unavailable_file_size(alias, batch_nodes)

    return (
        updated_resource_ids,
        updated_resource_content_ids,
        updated_resources_total_size,
    )


def _get_files_for_available_courses(channel_id):
    # Include files for new descendants of available courses that are not
    # yet available locally.
    available_course_nodes = ContentNode.objects.filter(
        channel_id=channel_id,
        available=True,
        modality=modalities.COURSE,
    )
    descendant_filter = Q()
    for course in available_course_nodes.values("lft", "rght", "tree_id"):
        descendant_filter |= Q(
            tree_id=course["tree_id"],
            lft__gt=course["lft"],
            rght__lt=course["rght"],
        )
    if descendant_filter:
        course_descendants = ContentNode.objects.filter(
            channel_id=channel_id, available=False
        ).filter(descendant_filter)
        return list(
            LocalFile.objects.filter(
                available=False,
                files__supplementary=False,
                files__contentnode__in=course_descendants,
            ).values("id", "file_size", "extension")
        )
    return []


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

    queried_file_objects.extend(_get_files_for_available_courses(channel_id))

    checksums = set()

    total_bytes_to_transfer = 0

    files_to_download = []

    for file in queried_file_objects:
        if file["id"] not in checksums:
            checksums.add(file["id"])
            total_bytes_to_transfer += file["file_size"]
            files_to_download.append(file)

    return len(content_ids), files_to_download, total_bytes_to_transfer
