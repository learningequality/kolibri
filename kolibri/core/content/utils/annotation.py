import datetime
import logging
import os

from django.db import connection
from le_utils.constants import content_kinds
from sqlalchemy import and_
from sqlalchemy import exists
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.exc import DatabaseError

from .channels import get_channel_ids_for_content_database_dir
from .paths import get_content_database_file_path
from .paths import get_content_file_name
from .paths import get_content_storage_file_path
from .sqlalchemybridge import Bridge
from kolibri.core.content.apps import KolibriContentConfig
from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.serializers import _files_for_nodes
from kolibri.core.content.serializers import _total_file_size
from kolibri.core.content.utils.paths import get_content_database_dir_path
from kolibri.core.device.models import ContentCacheKey

logger = logging.getLogger(__name__)

CONTENT_APP_NAME = KolibriContentConfig.label

CHUNKSIZE = 10000


def update_channel_metadata():
    """
    If we are potentially moving from a version of Kolibri that did not import its content data,
    scan through the content database folder for all channel content databases,
    and pull the data from each database if we have not already imported it.
    Additionally, fix any potential issues that might be in the current content database from bugs
    in a previous version.
    """
    from .channel_import import import_channel_from_local_db, InvalidSchemaVersionError, FutureSchemaError
    channel_ids = get_channel_ids_for_content_database_dir(get_content_database_dir_path())
    for channel_id in channel_ids:
        if not ChannelMetadata.objects.filter(id=channel_id).exists():
            try:
                import_channel_from_local_db(channel_id)
                annotate_content(channel_id)
            except (InvalidSchemaVersionError, FutureSchemaError):
                logger.warning("Tried to import channel {channel_id}, but database file was incompatible".format(channel_id=channel_id))
            except DatabaseError:
                logger.warning("Tried to import channel {channel_id}, but database file was corrupted.".format(channel_id=channel_id))
    fix_multiple_trees_with_id_one()
    connection.close()


def fix_multiple_trees_with_id_one():
    # Do a check for improperly imported ContentNode trees
    # These trees have been naively imported, and so there are multiple trees
    # with tree_ids set to 1. Just check the root nodes to reduce the query size.
    tree_id_one_channel_ids = ContentNode.objects.filter(parent=None, tree_id=1).values_list('channel_id', flat=True)
    if len(tree_id_one_channel_ids) > 1:
        logger.warning("Improperly imported channels discovered")
        # There is more than one channel with a tree_id of 1
        # Find which channel has the most content nodes, and then delete and reimport the rest.
        channel_sizes = {}
        for channel_id in tree_id_one_channel_ids:
            channel_sizes[channel_id] = ContentNode.objects.filter(channel_id=channel_id).count()
        # Get sorted list of ids by increasing number of nodes
        sorted_channel_ids = sorted(channel_sizes, key=channel_sizes.get)
        # Loop through all but the largest channel, delete and reimport
        count = 0
        from .channel_import import import_channel_from_local_db
        for channel_id in sorted_channel_ids[:-1]:
            # Double check that we have a content db to import from before deleting any metadata
            if os.path.exists(get_content_database_file_path(channel_id)):
                logger.warning("Deleting and reimporting channel metadata for {channel_id}".format(channel_id=channel_id))
                ChannelMetadata.objects.get(id=channel_id).delete_content_tree_and_files()
                import_channel_from_local_db(channel_id)
                logger.info("Successfully reimported channel metadata for {channel_id}".format(channel_id=channel_id))
                count += 1
            else:
                logger.warning("Attempted to reimport channel metadata for channel {channel_id} but no content database found".format(channel_id=channel_id))
        if count:
            logger.info("Successfully reimported channel metadata for {count} channels".format(count=count))
        failed_count = len(sorted_channel_ids) - 1 - count
        if failed_count:
            logger.warning("Failed to reimport channel metadata for {count} channels".format(count=failed_count))


