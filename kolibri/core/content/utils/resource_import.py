import concurrent.futures
import logging
import os
from abc import ABCMeta
from abc import abstractmethod

import requests
from le_utils.constants import content_kinds
from six import string_types
from six import with_metaclass

from kolibri.core.content.errors import InsufficientStorageSpaceError
from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.models import ContentNode
from kolibri.core.content.utils import annotation
from kolibri.core.content.utils import paths
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.content.utils.content_manifest import ContentManifest
from kolibri.core.content.utils.file_availability import LocationError
from kolibri.core.content.utils.import_export_content import get_import_export_data
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.content.utils.paths import get_content_file_name
from kolibri.core.content.utils.upgrade import get_import_data_for_update
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.tasks.utils import fd_safe_executor
from kolibri.core.tasks.utils import JobProgressMixin
from kolibri.utils import conf
from kolibri.utils import file_transfer as transfer
from kolibri.utils.system import get_free_space


logger = logging.getLogger(__name__)


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


class ResourceImportManagerBase(with_metaclass(ABCMeta, JobProgressMixin)):
    public = None

    def __init__(
        self,
        channel_id,
        node_ids=None,
        exclude_node_ids=None,
        renderable_only=True,
        fail_on_error=False,
        content_dir=None,
    ):
        self.channel_id = channel_id

        if node_ids is not None:
            node_ids = set(node_ids)

        if exclude_node_ids is not None:
            exclude_node_ids = set(exclude_node_ids)

        self.node_ids = node_ids
        self.exclude_node_ids = exclude_node_ids
        self.renderable_only = renderable_only
        self.fail_on_error = fail_on_error
        self.content_dir = content_dir or conf.OPTIONS["Paths"]["CONTENT_DIR"]
        super(ResourceImportManagerBase, self).__init__()

    @classmethod
    def from_manifest(cls, channel_id, manifest_file, **kwargs):
        if "node_ids" in kwargs:
            raise TypeError("Unexpected keyword argument node_ids")
        if "exclude_node_ids" in kwargs:
            raise TypeError("Unexpected keyword argument exclude_node_ids")
        if isinstance(manifest_file, string_types):
            manifest_file = open(manifest_file, "r")
        content_manifest = ContentManifest()
        content_manifest.read_file(manifest_file)
        node_ids = content_manifest.get_node_ids_for_channel(channel_id)
        exclude_node_ids = None
        manifest_file.close()
        return cls(
            channel_id, node_ids=node_ids, exclude_node_ids=exclude_node_ids, **kwargs
        )

    def _start_file_transfer(self, f, filetransfer):
        """
        Start to transfer the file from network/disk to the destination.

        Returns a tuple containing an error that occurred and the amount
        of data transferred. The error value will be None if no error
        occurred.
        """
        data_transferred = 0

        with filetransfer:
            try:
                for chunk in filetransfer:
                    data_transferred += len(chunk)
            except transfer.TransferFailed as e:
                return e, data_transferred
            # Ensure that if for some reason the total file size for the transfer
            # is less than what we have marked in the database that we make up
            # the difference so that the overall progress is never incorrect.
            # This could happen, for example for a local transfer if a file
            # has been replaced or corrupted (which we catch below)
            data_transferred += f["file_size"] - filetransfer.transfer_size

        return None, data_transferred

    @abstractmethod
    def get_import_data(self):
        """
        Must return:
            total_resource_count - total number of resources to be imported
            files_to_download - iterable of dicts of localfile data id, file_size, extension
            total_bytes_to_transfer - total size of all files to be transferred
        """
        pass

    @abstractmethod
    def create_file_transfer(self, f, filename, dest):
        """
        Must return a FileTransfer object that can be submitted to a worker to run the file transfer.
        """
        pass

    def _attempt_file_transfer(self, f):
        filename = get_content_file_name(f)
        try:
            dest = paths.get_content_storage_file_path(
                filename, contentfolder=self.content_dir
            )
        except InvalidStorageFilenameError:
            # If the destination file name is malformed, just stop now.
            self.update_progress(f["file_size"])
            return

        # if the file already exists add its size to our overall progress, and skip
        if os.path.isfile(dest) and os.path.getsize(dest) == f["file_size"]:
            self.update_progress(f["file_size"])
            self.file_checksums_to_annotate.append(f["id"])
            self.transferred_file_size += f["file_size"]
            return

        filetransfer = self.create_file_transfer(f, filename, dest)
        if filetransfer:
            future = self.executor.submit(self._start_file_transfer, f, filetransfer)
            self.future_file_transfers[future] = f

    def _handle_future(self, future, f):
        try:
            error, data_transferred = future.result()
            self.update_progress(data_transferred)
            if error:
                if self.fail_on_error:
                    raise error
                self.number_of_skipped_files += 1
            else:
                self.file_checksums_to_annotate.append(f["id"])
                self.transferred_file_size += f["file_size"]
            self.remaining_bytes_to_transfer -= f["file_size"]
            remaining_free_space = get_free_space(self.content_dir)
            if remaining_free_space <= self.remaining_bytes_to_transfer:
                raise InsufficientStorageSpaceError(
                    "Kolibri ran out of storage space while importing content"
                )
        except transfer.TransferCanceled:
            pass
        except Exception as e:
            logger.error("An error occurred during content import: {}".format(e))

            if not self.fail_on_error and (
                (
                    isinstance(e, requests.exceptions.HTTPError)
                    and e.response.status_code == 404
                )
                or (isinstance(e, OSError) and e.errno == 2)
            ):
                # Continue file import when the current file is not found from the source and is skipped.
                self.update_progress(f["file_size"])
                self.number_of_skipped_files += 1
            else:
                self.exception = e

    def _wait_for_futures(self):
        for future in concurrent.futures.as_completed(self.future_file_transfers):
            f = self.future_file_transfers[future]
            self._handle_future(future, f)
            if self.is_cancelled() or self.exception:
                break
        if self.is_cancelled() or self.exception:
            for future in self.future_file_transfers:
                future.cancel()

    def _check_free_space(self, total_bytes_to_transfer):
        if not paths.using_remote_storage():
            free_space = get_free_space(self.content_dir)

            if free_space <= total_bytes_to_transfer:
                raise InsufficientStorageSpaceError(
                    "Import would completely fill remaining disk space"
                )

    def run(self):
        """
        Convenience method to just run the whole import.
        """
        self.prepare_for_import()
        self.initialize_standalone_progress_tracking()
        self.run_import()
        self.finalize_standalone_progress_tracking()

    def prepare_for_import(self):
        (
            self.total_resource_count,
            self.files_to_download,
            self.total_bytes_to_transfer,
        ) = self.get_import_data()

        self._check_free_space(self.total_bytes_to_transfer)

        self.resources_before_transfer = (
            ContentNode.objects.filter(channel_id=self.channel_id, available=True)
            .exclude(kind=content_kinds.TOPIC)
            .count()
        )

        self.dummy_bytes_for_annotation = (
            annotation.calculate_dummy_progress_for_annotation(
                self.node_ids, self.exclude_node_ids, self.total_bytes_to_transfer
            )
        )

        self.total_bytes = (
            self.dummy_bytes_for_annotation
            if paths.using_remote_storage()
            else self.total_bytes_to_transfer + self.dummy_bytes_for_annotation
        )

        return self.total_bytes, self.total_bytes_to_transfer, self.total_resource_count

    def initialize_standalone_progress_tracking(self):
        """
        When this import manager is the only one being used in a task, can just
        call this convenience method to handle progress tracking.
        Otherwise job metadata and the total progress to start tracking must be set
        elsewhere.
        """
        self.update_job_metadata(
            file_size=self.total_bytes_to_transfer,
            total_resources=self.total_resource_count,
        )
        self.start_progress(total=self.total_bytes)

    def finalize_standalone_progress_tracking(self):
        self.update_job_metadata(
            transferred_file_size=self.transferred_file_size,
            transferred_resources=self.resources_after_transfer
            - self.resources_before_transfer,
        )

    def run_import(self):
        self.exception = None
        self.number_of_skipped_files = 0
        self.transferred_file_size = 0
        self.file_checksums_to_annotate = []

        if paths.using_remote_storage():
            self.file_checksums_to_annotate.extend(
                f["id"] for f in self.files_to_download
            )
            self.transferred_file_size = self.total_bytes_to_transfer
        else:
            self.remaining_bytes_to_transfer = self.total_bytes_to_transfer
            # Allow for two open file descriptors per download:
            # The temporary download file that the file is streamed to initially, and then
            # the actual destination file that it is moved to.
            with fd_safe_executor(fds_per_task=2) as executor:
                self.executor = executor
                batch_size = 100
                # ThreadPoolExecutor allows us to download files concurrently,
                # greatly reducing download time in most cases. However, loading
                # all the downloads into the pool requires considerable memory,
                # so we divide the downloads into batches to keep memory usage down.
                # In batches of 100, total RAM usage doesn't exceed 250MB in testing.
                i = 0
                file_batch = self.files_to_download[i : i + batch_size]
                while file_batch and not (self.is_cancelled() or self.exception):
                    self.future_file_transfers = {}
                    for f in file_batch:
                        if self.is_cancelled() or self.exception:
                            break
                        self._attempt_file_transfer(f)

                    self._wait_for_futures()
                    i += batch_size
                    file_batch = self.files_to_download[i : i + batch_size]

        annotation.set_content_visibility(
            self.channel_id,
            self.file_checksums_to_annotate,
            node_ids=self.node_ids,
            exclude_node_ids=self.exclude_node_ids,
            public=self.public,
        )

        self.resources_after_transfer = (
            ContentNode.objects.filter(channel_id=self.channel_id, available=True)
            .exclude(kind=content_kinds.TOPIC)
            .count()
        )

        if self.number_of_skipped_files > 0:
            logger.warning(
                "{} files are skipped, because errors occurred during the import.".format(
                    self.number_of_skipped_files
                )
            )

        self.update_progress(self.dummy_bytes_for_annotation)

        if self.exception:
            raise self.exception

        # Reraise any cancellation
        self.check_for_cancel()

        return (
            self.transferred_file_size,
            self.resources_after_transfer - self.resources_before_transfer,
        )


