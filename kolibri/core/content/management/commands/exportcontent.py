import logging
import os

from django.core.management.base import CommandError

from ...utils import paths
from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.utils.content_manifest import ContentManifest
from kolibri.core.content.utils.import_export_content import get_content_nodes_data
from kolibri.core.content.utils.import_export_content import get_import_export_nodes
from kolibri.core.content.utils.paths import get_content_file_name
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.core.tasks.utils import get_current_job
from kolibri.utils import file_transfer as transfer

logger = logging.getLogger(__name__)


class Command(AsyncCommand):
    exported_size = 0
    total_resources = 0

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
            type=lambda x: x.split(",") if x else [],
            default=None,
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
            type=lambda x: x.split(",") if x else [],
            default=None,
            required=False,
            dest="exclude_node_ids",
            help=exclude_node_ids_help_text,
        )

        parser.add_argument("channel_id", type=str)
        parser.add_argument("destination", type=str)
        parser.add_argument(
            "--manifest-only",
            action="store_true",
            default=False,
            help="Generate only the manifest.json file",
        )

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

        channel_metadata = ChannelMetadata.objects.get(id=channel_id)

        nodes_queries_list = get_import_export_nodes(
            channel_id, node_ids, exclude_node_ids, available=True
        )

        (total_resource_count, files, total_bytes_to_transfer) = get_content_nodes_data(
            channel_id, nodes_queries_list, available=True
        )

        self.update_job_metadata(total_bytes_to_transfer, total_resource_count)

        # dont copy files if we are only exporting the manifest
        if not options["manifest_only"]:
            self.copy_content_files(
                channel_id, data_dir, files, total_bytes_to_transfer
            )

        # Reraise any cancellation
        self.check_for_cancel()

        logger.info(
            "Exporting manifest for channel id {} to {}".format(channel_id, data_dir)
        )

        manifest_path = os.path.join(data_dir, "content", "manifest.json")
        content_manifest = ContentManifest()
        content_manifest.read(manifest_path)
        content_manifest.add_content_nodes(
            channel_id, channel_metadata.version, nodes_queries_list
        )
        content_manifest.write(manifest_path)

    def copy_content_files(self, channel_id, data_dir, files, total_bytes_to_transfer):
        logger.info(
            "Exporting content for channel id {} to {}".format(channel_id, data_dir)
        )
        with self.start_progress(
            total=total_bytes_to_transfer
        ) as overall_progress_update:
            for f in files:
                if self.is_cancelled():
                    break
                self.export_file(f, data_dir, overall_progress_update)

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
            total=copy.transfer_size
        ) as file_cp_progress_update:

            def progress_update(length):
                self.exported_size = self.exported_size + length
                overall_progress_update(length)
                file_cp_progress_update(length)

            try:
                copy.run(progress_update=progress_update)
            except transfer.TransferCanceled:
                job = get_current_job()
                if job:
                    job.extra_metadata["file_size"] = self.exported_size
                    job.extra_metadata["total_resources"] = 0
                    job.save_meta()
                return
        return dest
