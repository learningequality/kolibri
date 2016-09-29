import logging as logger

from django.core.management.base import CommandError
from kolibri.tasks.management.commands.base import AsyncCommand

from ...utils import annotation, paths, transfer

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
        network_subparser.add_argument('channel_id', type=str)

        local_subparser = subparsers.add_parser(
            name='local',
            cmd=self,
            help='Copy the content from the given folder.'
        )
        local_subparser.add_argument('channel_id', type=str)
        local_subparser.add_argument('directory', type=str)

    def download_channel(self, channel_id):
        logging.info("Downloading data for channel id {}".format(channel_id))
        self._transfer(DOWNLOAD_METHOD, channel_id)

    def copy_channel(self, channel_id, path):
        logging.info("Copying in data for channel id {}".format(channel_id))
        self._transfer(COPY_METHOD, channel_id, path=path)

    def _transfer(self, method, channel_id, path=None):

        dest = paths.get_content_database_file_path(channel_id)

        # determine where we're downloading/copying from, and create appropriate transfer object
        if method == DOWNLOAD_METHOD:
            url = paths.get_content_database_file_url(channel_id)
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
                    progress_update(len(chunk), progress_extra_data)

        annotation.update_channel_metadata_cache()

    def handle_async(self, *args, **options):
        if options['command'] == 'network':
            self.download_channel(options["channel_id"])
        elif options['command'] == 'local':
            self.copy_channel(options["channel_id"], options["directory"])
        else:
            self._parser.print_help()
            raise CommandError("Please give a valid subcommand. You gave: {}".format(options["command"]))
