import logging
import os

from django.core.management.base import CommandError

from ...utils import paths
from ...utils import transfer
from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.utils.import_export_content import get_import_export_data
from kolibri.core.content.utils.paths import get_content_file_name
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.core.tasks.utils import get_current_job

logger = logging.getLogger(__name__)


class Command(AsyncCommand):
    def add_arguments(self, parser):
        node_ids_help_text = """
        Specify one or more node IDs to import. Only the files associated to those node IDs will be imported.
        Make sure to call this near the end of the argument list.

        e.g.

        kolibri manage importcontent network <channel id> --node_ids <id1>,<id2>, [<ids>,...]
        """
        parser.add_argument(
            "--node_ids",
            "-n",
            # Split the comma separated string we get, into a list of strings
            type=lambda x: x.split(","),
            default=[],
            required=False,
            dest="node_ids",
            help=node_ids_help_text,
        )

        exclude_node_ids_help_text = """
        Specify one or more node IDs to exclude. Files associated to those node IDs will be not be imported.
        Make sure to call this near the end of the argument list.

        e.g.

        kolibri manage importcontent network <channel id> --exclude_node_ids <id1>,<id2>, [<ids>,...]
        """
        parser.add_argument(
            "--exclude_node_ids",
            type=lambda x: x.split(","),
            default=[],
            required=False,
            dest="exclude_node_ids",
            help=exclude_node_ids_help_text,
        )

        parser.add_argument("channel_id", type=str)
        parser.add_argument("destination", type=str)

    def update_job_metadata(self, total_bytes_to_transfer, total_resource_count):
        job = get_current_job()
        if job:
            job.extra_metadata["file_size"] = total_bytes_to_transfer
            job.extra_metadata["total_resources"] = total_resource_count
            job.save_meta()

    def handle_async(self, *args, **options):
        if paths.using_remote_storage():
            raise CommandError("Cannot export files when using remote file storage")
        channel_id = options["channel_id"]
        data_dir = os.path.realpath(options["destination"])
        node_ids = options["node_ids"]
        exclude_node_ids = options["exclude_node_ids"]
        logger.info(
            "Exporting content for channel id {} to {}".format(channel_id, data_dir)
        )

        (
            total_resource_count,
            files,
            total_bytes_to_transfer,
        ) = get_import_export_data(channel_id, node_ids, exclude_node_ids, True)

        self.update_job_metadata(total_bytes_to_transfer, total_resource_count)

        exported_files = []

        with self.start_progress(
            total=total_bytes_to_transfer
        ) as overall_progress_update:

            for f in files:

                if self.is_cancelled():
                    break

                dest = self.export_file(f, data_dir, overall_progress_update)
                if dest:
                    exported_files.append(dest)

            if self.is_cancelled():
                # Cancelled, clean up any already downloading files.
                for dest in exported_files:
                    os.remove(dest)
                self.cancel()

    def export_file(self, f, data_dir, overall_progress_update):
        filename = get_content_file_name(f)

        try:
            srcpath = paths.get_content_storage_file_path(filename)
            dest = paths.get_content_storage_file_path(filename, datafolder=data_dir)
        except InvalidStorageFilenameError:
            # If any files have an invalid storage file name, don't export them.
            overall_progress_update(f["file_size"])
            return

        # if the file already exists, add its size to our overall progress, and skip
        if os.path.isfile(dest) and os.path.getsize(dest) == f["file_size"]:
            overall_progress_update(f["file_size"])
            return

        copy = transfer.FileCopy(srcpath, dest, cancel_check=self.is_cancelled)

        with copy, self.start_progress(
            total=copy.total_size
        ) as file_cp_progress_update:
            try:
                for chunk in copy:
                    length = len(chunk)
                    overall_progress_update(length)
                    file_cp_progress_update(length)
            except transfer.TransferCanceled:
                return
        return dest
