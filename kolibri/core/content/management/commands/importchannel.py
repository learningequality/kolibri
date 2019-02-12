import logging
import os
from time import sleep

from django.core.management.base import CommandError

from ...utils import channel_import
from ...utils import paths
from ...utils import transfer
from ...utils.import_export_content import retry_import
from kolibri.core.errors import KolibriUpgradeError
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.utils import conf

logger = logging.getLogger(__name__)

# constants to specify the transfer method to be used
DOWNLOAD_METHOD = "download"
COPY_METHOD = "copy"


def import_channel_by_id(channel_id, cancel_check):
    try:
        channel_import.import_channel_from_local_db(channel_id, cancel_check=cancel_check)
    except channel_import.InvalidSchemaVersionError:
        raise CommandError(
            "Database file had an invalid database schema, the file may be corrupted or have been modified.")
    except channel_import.FutureSchemaError:
        raise KolibriUpgradeError("Database file uses a future database schema that this version of Kolibri does not support.")


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

        default_studio_url = conf.OPTIONS['Urls']['CENTRAL_CONTENT_BASE_URL']
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
        logger.info("Downloading data for channel id {}".format(channel_id))
        self._transfer(DOWNLOAD_METHOD, channel_id, baseurl)

    def copy_channel(self, channel_id, path):
        logger.info("Copying in data for channel id {}".format(channel_id))
        self._transfer(COPY_METHOD, channel_id, path=path)

    def _transfer(self, method, channel_id, baseurl=None, path=None):

        dest = paths.get_content_database_file_path(channel_id)

        # determine where we're downloading/copying from, and create appropriate transfer object
        if method == DOWNLOAD_METHOD:
            url = paths.get_content_database_file_url(channel_id, baseurl=baseurl)
            logger.debug("URL to fetch: {}".format(url))
            filetransfer = transfer.FileDownload(url, dest)
        elif method == COPY_METHOD:
            srcpath = paths.get_content_database_file_path(channel_id, datafolder=path)
            filetransfer = transfer.FileCopy(srcpath, dest)

        logger.debug("Destination: {}".format(dest))

        finished = False
        while not finished:
            finished = self._start_file_transfer(filetransfer, channel_id, dest)
            if self.is_cancelled():
                self.cancel()
                break

    def _start_file_transfer(self, filetransfer, channel_id, dest):
        progress_extra_data = {
            "channel_id": channel_id,
        }

        try:
            with filetransfer, self.start_progress(total=filetransfer.total_size) as progress_update:
                for chunk in filetransfer:

                    if self.is_cancelled():
                        filetransfer.cancel()
                        break
                    progress_update(len(chunk), progress_extra_data)
                try:
                    import_channel_by_id(channel_id, self.is_cancelled)
                except channel_import.ImportCancelError:
                    # This will only occur if is_cancelled is True.
                    pass
                if self.is_cancelled():
                    try:
                        os.remove(dest)
                    except IOError as e:
                        logger.error("Tried to remove {}, but exception {} occurred.".format(
                            dest, e))
                    self.cancel()
                return True

        except Exception as e:
            logger.error("An error occurred during channel import: {}".format(e))
            retry_import(e, skip_404=False)

            logger.info('Waiting for 30 seconds before retrying import: {}\n'.format(
                filetransfer.source))
            sleep(30)

            return False

    def handle_async(self, *args, **options):
        if options['command'] == 'network':
            self.download_channel(options["channel_id"], options["baseurl"])
        elif options['command'] == 'disk':
            self.copy_channel(options["channel_id"], options["directory"])
        else:
            self._parser.print_help()
            raise CommandError("Please give a valid subcommand. You gave: {}".format(options["command"]))
