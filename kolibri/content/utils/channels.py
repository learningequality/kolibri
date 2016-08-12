import fnmatch
import logging as logger
import os
import psutil
import sqlite3
from collections import namedtuple
from django.conf import settings
from kolibri.utils.uuids import is_valid_uuid

logging = logger.getLogger(__name__)

KolibriExportedChannelData = namedtuple(
    "KolibriExportedChannelData",
    ["name", "id", "path"],
)

DriveData = namedtuple(
    "DriveData",
    [
        "kind",
        "name",
        "id",
        "writeable",
        "has_content",
        "channels",
    ]
)

def get_channel_id_list_from_scanning_content_database_dir(content_database_dir, return_full_dir=False):
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

    if not return_full_dir:
        return valid_db_names
    else:
        full_dir_template = os.path.join(content_database_dir, "{}.sqlite3")
        return [full_dir_template.format(f) for f in valid_db_names]


def find_kolibri_data_in_mountpoints(physical_drives_only=False):
    drives = psutil.disk_partitions(all=(not physical_drives_only))

    discovered_drives = {}
    for drive in drives:
        channels = list(discover_kolibri_data(drive.mountpoint))
        is_writeable = "rw" in drive.opts

        discovered_drives[drive.mountpoint] = DriveData(
            kind="localdrive",
            id=drive.mountpoint,
            name=drive.mountpoint,
            writeable=is_writeable,      # Everything is false for now, TODO later
            has_content=bool(channels),  # True if we found channels in it
            channels=channels,
        )

    return discovered_drives


def discover_kolibri_data(folder):
    kolibri_export_root_dir = os.path.join(
        folder,
        settings.EXPORT_FOLDER_NAME,
    )

    if not os.path.exists(kolibri_export_root_dir):
        raise StopIteration     # exit out of generator early

    export_db_dir = os.path.join(
        kolibri_export_root_dir,
        "content",
        "databases",
    )

    channel_db_paths = get_channel_id_list_from_scanning_content_database_dir(export_db_dir, return_full_dir=True)

    for path in channel_db_paths:
        for channeldata in read_channel_data(path):
            logger.info("Found {path} with name {name}".format(
                path=path,
                name=channeldata.name)
            )
            yield channeldata


def read_channel_data(channeldbpath):
    # import here to avoid circular imports whenever kolibri.content.models imports utils too
    from kolibri.content.models import ChannelMetadata

    channel_metadata_tablename = ChannelMetadata._meta.db_table
    conn = sqlite3.connect(channeldbpath)

    cursor = conn.cursor()

    fields = list(KolibriExportedChannelData._fields)
    fields.remove('path')       # path is inserted by this function, and not determined from the DB

    query = "SELECT {fields} FROM {tablename}".format(
        tablename=channel_metadata_tablename,
        fields=",".join(fields),
    )

    result = cursor.execute(query)

    for row in result.fetchall():
        # I don't like this, we hardcode the return positions. Find a way to
        # dynamically determine the sqlite result position with its
        # corresponding fields
        data = KolibriExportedChannelData(
            name=row[0],
            id=row[1],
            path=channeldbpath,
        )
        yield data

    conn.close()
