import logging
import os

from ...utils import paths
from ...utils import transfer
from kolibri.core.tasks.management.commands.base import AsyncCommand

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

            with self.start_progress(total=copy.total_size) as progress_update:
                try:
                    for block in copy:
                        progress_update(len(block))

                except transfer.TransferCanceled:
                    pass

                if self.is_cancelled():
                    try:
                        os.remove(dest)
                    except IOError:
                        pass
                    self.cancel()
