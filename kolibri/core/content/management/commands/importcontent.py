import logging
import os
from time import sleep

import requests
from django.core.management.base import CommandError
from le_utils.constants import content_kinds

from ...utils import annotation
from ...utils import paths
from ...utils import transfer
from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.models import ContentNode
from kolibri.core.content.utils.file_availability import LocationError
from kolibri.core.content.utils.import_export_content import calculate_files_to_transfer
from kolibri.core.content.utils.import_export_content import compare_checksums
from kolibri.core.content.utils.import_export_content import get_nodes_to_transfer
from kolibri.core.content.utils.import_export_content import retry_import
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.core.tasks.utils import db_task_write_lock
from kolibri.core.tasks.utils import get_current_job
from kolibri.utils import conf

# constants to specify the transfer method to be used
DOWNLOAD_METHOD = "download"
COPY_METHOD = "copy"

logger = logging.getLogger(__name__)

FILE_TRANSFERRED = 2
FILE_SKIPPED = 1
FILE_NOT_TRANSFERRED = 0


def lookup_channel_listing_status(channel_id, baseurl=None):
    """
    Look up the listing status of the channel from the remote, this is surfaced as a
    `public` boolean field.
    """
    resp = requests.get(get_channel_lookup_url(identifier=channel_id, baseurl=baseurl))

    if resp.status_code != 200:
        return None

    (channel_info,) = resp.json()
    return channel_info.get("public", None)


