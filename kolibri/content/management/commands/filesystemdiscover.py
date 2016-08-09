import json
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
    ["name", "id"],
)


logger = logging.getLogger(__name__)


class Command(AsyncCommand):

    def add_arguments(self, parser):
        pass

    def handle_async(self, *args, **options):
        drives = psutil.disk_partitions(all=True)

        discovered_drives = []
        for drive in drives:
            discovered_drives += list(discover_kolibri_data(drive.mountpoint))

        return json.dumps([d._asdict() for d in discovered_drives])


def discover_kolibri_data(folder):
    kolibri_export_root_dir = os.path.join(
        folder,
        settings.EXPORT_FOLDER_NAME,
    )

    if not os.path.exists(kolibri_export_root_dir):
        return None

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

    query = "SELECT {fields} FROM {tablename}".format(
        tablename=channel_metadata_tablename,
        fields=",".join(KolibriExportedChannelData._fields),
    )

    result = cursor.execute(query)

    for row in result.fetchall():
        # I don't like this, we hardcode the return positions. Find a way to
        # dynamically determine the sqlite result position with its
        # corresponding fields
        data = KolibriExportedChannelData(
            name=row[0],
            id=row[1],
        )
        yield data

    conn.close()