class RemoteResourceImportManagerBase(ResourceImportManagerBase):
    def __init__(
        self,
        channel_id,
        peer_id=None,
        baseurl=None,
        node_ids=None,
        exclude_node_ids=None,
        renderable_only=True,
        fail_on_error=False,
        content_dir=None,
        timeout=transfer.Transfer.DEFAULT_TIMEOUT,
    ):
        super(RemoteResourceImportManagerBase, self).__init__(
            channel_id,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            renderable_only=renderable_only,
            fail_on_error=fail_on_error,
            content_dir=content_dir,
        )
        self.timeout = timeout
        self.peer_id = peer_id

        if baseurl is None and peer_id is not None:
            try:
                peer = (
                    NetworkLocation.objects.all()
                    .values("base_url", "id")
                    .get(id=peer_id)
                )
                baseurl = NetworkClient.build_for_address(peer["base_url"]).base_url
            except (NetworkLocation.DoesNotExist, NetworkLocationNotFound):
                raise LocationError(
                    "The network location with the id {} does not exist".format(peer_id)
                )

        self.baseurl = baseurl or conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"]
        self.public = lookup_channel_listing_status(
            channel_id=channel_id, baseurl=baseurl
        )

        self.session = requests.Session()

    def create_file_transfer(self, f, filename, dest):
        url = paths.get_content_storage_remote_url(filename, baseurl=self.baseurl)
        return transfer.FileDownload(
            url,
            dest,
            f["id"],
            session=self.session,
            cancel_check=self.is_cancelled,
            timeout=self.timeout,
        )


