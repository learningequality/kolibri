import fnmatch
import os
from uuid import UUID

from django.conf import settings
from kolibri.content.models import ChannelMetadata


def is_valid_uuid(uuid_to_test, version=4):
    """
    Check if uuid_to_test is a valid UUID.

    :param uuid_to_test: str
    :param version: int {1, 2, 3, 4}
    :return: True if uuid_to_test is from a valid UUID
    """
    try:
        uuid_obj = UUID(uuid_to_test, version=version)
    except (ValueError, AttributeError, TypeError):
        return False

    return uuid_obj.hex == uuid_to_test

def scan_contentdb_dir():
    db_list = fnmatch.filter(os.listdir(settings.CONTENT_DB_DIR), '*.sqlite3')
    db_names = [db.split('.sqlite3', 1)[0] for db in db_list]
    return db_names

def sync_channelmetadata():
    """
    Everytime kolibri runs, scan through the settings.CONTENT_DB_DIR folder to collect the names for all ContentDB,
    and use the name to query each ContentDB to get the ChannelMetadata object,
    and use them to update the ChannelMetadata object in the default database to ensure they are insync
    """
    db_names = scan_contentdb_dir()
    # delete channelmetadata obejcts in default db that cannot be found in CONTENT_DB_DIR
    ChannelMetadata.objects.exclude(channel_id__in=db_names).delete()
    # sync the channelmetadata objects in default db with channelmetadata objects in CONTENT_DB_DIR
    for db_name in db_names:
        update_values = ChannelMetadata.objects.using(db_name).values()[0]
        ChannelMetadata.objects.update_or_create(channel_id=db_name, defaults=update_values)
