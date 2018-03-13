import logging as logger
import os

from django.conf import settings
from django.core.management.base import CommandError
from kolibri.tasks.management.commands.base import AsyncCommand

from ...utils import channel_import, paths, transfer

logging = logger.getLogger(__name__)

# constants to specify the transfer method to be used
DOWNLOAD_METHOD = "download"
COPY_METHOD = "copy"


class Command(AsyncCommand):

    def add_arguments(self, parser):
        # let's save the parser in case we need to print a help statement
        self._parser = parser

        # see `importcontent` management command for explanation of how we're using subparsers
        subparsers = parser.add_subparsers(dest='command', help="The following subcommands are available.")

        network_subparser = subparsers.add_parser(
            name='network',
            cmd=self,
            help="Download the given channel through the network."
        )
        network_subparser.add_argument(
            'channel_id',
            type=str,
            help="Download the database for the given channel_id."
        )

        default_studio_url = settings.CENTRAL_CONTENT_DOWNLOAD_BASE_URL
        network_subparser.add_argument(
            "--baseurl",
            type=str,
            default=default_studio_url,
            help="The host we will download the content from. Defaults to {}".format(default_studio_url),
        )

        local_subparser = subparsers.add_parser(
            name='disk',
            cmd=self,
            help='Copy the content from the given folder.'
        )
        local_subparser.add_argument(
            'channel_id',
            type=str,
            help="Import this channel id from the given directory."
        )
        local_subparser.add_argument(
            'directory',
            type=str,
            help="Import content from this directory."
        )

    def download_channel(self, channel_id, baseurl):
        logging.info("Downloading data for channel id {}".format(channel_id))
        self._transfer(DOWNLOAD_METHOD, channel_id, baseurl)

    def copy_channel(self, channel_id, path):
        logging.info("Copying in data for channel id {}".format(channel_id))
        self._transfer(COPY_METHOD, channel_id, path=path)

    def _transfer(self, method, channel_id, baseurl=None, path=None):

        dest = paths.get_content_database_file_path(channel_id)

        # determine where we're downloading/copying from, and create appropriate transfer object
        if method == DOWNLOAD_METHOD:
            url = paths.get_content_database_file_url(channel_id, baseurl=baseurl)
            logging.debug("URL to fetch: {}".format(url))
            filetransfer = transfer.FileDownload(url, dest)
        elif method == COPY_METHOD:
            srcpath = paths.get_content_database_file_path(channel_id, datafolder=path)
            filetransfer = transfer.FileCopy(srcpath, dest)

        logging.debug("Destination: {}".format(dest))

        progress_extra_data = {
            "channel_id": channel_id,
        }

        with filetransfer:

            with self.start_progress(total=filetransfer.total_size) as progress_update:

                for chunk in filetransfer:

                    if self.is_cancelled():
                        filetransfer.cancel()
                        break
                    progress_update(len(chunk), progress_extra_data)

                if not self.is_cancelled():
                    channel_import.import_channel_from_local_db(channel_id)
                else:
                    try:
                        os.remove(dest)
                    except IOError:
                        pass
                    self.cancel()

    def handle_async(self, *args, **options):
        if options['command'] == 'network':
            self.download_channel(options["channel_id"], options["baseurl"])
        elif options['command'] == 'disk':
            self.copy_channel(options["channel_id"], options["directory"])
        else:
            self._parser.print_help()
            raise CommandError("Please give a valid subcommand. You gave: {}".format(options["command"]))
