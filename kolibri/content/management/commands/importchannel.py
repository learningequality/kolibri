import logging as logger

from kolibri.content.utils.annotation import update_channel_metadata_cache
from kolibri.tasks.management.commands.base import AsyncCommand

from ...utils import paths, transfer

logging = logger.getLogger(__name__)


class Command(AsyncCommand):

    def add_arguments(self, parser):
        parser.add_argument("channel_id", type=str)

    def handle_async(self, *args, **options):
        channel_id = options["channel_id"]
        logging.info("Downloading data for channel id {}".format(channel_id))

        url = paths.get_content_database_file_url(channel_id)
        dest = paths.get_content_database_file_path(channel_id)

        logging.debug("URL to fetch: {}".format(url))
        logging.debug("Destination: {}".format(dest))

        with transfer.FileDownload(url, dest) as download:

            with self.start_progress(total=download.total_size) as progress_update:

                for chunk in download:
                    progress_update(chunk)

        update_channel_metadata_cache()
