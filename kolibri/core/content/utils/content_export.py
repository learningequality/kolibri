import logging
import os

from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.utils import paths
from kolibri.core.content.utils.channel_transfer import get_job
from kolibri.core.content.utils.content_manifest import ContentManifest
from kolibri.core.content.utils.import_export_content import get_content_nodes_data
from kolibri.core.content.utils.import_export_content import get_import_export_nodes
from kolibri.core.content.utils.paths import get_content_file_name
from kolibri.utils import file_transfer as transfer

logger = logging.getLogger(__name__)


def export_content(
    channel_id, destination, manifest_only=False, node_ids=None, exclude_node_ids=None
):
    job = get_job()
    data_dir = os.path.realpath(destination)
    channel_metadata = ChannelMetadata.objects.get(id=channel_id)

    nodes_queries_list = get_import_export_nodes(
        channel_id, node_ids, exclude_node_ids, available=True
    )
    (total_resource_count, files, total_bytes_to_transfer) = get_content_nodes_data(
        channel_id, nodes_queries_list, available=True
    )
    # update job meta data
    job.extra_metadata["file_size"] = total_bytes_to_transfer
    job.extra_metadata["total_resources"] = total_resource_count
    job.save_meta()
    # dont copy files if we are only exporting the manifest
    if not manifest_only:
        copy_content_files(channel_id, data_dir, files, total_bytes_to_transfer)
    # Reraise any cancellation
    job.check_for_cancel()
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


def copy_content_files(channel_id, data_dir, files, total_bytes_to_transfer):
    job = get_job()
    logger.info(
        "Exporting content for channel id {} to {}".format(channel_id, data_dir)
    )
    for f in files:
        if job.is_cancelled():
            break
        export_file(f, data_dir, total_bytes_to_transfer)


def export_file(f, data_dir, total_bytes_to_transfer):
    job = get_job()
    filename = get_content_file_name(f)
    try:
        srcpath = paths.get_content_storage_file_path(filename)
        dest = paths.get_content_storage_file_path(filename, datafolder=data_dir)
    except InvalidStorageFilenameError:
        # If any files have an invalid storage file name, don't export them.
        job.update_progress(job.progress + f["file_size"], total_bytes_to_transfer)
        return
    # if the file already exists, add its size to our overall progress, and skip
    if os.path.isfile(dest) and os.path.getsize(dest) == f["file_size"]:
        job.update_progress(job.progress + f["file_size"], total_bytes_to_transfer)
        return
    with transfer.FileCopy(srcpath, dest, cancel_check=job.is_cancelled) as copy:

        def progress_update(length):
            job.update_progress(job.progress + length, total_bytes_to_transfer)

        try:
            copy.run(progress_update=progress_update)
        except transfer.TransferCanceled:
            job.extra_metadata["file_size"] = job.progress
            job.extra_metadata["total_resources"] = 0
            job.save_meta()
            return
        return dest