class Command(AsyncCommand):
    def add_arguments(self, parser):
        # let's save the parser in case we need to print a help statement
        self._parser = parser

        # we want two groups of arguments. One group is when the
        # 'importcontent disk' command is given, where we'll expect a file
        # directory to be given. Another is the 'importcontent network'
        # command to be given, where we'll expect a channel.

        # However, some optional arguments apply to both groups. Add them here!
        node_ids_help_text = """
        Specify one or more node IDs to import. Only the files associated to those node IDs will be imported.

        e.g.

        kolibri manage importcontent --node_ids <id1>,<id2>, [<ids>,...] {network, disk} <channel id>
        """
        parser.add_argument(
            "--node_ids",
            "-n",
            # Split the comma separated string we get, into a list of strings
            type=lambda x: x.split(","),
            default=None,
            required=False,
            dest="node_ids",
            help=node_ids_help_text,
        )

        exclude_node_ids_help_text = """
        Specify one or more node IDs to exclude. Files associated to those node IDs will be not be imported.

        e.g.

        kolibri manage importcontent --exclude_node_ids <id1>,<id2>, [<ids>,...] {network, disk} <channel id>
        """
        parser.add_argument(
            "--exclude_node_ids",
            # Split the comma separated string we get, into a list of string
            type=lambda x: x.split(","),
            default=None,
            required=False,
            dest="exclude_node_ids",
            help=exclude_node_ids_help_text,
        )

        parser.add_argument(
            "--include-unrenderable-content",
            action="store_false",
            default=True,
            dest="renderable_only",
            help="Import all content, not just that which this Kolibri instance can render",
        )

        # to implement these two groups of commands and their corresponding
        # arguments, we'll need argparse.subparsers.
        subparsers = parser.add_subparsers(
            dest="command", help="The following subcommands are available."
        )

        # the network command has a channel id required positional argument,
        # and some optional content_id arguments.

        # TODO: implement a --content-domain parameter, for optionally
        # specifying the domain for the curation server.

        # Note: cmd should be the management command instance, as though the
        # interface for adding arguments is argparse, Django overrides the
        # parser object with its own thing, hence why we need to add cmd. See
        # http://stackoverflow.com/questions/36706220/is-it-possible-to-create-subparsers-in-a-django-management-command
        network_subparser = subparsers.add_parser(
            name="network",
            cmd=self,
            help="Download the given channel through the network.",
        )
        network_subparser.add_argument("channel_id", type=str)

        default_studio_url = conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"]
        network_subparser.add_argument(
            "--baseurl", type=str, default=default_studio_url, dest="baseurl"
        )

        network_subparser.add_argument(
            "--peer_id", type=str, default="", dest="peer_id"
        )

        disk_subparser = subparsers.add_parser(
            name="disk", cmd=self, help="Copy the content from the given folder."
        )
        disk_subparser.add_argument("channel_id", type=str)
        disk_subparser.add_argument("directory", type=str)
        disk_subparser.add_argument("--drive_id", type=str, dest="drive_id", default="")

    def download_content(
        self,
        channel_id,
        node_ids=None,
        exclude_node_ids=None,
        baseurl=None,
        peer_id=None,
        renderable_only=True,
    ):
        self._transfer(
            DOWNLOAD_METHOD,
            channel_id,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            baseurl=baseurl,
            peer_id=peer_id,
            renderable_only=renderable_only,
        )

    def copy_content(
        self,
        channel_id,
        path,
        drive_id=None,
        node_ids=None,
        exclude_node_ids=None,
        renderable_only=True,
    ):
        self._transfer(
            COPY_METHOD,
            channel_id,
            path=path,
            drive_id=drive_id,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            renderable_only=renderable_only,
        )

    def _transfer(  # noqa: max-complexity=16
        self,
        method,
        channel_id,
        path=None,
        drive_id=None,
        node_ids=None,
        exclude_node_ids=None,
        baseurl=None,
        peer_id=None,
        renderable_only=True,
    ):

        try:
            nodes_for_transfer = get_nodes_to_transfer(
                channel_id,
                node_ids,
                exclude_node_ids,
                False,
                renderable_only=renderable_only,
                drive_id=drive_id,
                peer_id=peer_id,
            )
        except LocationError:
            if drive_id:
                raise CommandError(
                    "The external drive with given drive id {} does not exist.".format(
                        drive_id
                    )
                )
            if peer_id:
                raise CommandError(
                    "The network location with the id {} does not exist".format(peer_id)
                )
        total_resource_count = (
            nodes_for_transfer.exclude(kind=content_kinds.TOPIC)
            .values("content_id")
            .distinct()
            .count()
        )

        (files_to_download, total_bytes_to_transfer) = calculate_files_to_transfer(
            nodes_for_transfer, False
        )

        job = get_current_job()

        if job:
            job.extra_metadata["file_size"] = total_bytes_to_transfer
            job.extra_metadata["total_resources"] = total_resource_count
            job.save_meta()

        number_of_skipped_files = 0
        transferred_file_size = 0
        file_checksums_to_annotate = []
        public = None

        # If we're downloading, check listing status
        if method == DOWNLOAD_METHOD:
            public = lookup_channel_listing_status(
                channel_id=channel_id, baseurl=baseurl
            )

        resources_before_transfer = (
            ContentNode.objects.filter(channel_id=channel_id, available=True)
            .exclude(kind=content_kinds.TOPIC)
            .values("content_id")
            .distinct()
            .count()
        )

        with self.start_progress(
            total=total_bytes_to_transfer
        ) as overall_progress_update:
            exception = None  # Exception that is not caught by the retry logic

            if method == DOWNLOAD_METHOD:
                session = requests.Session()

            for f in files_to_download:

                if self.is_cancelled():
                    break

                filename = f.get_filename()
                try:
                    dest = paths.get_content_storage_file_path(filename)
                except InvalidStorageFilenameError:
                    # If the destination file name is malformed, just stop now.
                    overall_progress_update(f.file_size)
                    continue

                # if the file already exists, add its size to our overall progress, and skip
                if os.path.isfile(dest) and os.path.getsize(dest) == f.file_size:
                    overall_progress_update(f.file_size)
                    file_checksums_to_annotate.append(f.id)
                    transferred_file_size += f.file_size
                    continue

                # determine where we're downloading/copying from, and create appropriate transfer object
                if method == DOWNLOAD_METHOD:
                    url = paths.get_content_storage_remote_url(
                        filename, baseurl=baseurl
                    )
                    filetransfer = transfer.FileDownload(url, dest, session=session)
                elif method == COPY_METHOD:
                    try:
                        srcpath = paths.get_content_storage_file_path(
                            filename, datafolder=path
                        )
                    except InvalidStorageFilenameError:
                        # If the source file name is malformed, just stop now.
                        overall_progress_update(f.file_size)
                        continue
                    filetransfer = transfer.FileCopy(srcpath, dest)

                finished = False
                try:
                    while not finished:
                        finished, status = self._start_file_transfer(
                            f, filetransfer, overall_progress_update
                        )

                        if self.is_cancelled():
                            break

                        if status == FILE_TRANSFERRED:
                            file_checksums_to_annotate.append(f.id)
                            transferred_file_size += f.file_size
                        elif status == FILE_SKIPPED:
                            number_of_skipped_files += 1
                except Exception as e:
                    exception = e
                    break

            with db_task_write_lock:
                annotation.set_content_visibility(
                    channel_id,
                    file_checksums_to_annotate,
                    node_ids=node_ids,
                    exclude_node_ids=exclude_node_ids,
                    public=public,
                )

            resources_after_transfer = (
                ContentNode.objects.filter(channel_id=channel_id, available=True)
                .exclude(kind=content_kinds.TOPIC)
                .values("content_id")
                .distinct()
                .count()
            )

            if job:
                job.extra_metadata["transferred_file_size"] = transferred_file_size
                job.extra_metadata["transferred_resources"] = (
                    resources_after_transfer - resources_before_transfer
                )
                job.save_meta()

            if number_of_skipped_files > 0:
                logger.warning(
                    "{} files are skipped, because errors occurred during the import.".format(
                        number_of_skipped_files
                    )
                )

            if exception:
                raise exception

            if self.is_cancelled():
                self.cancel()

    # fmt: on

    def _start_file_transfer(self, f, filetransfer, overall_progress_update):
        """
        Start to transfer the file from network/disk to the destination.
        Return value:
            * True, FILE_TRANSFERRED - successfully transfer the file.
            * True, FILE_SKIPPED - the file does not exist so it is skipped.
            * True, FILE_NOT_TRANSFERRED - the transfer is cancelled.
            * False, FILE_NOT_TRANSFERRED - the transfer fails and needs to retry.
        """
        try:
            # Save the current progress value
            original_value = self.progresstrackers[0].progress
            original_progress = self.progresstrackers[0].get_progress()

            with filetransfer, self.start_progress(
                total=filetransfer.total_size
            ) as file_dl_progress_update:
                for chunk in filetransfer:
                    if self.is_cancelled():
                        filetransfer.cancel()
                        return True, FILE_NOT_TRANSFERRED
                    length = len(chunk)
                    overall_progress_update(length)
                    file_dl_progress_update(length)

                # Ensure that if for some reason the total file size for the transfer
                # is less than what we have marked in the database that we make up
                # the difference so that the overall progress is never incorrect.
                # This could happen, for example for a local transfer if a file
                # has been replaced or corrupted (which we catch below)
                overall_progress_update(f.file_size - filetransfer.total_size)

                # If checksum of the destination file is different from the localfile
                # id indicated in the database, it means that the destination file
                # is corrupted, either from origin or during import. Skip importing
                # this file.
                checksum_correctness = compare_checksums(filetransfer.dest, f.id)
                if not checksum_correctness:
                    e = "File {} is corrupted.".format(filetransfer.source)
                    logger.error(
                        "An error occurred during content import: {}".format(e)
                    )
                    os.remove(filetransfer.dest)
                    return True, FILE_SKIPPED

            return True, FILE_TRANSFERRED

        except Exception as e:
            logger.error("An error occurred during content import: {}".format(e))
            retry = retry_import(e, skip_404=True)

            if retry:
                # Restore the previous progress so that the progress bar will
                # not reach over 100% later
                self.progresstrackers[0].progress = original_value

                self.progresstrackers[0].update_callback(
                    original_progress.progress_fraction, original_progress
                )

                logger.info(
                    "Waiting for 30 seconds before retrying import: {}\n".format(
                        filetransfer.source
                    )
                )
                sleep(30)
                return False, FILE_NOT_TRANSFERRED
            else:
                overall_progress_update(f.file_size)
                return True, FILE_SKIPPED

    def handle_async(self, *args, **options):
        if options["command"] == "network":
            self.download_content(
                options["channel_id"],
                node_ids=options["node_ids"],
                exclude_node_ids=options["exclude_node_ids"],
                baseurl=options["baseurl"],
                peer_id=options["peer_id"],
                renderable_only=options["renderable_only"],
            )
        elif options["command"] == "disk":
            self.copy_content(
                options["channel_id"],
                options["directory"],
                drive_id=options["drive_id"],
                node_ids=options["node_ids"],
                exclude_node_ids=options["exclude_node_ids"],
                renderable_only=options["renderable_only"],
            )
        else:
            self._parser.print_help()
            raise CommandError(
                "Please give a valid subcommand. You gave: {}".format(
                    options["command"]
                )
            )