def set_leaf_node_availability_from_local_file_availability(channel_id):
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    ContentNodeTable = bridge.get_table(ContentNode)
    FileTable = bridge.get_table(File)
    LocalFileTable = bridge.get_table(LocalFile)

    connection = bridge.get_connection()

    file_statement = select([LocalFileTable.c.available]).where(
        FileTable.c.local_file_id == LocalFileTable.c.id,
    ).limit(1)

    logger.info('Setting availability of File objects based on LocalFile availability')

    connection.execute(FileTable.update().values(available=file_statement).execution_options(autocommit=True))

    contentnode_statement = select([FileTable.c.contentnode_id]
    ).where(
        and_(
            FileTable.c.available == True,  # noqa
            FileTable.c.supplementary == False
        )
    ).where(
        ContentNodeTable.c.id == FileTable.c.contentnode_id,
    )

    logger.info('Setting availability of non-topic ContentNode objects based on File availability')

    connection.execute(ContentNodeTable.update().where(
        and_(
            ContentNodeTable.c.kind != content_kinds.TOPIC,
            ContentNodeTable.c.channel_id == channel_id,
        )
    ).values(available=exists(contentnode_statement)).execution_options(autocommit=True))

    bridge.end()


def mark_local_files_as_available(checksums):
    """
    Shortcut method to update database if we are sure that the files are available.
    Can be used after successful downloads to flag availability without having to do expensive disk reads.
    """
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    LocalFileClass = bridge.get_class(LocalFile)

    logger.info('Setting availability of {number} LocalFile objects based on passed in checksums'.format(number=len(checksums)))

    for i in range(0, len(checksums), CHUNKSIZE):
        bridge.session.bulk_update_mappings(LocalFileClass, ({
            'id': checksum,
            'available': True
        } for checksum in checksums[i:i + CHUNKSIZE]))
        bridge.session.flush()

    bridge.session.commit()

    bridge.end()


def set_local_file_availability_from_disk(checksums=None):
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    LocalFileClass = bridge.get_class(LocalFile)

    if checksums is None:
        logger.info('Setting availability of LocalFile objects based on disk availability')
        files = bridge.session.query(LocalFileClass.id, LocalFileClass.available, LocalFileClass.extension).all()
    elif type(checksums) == list:
        logger.info('Setting availability of {number} LocalFile objects based on disk availability'.format(number=len(checksums)))
        files = bridge.session.query(LocalFileClass.id, LocalFileClass.available, LocalFileClass.extension).filter(LocalFileClass.id.in_(checksums)).all()
    else:
        logger.info('Setting availability of LocalFile object with checksum {checksum} based on disk availability'.format(checksum=checksums))
        files = [bridge.session.query(LocalFileClass).get(checksums)]

    checksums_to_update = []
    for file in files:
        try:
            # Only update if the file exists, *and* the localfile is set as unavailable.
            if os.path.exists(get_content_storage_file_path(get_content_file_name(file))) and not file.available:
                checksums_to_update.append(file.id)
        except InvalidStorageFilenameError:
            continue

    bridge.end()

    mark_local_files_as_available(checksums_to_update)


def recurse_availability_up_tree(channel_id):
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    ContentNodeClass = bridge.get_class(ContentNode)

    ContentNodeTable = bridge.get_table(ContentNode)

    connection = bridge.get_connection()

    node_depth = bridge.session.query(func.max(ContentNodeClass.level)).scalar()

    logger.info('Setting availability of ContentNode objects with children for {levels} levels'.format(levels=node_depth))

    child = ContentNodeTable.alias()

    # start a transaction

    trans = connection.begin()
    # Go from the deepest level to the shallowest
    start = datetime.datetime.now()
    for level in range(node_depth, 0, -1):

        available_nodes = select([child.c.available]).where(
            and_(
                child.c.available == True,  # noqa
                ContentNodeTable.c.id == child.c.parent_id
            )
        )

        logger.info('Setting availability of ContentNode objects with children for level {level}'.format(level=level))
        # Only modify topic availability here
        connection.execute(ContentNodeTable.update().where(
            and_(
                ContentNodeTable.c.level == level - 1,
                ContentNodeTable.c.channel_id == channel_id,
                ContentNodeTable.c.kind == content_kinds.TOPIC)).values(available=exists(available_nodes)))

    # commit the transaction
    trans.commit()

    elapsed = (datetime.datetime.now() - start)
    logger.debug("Availability annotation took {} seconds".format(elapsed.seconds))

    bridge.end()


