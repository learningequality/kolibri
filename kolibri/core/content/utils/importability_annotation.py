"""
The functions in this file are for setting somewhat transitory state in the content database
that is used during the content import process - the starting point for annotation is the
concept of 'importability' - the implementation here is differently defined from an
historic use of 'importable' heretofore used, previously 'importable' signified only
that the particular file in question was available to be imported (it was either assumed
to be the case in the case of any remote import - or if the file was present on disk when
importing from USB or an external hard drive).

Henceforth, 'importable' is better understood in a more contextual light, relative to the
current import operation that is being enacted by the user. Importable means precisely:
A file is importable if and only if it exists to be imported on the remote server or external
drive from which importing is taking place, and also if it is not currently available on the
local server into which we are importing the content.

This AND condition is an important change, that also simplifies how we calculate the amount
of space that potentially imported content will use, as we can treat 'available'
and 'importable' as mutually exclusive categories (but not simple boolean inverses, as there
can still be content that is neither currently available nor importable.)
"""
import datetime
import json
import logging
import os
import re

import requests
from django.core.cache import cache
from django.db.models import Sum
from le_utils.constants import content_kinds
from sqlalchemy import and_
from sqlalchemy import exists
from sqlalchemy import func
from sqlalchemy import select

from .annotation import _files_for_nodes
from .annotation import _total_file_size
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
            and_(
                # This seems relatively performant, and was twice as fast as doing the
                # same query but also filtering by channel_id
                LocalFileTable.c.id.in_(checksums),
                LocalFileTable.c.available == False,  # noqa
            )
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

    contentnode_file_size_statement = (
        select([func.sum(LocalFileTable.c.file_size)])
        .select_from(FileTable.join(LocalFileTable))
        .where(
            and_(
                FileTable.c.importable == True,  # noqa
            )
        )
        .where(ContentNodeTable.c.id == FileTable.c.contentnode_id)
    )

    logger.info(
        "Setting importability of ContentNode objects based on File importability"
    )

    # Update all importability attributes on leaf (non-topic) nodes.
    connection.execute(
        ContentNodeTable.update()
        .where(
            and_(
                ContentNodeTable.c.kind != content_kinds.TOPIC,
                ContentNodeTable.c.channel_id == channel_id,
            )
        )
        .values(
            importable=exists(contentnode_statement),
            importable_resources=exists(contentnode_statement),
            importable_file_size=contentnode_file_size_statement,
        )
        .execution_options(autocommit=True)
    )

    # Update importable file_size attribute on topic nodes.
    # This will capture file size for files associated with the
    # topics themselves, which can then be used as a base for addition
    # of descendant file sizes in the recursive annotation step.
    connection.execute(
        ContentNodeTable.update()
        .where(
            and_(
                ContentNodeTable.c.kind == content_kinds.TOPIC,
                ContentNodeTable.c.channel_id == channel_id,
            )
        )
        .values(
            importable_file_size=contentnode_file_size_statement,
        )
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
    start = datetime.datetime.now()

    # Update all leaf ContentNodes to have importable_coach_content to 1 or 0
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
        .values(importable_coach_contents=ContentNodeTable.c.coach_content)
    )

    # Before starting set importability to False on all topics.
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
        .values(importable=False)
    )

    # Go from the deepest level to the shallowest
    for level in range(node_depth, 0, -1):

        importable_nodes = select([child.c.importable]).where(
            and_(
                child.c.importable == True,  # noqa
                ContentNodeTable.c.id == child.c.parent_id,
            )
        )

        node_resources = select([func.sum(child.c.importable_resources)]).where(
            and_(
                child.c.importable == True,  # noqa
                ContentNodeTable.c.id == child.c.parent_id,
            )
        )

        node_file_size = select([func.sum(child.c.importable_file_size)]).where(
            and_(
                child.c.importable == True,  # noqa
                ContentNodeTable.c.id == child.c.parent_id,
            )
        )

        # Expression that sums the total number of importable coach contents for each child node
        # of a contentnode
        coach_content_num = select([func.sum(child.c.importable_coach_contents)]).where(
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
            # Because we have set importability to False on all topics as a starting point
            # we only need to make updates to topics with importable children.
            .where(exists(importable_nodes))
            .values(
                importable=exists(importable_nodes),
                importable_resources=node_resources,
                importable_file_size=ContentNodeTable.c.importable_file_size + node_file_size,
                importable_coach_contents=coach_content_num,
            )
        )

    # commit the transaction
    trans.commit()

    elapsed = datetime.datetime.now() - start
    logger.debug("Importability annotation took {} seconds".format(elapsed.seconds))

    bridge.end()


