from django.conf import settings

from .channels import get_channel_ids_for_content_database_dir


def update_channel_metadata_cache():
    """
    After a channel is imported, or when the devserver is started,
    scan through the settings.CONTENT_DATABASE_DIR folder for all channel content databases,
    and pull the data from each database's ChannelMetadata object to update the ChannelMetadataCache
    object in the default database to ensure they are in sync.
    """
    db_names = get_channel_ids_for_content_database_dir(settings.CONTENT_DATABASE_DIR)
    return db_names
