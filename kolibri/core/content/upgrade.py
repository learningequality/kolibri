"""
A file to contain specific logic to handle version upgrades in Kolibri.
"""
import logging
import os

from le_utils.constants import content_kinds
from sqlalchemy import and_
from sqlalchemy import cast
from sqlalchemy import exists
from sqlalchemy import func
from sqlalchemy import Integer
from sqlalchemy import select
from sqlalchemy.exc import DatabaseError

from kolibri.core.content.apps import KolibriContentConfig
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.utils.annotation import set_content_visibility_from_disk
from kolibri.core.content.utils.channel_import import FutureSchemaError
from kolibri.core.content.utils.channel_import import import_channel_from_local_db
from kolibri.core.content.utils.channel_import import InvalidSchemaVersionError
from kolibri.core.content.utils.channels import get_channel_ids_for_content_database_dir
from kolibri.core.content.utils.paths import get_content_database_dir_path
from kolibri.core.content.utils.paths import get_content_database_file_path
from kolibri.core.content.utils.sqlalchemybridge import Bridge
from kolibri.core.upgrade import version_upgrade


logger = logging.getLogger(__name__)


# Only bother doing this if we are moving from
# a version of Kolibri before we imported
# content databases.
@version_upgrade(old_version="<0.6.0")
def import_external_content_dbs():
    """
    If we are potentially moving from a version of Kolibri that did not import its content data,
    scan through the content database folder for all channel content databases,
    and pull the data from each database if we have not already imported it.
    """
    channel_ids = get_channel_ids_for_content_database_dir(
        get_content_database_dir_path()
    )
    for channel_id in channel_ids:
        if not ChannelMetadata.objects.filter(id=channel_id).exists():
            try:
                import_channel_from_local_db(channel_id)
                set_content_visibility_from_disk(channel_id)
            except (InvalidSchemaVersionError, FutureSchemaError):
                logger.warning(
                    "Tried to import channel {channel_id}, but database file was incompatible".format(
                        channel_id=channel_id
                    )
                )
            except DatabaseError:
                logger.warning(
                    "Tried to import channel {channel_id}, but database file was corrupted.".format(
                        channel_id=channel_id
                    )
                )


# This issue was fixed by 0.9.2, so only do this
# when upgrading from versions prior to this.
@version_upgrade(old_version="<0.9.2")
def fix_multiple_trees_with_tree_id1():
    # Do a check for improperly imported ContentNode trees
    # These trees have been naively imported, and so there are multiple trees
    # with tree_ids set to 1. Just check the root nodes to reduce the query size.
    tree_id_one_channel_ids = ContentNode.objects.filter(
        parent=None, tree_id=1
    ).values_list("channel_id", flat=True)
    if len(tree_id_one_channel_ids) > 1:
        logger.warning("Improperly imported channels discovered")
        # There is more than one channel with a tree_id of 1
        # Find which channel has the most content nodes, and then delete and reimport the rest.
        channel_sizes = {}
        for channel_id in tree_id_one_channel_ids:
            channel_sizes[channel_id] = ContentNode.objects.filter(
                channel_id=channel_id
            ).count()
        # Get sorted list of ids by increasing number of nodes
        sorted_channel_ids = sorted(channel_sizes, key=channel_sizes.get)
        # Loop through all but the largest channel, delete and reimport
        count = 0

        for channel_id in sorted_channel_ids[:-1]:
            # Double check that we have a content db to import from before deleting any metadata
            if os.path.exists(get_content_database_file_path(channel_id)):
                logger.warning(
                    "Deleting and reimporting channel metadata for {channel_id}".format(
                        channel_id=channel_id
                    )
                )
                ChannelMetadata.objects.get(
                    id=channel_id
                ).delete_content_tree_and_files()
                import_channel_from_local_db(channel_id)
                logger.info(
                    "Successfully reimported channel metadata for {channel_id}".format(
                        channel_id=channel_id
                    )
                )
                count += 1
            else:
                logger.warning(
                    "Attempted to reimport channel metadata for channel {channel_id} but no content database found".format(
                        channel_id=channel_id
                    )
                )
        if count:
            logger.info(
                "Successfully reimported channel metadata for {count} channels".format(
                    count=count
                )
            )
        failed_count = len(sorted_channel_ids) - 1 - count
        if failed_count:
            logger.warning(
                "Failed to reimport channel metadata for {count} channels".format(
                    count=failed_count
                )
            )


