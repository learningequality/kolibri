import datetime
import logging as logger
import os

from django.conf import settings
from kolibri.content.apps import KolibriContentConfig
from kolibri.content.models import ChannelMetadata, ContentNode, File, LocalFile
from le_utils.constants import content_kinds
from sqlalchemy import and_, exists, func, select

from .channels import get_channel_ids_for_content_database_dir
from .paths import get_content_file_name, get_content_storage_file_path
from .sqlalchemybridge import Bridge

logging = logger.getLogger(__name__)

CONTENT_APP_NAME = KolibriContentConfig.label

CHUNKSIZE = 10000

def update_channel_metadata():
    """
    If we are potentially moving from a version of Kolibri that did not import its content data,
    scan through the settings.CONTENT_DATABASE_DIR folder for all channel content databases,
    and pull the data from each database if we have not already imported it.
    """
    from .channel_import import import_channel_from_local_db
    channel_ids = get_channel_ids_for_content_database_dir(settings.CONTENT_DATABASE_DIR)
    for channel_id in channel_ids:
        if not ChannelMetadata.objects.filter(id=channel_id).exists():
            import_channel_from_local_db(channel_id)
            set_availability(channel_id)


def set_leaf_node_availability_from_local_file_availability():
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    ContentNodeTable = bridge.get_table(ContentNode)
    FileTable = bridge.get_table(File)
    LocalFileTable = bridge.get_table(LocalFile)

    connection = bridge.get_connection()

    file_statement = select([LocalFileTable.c.available]).where(
        FileTable.c.local_file_id == LocalFileTable.c.id,
    ).limit(1)

    logging.info('Setting availability of File objects based on LocalFile availability')

    connection.execute(FileTable.update().values(available=file_statement).execution_options(autocommit=True))

    contentnode_statement = select([FileTable.c.contentnode_id]).where(
        and_(
            FileTable.c.available == True,  # noqa
            FileTable.c.supplementary == False
        )
    ).where(ContentNodeTable.c.id == FileTable.c.contentnode_id)

    logging.info('Setting availability of non-topic ContentNode objects based on File availability')

    connection.execute(ContentNodeTable.update().where(
        ContentNodeTable.c.kind != content_kinds.TOPIC).values(available=exists(contentnode_statement)).execution_options(autocommit=True))

    bridge.end()

def mark_local_files_as_available(checksums):
    """
    Shortcut method to update database if we are sure that the files are available.
    Can be used after successful downloads to flag availability without having to do expensive disk reads.
    """
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    LocalFileClass = bridge.get_class(LocalFile)

    logging.info('Setting availability of {number} LocalFile objects based on passed in checksums'.format(number=len(checksums)))

    for i in range(0, len(checksums), CHUNKSIZE):
        bridge.session.bulk_update_mappings(LocalFileClass, ({
            'id': checksum,
            'available': True
        } for checksum in checksums[i:i+CHUNKSIZE]))
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

    checksums_to_update = [
        file.id for file in files if os.path.exists(get_content_storage_file_path(get_content_file_name(file)))
    ]

    bridge.end()

    mark_local_files_as_available(checksums_to_update)

def recurse_availability_up_tree(channel_id):
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    ContentNodeClass = bridge.get_class(ContentNode)

    ContentNodeTable = bridge.get_table(ContentNode)

    connection = bridge.get_connection()

    node_depth = bridge.session.query(func.max(ContentNodeClass.level)).scalar()

    logging.info('Setting availability of ContentNode objects with children for {levels} levels'.format(levels=node_depth))

    child = ContentNodeTable.alias()

    # start a transaction

    trans = connection.begin()
    # Go from the deepest level to the shallowest
    start = datetime.datetime.now()
    for level in range(node_depth, 0, -1):

        available_nodes = select([child.c.available]).where(
            and_(
                child.c.available == True,  # noqa
                child.c.level == level,
                child.c.channel_id == channel_id,
            )
        ).where(ContentNodeTable.c.id == child.c.parent_id)

        logging.info('Setting availability of ContentNode objects with children for level {level}'.format(level=level))
        # Only modify topic availability here
        connection.execute(ContentNodeTable.update().where(
            and_(
                ContentNodeTable.c.level == level - 1,
                ContentNodeTable.c.channel_id == channel_id,
                ContentNodeTable.c.kind == content_kinds.TOPIC)).values(available=exists(available_nodes)))

    # commit the transaction
    trans.commit()

    elapsed = (datetime.datetime.now() - start)
    logging.debug("Availability annotation took {} seconds".format(elapsed.seconds))

    bridge.end()

def set_availability(channel_id, checksums=None):
    if checksums is None:
        set_local_file_availability_from_disk()
    else:
        mark_local_files_as_available(checksums)

    set_leaf_node_availability_from_local_file_availability()
    recurse_availability_up_tree(channel_id)