class DiskResourceImportManagerBase(ResourceImportManagerBase):
    def __init__(
        self,
        channel_id,
        drive_id=None,
        path=None,
        node_ids=None,
        exclude_node_ids=None,
        renderable_only=True,
        fail_on_error=False,
        content_dir=None,
    ):
        self.drive_id = drive_id
        if drive_id and not path:
            path = self.get_path_from_drive_id(drive_id)

        self.path = path

        super(DiskResourceImportManagerBase, self).__init__(
            channel_id,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            renderable_only=renderable_only,
            fail_on_error=fail_on_error,
            content_dir=content_dir,
        )

    @staticmethod
    def get_path_from_drive_id(drive_id):
        try:
            drive = get_mounted_drive_by_id(drive_id)
        except KeyError:
            raise LocationError(
                "The external drive with given drive id {} does not exist.".format(
                    drive_id
                )
            )
        return drive["path"]

    @classmethod
    def from_manifest(
        cls, channel_id, manifest_file=None, path=None, drive_id=None, **kwargs
    ):
        if drive_id and not path:
            path = cls.get_path_from_drive_id(drive_id)
        if not manifest_file and not path:
            raise TypeError("Must specify either manifest_file or path")
        if not path:
            # If manifest_file is stdin, its name will be "<stdin>" and path
            # will become "". This feels clumsy, but the resulting behaviour
            # is reasonable.
            manifest_file_name = getattr(manifest_file, "name", "")
            manifest_dir = os.path.dirname(manifest_file_name)
            path = os.path.dirname(manifest_dir)
        if not manifest_file:
            manifest_file_path = os.path.join(path, "content", "manifest.json")
            if os.path.exists(manifest_file_path):
                manifest_file = manifest_file_path
        if manifest_file:
            return super(DiskResourceImportManagerBase, cls).from_manifest(
                channel_id, manifest_file, path=path, drive_id=drive_id, **kwargs
            )
        return cls(channel_id, path=path, drive_id=drive_id, **kwargs)

    def create_file_transfer(self, f, filename, dest):
        try:
            srcpath = paths.get_content_storage_file_path(
                filename, datafolder=self.path
            )
        except InvalidStorageFilenameError:
            # If the source file name is malformed, just stop now.
            self.update_progress(f["file_size"])
            return
        return transfer.FileCopy(
            srcpath,
            dest,
            f["id"],
            cancel_check=self.is_cancelled,
        )


class RemoteChannelResourceImportManager(RemoteResourceImportManagerBase):
    def get_import_data(self):
        return get_import_export_data(
            self.channel_id,
            self.node_ids,
            self.exclude_node_ids,
            False,
            renderable_only=self.renderable_only,
            peer_id=self.peer_id,
        )


class RemoteChannelUpdateManager(RemoteResourceImportManagerBase):
    def get_import_data(self):
        return get_import_data_for_update(
            self.channel_id,
            renderable_only=self.renderable_only,
            peer_id=self.peer_id,
        )


class DiskChannelResourceImportManager(DiskResourceImportManagerBase):
    def get_import_data(self):
        return get_import_export_data(
            self.channel_id,
            self.node_ids,
            self.exclude_node_ids,
            False,
            renderable_only=self.renderable_only,
            drive_id=self.drive_id,
        )


class DiskChannelUpdateManager(DiskResourceImportManagerBase):
    def get_import_data(self):
        return get_import_data_for_update(
            self.channel_id,
            renderable_only=self.renderable_only,
            drive_id=self.drive_id,
        )
