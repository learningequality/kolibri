from kolibri.utils.time import local_now
from django.conf import settings

from ..content_db_router import using_content_database
from ..models import ChannelMetadata, ChannelMetadataCache
from .channels import get_channel_ids_for_content_database_dir


def update_channel_metadata_cache():
    """
    After a channel is imported, or when the devserver is started,
    scan through the settings.CONTENT_DATABASE_DIR folder for all channel content databases,
    and pull the data from each database's ChannelMetadata object to update the ChannelMetadataCache
    object in the default database to ensure they are in sync.
    """
    db_names = get_channel_ids_for_content_database_dir(settings.CONTENT_DATABASE_DIR)
    # Delete ChannelMetadataCache objects in default db that are not found in CONTENT_DATABASE_DIR
    ChannelMetadataCache.objects.exclude(id__in=db_names).delete()
    # sync the ChannelMetadataCache objects in default db with ChannelMetadata objects in CONTENT_DATABASE_DIR
    for db_name in db_names:
        with using_content_database(db_name):
            update_values = ChannelMetadata.objects.values()[0]

        ch_metadata_obj, _ = ChannelMetadataCache.objects.update_or_create(
            id=db_name,
            defaults=update_values,
        )

        # Records a new last_updated only if channel is brand new. Does not
        # handle case where channel's version is upgraded, which is not
        # yet supported on UI anyway
        if ch_metadata_obj.last_updated is None:
            ch_metadata_obj.last_updated = local_now()
            ch_metadata_obj.save()

    # Fix #1818.1 content database files get locked (this is called on startup)
    from django.db import connections
    connections.close_all()
