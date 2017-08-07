import logging as logger
import math
import os

from django.conf import settings
from kolibri.content.apps import KolibriContentConfig
from kolibri.content.models import ChannelMetadata, ContentNode, File, LocalFile
from sqlalchemy import and_, select

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

def set_leaf_node_availability_from_local_file_availability():
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    ContentNodeTable = bridge.get_table(ContentNode)
    FileTable = bridge.get_table(File)
    LocalFileTable = bridge.get_table(LocalFile)

    connection = bridge.get_connection()

    file_statement = select([LocalFileTable.c.available]).where(
        and_(
            FileTable.c.local_file_id == LocalFileTable.c.id,
        )
    ).limit(1)

    logging.info('Setting availability of File objects based on LocalFile availability')

    connection.execute(FileTable.update().values(available=file_statement).execution_options(autocommit=True))

    contentnode_statement = select([FileTable.c.contentnode_id]).where(
        and_(
            FileTable.c.available == True,  # noqa
            FileTable.c.supplementary == False
        )
    )

    logging.info('Setting availability of non-topic ContentNode objects based on File availability')

    connection.execute(ContentNodeTable.update().where(
        ContentNodeTable.c.id.in_(contentnode_statement)).values(available=True).execution_options(autocommit=True))

    bridge.end()

def set_local_file_availability(checksums):
    """
    Shortcut method to update database if we are sure that the files are available.
    Can be used after successful downloads to flag availability without having to do expensive disk reads.
    """
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    LocalFileClass = bridge.get_class(LocalFile)

    logging.info('Setting availability of {number} LocalFile objects based on passed in checksums'.format(number=len(checksums)))

    for i in range(1, int(math.ceil(len(checksums)/10000.0)) + 1):
        bridge.session.bulk_update_mappings(LocalFileClass, ({
            'id': checksum,
            'available': True
        } for checksum in checksums[0:i*10000]))
        bridge.session.flush()

    bridge.session.commit()

    bridge.end()

def set_local_file_availability_from_disk(checksums=None):
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    LocalFileClass = bridge.get_class(LocalFile)

    if checksums is None:
        logging.info('Setting availability of LocalFile objects based on disk availability')
        files = bridge.session.query(LocalFileClass).all()
    elif type(checksums) == list:
        logging.info('Setting availability of {number} LocalFile objects based on disk availability'.format(number=len(checksums)))
        files = bridge.session.query(LocalFileClass).filter(LocalFileClass.id.in_(checksums)).all()
    else:
        logging.info('Setting availability of LocalFile object with checksum {checksum} based on disk availability'.format(checksum=checksums))
        files = [bridge.session.query(LocalFileClass).get(checksums)]

    rows_unflushed = 0
    files_to_update = []
    for file in files:
        if os.path.exists(get_content_storage_file_path(get_content_file_name(file))):
            files_to_update.append({
                'id': file.id,
                'available': True,
            })
            rows_unflushed += 1
        if rows_unflushed == 10000:
            bridge.session.bulk_update_mappings(LocalFileClass, files_to_update)
            bridge.session.flush()
            files_to_update = []
            rows_unflushed = 0

    if files_to_update:
        bridge.session.bulk_update_mappings(LocalFileClass, files_to_update)

    bridge.session.commit()

    bridge.end()

def recurse_availability_up_tree():
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    ContentNodeClass = bridge.get_class(ContentNode)

    ContentNodeTable = bridge.get_table(ContentNode)

    connection = bridge.get_connection()

    node_levels = bridge.session.query(ContentNodeClass.level).distinct().all()

    # We can ignore the top level, as we annotate based on the level below
    levels = sorted([level[0] for level in node_levels])[1:]

    logging.info('Setting availability of ContentNode objects with children for {levels} levels'.format(levels=len(levels)))

    # Go from the deepest level to the shallowest
    for level in reversed(levels):
        select_parents_of_available = select([ContentNodeTable.c.parent_id]).where(
            and_(
                ContentNodeTable.c.available == True,  # noqa
                ContentNodeTable.c.level == level,
            )
        )
        logging.info('Setting availability of ContentNode objects with children for level {level}'.format(level=level))
        connection.execute(ContentNodeTable.update().where(
            ContentNodeTable.c.id.in_(select_parents_of_available)).values(available=True).execution_options(autocommit=True))

    bridge.end()
