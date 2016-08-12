import fnmatch
import logging as logger
import os

from kolibri.core.discovery.utils.filesystem import enumerate_mounted_disk_partitions
from kolibri.utils.uuids import is_valid_uuid

from ..content_db_router import using_content_database
from .paths import get_content_database_folder_path

logging = logger.getLogger(__name__)

def get_channel_ids_for_content_database_dir(content_database_dir):
    """
    Returns a list of channel IDs for the channel databases that exist in a content database directory.
    """
    db_list = fnmatch.filter(os.listdir(content_database_dir), '*.sqlite3')
    db_names = [db.split('.sqlite3', 1)[0] for db in db_list]
    valid_db_names = [name for name in db_names if is_valid_uuid(name)]
    invalid_db_names = set(db_names) - set(valid_db_names)

    if invalid_db_names:
        logging.warning("Ignoring databases in content database directory '{directory}' with invalid names: {names}"
                        .format(directory=content_database_dir, names=invalid_db_names))

    return valid_db_names

def enumerate_content_database_file_paths(content_database_dir):
    full_dir_template = os.path.join(content_database_dir, "{}.sqlite3")
    channel_ids = get_channel_ids_for_content_database_dir(content_database_dir)
    return [full_dir_template.format(f) for f in channel_ids]

def read_channel_metadata_from_db_file(channeldbpath):
    # import here to avoid circular imports whenever kolibri.content.models imports utils too
    from kolibri.content.models import ChannelMetadata

    with using_content_database(channeldbpath):
        return ChannelMetadata.objects.first()

def get_channels_for_data_folder(datafolder):
    channels = []
    for path in enumerate_content_database_file_paths(get_content_database_folder_path(datafolder)):
        channel = read_channel_metadata_from_db_file(path)
        channel_data = {
            "path": path,
            "id": channel.id,
            "name": channel.name,
        }
        channels.append(channel_data)
    return channels

def get_mounted_drives_with_channel_info():
    drives = enumerate_mounted_disk_partitions()
    for drive in drives.values():
        drive.metadata["channels"] = get_channels_for_data_folder(drive.data_folder) if drive.data_folder else []
    return drives
