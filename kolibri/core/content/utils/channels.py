import fnmatch
import logging
import os

from django.core.cache import cache
from sqlalchemy.exc import DatabaseError
from sqlalchemy.sql import select

from .paths import get_content_database_dir_path
from .sqlalchemybridge import Bridge
from kolibri.core.discovery.utils.filesystem import enumerate_mounted_disk_partitions
from kolibri.utils.uuids import is_valid_uuid

logger = logging.getLogger(__name__)

CHANNEL_UPDATE_STATS_CACHE_KEY = "CHANNEL_UPDATE_STATS_{}"


def get_channel_ids_for_content_dirs(content_dirs):
    database_dir_paths = [
        get_content_database_dir_path(contentfolder=path) for path in content_dirs
    ]
    channel_ids = set()
    for path in database_dir_paths:
        channel_ids.update(get_channel_ids_for_content_database_dir(path))
    return list(channel_ids)


def get_channel_ids_for_content_database_dir(content_database_dir):
    """
    Returns a list of channel IDs for the channel databases that exist in a content database directory.
    """

    # immediately return an empty list if the content database directory doesn't exist
    if not os.path.isdir(content_database_dir):
        return []

    # get a list of all the database files in the directory, and extract IDs
    db_list = fnmatch.filter(os.listdir(content_database_dir), "*.sqlite3")
    db_names = [db.split(".sqlite3", 1)[0] for db in db_list]

    # determine which database names are valid, and only use those ones
    valid_db_names = [name for name in db_names if is_valid_uuid(name)]
    invalid_db_names = set(db_names) - set(valid_db_names)
    if invalid_db_names:
        logger.warning(
            "Ignoring databases in content database directory '{directory}' with invalid names: {names}".format(
                directory=content_database_dir, names=invalid_db_names
            )
        )

    # nonexistent database files are created if we delete the files that have broken symbolic links;
    # empty database files are created if we delete a database file while the server is running and connected to it;
    # here, we delete and exclude such databases to avoid errors when we try to connect to them
    db_files_to_remove = set({})
    for db_name in valid_db_names:
        filename = os.path.join(content_database_dir, "{}.sqlite3".format(db_name))
        if not os.path.exists(filename) or os.path.getsize(filename) == 0:
            db_files_to_remove.add(db_name)
            os.remove(filename)

    if db_files_to_remove:
        err_msg = (
            "Removing nonexistent or empty databases in content database directory "
            "'{directory}' with IDs: {names}.\nPlease import the channels again."
        )
        logger.warning(
            err_msg.format(directory=content_database_dir, names=db_files_to_remove)
        )
    valid_dbs = list(set(valid_db_names) - set(db_files_to_remove))

    return valid_dbs


def enumerate_content_database_file_paths(content_database_dir):
    full_dir_template = os.path.join(content_database_dir, "{}.sqlite3")
    channel_ids = get_channel_ids_for_content_database_dir(content_database_dir)
    return [full_dir_template.format(f) for f in channel_ids]


def read_channel_metadata_from_db_file(channeldbpath):
    # import here to avoid circular imports whenever kolibri.core.content.models imports utils too
    from kolibri.core.content.models import ChannelMetadata

    source = Bridge(sqlite_file_path=channeldbpath)

    ChannelMetadataTable = source.get_table(ChannelMetadata)

    source_channel_metadata = dict(
        source.execute(select([ChannelMetadataTable])).fetchone()
    )

    # Use the inferred version from the SQLAlchemy Bridge object, and set it as additional
    # metadata on the channel data

    source_channel_metadata["inferred_schema_version"] = source.schema_version

    source.end()

    # Adds an attribute `root_id` when `root_id` does not exist to match with
    # the latest schema.
    if "root_id" not in source_channel_metadata:
        source_channel_metadata["root_id"] = source_channel_metadata["root_pk"]

    return source_channel_metadata


def get_channels_for_data_folder(datafolder):
    channels = []
    for path in enumerate_content_database_file_paths(
        get_content_database_dir_path(datafolder)
    ):
        try:
            channel = read_channel_metadata_from_db_file(path)
        except DatabaseError:
            logger.warning(
                "Tried to import channel from database file {}, but the file was corrupted.".format(
                    path
                )
            )
            continue
        channel_data = {
            "path": path,
            "id": channel["id"],
            "name": channel["name"],
            "description": channel["description"],
            "tagline": channel.get("tagline", ""),
            "thumbnail": channel["thumbnail"],
            "version": channel["version"],
            "root": channel["root_id"],
            "author": channel["author"],
            "last_updated": channel.get("last_updated"),
            "lang_code": channel.get("lang_code"),
            "lang_name": channel.get("lang_name"),
        }
        channels.append(channel_data)
    return channels


# Use this to cache mounted drive information when
# it has already been fetched for querying by drive id
MOUNTED_DRIVES_CACHE_KEY = "mounted_drives_cache_key"


def get_mounted_drives_with_channel_info():
    drives = enumerate_mounted_disk_partitions()
    for drive in drives.values():
        drive.metadata["channels"] = (
            get_channels_for_data_folder(drive.datafolder) if drive.datafolder else []
        )
    cache.set(MOUNTED_DRIVES_CACHE_KEY, drives, 3600)
    return drives


def get_mounted_drive_by_id(drive_id):
    drives = cache.get(MOUNTED_DRIVES_CACHE_KEY)
    if drives is None or drives.get(drive_id, None) is None:
        drives = get_mounted_drives_with_channel_info()
    return drives[drive_id]
