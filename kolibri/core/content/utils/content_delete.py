import logging
import os

from django.db.models import Sum
from le_utils.constants import content_kinds

from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.annotation import propagate_forced_localfile_removal
from kolibri.core.content.utils.annotation import reannotate_all_channels
from kolibri.core.content.utils.annotation import set_content_invisible
from kolibri.core.content.utils.channel_transfer import get_job
from kolibri.core.content.utils.content_request import propagate_contentnode_removal
from kolibri.core.content.utils.importability_annotation import clear_channel_stats
from kolibri.core.content.utils.paths import get_content_database_file_path
from kolibri.core.utils.lock import db_lock


logger = logging.getLogger(__name__)


def delete_metadata(
    channel,
    node_ids,
    exclude_node_ids,
    force_delete,
    ignore_admin_flags,
    update_content_requests,
):
    # Only delete all metadata if we are not doing selective deletion
    delete_all_metadata = not (node_ids or exclude_node_ids)

    resources_before = set(
        ContentNode.objects.filter(channel_id=channel.id, available=True)
        .exclude(kind=content_kinds.TOPIC)
        .values_list("id", flat=True)
    )

    # If we have been passed node ids do not do a full deletion pass
    set_content_invisible(
        channel.id, node_ids, exclude_node_ids, not ignore_admin_flags
    )
    # If everything has been made invisible, delete all the metadata
    delete_all_metadata = delete_all_metadata or not channel.root.available

    resources_after = set(
        ContentNode.objects.filter(channel_id=channel.id, available=True)
        .exclude(kind=content_kinds.TOPIC)
        .values_list("id", flat=True)
    )

    removed_resources = resources_before.difference(resources_after)

    total_resource_number = len(removed_resources)

    if force_delete:
        # Do this before we delete all the metadata, as otherwise we lose
        # track of which local files were associated with the channel we
        # just deleted.

        unused_files = (
            LocalFile.objects.filter(
                available=True,
                files__contentnode__channel_id=channel.id,
                files__contentnode__available=False,
            )
            .distinct()
            .values("id", "file_size", "extension")
        )

        with db_lock():
            removed_resources.update(propagate_forced_localfile_removal(unused_files))
        # Separate these operations as running the SQLAlchemy code in the latter
        # seems to cause the Django ORM interactions in the former to roll back
        # Not quite sure what is causing it, but presumably due to transaction
        # scopes.
        reannotate_all_channels()

    if delete_all_metadata:
        logger.info("Deleting all channel metadata")
        with db_lock():
            channel.delete_content_tree_and_files()

    if update_content_requests and removed_resources:
        propagate_contentnode_removal(list(removed_resources))

    # Clear any previously set channel availability stats for this channel
    clear_channel_stats(channel.id)

    return total_resource_number, delete_all_metadata


def delete_content(
    channel_id,
    node_ids,
    exclude_node_ids,
    force_delete,
    ignore_admin_flags=True,
    update_content_requests=True,
):
    job = get_job()
    try:
        channel = ChannelMetadata.objects.get(pk=channel_id)
    except ChannelMetadata.DoesNotExist:
        raise KeyError("Channel matching id {id} does not exist".format(id=channel_id))

    (total_resource_number, delete_all_metadata,) = delete_metadata(
        channel,
        node_ids,
        exclude_node_ids,
        force_delete,
        ignore_admin_flags,
        update_content_requests,
    )
    unused_files = LocalFile.objects.get_unused_files()
    # Get the number of files that are being deleted
    unused_files_count = unused_files.count()
    deleted_bytes = unused_files.aggregate(size=Sum("file_size"))["size"] or 0
    job.extra_metadata["file_size"] = deleted_bytes
    job.extra_metadata["total_resources"] = total_resource_number
    job.save_meta()
    additional_progress = sum((1, bool(delete_all_metadata)))
    target_progress = unused_files_count + additional_progress
    current_progress = 0
    for _ in LocalFile.objects.delete_unused_files():
        current_progress += 1
        job.update_progress(current_progress, target_progress)
    with db_lock():
        LocalFile.objects.delete_orphan_file_objects()
    current_progress += 1
    job.update_progress(current_progress, target_progress)
    if delete_all_metadata:
        try:
            os.remove(get_content_database_file_path(channel_id))
        except OSError:
            pass
        current_progress += 1
        job.update_progress(current_progress, target_progress)
    job.update_progress(target_progress, target_progress)
