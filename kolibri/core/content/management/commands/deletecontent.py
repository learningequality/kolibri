import logging
import os

from django.core.management.base import CommandError

from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.annotation import propagate_forced_localfile_removal
from kolibri.core.content.utils.annotation import reannotate_all_channels
from kolibri.core.content.utils.annotation import set_content_invisible
from kolibri.core.content.utils.import_export_content import get_import_export_data
from kolibri.core.content.utils.importability_annotation import clear_channel_stats
from kolibri.core.content.utils.paths import get_content_database_file_path
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.utils.lock import db_lock

logger = logging.getLogger(__name__)


def delete_metadata(channel, node_ids, exclude_node_ids, force_delete):
    # Only delete all metadata if we are not doing selective deletion
    delete_all_metadata = not (node_ids or exclude_node_ids)

    (
        total_resource_number,
        unused_files,
        total_bytes_to_transfer,
    ) = get_import_export_data(
        channel.id,
        node_ids,
        exclude_node_ids,
        # Don't filter by availability as we have set nodes invisible
        # above, but the localfiles we are trying to delete are still
        # available
        None,
        renderable_only=False,
        topic_thumbnails=False,
    )

    if node_ids or exclude_node_ids:
        # If we have been passed node ids do not do a full deletion pass
        set_content_invisible(channel.id, node_ids, exclude_node_ids)
        # If everything has been made invisible, delete all the metadata
        delete_all_metadata = not channel.root.available

    if force_delete:
        # Do this before we delete all the metadata, as otherwise we lose
        # track of which local files were associated with the channel we
        # just deleted.

        with db_lock():
            propagate_forced_localfile_removal(unused_files)
        # Separate these operations as running the SQLAlchemy code in the latter
        # seems to cause the Django ORM interactions in the former to roll back
        # Not quite sure what is causing it, but presumably due to transaction
        # scopes.
        reannotate_all_channels()

    if delete_all_metadata:
        logger.info("Deleting all channel metadata")
        with db_lock():
            channel.delete_content_tree_and_files()

    # Clear any previously set channel availability stats for this channel
    clear_channel_stats(channel.id)

    return total_resource_number, delete_all_metadata, total_bytes_to_transfer


class Command(AsyncCommand):
    def add_arguments(self, parser):
        parser.add_argument("channel_id", type=str)
        # However, some optional arguments apply to both groups. Add them here!
        node_ids_help_text = """
        Specify one or more node IDs to delete. Only these ContentNodes and descendants will be deleted.

        e.g.

        kolibri manage deletecontent --node_ids <id1>,<id2>,[<ids>,...] <channel id>
        """
        parser.add_argument(
            "--node_ids",
            "-n",
            # Split the comma separated string we get, into a list of strings
            type=lambda x: x.split(","),
            default=[],
            required=False,
            dest="node_ids",
            help=node_ids_help_text,
        )

        exclude_node_ids_help_text = """
        Specify one or more node IDs to exclude. Descendants of these node IDs will be not be deleted.

        e.g.

        kolibri manage deletecontent --exclude_node_ids <id1>,<id2>,[<ids>,...] <channel id>
        """
        parser.add_argument(
            "--exclude_node_ids",
            # Split the comma separated string we get, into a list of string
            type=lambda x: x.split(","),
            default=[],
            required=False,
            dest="exclude_node_ids",
            help=exclude_node_ids_help_text,
        )
        parser.add_argument(
            "-f",
            "--force_delete",
            action="store_true",
            dest="force_delete",
            default=False,
            help="Ensure removal of files",
        )

    def handle_async(self, *args, **options):
        channel_id = options["channel_id"]
        node_ids = options["node_ids"]
        exclude_node_ids = options["exclude_node_ids"]
        force_delete = options["force_delete"]

        try:
            channel = ChannelMetadata.objects.get(pk=channel_id)
        except ChannelMetadata.DoesNotExist:
            raise CommandError(
                "Channel matching id {id} does not exist".format(id=channel_id)
            )

        (
            total_resource_number,
            delete_all_metadata,
            total_bytes_to_transfer,
        ) = delete_metadata(channel, node_ids, exclude_node_ids, force_delete)
        unused_files = LocalFile.objects.get_unused_files()
        # Get orphan files that are being deleted
        total_file_deletion_operations = unused_files.count()
        job = get_current_job()
        if job:
            job.extra_metadata["file_size"] = total_bytes_to_transfer
            job.extra_metadata["total_resources"] = total_resource_number
            job.save_meta()
        progress_extra_data = {"channel_id": channel_id}
        additional_progress = sum((1, bool(delete_all_metadata)))
        with self.start_progress(
            total=total_file_deletion_operations + additional_progress
        ) as progress_update:

            for _ in LocalFile.objects.delete_unused_files():
                progress_update(1, progress_extra_data)

            with db_lock():
                LocalFile.objects.delete_orphan_file_objects()

            progress_update(1, progress_extra_data)

            if delete_all_metadata:
                try:
                    os.remove(get_content_database_file_path(channel_id))
                except OSError:
                    pass

                progress_update(1, progress_extra_data)
