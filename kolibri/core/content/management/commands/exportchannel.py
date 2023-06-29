import logging
import os

from ...utils import paths
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.utils import file_transfer as transfer

logger = logging.getLogger(__name__)


class Command(AsyncCommand):
    def add_arguments(self, parser):
        parser.add_argument("channel_id", type=str)
        parser.add_argument("destination", type=str)

    def handle_async(self, *args, **options):
        channel_id = options["channel_id"]
        data_dir = os.path.realpath(options["destination"])
        logger.info(
            "Exporting channel database for channel id {} to {}".format(
                channel_id, data_dir
            )
        )

        src = paths.get_content_database_file_path(channel_id)
        dest = paths.get_content_database_file_path(channel_id, datafolder=data_dir)

        logger.debug("Source file: {}".format(src))
        logger.debug("Destination file: {}".format(dest))

        with transfer.FileCopy(src, dest, cancel_check=self.is_cancelled) as copy:

            with self.start_progress(total=copy.transfer_size) as progress_update:
                try:
                    copy.run(progress_update=progress_update)
                except transfer.TransferCanceled:
                    pass

                # Reraise any cancellation
                self.check_for_cancel()