def topic_coach_content_annotation(channel_id):
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    ContentNodeClass = bridge.get_class(ContentNode)

    ContentNodeTable = bridge.get_table(ContentNode)

    connection = bridge.get_connection()

    node_depth = bridge.session.query(func.max(ContentNodeClass.level)).scalar()

    logger.info('Setting totals of coach content ContentNode objects with children for {levels} levels'.format(levels=node_depth))

    child = ContentNodeTable.alias()

    # start a transaction

    trans = connection.begin()
    # Go from the deepest level to the shallowest
    start = datetime.datetime.now()
    for level in range(node_depth, 0, -1):

        available_nodes = select([child.c.available]).where(
            and_(
                child.c.available == True,  # noqa
                ContentNodeTable.c.id == child.c.parent_id
            )
        )

        # Create an expression that will resolve a boolean value for all the available children
        # of a content node, whereby if they all have coach_content flagged on them, it will be true,
        # but otherwise false.
        # Everything after the select statement should be identical to the available_nodes expression above.
        if bridge.engine.name == 'sqlite':
            coach_content_nodes = select([func.min(child.c.coach_content)]).where(
                and_(
                    child.c.available == True,  # noqa
                    ContentNodeTable.c.id == child.c.parent_id
                )
            )
        elif bridge.engine.name == 'postgresql':
            coach_content_nodes = select([func.bool_and(child.c.coach_content)]).where(
                and_(
                    child.c.available == True,  # noqa
                    ContentNodeTable.c.id == child.c.parent_id
                )
            )

        logger.info('Setting totals of coach content ContentNode objects with children for level {level}'.format(level=level))

        # Update all ContentNodes
        connection.execute(ContentNodeTable.update().where(
            and_(
                # In this level
                ContentNodeTable.c.level == level - 1,
                # In this channel
                ContentNodeTable.c.channel_id == channel_id,
                # That are topics, and that have children that are flagged as available, with the coach content expression above
                ContentNodeTable.c.kind == content_kinds.TOPIC)).where(exists(available_nodes)).values(coach_content=coach_content_nodes))

    # commit the transaction
    trans.commit()

    elapsed = (datetime.datetime.now() - start)
    logger.debug("Topic coach content annotation took {} seconds".format(elapsed.seconds))

    bridge.end()


def update_content_metadata(channel_id):
    set_leaf_node_availability_from_local_file_availability(channel_id)
    recurse_availability_up_tree(channel_id)
    topic_coach_content_annotation(channel_id)
    calculate_channel_fields(channel_id)
    ContentCacheKey.update_cache_key()


def annotate_content(channel_id, checksums=None):
    if checksums is None:
        set_local_file_availability_from_disk()
    else:
        mark_local_files_as_available(checksums)

    update_content_metadata(channel_id)


def calculate_channel_fields(channel_id):
    channel = ChannelMetadata.objects.get(id=channel_id)
    calculate_published_size(channel)
    calculate_total_resource_count(channel)
    calculate_included_languages(channel)
    calculate_next_order(channel)


def calculate_published_size(channel):
    content_nodes = ContentNode.objects.filter(channel_id=channel.id)
    channel.published_size = _total_file_size(_files_for_nodes(content_nodes).filter(available=True))
    channel.save()


def calculate_total_resource_count(channel):
    content_nodes = ContentNode.objects.filter(channel_id=channel.id)
    channel.total_resource_count = content_nodes.filter(available=True).exclude(kind=content_kinds.TOPIC).dedupe_by_content_id().count()
    channel.save()


def calculate_included_languages(channel):
    content_nodes = ContentNode.objects.filter(channel_id=channel.id, available=True).exclude(lang=None)
    languages = content_nodes.order_by('lang').values_list('lang', flat=True).distinct()
    channel.included_languages.add(*list(languages))


def calculate_next_order(channel):
    latest_order = ChannelMetadata.objects.latest('order').order
    if latest_order is None:
        channel.order = 1
    else:
        channel.order = latest_order + 1
    channel.save()
