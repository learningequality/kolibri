import logging
import os

from le_utils.constants import content_kinds

from kolibri.core.content.constants.transfer_types import COPY_METHOD
from kolibri.core.content.constants.transfer_types import DOWNLOAD_METHOD
from kolibri.core.content.models import ContentNode
from kolibri.core.content.utils import paths
from kolibri.core.content.utils.annotation import update_content_metadata
from kolibri.core.content.utils.channel_import import import_channel_by_id
from kolibri.core.content.utils.channel_import import ImportCancelError
from kolibri.core.content.utils.importability_annotation import clear_channel_stats
from kolibri.core.device.models import ContentCacheKey
from kolibri.core.tasks.utils import get_current_job
from kolibri.utils import file_transfer as transfer

logger = logging.getLogger(__name__)


class DummyJob:
    def __init__(self):
        # same default values as in the Job contructor
        self.progress = 0
        self.total_progress = 0
        self.extra_metadata = {}

    def is_cancelled(self):
        return False

    def check_for_cancel(self):
        pass

    def update_progress(self, bytes_transferred, extra_data=None):
        pass

    def update_metadata(self, **kwargs):
        pass

    def save_meta(self):
        pass


def get_job():
    job = get_current_job()
    if job is None:
        return DummyJob()
    return job


def start_file_transfer(filetransfer, channel_id, dest, no_upgrade, contentfolder):
    """
    Runs the file transfer and, if not in "no_upgrade" mode, imports the channel and updates metadata.

    :param filetransfer: The file transfer object to execute.
    :param channel_id: The channel id being transferred.
    :param dest: The destination file path.
    :param no_upgrade: If True, bypass the channel import.
    :param contentfolder: The content folder used during import.
    """
    job = get_job()
    progress_extra_data = {"channel_id": channel_id}

    with filetransfer:
        job.update_progress(0, filetransfer.transfer_size)

        def progress_callback(bytes_transferred):
            job.update_progress(bytes_transferred + job.progress, job.total_progress)
            job.update_metadata(**progress_extra_data)

        filetransfer.run(progress_callback)

        # if upgrading, import the channel
        if not no_upgrade:
            try:
                # In each case we need to evaluate the queryset now,
                # in order to get node ids as they currently are before
                # the import. If we did not coerce each of these querysets
                # to a list now, they would be lazily evaluated after the
                # import, and would reflect the state of the database
                # after the import.

                # evaluate list so we have the current node ids
                node_ids = list(
                    ContentNode.objects.filter(channel_id=channel_id, available=True)
                    .exclude(kind=content_kinds.TOPIC)
                    .values_list("id", flat=True)
                )
                admin_imported_ids = list(
                    ContentNode.objects.filter(
                        channel_id=channel_id, available=True, admin_imported=True
                    )
                    .exclude(kind=content_kinds.TOPIC)
                    .values_list("id", flat=True)
                )
                not_admin_imported_ids = list(
                    ContentNode.objects.filter(
                        channel_id=channel_id, available=True, admin_imported=False
                    )
                    .exclude(kind=content_kinds.TOPIC)
                    .values_list("id", flat=True)
                )
                import_ran = import_channel_by_id(
                    channel_id, job.is_cancelled, contentfolder
                )
                if import_ran:
                    if node_ids:
                        # Annotate default channel DB based on previously annotated leaf nodes.
                        update_content_metadata(channel_id, node_ids=node_ids)
                        if admin_imported_ids:
                            # Reset admin_imported flag for nodes that were imported by admin.
                            ContentNode.objects.filter_by_uuids(
                                admin_imported_ids
                            ).update(admin_imported=True)
                        if not_admin_imported_ids:
                            # Reset admin_imported flag for nodes that were not imported by admin.
                            ContentNode.objects.filter_by_uuids(
                                not_admin_imported_ids
                            ).update(admin_imported=False)
                    else:
                        # Ensure the channel is available to the frontend.
                        ContentCacheKey.update_cache_key()

                    # Clear any previously set channel availability stats for this channel.
                    clear_channel_stats(channel_id)
            except ImportCancelError:
                # This will only occur if job.is_cancelled() is True.
                pass


def transfer_channel(
    channel_id,
    method,
    no_upgrade=False,
    content_dir=None,
    baseurl=None,
    source_path=None,
):
    """
    Transfers a channel database either by downloading or copying

    :param channel_id: The channel id to transfer.
    :param method: The transfer method (DOWNLOAD_METHOD or COPY_METHOD).
    :param no_upgrade: If True, only download the database to an upgrade file path.
    :param content_dir: The content directory.
    :param baseurl: The base URL from which to download (if applicable).
    :param source_path: The source path (if copying).
    :return: The destination path of the transferred channel database.
    """
    job = get_job()

    new_channel_dest = paths.get_upgrade_content_database_file_path(
        channel_id, contentfolder=content_dir
    )
    dest = (
        new_channel_dest
        if no_upgrade
        else paths.get_content_database_file_path(channel_id, contentfolder=content_dir)
    )

    # If a new channel version DB has previously been downloaded, just copy it over.
    if os.path.exists(new_channel_dest) and not no_upgrade:
        method = COPY_METHOD

    # Determine where we're downloading/copying from, and create the appropriate transfer object.
    if method == DOWNLOAD_METHOD:
        url = paths.get_content_database_file_url(channel_id, baseurl=baseurl)
        logger.debug("URL to fetch: {}".format(url))
        filetransfer = transfer.FileDownload(url, dest, cancel_check=job.is_cancelled)
    elif method == COPY_METHOD:
        # If there is a new channel version DB, set that as source path.
        srcpath = (
            new_channel_dest
            if os.path.exists(new_channel_dest)
            else paths.get_content_database_file_path(
                channel_id, datafolder=source_path
            )
        )
        filetransfer = transfer.FileCopy(srcpath, dest, cancel_check=job.is_cancelled)
    else:
        raise ValueError("Invalid transfer method specified: {}".format(method))

    logger.debug("Destination: {}".format(dest))

    try:
        start_file_transfer(filetransfer, channel_id, dest, no_upgrade, content_dir)
    except transfer.TransferCanceled:
        pass

    if job.is_cancelled():
        try:
            os.remove(dest)
        except OSError as e:
            logger.info(
                "Tried to remove {}, but exception {} occurred.".format(dest, e)
            )
        # Reraise any cancellation.
        job.check_for_cancel()

    # If we are trying to upgrade, remove the new channel DB.
    if os.path.exists(new_channel_dest) and not no_upgrade:
        os.remove(new_channel_dest)

    return dest


def export_channel(channel_id, destination):
    job = get_job()
    data_dir = os.path.realpath(destination)
    logger.info(
        "Exporting channel database for channel id {} to {}".format(
            channel_id, data_dir
        )
    )
    src = paths.get_content_database_file_path(channel_id)
    dest = paths.get_content_database_file_path(channel_id, datafolder=data_dir)
    logger.debug("Source file: {}".format(src))
    logger.debug("Destination file: {}".format(dest))
    with transfer.FileCopy(src, dest, cancel_check=job.is_cancelled) as copy:
        job.update_progress(0, copy.transfer_size)

        def progress_callback(bytes_transferred):
            new_progress = job.progress + bytes_transferred
            job.update_progress(new_progress, job.total_progress)

        try:
            copy.run(progress_update=progress_callback)
        except transfer.TransferCanceled:
            pass
        # Reraise any cancellation
        job.check_for_cancel()
