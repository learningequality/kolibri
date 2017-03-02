import logging as logger
import os

from kolibri.tasks.management.commands.base import AsyncCommand

from ...utils import paths, transfer

logging = logger.getLogger(__name__)


class Command(AsyncCommand):

    def add_arguments(self, parser):
        parser.add_argument("channel_id", type=str)
        parser.add_argument("destination", type=str)

    def handle_async(self, *args, **options):
        channel_id = options["channel_id"]
        data_dir = os.path.realpath(options["destination"])
        logging.info("Exporting channel database for channel id {} to {}".format(channel_id, data_dir))

        src = paths.get_content_database_file_path(channel_id)
        dest = paths.get_content_database_file_path(channel_id, datafolder=data_dir)

        logging.debug("Source file: {}".format(src))
        logging.debug("Destination file: {}".format(dest))

        with transfer.FileCopy(src, dest) as copy:

            with self.start_progress(total=copy.total_size) as progress_update:

                    for block in copy:
                        progress_update(len(block))
