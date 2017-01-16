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

    # immediately return an empty list if the content database directory doesn't exist
    if not os.path.isdir(content_database_dir):
        return []

    # get a list of all the database files in the directory, and extract IDs
    db_list = fnmatch.filter(os.listdir(content_database_dir), '*.sqlite3')
    db_names = [db.split('.sqlite3', 1)[0] for db in db_list]

    # determine which database names are valid, and only use those ones
    valid_db_names = [name for name in db_names if is_valid_uuid(name)]
    invalid_db_names = set(db_names) - set(valid_db_names)
    if invalid_db_names:
        logging.warning("Ignoring databases in content database directory '{directory}' with invalid names: {names}"
                        .format(directory=content_database_dir, names=invalid_db_names))

    # empty database files are created if we delete a database file while the server is running and connected to it;
    # here, we delete and exclude such databases to avoid errors when we try to connect to them
    empty_db_files = set({})
    for db_name in valid_db_names:
        filename = os.path.join(content_database_dir, "{}.sqlite3".format(db_name))
        if os.path.getsize(filename) == 0:
            empty_db_files.add(db_name)
            os.remove(filename)
    if empty_db_files:
        logging.warning("Removing empty databases in content database directory '{directory}' with IDs: {names}"
                        .format(directory=content_database_dir, names=empty_db_files))
    valid_dbs = list(set(valid_db_names) - set(empty_db_files))

    return valid_dbs

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
        drive.metadata["channels"] = get_channels_for_data_folder(drive.datafolder) if drive.datafolder else []
    return drives

def get_current_or_first_channel(request):
    # import here to avoid circular imports whenever kolibri.content.models imports utils too
    from kolibri.content.models import ChannelMetadataCache

    currentChannelId = request.COOKIES.get('currentChannelId')
    firstChannel = ChannelMetadataCache.objects.first()
    # try to get channel from cookie
    if currentChannelId:
        try:
            return ChannelMetadataCache.objects.get(pk=currentChannelId)
        except ChannelMetadataCache.DoesNotExist:
            return None
    # if no id from cookie, grab first channel from list of channels
    elif firstChannel:
        return firstChannel
    # if no cookie and no content databases, return None
    else:
        return None
