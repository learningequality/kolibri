import logging

from le_utils.constants import content_kinds
from sqlalchemy import and_
from sqlalchemy import cast
from sqlalchemy import exists
from sqlalchemy import func
from sqlalchemy import Integer
from sqlalchemy import or_
from sqlalchemy import select

from .sqlalchemybridge import Bridge
from .sqlalchemybridge import filter_by_uuids
from kolibri.core.content.apps import KolibriContentConfig
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.content_types_tools import renderable_files_presets
from kolibri.core.content.utils.file_availability import (
    get_available_checksums_from_disk,
)
from kolibri.core.content.utils.file_availability import (
    get_available_checksums_from_remote,
)
from kolibri.core.utils.cache import CrossProcessCache

logger = logging.getLogger(__name__)

CONTENT_APP_NAME = KolibriContentConfig.label


def get_channel_annotation_stats(channel_id, checksums=None):
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    ContentNodeTable = bridge.get_table(ContentNode)
    FileTable = bridge.get_table(File)
    LocalFileTable = bridge.get_table(LocalFile)
    if checksums is not None:
        file_table = FileTable.join(
            LocalFileTable,
            and_(
                FileTable.c.local_file_id == LocalFileTable.c.id,
                or_(
                    # checksums are not uuids and have been got from
                    # get_channel_stats_from_disk, so no need to validate them:
                    filter_by_uuids(LocalFileTable.c.id, checksums, validate=False),
                    LocalFileTable.c.available == True,  # noqa
                ),
            ),
        )
    else:
        file_table = FileTable.join(
            LocalFileTable, FileTable.c.local_file_id == LocalFileTable.c.id
        )

    contentnode_statement = (
        select([FileTable.c.contentnode_id])
        .select_from(file_table)
        .where(FileTable.c.supplementary == False)  # noqa
        .where(
            or_(*(FileTable.c.preset == preset for preset in renderable_files_presets))
        )
        .where(ContentNodeTable.c.id == FileTable.c.contentnode_id)
    )
    connection = bridge.get_connection()

    # start a transaction

    trans = connection.begin()

    connection.execute(
        ContentNodeTable.update()
        .where(
            and_(
                ContentNodeTable.c.kind != content_kinds.TOPIC,
                ContentNodeTable.c.channel_id == channel_id,
            )
        )
        .values(available=exists(contentnode_statement))
    )

    ContentNodeClass = bridge.get_class(ContentNode)

    node_depth = (
        bridge.session.query(func.max(ContentNodeClass.level))
        .filter_by(channel_id=channel_id)
        .scalar()
    )

    child = ContentNodeTable.alias()

    # Update all leaf ContentNodes to have num_coach_content to 1 or 0
    # Update all leaf ContentNodes to have on_device_resources to 1 or 0
    connection.execute(
        ContentNodeTable.update()
        .where(
            and_(
                # In this channel
                ContentNodeTable.c.channel_id == channel_id,
                # That are not topics
                ContentNodeTable.c.kind != content_kinds.TOPIC,
            )
        )
        .values(
            num_coach_contents=cast(ContentNodeTable.c.coach_content, Integer()),
            on_device_resources=cast(ContentNodeTable.c.available, Integer()),
        )
    )

    # Before starting set availability to False on all topics.
    connection.execute(
        ContentNodeTable.update()
        .where(
            and_(
                # In this channel
                ContentNodeTable.c.channel_id == channel_id,
                # That are topics
                ContentNodeTable.c.kind == content_kinds.TOPIC,
            )
        )
        .values(available=False)
    )

    # Expression to capture all available child nodes of a contentnode
    available_nodes = select([child.c.available]).where(
        and_(
            child.c.available == True,  # noqa
            ContentNodeTable.c.id == child.c.parent_id,
        )
    )

    # Expressions for annotation of coach content

    # Expression that will resolve a boolean value for all the available children
    # of a content node, whereby if they all have coach_content flagged on them, it will be true,
    # but otherwise false.
    # Everything after the select statement should be identical to the available_nodes expression above.
    if bridge.engine.name == "sqlite":
        # Use a min function to simulate an AND.
        coach_content_nodes = select([func.min(child.c.coach_content)]).where(
            and_(
                child.c.available == True,  # noqa
                ContentNodeTable.c.id == child.c.parent_id,
            )
        )
    elif bridge.engine.name == "postgresql":
        # Use the postgres boolean AND operator
        coach_content_nodes = select([func.bool_and(child.c.coach_content)]).where(
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

    # Expression that sums the total number of on_device_resources for each child node
    # of a contentnode
    on_device_num = select([func.sum(child.c.on_device_resources)]).where(
        and_(
            child.c.available == True,  # noqa
            ContentNodeTable.c.id == child.c.parent_id,
        )
    )

    stats = {}

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
            .values(
                available=exists(available_nodes),
                coach_content=coach_content_nodes,
                num_coach_contents=coach_content_num,
                on_device_resources=on_device_num,
            )
        )

        level_stats = connection.execute(
            select(
                [
                    ContentNodeTable.c.id,
                    ContentNodeTable.c.coach_content,
                    ContentNodeTable.c.num_coach_contents,
                    ContentNodeTable.c.on_device_resources,
                ]
            ).where(
                and_(
                    ContentNodeTable.c.level == level,
                    ContentNodeTable.c.channel_id == channel_id,
                    ContentNodeTable.c.available == True,  # noqa
                )
            )
        )

        for stat in level_stats:
            stats[stat[0]] = {
                "coach_content": bool(stat[1]),
                "num_coach_contents": stat[2] or 0,
                "total_resources": stat[3] or 0,
            }

    root_node_stats = connection.execute(
        select(
            [
                ContentNodeTable.c.id,
                ContentNodeTable.c.coach_content,
                ContentNodeTable.c.num_coach_contents,
                ContentNodeTable.c.on_device_resources,
            ]
        ).where(
            and_(
                ContentNodeTable.c.level == 0,
                ContentNodeTable.c.channel_id == channel_id,
            )
        )
    ).fetchone()

    stats[root_node_stats[0]] = {
        "coach_content": root_node_stats[1],
        "num_coach_contents": root_node_stats[2],
        "total_resources": root_node_stats[3],
    }

    # rollback the transaction to undo the temporary annotation
    trans.rollback()

    bridge.end()

    return stats


