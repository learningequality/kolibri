import logging
import os

from django.core.management.base import CommandError
from le_utils.constants import content_kinds

from ...utils import channel_import
from ...utils import paths
from ...utils import transfer
from ...utils.annotation import update_content_metadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.utils.importability_annotation import clear_channel_stats
from kolibri.core.errors import KolibriUpgradeError
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.utils import conf

logger = logging.getLogger(__name__)

# constants to specify the transfer method to be used
DOWNLOAD_METHOD = "download"
COPY_METHOD = "copy"


def import_channel_by_id(channel_id, cancel_check):
    try:
        return channel_import.import_channel_from_local_db(
            channel_id, cancel_check=cancel_check
        )
    except channel_import.InvalidSchemaVersionError:
        raise CommandError(
            "Database file had an invalid database schema, the file may be corrupted or have been modified."
        )
    except channel_import.FutureSchemaError:
        raise KolibriUpgradeError(
            "Database file uses a future database schema that this version of Kolibri does not support."
        )


class Command(AsyncCommand):
    def add_arguments(self, parser):
        # let's save the parser in case we need to print a help statement
        self._parser = parser

        # see `importcontent` management command for explanation of how we're using subparsers
        subparsers = parser.add_subparsers(
            dest="command", help="The following subcommands are available."
        )

        network_subparser = subparsers.add_parser(
            name="network",
            cmd=self,
            help="Download the given channel through the network.",
        )
        network_subparser.add_argument(
            "channel_id",
            type=str,
            help="Download the database for the given channel_id.",
        )

        default_studio_url = conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"]
        network_subparser.add_argument(
            "--baseurl",
            type=str,
            default=default_studio_url,
            help="The host we will download the content from. Defaults to {}".format(
                default_studio_url
            ),
        )
        network_subparser.add_argument(
            "--no_upgrade",
            action="store_true",
            help="Only download database to an upgrade file path.",
        )

        local_subparser = subparsers.add_parser(
            name="disk", cmd=self, help="Copy the content from the given folder."
        )
        local_subparser.add_argument(
            "channel_id",
            type=str,
            help="Import this channel id from the given directory.",
        )
        local_subparser.add_argument(
            "directory", type=str, help="Import content from this directory."
        )
        local_subparser.add_argument(
            "--no_upgrade",
            action="store_true",
            help="Only download database to an upgrade file path.",
        )

    def download_channel(self, channel_id, baseurl, no_upgrade):
        logger.info("Downloading data for channel id {}".format(channel_id))
        self._transfer(DOWNLOAD_METHOD, channel_id, baseurl, no_upgrade=no_upgrade)

    def copy_channel(self, channel_id, path, no_upgrade):
        logger.info("Copying in data for channel id {}".format(channel_id))
        self._transfer(COPY_METHOD, channel_id, path=path, no_upgrade=no_upgrade)

    def _transfer(self, method, channel_id, baseurl=None, path=None, no_upgrade=False):

        new_channel_dest = paths.get_upgrade_content_database_file_path(channel_id)
        dest = (
            new_channel_dest
            if no_upgrade
            else paths.get_content_database_file_path(channel_id)
        )

        # if new channel version db has previously been downloaded, just copy it over
        if os.path.exists(new_channel_dest) and not no_upgrade:
            method = COPY_METHOD
        # determine where we're downloading/copying from, and create appropriate transfer object
        if method == DOWNLOAD_METHOD:
            url = paths.get_content_database_file_url(channel_id, baseurl=baseurl)
            logger.debug("URL to fetch: {}".format(url))
            filetransfer = transfer.FileDownload(
                url, dest, cancel_check=self.is_cancelled
            )
        elif method == COPY_METHOD:
            # if there is a new channel version db, set that as source path
            srcpath = (
                new_channel_dest
                if os.path.exists(new_channel_dest)
                else paths.get_content_database_file_path(channel_id, datafolder=path)
            )
            filetransfer = transfer.FileCopy(
                srcpath, dest, cancel_check=self.is_cancelled
            )

        logger.debug("Destination: {}".format(dest))

        try:
            self._start_file_transfer(
                filetransfer, channel_id, dest, no_upgrade=no_upgrade
            )
        except transfer.TransferCanceled:
            pass

        if self.is_cancelled():
            try:
                os.remove(dest)
            except OSError as e:
                logger.info(
                    "Tried to remove {}, but exception {} occurred.".format(dest, e)
                )
            self.cancel()

        # if we are trying to upgrade, remove new channel db
        if os.path.exists(new_channel_dest) and not no_upgrade:
            os.remove(new_channel_dest)

    def _start_file_transfer(self, filetransfer, channel_id, dest, no_upgrade=False):
        progress_extra_data = {"channel_id": channel_id}

        with filetransfer, self.start_progress(
            total=filetransfer.total_size
        ) as progress_update:
            for chunk in filetransfer:
                progress_update(len(chunk), progress_extra_data)
            # if upgrading, import the channel
            if not no_upgrade:
                try:
                    # evaluate list so we have the current node ids
                    node_ids = list(
                        ContentNode.objects.filter(
                            channel_id=channel_id, available=True
                        )
                        .exclude(kind=content_kinds.TOPIC)
                        .values_list("id", flat=True)
                    )
                    import_ran = import_channel_by_id(channel_id, self.is_cancelled)
                    if node_ids and import_ran:
                        # annotate default channel db based on previously annotated leaf nodes
                        update_content_metadata(channel_id, node_ids=node_ids)
                    if import_ran:
                        # Clear any previously set channel availability stats for this channel
                        clear_channel_stats(channel_id)
                except channel_import.ImportCancelError:
                    # This will only occur if is_cancelled is True.
                    pass

    def handle_async(self, *args, **options):
        if options["command"] == "network":
            self.download_channel(
                options["channel_id"], options["baseurl"], options["no_upgrade"]
            )
        elif options["command"] == "disk":
            self.copy_channel(
                options["channel_id"], options["directory"], options["no_upgrade"]
            )
        else:
            self._parser.print_help()
            raise CommandError(
                "Please give a valid subcommand. You gave: {}".format(
                    options["command"]
                )
            )
