import logging
import os
import sqlite3
from collections import namedtuple

import psutil
from django.conf import settings
from kolibri.content.models import ChannelMetadata
from kolibri.content.utils.channels import get_channel_id_list_from_scanning_content_database_dir
from kolibri.tasks.management.commands.base import AsyncCommand

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


logger = logging.getLogger(__name__)


class Command(AsyncCommand):

    def add_arguments(self, parser):
        pass

    def handle_async(self, *args, **options):
        drives = psutil.disk_partitions(all=True)

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

        if self._called_from_command_line:
            return str(discovered_drives)
        else:
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