cache = CrossProcessCache(3600)


CHANNEL_STATS_CACHED_KEYS = "CHANNEL_STATS_CACHED_KEYS_{channel_id}"


# Used for tracking which keys are cached for which channel
# we can then clear these when necessary
def register_key_as_cached(key, channel_id):
    cached_keys = cache.get(
        CHANNEL_STATS_CACHED_KEYS.format(channel_id=channel_id), set()
    )
    cached_keys.add(key)
    cache.set(
        CHANNEL_STATS_CACHED_KEYS.format(channel_id=channel_id), cached_keys, None
    )


def get_channel_stats_from_disk(channel_id, drive_id):
    CACHE_KEY = "DISK_CHANNEL_STATS_{drive_id}_{channel_id}".format(
        drive_id=drive_id, channel_id=channel_id
    )
    if CACHE_KEY not in cache:
        checksums = get_available_checksums_from_disk(channel_id, drive_id)
        channel_stats = get_channel_annotation_stats(channel_id, checksums)
        cache.set(CACHE_KEY, channel_stats, 3600)
        register_key_as_cached(CACHE_KEY, channel_id)
    else:
        channel_stats = cache.get(CACHE_KEY)
    return channel_stats


def get_channel_stats_from_peer(channel_id, peer_id):
    CACHE_KEY = "PEER_CHANNEL_STATS_{peer_id}_{channel_id}".format(
        peer_id=peer_id, channel_id=channel_id
    )
    if CACHE_KEY not in cache:
        checksums = get_available_checksums_from_remote(channel_id, peer_id)
        channel_stats = get_channel_annotation_stats(channel_id, checksums)
        cache.set(CACHE_KEY, channel_stats, 3600)
        register_key_as_cached(CACHE_KEY, channel_id)
    else:
        channel_stats = cache.get(CACHE_KEY)
    return channel_stats


def get_channel_stats_from_studio(channel_id):
    CACHE_KEY = "STUDIO_CHANNEL_STATS_{channel_id}".format(channel_id=channel_id)
    if CACHE_KEY not in cache:
        channel_stats = get_channel_annotation_stats(channel_id)
        cache.set(CACHE_KEY, channel_stats, 3600)
        register_key_as_cached(CACHE_KEY, channel_id)
    else:
        channel_stats = cache.get(CACHE_KEY)
    return channel_stats


def clear_channel_stats(channel_id):
    cached_keys = cache.get(
        CHANNEL_STATS_CACHED_KEYS.format(channel_id=channel_id), set()
    )
    for key in cached_keys:
        cache.delete(key)
    cache.set(CHANNEL_STATS_CACHED_KEYS.format(channel_id=channel_id), set(), None)
