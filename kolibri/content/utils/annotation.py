from django.conf import settings

from ..content_db_router import using_content_database
from ..models import ChannelMetadata, ChannelMetadataCache
from .channels import get_channel_ids_for_content_database_dir


def update_channel_metadata_cache():
    """
    Scan through the settings.CONTENT_DATABASE_DIR folder for all channel content databases,
    and pull the data from each database's ChannelMetadata object to update the ChannelMetadataCache
    object in the default database to ensure they are in sync.
    """
    db_names = get_channel_ids_for_content_database_dir(settings.CONTENT_DATABASE_DIR)
    # delete channelmetadata obejcts in default db that cannot be found in CONTENT_DATABASE_DIR
    ChannelMetadataCache.objects.exclude(id__in=db_names).delete()
    # sync the channelmetadata objects in default db with channelmetadata objects in CONTENT_DATABASE_DIR
    for db_name in db_names:
        with using_content_database(db_name):
            update_values = ChannelMetadata.objects.values()[0]
        ChannelMetadataCache.objects.update_or_create(id=db_name, defaults=update_values)
