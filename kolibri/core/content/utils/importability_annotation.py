import datetime
import json
import logging
import os
import re

import requests
from le_utils.constants import content_kinds
from sqlalchemy import and_
from sqlalchemy import exists
from sqlalchemy import func
from sqlalchemy import select

from .paths import get_content_storage_dir_path
from .paths import get_file_checksums_url
from .sqlalchemybridge import Bridge
from kolibri.core.content.apps import KolibriContentConfig
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile

logger = logging.getLogger(__name__)

CONTENT_APP_NAME = KolibriContentConfig.label

CHUNKSIZE = 10000


def mark_local_files_as_importable(checksums):
    """
    Update database if we are sure that the files are importable.
    Used to set transitory state for particular import scenarios.
    """

    bridge = Bridge(app_name=CONTENT_APP_NAME)
    connection = bridge.get_connection()

    LocalFileTable = bridge.get_table(LocalFile)

    logger.info(
        "Setting importability of {number} LocalFile objects based on passed in checksums".format(
            number=len(checksums)
        )
    )

    connection.execute(
        LocalFileTable.update()
        .where(
            # This seems relatively performant, and was twice as fast as doing the
            # same query but also filtering by channel_id
            LocalFileTable.c.id.in_(checksums)
        )
        .values(importable=True)
        .execution_options(autocommit=True)
    )

    bridge.end()


def set_leaf_node_importability_from_local_file_importability(channel_id):
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    ContentNodeTable = bridge.get_table(ContentNode)
    FileTable = bridge.get_table(File)
    LocalFileTable = bridge.get_table(LocalFile)

    connection = bridge.get_connection()

    file_statement = (
        select([LocalFileTable.c.importable])
        .where(FileTable.c.local_file_id == LocalFileTable.c.id)
        .limit(1)
    )

    logger.info(
        "Setting importability of File objects based on LocalFile importability"
    )

    connection.execute(
        FileTable.update()
        .values(importable=file_statement)
        .execution_options(autocommit=True)
    )

    contentnode_statement = (
        select([FileTable.c.contentnode_id])
        .where(
            and_(
                FileTable.c.importable == True,  # noqa
                FileTable.c.supplementary == False,
            )
        )
        .where(ContentNodeTable.c.id == FileTable.c.contentnode_id)
    )

    logger.info(
        "Setting importability of non-topic ContentNode objects based on File importability"
    )

    connection.execute(
        ContentNodeTable.update()
        .where(
            and_(
                ContentNodeTable.c.kind != content_kinds.TOPIC,
                ContentNodeTable.c.channel_id == channel_id,
            )
        )
        .values(importable=exists(contentnode_statement))
        .execution_options(autocommit=True)
    )

    bridge.end()


def recurse_importability_up_tree(channel_id):
    bridge = Bridge(app_name=CONTENT_APP_NAME)

    ContentNodeClass = bridge.get_class(ContentNode)

    ContentNodeTable = bridge.get_table(ContentNode)

    connection = bridge.get_connection()

    node_depth = bridge.session.query(func.max(ContentNodeClass.level)).scalar()

    logger.info(
        "Setting importability of ContentNode objects with children for {levels} levels".format(
            levels=node_depth
        )
    )

    child = ContentNodeTable.alias()

    # start a transaction

    trans = connection.begin()
    # Go from the deepest level to the shallowest
    start = datetime.datetime.now()
    for level in range(node_depth, 0, -1):

        importable_nodes = select([child.c.importable]).where(
            and_(
                child.c.importable == True,  # noqa
                ContentNodeTable.c.id == child.c.parent_id,
            )
        )

        logger.info(
            "Setting importability of ContentNode objects with children for level {level}".format(
                level=level
            )
        )
        # Only modify topic importability here
        connection.execute(
            ContentNodeTable.update()
            .where(
                and_(
                    ContentNodeTable.c.level == level - 1,
                    ContentNodeTable.c.channel_id == channel_id,
                    ContentNodeTable.c.kind == content_kinds.TOPIC,
                )
            )
            .values(importable=exists(importable_nodes))
        )

    # commit the transaction
    trans.commit()

    elapsed = datetime.datetime.now() - start
    logger.debug("Importability annotation took {} seconds".format(elapsed.seconds))

    bridge.end()


def annotate_importability(channel_id, checksums):
    channel_localfiles = LocalFile.objects.filter(
        files__contentnode__channel_id=channel_id
    )
    if checksums is None:
        # If None just say everything is importable as we have no better info
        channel_localfiles.update(importable=True)
    else:
        # First clear any existing annotation
        channel_localfiles.update(importable=False)
        mark_local_files_as_importable(checksums)
    tree_id = ChannelMetadata.objects.get(id=channel_id).root.tree_id
    ContentNode.objects.filter(tree_id=tree_id).update(importable=False)
    set_leaf_node_importability_from_local_file_importability(channel_id)
    recurse_importability_up_tree(channel_id)


checksum_regex = re.compile("^([a-f0-9]{32})$")


def annotate_importability_from_remote(channel_id, baseurl):
    response = requests.get(get_file_checksums_url(channel_id, baseurl))

    checksums = None

    # Do something if we got a successful return
    if response.status_code == 200:
        try:
            checksums = json.loads(response.content)
            # Filter to avoid passing in bad checksums
            checksums = [
                checksum for checksum in checksums if checksum_regex.match(checksum)
            ]
        except ValueError:
            # Bad JSON parsing will throw ValueError
            # If the result of the json.loads is not iterable, a TypeError will be thrown
            # If we end up here, just set checksums to None to allow us to cleanly continue
            pass
    annotate_importability(channel_id, checksums)


def annotate_importability_from_disk(channel_id, basepath):
    content_dir = get_content_storage_dir_path(datafolder=basepath)

    checksums = []

    for _, _, files in os.walk(content_dir):
        for name in files:
            checksum = os.path.splitext(name)[0]
            # Only add valid checksums formatted according to our standard filename
            if checksum_regex.match(checksum):
                checksums.append(checksum)
    annotate_importability(channel_id, checksums)
