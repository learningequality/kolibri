import logging as logger
import os

from django.core.management.base import CommandError
from kolibri.content.models import ChannelMetadata, LocalFile
from kolibri.content.utils.paths import get_content_database_file_path
from kolibri.tasks.management.commands.base import AsyncCommand

logging = logger.getLogger(__name__)

class Command(AsyncCommand):

    def add_arguments(self, parser):
        parser.add_argument('channel_id', type=str)

    def handle_async(self, *args, **options):
        channel_id = options["channel_id"]

        try:
            channel = ChannelMetadata.objects.get(pk=channel_id)
        except ChannelMetadata.DoesNotExist:
            raise CommandError("Channel matching id {id} does not exist".format(id=channel_id))

        logging.info("Deleting all channel metadata")
        channel.delete_content_tree_and_files()

        # Get orphan files that are being deleted
        total_file_deletion_operations = LocalFile.objects.get_orphan_files().filter(
            available=True).count()

        total_local_files_to_delete = LocalFile.objects.get_orphan_files().count()

        progress_extra_data = {
            "channel_id": channel_id,
        }

        with self.start_progress(total=total_file_deletion_operations + total_local_files_to_delete + 1) as progress_update:
            logging.info("Deleting all channel metadata")

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
