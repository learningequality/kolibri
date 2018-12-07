import logging
import os

from django.core.management.base import CommandError

from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.paths import get_content_database_file_path
from kolibri.core.tasks.management.commands.base import AsyncCommand

logger = logging.getLogger(__name__)


class Command(AsyncCommand):

    def add_arguments(self, parser):
        parser.add_argument('channel_id', type=str)

    def handle_async(self, *args, **options):
        channel_id = options["channel_id"]

        try:
            channel = ChannelMetadata.objects.get(pk=channel_id)
        except ChannelMetadata.DoesNotExist:
            raise CommandError("Channel matching id {id} does not exist".format(id=channel_id))

        logger.info("Deleting all channel metadata")
        channel.delete_content_tree_and_files()

        # Get orphan files that are being deleted
        total_file_deletion_operations = LocalFile.objects.get_orphan_files().filter(
            available=True).count()

        total_local_files_to_delete = LocalFile.objects.get_orphan_files().count()

        progress_extra_data = {
            "channel_id": channel_id,
        }

        with self.start_progress(total=total_file_deletion_operations + total_local_files_to_delete + 1) as progress_update:
            logger.info("Deleting all channel metadata")

            for file in LocalFile.objects.delete_orphan_files():
                if file.available:
                    progress_update(1, progress_extra_data)

            LocalFile.objects.delete_orphan_file_objects()

            progress_update(total_local_files_to_delete, progress_extra_data)

            try:
                os.remove(get_content_database_file_path(channel_id))
            except OSError:
                pass

            progress_update(1, progress_extra_data)
