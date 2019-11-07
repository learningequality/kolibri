import logging
import os

from django.core.management.base import CommandError

from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.annotation import set_content_invisible
from kolibri.core.content.utils.paths import get_content_database_file_path
from kolibri.core.tasks.management.commands.base import AsyncCommand

logger = logging.getLogger(__name__)


class Command(AsyncCommand):
    def add_arguments(self, parser):
        parser.add_argument("channel_id", type=str)
        # However, some optional arguments apply to both groups. Add them here!
        node_ids_help_text = """
        Specify one or more node IDs to delete. Only these ContentNodes and descendants will be deleted.

        e.g.

        kolibri manage deletechannel --node_ids <id1>,<id2>, [<ids>,...] <channel id>
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

        kolibri manage deletechannel --exclude_node_ids <id1>,<id2>, [<ids>,...] <channel id>
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

    def handle_async(self, *args, **options):
        channel_id = options["channel_id"]
        node_ids = options["node_ids"]
        exclude_node_ids = options["node_ids"]

        try:
            channel = ChannelMetadata.objects.get(pk=channel_id)
        except ChannelMetadata.DoesNotExist:
            raise CommandError(
                "Channel matching id {id} does not exist".format(id=channel_id)
            )

        # Only delete all metadata if we are not doing selective deletion
        delete_all_metadata = not (node_ids or exclude_node_ids)

        if node_ids or exclude_node_ids:
            # If we have been passed node ids do not do a full deletion pass
            set_content_invisible(channel_id, node_ids, exclude_node_ids)
            # If everything has been made invisible, delete all the metadata
            delete_all_metadata = not channel.root.available

        if delete_all_metadata:
            logger.info("Deleting all channel metadata")
            channel.delete_content_tree_and_files()

        # Get orphan files that are being deleted
        total_file_deletion_operations = LocalFile.objects.get_unused_files().count()
        progress_extra_data = {"channel_id": channel_id}

        with self.start_progress(
            total=total_file_deletion_operations + (2 if delete_all_metadata else 1)
        ) as progress_update:

            for file in LocalFile.objects.delete_unused_files():
                progress_update(1, progress_extra_data)

            LocalFile.objects.delete_orphan_file_objects()

            progress_update(1, progress_extra_data)

            if delete_all_metadata:
                try:
                    os.remove(get_content_database_file_path(channel_id))
                except OSError:
                    pass

                progress_update(1, progress_extra_data)
