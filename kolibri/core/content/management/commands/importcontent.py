import argparse
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
from kolibri.core.content.utils.import_export_content import read_content_manifest
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.content.utils.paths import get_content_file_name
from kolibri.core.content.utils.upgrade import get_import_data_for_update
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.core.tasks.utils import get_current_job
from kolibri.utils import conf
from kolibri.utils.options import FD_PER_THREAD
from kolibri.utils.system import get_fd_limit
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

        manifest_help_text = """
        Specify a path to a manifest file. Content specified in this manifest file will be imported.

        e.g.

        kolibri manage importcontent --manifest /path/to/KOLIBRI_DATA/content/all.json disk
        """
        parser.add_argument(
            "--manifest",
            # Split the comma separated string we get, into a list of strings
            type=argparse.FileType("r"),
            default=None,
            required=False,
            dest="manifest",
            help=manifest_help_text,
        )

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

        parser.add_argument(
            "--fail-on-error",
            action="store_true",
            default=False,
            dest="fail_on_error",
            help="Raise an error when a file has failed to be imported",
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

        network_subparser.add_argument(
            "--timeout",
            type=int,
            default=transfer.Transfer.DEFAULT_TIMEOUT,
            dest="timeout",
            help="Specify network timeout in seconds (default: %(default)d)",
        )
        network_subparser.add_argument(
            "--content_dir",
            type=str,
            default=paths.get_content_dir_path(),
            help="Download the content to the given content dir.",
        )

        disk_subparser = subparsers.add_parser(
            name="disk", cmd=self, help="Copy the content from the given folder."
        )
        disk_subparser.add_argument("channel_id", type=str)
        disk_subparser.add_argument("directory", type=str, nargs="?")
        disk_subparser.add_argument("--drive_id", type=str, dest="drive_id", default="")
        disk_subparser.add_argument(
            "--content_dir",
            type=str,
            default=paths.get_content_dir_path(),
            help="Copy the content to the given content dir.",
        )

    def download_content(
        self,
        channel_id,
        manifest_file=None,
        node_ids=None,
        exclude_node_ids=None,
        baseurl=None,
        peer_id=None,
        renderable_only=True,
        import_updates=False,
        fail_on_error=False,
        timeout=transfer.Transfer.DEFAULT_TIMEOUT,
        content_dir=None,
    ):
        self._transfer(
            DOWNLOAD_METHOD,
            channel_id,
            manifest_file=manifest_file,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            baseurl=baseurl,
            peer_id=peer_id,
            renderable_only=renderable_only,
            import_updates=import_updates,
            fail_on_error=fail_on_error,
            timeout=timeout,
            content_dir=content_dir,
        )

    def copy_content(
        self,
        channel_id,
        path,
        manifest_file=None,
        drive_id=None,
        node_ids=None,
        exclude_node_ids=None,
        renderable_only=True,
        import_updates=False,
        fail_on_error=False,
        content_dir=None,
    ):
        self._transfer(
            COPY_METHOD,
            channel_id,
            path=path,
            manifest_file=manifest_file,
            drive_id=drive_id,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            renderable_only=renderable_only,
            import_updates=import_updates,
            fail_on_error=fail_on_error,
            content_dir=content_dir,
        )

    def _transfer(  # noqa: max-complexity=16
        self,
        method,
        channel_id,
        manifest_file=None,
        path=None,
        drive_id=None,
        node_ids=None,
        exclude_node_ids=None,
        baseurl=None,
        peer_id=None,
        renderable_only=True,
        import_updates=False,
        fail_on_error=False,
        timeout=transfer.Transfer.DEFAULT_TIMEOUT,
        content_dir=None,
    ):
        if manifest_file and not path:
            # If manifest_file is stdin, its name will be "<stdin>" and path
            # will become "". This feels clumsy, but it is reasonable default
            # behaviour.
            path = os.path.dirname(manifest_file.name)

        if manifest_file:
            node_ids, exclude_node_ids = _node_ids_from_content_manifest(
                manifest_file, channel_id
            )

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

        if not content_dir:
            content_dir = conf.OPTIONS["Paths"]["CONTENT_DIR"]

        if not paths.using_remote_storage():
            free_space = get_free_space(content_dir)

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

            executor = (
                concurrent.futures.ProcessPoolExecutor
                if conf.OPTIONS["Tasks"]["USE_WORKER_MULTIPROCESSING"]
                else concurrent.futures.ThreadPoolExecutor
            )

            max_workers = 10

            if not conf.OPTIONS["Tasks"]["USE_WORKER_MULTIPROCESSING"]:
                # If we're not using multiprocessing for workers, we may need
                # to limit the number of workers depending on the number of allowed
                # file descriptors.
                # This is a heuristic method, where we know there can be issues if
                # the max number of file descriptors for a process is 256, and we use 10
                # workers, with potentially 4 concurrent tasks downloading files.
                # The number of concurrent tasks that might be downloading files is determined
                # by the number of regular workers running in the task runner
                # (although the high priority task queue could also be running a channel database download).
                server_reserved_fd_count = (
                    FD_PER_THREAD * conf.OPTIONS["Server"]["CHERRYPY_THREAD_POOL"]
                )
                max_descriptors_per_download_task = (
                    get_fd_limit() - server_reserved_fd_count
                ) / conf.OPTIONS["Tasks"]["REGULAR_PRIORITY_WORKERS"]
                # Each download task only needs to have a maximum of two open file descriptors at once:
                # The temporary download file that the file is streamed to initially, and then
                # the actual destination file that it is moved to. To add tolerance, we divide
                # the number of file descriptors that could be allocated to this task by four,
                # which should give us leeway in case of unforeseen descriptor use during the process.
                max_workers = min(
                    max_workers, min(1, max_descriptors_per_download_task // 4)
                )

            with executor(max_workers=max_workers) as executor:
                batch_size = 100
                # ThreadPoolExecutor allows us to download files concurrently,
                # greatly reducing download time in most cases. However, loading
                # all the downloads into the pool requires considerable memory,
                # so we divide the downloads into batches to keep memory usage down.
                # In batches of 100, total RAM usage doesn't exceed 250MB in testing.
                while files_to_download:
                    if self.is_cancelled():
                        break
                    future_file_transfers = {}
                    for i in range(batch_size):
                        if self.is_cancelled():
                            break
                        if files_to_download:
                            f = files_to_download.pop()
                            filename = get_content_file_name(f)
                            try:
                                dest = paths.get_content_storage_file_path(
                                    filename, contentfolder=content_dir
                                )
                            except InvalidStorageFilenameError:
                                # If the destination file name is malformed, just stop now.
                                overall_progress_update(f["file_size"])
                                continue

                            # if the file already exists add its size to our overall progress, and skip
                            if (
                                os.path.isfile(dest)
                                and os.path.getsize(dest) == f["file_size"]
                            ):
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
                                    url,
                                    dest,
                                    session=session,
                                    cancel_check=self.is_cancelled,
                                    timeout=timeout,
                                )
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
                            remaining_free_space = get_free_space(content_dir)
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
                                not fail_on_error
                                and isinstance(e, requests.exceptions.HTTPError)
                                and e.response.status_code == 404
                            ) or (isinstance(e, OSError) and e.errno == 2):
                                # Continue file import when the current file is not found from the source and is skipped.
                                overall_progress_update(f["file_size"])
                                number_of_skipped_files += 1
                                continue
                            else:
                                self.exception = e
                                break
                    if self.is_cancelled():
                        for future in future_file_transfers:
                            future.cancel()

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
            try:
                checksum_correctness = compare_checksums(filetransfer.dest, f["id"])
            except (IOError, OSError):
                checksum_correctness = False
            if not checksum_correctness:
                e = "File {} is corrupted.".format(filetransfer.source)
                logger.error("An error occurred during content import: {}".format(e))
                try:
                    os.remove(filetransfer.dest)
                except OSError:
                    pass
                return FILE_SKIPPED, data_transferred

        return FILE_TRANSFERRED, data_transferred

    def handle_async(self, *args, **options):
        if not options["directory"] and not options["manifest"]:
            raise CommandError(
                "Either a directory or a manifest file must be provided."
            )

        if options["manifest"] and (options["node_ids"] or options["exclude_node_ids"]):
            raise CommandError(
                "The --manifest option must not be combined with --node_ids or --exclude_node_ids."
            )

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
                manifest_file=options["manifest"],
                node_ids=options["node_ids"],
                exclude_node_ids=options["exclude_node_ids"],
                baseurl=options["baseurl"],
                peer_id=options["peer_id"],
                renderable_only=options["renderable_only"],
                import_updates=options["import_updates"],
                fail_on_error=options["fail_on_error"],
                timeout=options["timeout"],
                content_dir=options["content_dir"],
            )
        elif options["command"] == "disk":
            self.copy_content(
                options["channel_id"],
                options["directory"],
                manifest_file=options["manifest"],
                drive_id=options["drive_id"],
                node_ids=options["node_ids"],
                exclude_node_ids=options["exclude_node_ids"],
                renderable_only=options["renderable_only"],
                import_updates=options["import_updates"],
                fail_on_error=options["fail_on_error"],
                content_dir=options["content_dir"],
            )
        else:
            self._parser.print_help()
            raise CommandError(
                "Please give a valid subcommand. You gave: {}".format(
                    options["command"]
                )
            )


def _node_ids_from_content_manifest(manifest_file, channel_id):
    all_node_ids = []
    all_exclude_node_ids = []

    channel_metadata = ChannelMetadata.objects.get(id=channel_id)

    for channel_version, node_ids, exclude_node_ids in read_content_manifest(
        manifest_file, channel_id
    ):
        if channel_version != channel_metadata.version:
            logger.warning(
                "Manifest entry for {channel_id} has a different version ({manifest_version}) than the installed channel ({installed_version})".format(
                    channel_id=channel_id,
                    manifest_version=channel_version,
                    installed_version=channel_metadata.version,
                )
            )
        all_node_ids.extend(node_ids)
        all_exclude_node_ids.extend(exclude_node_ids)

    return all_node_ids, all_exclude_node_ids
