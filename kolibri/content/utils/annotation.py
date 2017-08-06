import logging as logger
import os

from django.conf import settings
from kolibri.content.apps import KolibriContentConfig
from kolibri.content.models import ChannelMetadata, ContentNode, File, LocalFile
from le_utils.constants import content_kinds

from .channels import get_channel_ids_for_content_database_dir
from .paths import get_content_file_name, get_content_storage_file_path
from .sqlalchemybridge import Bridge

logging = logger.getLogger(__name__)

CONTENT_APP_NAME = KolibriContentConfig.label

def update_channel_metadata_cache():
    """
    If we are potentially moving from a version of Kolibri that did not import its content data,
    scan through the settings.CONTENT_DATABASE_DIR folder for all channel content databases,
    and pull the data from each database's ChannelMetadata object to update the ChannelMetadataCache
    object in the default database to ensure they are in sync.
    """
    from .channel_import import import_channel_from_local_db
    channel_ids = get_channel_ids_for_content_database_dir(settings.CONTENT_DATABASE_DIR)
    for channel_id in channel_ids:
        if not ChannelMetadata.objects.filter(id=channel_id).exists():
            import_channel_from_local_db(channel_id)

def set_leaf_node_availability_from_local_file_availability(channel_id):
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    ContentNodeClass = bridge.get_class(ContentNode)
    FileClass = bridge.get_class(File)

    for file in bridge.session.query(FileClass).join(FileClass.content_contentnode).filter(
            ContentNodeClass.channel_id == channel_id).join(FileClass.content_localfile).all():
        file.available = file.content_localfile.available

    for contentnode in bridge.session.query(ContentNodeClass).filter_by(channel_id=channel_id).all():
        if contentnode.kind != content_kinds.TOPIC:
            contentnode.available = any([file.available for file in contentnode.content_file_collection if not file.supplementary])

    bridge.session.commit()

    bridge.end()

def set_local_file_availability_from_disk(checksums=None):
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    LocalFileClass = bridge.get_class(LocalFile)

    if checksums is None:
        files = bridge.session.query(LocalFileClass).all()
    elif type(checksums) == list:
        files = bridge.session.query(LocalFileClass).filter(LocalFileClass.id.in_(checksums)).all()
    else:
        files = [bridge.session.query(LocalFileClass).get(checksums)]

    for file in files:
        file.available = os.path.exists(get_content_storage_file_path(get_content_file_name(file)))

    bridge.session.commit()

    bridge.end()

def recurse_availability_up_tree(channel_id):
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    ContentNodeClass = bridge.get_class(ContentNode)

    node_levels = bridge.session.query(ContentNodeClass.level).filter_by(channel_id=channel_id).distinct().all()

    # We can ignore the deepest level, as either leaves or an empty topic
    levels = sorted([level[0] for level in node_levels])[:-1]

    # Go from the deepest level to the shallowest
    for level in reversed(levels):
        # Only do aggregate availability stamping on topics
        for contentnode in bridge.session.query(ContentNodeClass).filter_by(channel_id=channel_id, level=level, kind=content_kinds.TOPIC).all():
            contentnode.available = any(node.available for node in contentnode.content_contentnode_collection)

    bridge.session.commit()

    bridge.end()
