import concurrent.futures
import logging
import os
from abc import ABCMeta
from abc import abstractmethod

import requests
from le_utils.constants import content_kinds

from kolibri.core.analytics.tasks import schedule_ping
from kolibri.core.content.errors import InsufficientStorageSpaceError
from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.models import ContentNode
from kolibri.core.content.utils import annotation
from kolibri.core.content.utils import paths
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.content.utils.content_manifest import ContentManifest
from kolibri.core.content.utils.file_availability import generate_checksum_integer_mask
from kolibri.core.content.utils.file_availability import LocationError
from kolibri.core.content.utils.import_export_content import get_import_export_data
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.content.utils.paths import get_content_file_name
from kolibri.core.content.utils.upgrade import get_import_data_for_update
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseTimeout
from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_INSTANCE_ID
from kolibri.core.tasks.utils import fd_safe_executor
from kolibri.core.tasks.utils import JobProgressMixin
from kolibri.core.utils.urls import reverse_path
from kolibri.utils import conf
from kolibri.utils import file_transfer as transfer
from kolibri.utils.system import get_free_space


logger = logging.getLogger(__name__)


def lookup_channel_listing_status(channel_id, baseurl=None):
    """
    Look up the listing status of the channel from the remote, this is surfaced as a
    `public` boolean field.
    """
    client = NetworkClient.build_for_address(baseurl)
    try:
        # prevent trying to fetch a channel from a remote that it is not
        # available from.
        resp = client.get(
            get_channel_lookup_url(identifier=channel_id, baseurl=baseurl)
        )

    except NetworkLocationResponseFailure as e:
        if e.response.status_code == 404:
            return None
        raise LocationError(
            "Channel {} not found on remote {}".format(channel_id, baseurl)
        )
    (channel_info,) = resp.json()
    return channel_info.get("public", None)