def calculate_importable_file_size(channel):
    content_nodes = ContentNode.objects.filter(channel_id=channel.id)
    channel.importable_file_size = _total_file_size(
        _files_for_nodes(content_nodes).filter(importable=True)
    )


def calculate_importable_resource_count(channel):
    content_nodes = ContentNode.objects.filter(channel_id=channel.id)
    channel.importable_resources = (
        content_nodes.filter(importable=True)
        .exclude(kind=content_kinds.TOPIC)
        .dedupe_by_content_id()
        .count()
    )


def calculate_importable_duplication_index(channel):
    content_nodes = ContentNode.objects.filter(channel_id=channel.id)
    duped_resource_count = content_nodes.filter(importable=True).exclude(kind=content_kinds.TOPIC).count()
    try:
        channel.importable_resource_duplication = duped_resource_count / float(channel.importable_resources)
    except ZeroDivisionError:
        channel.importable_resource_duplication = 1
    duped_file_size = LocalFile.objects.filter(files__contentnode__in=content_nodes).aggregate(Sum("file_size"))["file_size__sum"] or 0
    try:
        channel.importable_file_duplication = duped_file_size / float(channel.importable_file_size)
    except ZeroDivisionError:
        channel.importable_file_duplication = 1


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
    set_leaf_node_importability_from_local_file_importability(channel_id)
    recurse_importability_up_tree(channel_id)
    channel = ChannelMetadata.objects.get(id=channel_id)
    calculate_importable_file_size(channel)
    calculate_importable_resource_count(channel)
    calculate_importable_duplication_index(channel)
    channel.save()


checksum_regex = re.compile("^([a-f0-9]{32})$")

# If we have already done importability annotation for this channel
# Record this fact so that we avoid doing it repeatedly.
IMPORTABILITY_ANNOTATION_CACHE_KEY = "importability_annotation_{channel_id}"


def clear_importability_cache(channel_id):
    cache.clear(IMPORTABILITY_ANNOTATION_CACHE_KEY.format(channel_id=channel_id))


def annotate_importability_from_studio(channel_id):
    """
    Dummy method to annotate everything as importable for Studio imports.
    """
    CACHE_MARKER = "STUDIO"
    CACHE_KEY = IMPORTABILITY_ANNOTATION_CACHE_KEY.format(channel_id=channel_id)
    if cache.get(CACHE_KEY) != CACHE_MARKER:
        annotate_importability(channel_id, None)
        cache.set(CACHE_KEY, CACHE_MARKER, 3600)


def annotate_importability_from_remote(channel_id, baseurl):
    CACHE_MARKER = "PEER_{baseurl}".format(baseurl=baseurl)
    CACHE_KEY = IMPORTABILITY_ANNOTATION_CACHE_KEY.format(channel_id=channel_id)
    if cache.get(CACHE_KEY) != CACHE_MARKER:
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
        cache.set(CACHE_KEY, CACHE_MARKER, 3600)


def annotate_importability_from_disk(channel_id, basepath):
    CACHE_MARKER = "DISK_{basepath}".format(basepath=basepath)
    CACHE_KEY = IMPORTABILITY_ANNOTATION_CACHE_KEY.format(channel_id=channel_id)
    if cache.get(CACHE_KEY) != CACHE_MARKER:
        # Cache the checksums from reading this internal device to use for other
        # importability annotations for different channels from the same drive.
        CHECKSUM_CACHE_KEY = 'disk_import_checksums_{basepath}'.format(basepath=basepath)
        checksums = cache.get(CHECKSUM_CACHE_KEY)
        if not checksums:
            content_dir = get_content_storage_dir_path(datafolder=basepath)

            checksums = []

            for _, _, files in os.walk(content_dir):
                for name in files:
                    checksum = os.path.splitext(name)[0]
                    # Only add valid checksums formatted according to our standard filename
                    if checksum_regex.match(checksum):
                        checksums.append(checksum)
            # Cache is per device, so a relatively long lived one should
            # be fine.
            cache.set(CHECKSUM_CACHE_KEY, checksums, 1800)
        annotate_importability(channel_id, checksums)
        cache.set(CACHE_KEY, CACHE_MARKER, 3600)
