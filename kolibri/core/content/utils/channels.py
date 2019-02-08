import fnmatch
import logging
import os

from .paths import get_content_database_dir_path
from .sqlalchemybridge import Bridge
from kolibri.core.discovery.utils.filesystem import enumerate_mounted_disk_partitions
from kolibri.utils.uuids import is_valid_uuid

logger = logging.getLogger(__name__)


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
        logger.warning("Ignoring databases in content database directory '{directory}' with invalid names: {names}"
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
        logger.warning("Removing empty databases in content database directory '{directory}' with IDs: {names}"
                       .format(directory=content_database_dir, names=empty_db_files))
    valid_dbs = list(set(valid_db_names) - set(empty_db_files))

    return valid_dbs


def enumerate_content_database_file_paths(content_database_dir):
    full_dir_template = os.path.join(content_database_dir, "{}.sqlite3")
    channel_ids = get_channel_ids_for_content_database_dir(content_database_dir)
    return [full_dir_template.format(f) for f in channel_ids]


def read_channel_metadata_from_db_file(channeldbpath):
    # import here to avoid circular imports whenever kolibri.core.content.models imports utils too
    from kolibri.core.content.models import ChannelMetadata

    source = Bridge(sqlite_file_path=channeldbpath)

    ChannelMetadataClass = source.get_class(ChannelMetadata)

    source_channel_metadata = source.session.query(ChannelMetadataClass).all()[0]

    # Use the inferred version from the SQLAlchemy Bridge object, and set it as additional
    # metadata on the channel data

    source_channel_metadata.inferred_schema_version = source.schema_version

    source.end()

    # Adds an attribute `root_id` when `root_id` does not exist to match with
    # the latest schema.
    if not hasattr(source_channel_metadata, 'root_id'):
        setattr(source_channel_metadata, 'root_id', getattr(source_channel_metadata, 'root_pk'))

    return source_channel_metadata


def get_channels_for_data_folder(datafolder):
    channels = []
    for path in enumerate_content_database_file_paths(get_content_database_dir_path(datafolder)):
        channel = read_channel_metadata_from_db_file(path)
        channel_data = {
            "path": path,
            "id": channel.id,
            "name": channel.name,
            "description": channel.description,
            "thumbnail": channel.thumbnail,
            "version": channel.version,
            "root": channel.root_id,
            "author": channel.author,
            "last_updated": getattr(channel, 'last_updated', None),
            "lang_code": getattr(channel, 'lang_code', None),
            "lang_name": getattr(channel, 'lang_name', None),
        }
        channels.append(channel_data)
    return channels


def get_mounted_drives_with_channel_info():
    drives = enumerate_mounted_disk_partitions()
    for drive in drives.values():
        drive.metadata["channels"] = get_channels_for_data_folder(drive.datafolder) if drive.datafolder else []
    return drives
