import logging
import os

from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.utils import paths
from kolibri.core.content.utils.content_manifest import ContentManifest
from kolibri.core.content.utils.import_export_content import get_content_nodes_data
from kolibri.core.content.utils.import_export_content import get_import_export_nodes
from kolibri.core.content.utils.paths import get_content_file_name
from kolibri.core.tasks.utils import JobProgressMixin
from kolibri.utils import file_transfer as transfer

logger = logging.getLogger(__name__)


class DiskChannelResourceExportManager(JobProgressMixin):
    """
    Manager for exporting channel database and content files to disk.

    This manager coordinates progress tracking across both export phases
    (channel database and content files) to provide a unified progress
    experience to users.
    """

    def __init__(
        self,
        channel_id,
        destination,
        node_ids=None,
        exclude_node_ids=None,
        export_channel_database=True,
        export_content=True,
        manifest_only=False,
    ):
        """
        Initialize the export manager.

        :param channel_id: The channel ID to export.
        :param destination: The destination folder path.
        :param node_ids: Optional list of node IDs to include.
        :param exclude_node_ids: Optional list of node IDs to exclude.
        :param export_channel_database: Whether to export the channel database.
        :param export_content: Whether to export content files.
        :param manifest_only: If True, only generate the manifest without copying files.
        """
        self.channel_id = channel_id
        self.destination = os.path.realpath(destination)
        self.node_ids = node_ids
        self.exclude_node_ids = exclude_node_ids
        self.export_channel_database = export_channel_database
        self.export_content = export_content
        self.manifest_only = manifest_only

        self.channel_db_size = 0
        self.content_bytes_to_transfer = 0
        self.total_bytes = 0
        self.total_resource_count = 0
        self.files_to_export = []
        self.nodes_queries_list = None
        self.transferred_file_size = 0

        super(DiskChannelResourceExportManager, self).__init__()

    def run(self):
        """
        Run the export operation with coordinated progress tracking.

        :return: The total number of bytes transferred.
        """
        self.prepare_for_export()
        self.initialize_progress_tracking()

        if self.export_channel_database:
            self.do_channel_database_export()

        if self.export_content:
            self.do_content_export()

        self.finalize_progress_tracking()

        return self.transferred_file_size

    def prepare_for_export(self):
        """
        Calculate total bytes to transfer across all export phases.
        """
        # Calculate channel database size
        if self.export_channel_database:
            channel_db_path = paths.get_content_database_file_path(self.channel_id)
            if os.path.exists(channel_db_path):
                self.channel_db_size = os.path.getsize(channel_db_path)

        # Calculate content files size
        if self.export_content:
            self.nodes_queries_list = get_import_export_nodes(
                self.channel_id, self.node_ids, self.exclude_node_ids, available=True
            )
            (
                self.total_resource_count,
                self.files_to_export,
                self.content_bytes_to_transfer,
            ) = get_content_nodes_data(
                self.channel_id, self.nodes_queries_list, available=True
            )

        # Total bytes is sum of both phases (if not manifest_only)
        if self.manifest_only:
            self.total_bytes = self.channel_db_size
        else:
            self.total_bytes = self.channel_db_size + self.content_bytes_to_transfer

    def initialize_progress_tracking(self):
        """
        Initialize progress tracking with total bytes for all phases.
        """
        file_size = (
            self.content_bytes_to_transfer
            if self.export_content
            else self.channel_db_size
        )
        self.update_job_metadata(
            file_size=file_size,
            total_resources=self.total_resource_count,
        )
        self.start_progress(total=self.total_bytes)

    def finalize_progress_tracking(self):
        """
        Finalize progress tracking with transferred file size.
        """
        self.update_job_metadata(
            transferred_file_size=self.transferred_file_size,
        )

    def do_channel_database_export(self):
        """
        Export the channel database file.
        """
        logger.info(
            "Exporting channel database for channel id {} to {}".format(
                self.channel_id, self.destination
            )
        )

        src = paths.get_content_database_file_path(self.channel_id)
        dest = paths.get_content_database_file_path(
            self.channel_id, datafolder=self.destination
        )

        logger.debug("Source file: {}".format(src))
        logger.debug("Destination file: {}".format(dest))

        with transfer.FileCopy(src, dest, cancel_check=self.is_cancelled) as copy:

            def progress_callback(bytes_transferred):
                self.update_progress(increment=bytes_transferred)
                self.transferred_file_size += bytes_transferred

            try:
                copy.run(progress_update=progress_callback)
            except transfer.TransferCanceled:
                pass

            # Reraise any cancellation
            self.check_for_cancel()

    def do_content_export(self):
        """
        Export content files and update the manifest.
        """
        channel_metadata = ChannelMetadata.objects.get(id=self.channel_id)

        # Don't copy files if we are only exporting the manifest
        if not self.manifest_only:
            self._copy_content_files()

        # Reraise any cancellation
        self.check_for_cancel()

        # Update the manifest
        logger.info(
            "Exporting manifest for channel id {} to {}".format(
                self.channel_id, self.destination
            )
        )
        manifest_path = os.path.join(self.destination, "content", "manifest.json")
        content_manifest = ContentManifest()
        content_manifest.read(manifest_path)
        content_manifest.add_content_nodes(
            self.channel_id, channel_metadata.version, self.nodes_queries_list
        )
        content_manifest.write(manifest_path)

    def _copy_content_files(self):
        """
        Copy all content files to the destination.
        """
        logger.info(
            "Exporting content for channel id {} to {}".format(
                self.channel_id, self.destination
            )
        )

        for f in self.files_to_export:
            if self.is_cancelled():
                break
            self._export_file(f)

    def _export_file(self, f):
        """
        Export a single content file.

        :param f: File dict containing id, file_size, extension.
        """
        filename = get_content_file_name(f)
        try:
            srcpath = paths.get_content_storage_file_path(filename)
            dest = paths.get_content_storage_file_path(
                filename, datafolder=self.destination
            )
        except InvalidStorageFilenameError:
            # If any files have an invalid storage file name, don't export them.
            self.update_progress(increment=f["file_size"])
            return

        # If the file already exists with correct size, skip but update progress
        if os.path.isfile(dest) and os.path.getsize(dest) == f["file_size"]:
            self.update_progress(increment=f["file_size"])
            self.transferred_file_size += f["file_size"]
            return

        try:
            with transfer.FileCopy(
                srcpath, dest, cancel_check=self.is_cancelled
            ) as copy:

                def progress_update(length):
                    self.update_progress(increment=length)
                    self.transferred_file_size += length

                copy.run(progress_update=progress_update)
        except transfer.TransferCanceled:
            self.update_job_metadata(
                file_size=self.transferred_file_size,
                total_resources=0,
            )
