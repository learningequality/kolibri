import logging as logger

import requests
from kolibri.content.utils.annotation import update_channel_metadata_cache
from kolibri.tasks.management.commands.base import AsyncCommand

from ...utils import paths

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

        r = requests.get(url, stream=True)
        r.raise_for_status()

        dbsize = int(r.headers['content-length'])

        with self.start_progress(total=dbsize) as progress_update:
            with open(dest, "wb") as f:
                for content in r.iter_content(1024):
                    f.write(content)
                    contentlength = len(content)
                    progress_update(contentlength)

        update_channel_metadata_cache()
