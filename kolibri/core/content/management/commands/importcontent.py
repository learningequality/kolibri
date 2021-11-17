import concurrent.futures
import logging
import os

import requests
from django.core.management.base import CommandError
from le_utils.constants import content_kinds

from ...utils import annotation
from ...utils import paths
from ...utils import transfer
from kolibri.core.content.errors import InsufficientStorageSpaceError
from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.utils.file_availability import LocationError
from kolibri.core.content.utils.import_export_content import compare_checksums
from kolibri.core.content.utils.import_export_content import get_import_export_data
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.content.utils.paths import get_content_file_name
from kolibri.core.content.utils.upgrade import get_import_data_for_update
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.core.tasks.utils import get_current_job
from kolibri.utils import conf
from kolibri.utils.system import get_free_space

# constants to specify the transfer method to be used
DOWNLOAD_METHOD = "download"
COPY_METHOD = "copy"

logger = logging.getLogger(__name__)

FILE_TRANSFERRED = 0
FILE_SKIPPED = 1


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

        parser.add_argument(
            "--import_updates",
            action="store_true",
            default=False,
            dest="import_updates",
            help="Import all updated content after a channel version upgrade",
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
        import_updates=False,
    ):
        self._transfer(
            DOWNLOAD_METHOD,
            channel_id,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            baseurl=baseurl,
            peer_id=peer_id,
            renderable_only=renderable_only,
            import_updates=import_updates,
        )

    def copy_content(
        self,
        channel_id,
        path,
        drive_id=None,
        node_ids=None,
        exclude_node_ids=None,
        renderable_only=True,
        import_updates=False,
    ):
        self._transfer(
            COPY_METHOD,
            channel_id,
            path=path,
            drive_id=drive_id,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            renderable_only=renderable_only,
            import_updates=import_updates,
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
        import_updates=False,
    ):
        try:
            if not import_updates:
                (
                    total_resource_count,
                    files_to_download,
                    total_bytes_to_transfer,
                ) = get_import_export_data(
                    channel_id,
                    node_ids,
                    exclude_node_ids,
                    False,
                    renderable_only=renderable_only,
                    drive_id=drive_id,
                    peer_id=peer_id,
                )
            else:
                (
                    total_resource_count,
                    files_to_download,
                    total_bytes_to_transfer,
                ) = get_import_data_for_update(
                    channel_id,
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
        except ValueError:
            if import_updates:
                raise CommandError(
                    "Tried to perform an channel update import when update data was not available"
                )
            raise

        if not paths.using_remote_storage():
            free_space = get_free_space(conf.OPTIONS["Paths"]["CONTENT_DIR"])

            if free_space <= total_bytes_to_transfer:
                raise InsufficientStorageSpaceError(
                    "Import would completely fill remaining disk space"
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

        dummy_bytes_for_annotation = annotation.calculate_dummy_progress_for_annotation(
            node_ids, exclude_node_ids, total_bytes_to_transfer
        )

        if paths.using_remote_storage():
            overall_progress_update = self.start_progress(
                total=dummy_bytes_for_annotation
            ).update_progress
            file_checksums_to_annotate.extend(f["id"] for f in files_to_download)
            transferred_file_size = total_bytes_to_transfer
        else:
            remaining_bytes_to_transfer = total_bytes_to_transfer
            overall_progress_update = self.start_progress(
                total=total_bytes_to_transfer + dummy_bytes_for_annotation
            ).update_progress
            if method == DOWNLOAD_METHOD:
                session = requests.Session()

            file_transfers = []
            for f in files_to_download:

                if self.is_cancelled():
                    break

                filename = get_content_file_name(f)
                try:
                    dest = paths.get_content_storage_file_path(filename)
                except InvalidStorageFilenameError:
                    # If the destination file name is malformed, just stop now.
                    overall_progress_update(f["file_size"])
                    continue

                # if the file already exists add its size to our overall progress, and skip
                if os.path.isfile(dest) and os.path.getsize(dest) == f["file_size"]:
                    overall_progress_update(f["file_size"])
                    file_checksums_to_annotate.append(f["id"])
                    transferred_file_size += f["file_size"]
                    continue

                # determine where we're downloading/copying from, and create appropriate transfer object
                if method == DOWNLOAD_METHOD:
                    url = paths.get_content_storage_remote_url(
                        filename, baseurl=baseurl
                    )
                    filetransfer = transfer.FileDownload(
                        url, dest, session=session, cancel_check=self.is_cancelled
                    )
                    file_transfers.append((f, filetransfer))
                elif method == COPY_METHOD:
                    try:
                        srcpath = paths.get_content_storage_file_path(
                            filename, datafolder=path
                        )
                    except InvalidStorageFilenameError:
                        # If the source file name is malformed, just stop now.
                        overall_progress_update(f["file_size"])
                        continue
                    filetransfer = transfer.FileCopy(
                        srcpath, dest, cancel_check=self.is_cancelled
                    )
                    file_transfers.append((f, filetransfer))
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                batch_size = 100
                # ThreadPoolExecutor allows us to download files concurrently,
                # greatly reducing download time in most cases. However, loading
                # all the downloads into the pool requires considerable memory,
                # so we divide the downloads into batches to keep memory usage down.
                # In batches of 100, total RAM usage doesn't exceed 250MB in testing.
                while file_transfers:
                    future_file_transfers = {}
                    for i in range(batch_size):
                        if file_transfers:
                            f, filetransfer = file_transfers.pop()
                            future = executor.submit(
                                self._start_file_transfer, f, filetransfer
                            )
                            future_file_transfers[future] = (f, filetransfer)

                    for future in concurrent.futures.as_completed(
                        future_file_transfers
                    ):
                        f, filetransfer = future_file_transfers[future]
                        try:
                            status, data_transferred = future.result()
                            overall_progress_update(data_transferred)
                            if self.is_cancelled():
                                break

                            if status == FILE_SKIPPED:
                                number_of_skipped_files += 1
                            else:
                                file_checksums_to_annotate.append(f["id"])
                                transferred_file_size += f["file_size"]
                            remaining_bytes_to_transfer -= f["file_size"]
                            remaining_free_space = get_free_space(
                                conf.OPTIONS["Paths"]["CONTENT_DIR"]
                            )
                            if remaining_free_space <= remaining_bytes_to_transfer:
                                raise InsufficientStorageSpaceError(
                                    "Kolibri ran out of storage space while importing content"
                                )
                        except transfer.TransferCanceled:
                            break
                        except Exception as e:
                            logger.error(
                                "An error occurred during content import: {}".format(e)
                            )
                            if (
                                isinstance(e, requests.exceptions.HTTPError)
                                and e.response.status_code == 404
                            ) or (isinstance(e, OSError) and e.errno == 2):
                                # Continue file import when the current file is not found from the source and is skipped.
                                overall_progress_update(f["file_size"])
                                number_of_skipped_files += 1
                                continue
                            else:
                                self.exception = e
                                break

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

        overall_progress_update(dummy_bytes_for_annotation)

        if self.exception:
            raise self.exception

        if self.is_cancelled():
            self.cancel()

    def _start_file_transfer(self, f, filetransfer):
        """
        Start to transfer the file from network/disk to the destination.
        Return value:
            * FILE_TRANSFERRED - successfully transfer the file.
            * FILE_SKIPPED - the file does not exist so it is skipped.
        """
        data_transferred = 0

        with filetransfer:
            for chunk in filetransfer:
                data_transferred += len(chunk)

            # Ensure that if for some reason the total file size for the transfer
            # is less than what we have marked in the database that we make up
            # the difference so that the overall progress is never incorrect.
            # This could happen, for example for a local transfer if a file
            # has been replaced or corrupted (which we catch below)
            data_transferred += f["file_size"] - filetransfer.total_size

            # If checksum of the destination file is different from the localfile
            # id indicated in the database, it means that the destination file
            # is corrupted, either from origin or during import. Skip importing
            # this file.
            checksum_correctness = compare_checksums(filetransfer.dest, f["id"])
            if not checksum_correctness:
                e = "File {} is corrupted.".format(filetransfer.source)
                logger.error("An error occurred during content import: {}".format(e))
                os.remove(filetransfer.dest)
                return FILE_SKIPPED, data_transferred

        return FILE_TRANSFERRED, data_transferred

    def handle_async(self, *args, **options):
        try:
            ChannelMetadata.objects.get(id=options["channel_id"])
        except ValueError:
            raise CommandError(
                "{} is not a valid channel_id".format(options["channel_id"])
            )
        except ChannelMetadata.DoesNotExist:
            raise CommandError(
                "Must import a channel with importchannel before importing content."
            )
        if options["command"] == "network":
            self.download_content(
                options["channel_id"],
                node_ids=options["node_ids"],
                exclude_node_ids=options["exclude_node_ids"],
                baseurl=options["baseurl"],
                peer_id=options["peer_id"],
                renderable_only=options["renderable_only"],
                import_updates=options["import_updates"],
            )
        elif options["command"] == "disk":
            self.copy_content(
                options["channel_id"],
                options["directory"],
                drive_id=options["drive_id"],
                node_ids=options["node_ids"],
                exclude_node_ids=options["exclude_node_ids"],
                renderable_only=options["renderable_only"],
                import_updates=options["import_updates"],
            )
        else:
            self._parser.print_help()
            raise CommandError(
                "Please give a valid subcommand. You gave: {}".format(
                    options["command"]
                )
            )