class ResourceImportManagerBase(JobProgressMixin, metaclass=ABCMeta):
    public = None

    def __init__(
        self,
        channel_id,
        node_ids=None,
        exclude_node_ids=None,
        renderable_only=True,
        all_thumbnails=False,
        fail_on_error=False,
        content_dir=None,
        admin_imported=True,
    ):
        self.channel_id = channel_id

        if node_ids is not None:
            node_ids = set(node_ids)

        if exclude_node_ids is not None:
            exclude_node_ids = set(exclude_node_ids)

        self.node_ids = node_ids
        self.exclude_node_ids = exclude_node_ids
        self.renderable_only = renderable_only
        self.all_thumbnails = all_thumbnails
        self.fail_on_error = fail_on_error
        self.content_dir = content_dir or conf.OPTIONS["Paths"]["CONTENT_DIR"]
        self.admin_imported = admin_imported
        super(ResourceImportManagerBase, self).__init__()

    @classmethod
    def from_manifest(cls, channel_id, manifest_file, **kwargs):
        if "node_ids" in kwargs:
            raise TypeError("Unexpected keyword argument node_ids")
        if "exclude_node_ids" in kwargs:
            raise TypeError("Unexpected keyword argument exclude_node_ids")
        if isinstance(manifest_file, str):
            manifest_file = open(manifest_file, "r")
        content_manifest = ContentManifest()
        content_manifest.read_file(manifest_file)
        node_ids = content_manifest.get_node_ids_for_channel(channel_id)
        exclude_node_ids = None
        manifest_file.close()
        return cls(
            channel_id, node_ids=node_ids, exclude_node_ids=exclude_node_ids, **kwargs
        )

    def _start_file_transfer(self, f):
        """
        Start to transfer the file from network/disk to the destination.
        """
        filename = get_content_file_name(f)
        dest = paths.get_content_storage_file_path(
            filename, contentfolder=self.content_dir
        )

        # if the file already exists add its size to our overall progress, and skip
        if os.path.isfile(dest) and os.path.getsize(dest) == f["file_size"]:
            return

        filetransfer = self.create_file_transfer(f, filename, dest)
        if filetransfer:
            with filetransfer:
                filetransfer.run()

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

    def _handle_future(self, future, f):
        try:
            # Handle updating all tracking of downloaded file sizes
            # before we check for errors
            data_transferred = f["file_size"] or 0
            self.update_progress(data_transferred)
            self.transferred_file_size += data_transferred
            self.remaining_bytes_to_transfer -= data_transferred
            remaining_free_space = get_free_space(self.content_dir)
            # Check for errors from the download
            future.result()
            # If not errors, mark this file to be annotated
            self.file_checksums_to_annotate.append(f["id"])
            # Finally check if we have enough space to continue
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
                or isinstance(e, InvalidStorageFilenameError)
            ):
                # Continue file import when the current file is not found from the source and is skipped,
                # or an invalid destination or source file name is provided.
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
        :return: a tuple of the transferred data size and number of resources imported
        :rtype: (int, int)
        """
        self.prepare_for_import()
        self.initialize_standalone_progress_tracking()
        results = self.run_import()
        self.finalize_standalone_progress_tracking()
        return results

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

        channel_has_imported_resources = (
            ContentNode.objects.filter(channel_id=self.channel_id)
            .filter(available=True)
            .exists()
        )

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
                        future = self.executor.submit(self._start_file_transfer, f)
                        self.future_file_transfers[future] = f

                    self._wait_for_futures()
                    i += batch_size
                    file_batch = self.files_to_download[i : i + batch_size]

        annotation.set_content_visibility(
            self.channel_id,
            self.file_checksums_to_annotate,
            node_ids=self.node_ids,
            exclude_node_ids=self.exclude_node_ids,
            public=self.public,
            admin_imported=self.admin_imported,
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

        if not channel_has_imported_resources:
            # This is the first time we're importing to this Channel, so ping telemetry now
            # that we've successfully imported contents to it
            schedule_ping()

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
        all_thumbnails=False,
        fail_on_error=False,
        content_dir=None,
        admin_imported=True,
        timeout=transfer.Transfer.DEFAULT_TIMEOUT,
    ):
        super(RemoteResourceImportManagerBase, self).__init__(
            channel_id,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            renderable_only=renderable_only,
            all_thumbnails=all_thumbnails,
            fail_on_error=fail_on_error,
            content_dir=content_dir,
            admin_imported=admin_imported,
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
        all_thumbnails=False,
        fail_on_error=False,
        content_dir=None,
        admin_imported=True,
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
            all_thumbnails=all_thumbnails,
            fail_on_error=fail_on_error,
            content_dir=content_dir,
            admin_imported=admin_imported,
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
        srcpath = paths.get_content_storage_file_path(filename, datafolder=self.path)
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
            all_thumbnails=self.all_thumbnails,
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
            all_thumbnails=self.all_thumbnails,
            drive_id=self.drive_id,
        )


class DiskChannelUpdateManager(DiskResourceImportManagerBase):
    def get_import_data(self):
        return get_import_data_for_update(
            self.channel_id,
            renderable_only=self.renderable_only,
            drive_id=self.drive_id,
        )


class ContentDownloadRequestResourceImportManager(RemoteChannelResourceImportManager):
    def __init__(
        self,
        channel_id,
        peer,
        download_request,
        renderable_only=True,
        fail_on_error=False,
        content_dir=None,
        timeout=transfer.Transfer.DEFAULT_TIMEOUT,
        # As this is primarily used for importing non-admin imported content
        # we reverse the default here.
        admin_imported=False,
    ):
        """
        :param channel_id: A hex UUID string
        :type channel_id: str
        :param peer: A NetworkLocation model object
        :type peer: NetworkLocation
        :param download_request: A ContentDownloadRequest model object
        :type download_request: ContentDownloadRequest
        :param renderable_only: Whether to only import renderable content
        :type renderable_only: bool
        :param fail_on_error: Whether to fail on import errors
        :type fail_on_error: bool
        :param content_dir: The directory to download content to
        :type content_dir: str
        :param timeout: The timeout for the download request
        :type timeout: int
        """
        super(ContentDownloadRequestResourceImportManager, self).__init__(
            channel_id,
            peer_id=peer.id,
            baseurl=peer.base_url,
            node_ids=[download_request.contentnode_id],
            exclude_node_ids=None,
            renderable_only=renderable_only,
            fail_on_error=fail_on_error,
            content_dir=content_dir,
            admin_imported=admin_imported,
            timeout=timeout,
        )
        self.peer = peer
        self.download_request = download_request

    def get_import_data(self):
        return get_import_export_data(
            self.channel_id,
            self.node_ids,
            self.exclude_node_ids,
            False,
            renderable_only=self.renderable_only,
            all_thumbnails=self.all_thumbnails,
            peer_id=self.peer_id,
            check_file_availability=False,
        )

    def run(self):
        node = ContentNode.objects.get(pk=self.download_request.contentnode_id)
        if self.peer.id != CENTRAL_CONTENT_BASE_INSTANCE_ID:
            required_checksums = (
                node.files.all()
                .filter(supplementary=False)
                .values_list("local_file_id", flat=True)
            )
            with NetworkClient.build_from_network_location(self.peer) as client:
                try:
                    response = client.post(
                        reverse_path(
                            "kolibri:core:get_public_file_checksums",
                            kwargs={"version": "v1"},
                        ),
                        json=list(required_checksums),
                    )
                    integer_mask = int(response.content)

                    expected_mask = generate_checksum_integer_mask(
                        required_checksums, required_checksums
                    )

                    if integer_mask != expected_mask:
                        raise ValueError("Checksums do not match")
                except (
                    ValueError,
                    TypeError,
                    NetworkLocationResponseFailure,
                    NetworkLocationResponseTimeout,
                ) as e:
                    logging.debug(
                        "Failed to retrieve or validate checksums: {}".format(e)
                    )
                    # Bad JSON parsing will throw ValueError
                    # If the result of the json.loads is not iterable, a TypeError will be thrown
                    # If we end up here, just set checksums to None to allow us to cleanly continue
                    if self.fail_on_error:
                        raise LocationError("Required files not available from remote")

        return super(ContentDownloadRequestResourceImportManager, self).run()

    def start_progress(self, total=100):
        super(ContentDownloadRequestResourceImportManager, self).start_progress(total)
        if self.download_request:
            self.download_request.update_progress(0, total)

    def update_progress(self, increment=1, message="", extra_data=None):
        super(ContentDownloadRequestResourceImportManager, self).update_progress(
            increment, message, extra_data
        )
        if self.download_request:
            self.download_request.update_progress(
                self.download_request.progress + increment,
                self.download_request.total_progress,
            )