# This was introduced in 0.12.4, so only annotate
# when upgrading from versions prior to this.
@version_upgrade(old_version="<0.12.4")
def update_num_coach_contents():
    """
    Function to set num_coach_content on all topic trees to account for
    those that were imported before annotations were performed
    """
    bridge = Bridge(app_name=KolibriContentConfig.label)

    ContentNodeClass = bridge.get_class(ContentNode)

    ContentNodeTable = bridge.get_table(ContentNode)

    connection = bridge.get_connection()

    child = ContentNodeTable.alias()

    logger.info("Updating num_coach_content on existing channels")

    # start a transaction

    trans = connection.begin()

    # Update all leaf ContentNodes to have num_coach_content to 1 or 0
    connection.execute(
        ContentNodeTable.update()
        .where(
            # That are not topics
            ContentNodeTable.c.kind
            != content_kinds.TOPIC
        )
        .values(num_coach_contents=cast(ContentNodeTable.c.coach_content, Integer()))
    )

    # Expression to capture all available child nodes of a contentnode
    available_nodes = select([child.c.available]).where(
        and_(
            child.c.available == True,  # noqa
            ContentNodeTable.c.id == child.c.parent_id,
        )
    )

    # Expression that sums the total number of coach contents for each child node
    # of a contentnode
    coach_content_num = select([func.sum(child.c.num_coach_contents)]).where(
        and_(
            child.c.available == True,  # noqa
            ContentNodeTable.c.id == child.c.parent_id,
        )
    )

    for channel_id in ChannelMetadata.objects.all().values_list("id", flat=True):

        node_depth = (
            bridge.session.query(func.max(ContentNodeClass.level))
            .filter_by(channel_id=channel_id)
            .scalar()
        )

        # Go from the deepest level to the shallowest
        for level in range(node_depth, 0, -1):

            # Only modify topic availability here
            connection.execute(
                ContentNodeTable.update()
                .where(
                    and_(
                        ContentNodeTable.c.level == level - 1,
                        ContentNodeTable.c.channel_id == channel_id,
                        ContentNodeTable.c.kind == content_kinds.TOPIC,
                    )
                )
                # Because we have set availability to False on all topics as a starting point
                # we only need to make updates to topics with available children.
                .where(exists(available_nodes))
                .values(num_coach_contents=coach_content_num)
            )

    # commit the transaction
    trans.commit()

    bridge.end()


# This was introduced in 0.13.0, so only annotate
# when upgrading from versions prior to this.
@version_upgrade(old_version="<0.13.0")
def update_on_device_resources():
    """
    Function to set on_device_resource on all topic trees to account for
    those that were imported before annotations were performed
    """
    bridge = Bridge(app_name=KolibriContentConfig.label)

    ContentNodeClass = bridge.get_class(ContentNode)

    ContentNodeTable = bridge.get_table(ContentNode)

    connection = bridge.get_connection()

    child = ContentNodeTable.alias()

    logger.info("Updating on_device_resource on existing channels")

    # start a transaction

    trans = connection.begin()

    # Update all leaf ContentNodes to have on_device_resource to 1 or 0
    connection.execute(
        ContentNodeTable.update()
        .where(
            # That are not topics
            ContentNodeTable.c.kind
            != content_kinds.TOPIC
        )
        .values(on_device_resources=cast(ContentNodeTable.c.available, Integer()))
    )

    # Expression to capture all available child nodes of a contentnode
    available_nodes = select([child.c.available]).where(
        and_(
            child.c.available == True,  # noqa
            ContentNodeTable.c.id == child.c.parent_id,
        )
    )

    # Expression that sums the total number of coach contents for each child node
    # of a contentnode
    on_device_num = select([func.sum(child.c.on_device_resources)]).where(
        and_(
            child.c.available == True,  # noqa
            ContentNodeTable.c.id == child.c.parent_id,
        )
    )

    for channel_id in ChannelMetadata.objects.all().values_list("id", flat=True):

        node_depth = (
            bridge.session.query(func.max(ContentNodeClass.level))
            .filter_by(channel_id=channel_id)
            .scalar()
        )

        # Go from the deepest level to the shallowest
        for level in range(node_depth, 0, -1):

            # Only modify topic availability here
            connection.execute(
                ContentNodeTable.update()
                .where(
                    and_(
                        ContentNodeTable.c.level == level - 1,
                        ContentNodeTable.c.channel_id == channel_id,
                        ContentNodeTable.c.kind == content_kinds.TOPIC,
                    )
                )
                # Because we have set availability to False on all topics as a starting point
                # we only need to make updates to topics with available children.
                .where(exists(available_nodes))
                .values(on_device_resources=on_device_num)
            )

    # commit the transaction
    trans.commit()

    bridge.end()
