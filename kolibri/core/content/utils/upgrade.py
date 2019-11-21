from le_utils.constants import content_kinds
from sqlalchemy import select

from .annotation import CONTENT_APP_NAME
from .sqlalchemybridge import Bridge
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile


def count_new_resources_available_for_import(destination, channel_id):
    """
    Queries the destination db to get the count of leaf nodes.
    Subtract by the count of leaf nodes on default db to get the number of new resources.
    """
    bridge = Bridge(app_name=CONTENT_APP_NAME, sqlite_file_path=destination)
    ContentNodeClass = bridge.get_class(ContentNode)
    leaf_node_counts = (
        bridge.session.query(ContentNodeClass.id)
        .filter(
            ContentNodeClass.channel_id == channel_id,
            ContentNodeClass.kind != content_kinds.TOPIC,
        )
        .count()
    )
    return max(
        leaf_node_counts
        - ContentNode.objects.filter(channel_id=channel_id)
        .exclude(kind=content_kinds.TOPIC)
        .count(),
        0,
    )


def count_removed_resources(destination, channel_id):
    """
    Queries the destination db to get the leaf node ids.
    Subtract available leaf nodes count on default db by available leaf nodes based on destination db leaf node ids.
    """
    bridge = Bridge(app_name=CONTENT_APP_NAME, sqlite_file_path=destination)
    ContentNodeClass = bridge.get_class(ContentNode)
    leaf_node_ids = [
        i
        for i, in bridge.session.query(ContentNodeClass.id)
        .filter(
            ContentNodeClass.channel_id == channel_id,
            ContentNodeClass.kind != content_kinds.TOPIC,
        )
        .all()
    ]
    return (
        ContentNode.objects.filter(channel_id=channel_id, available=True)
        .exclude(kind=content_kinds.TOPIC)
        .count()
        - ContentNode.objects.filter_by_uuids(leaf_node_ids, validate=False)
        .filter(available=True, channel_id=channel_id)
        .count()
    )


def automatically_updated_resource_ids(destination, channel_id):
    """
    Queries the destination db to get the leaf node ids, where local file objects are unavailable.
    Get the available node ids related to those missing file objects.
    """
    bridge = Bridge(app_name=CONTENT_APP_NAME, sqlite_file_path=destination)
    FileClass = bridge.get_class(File)
    LocalFileClass = bridge.get_class(LocalFile)
    # get unavailable local file ids on the destination db
    unavailable_local_file_ids_statement = select([LocalFileClass.id]).where(
        LocalFileClass.available == False  # noqa
    )
    # get the Contentnode ids where File objects are missing in the destination db
    contentnode_ids = [
        i
        for i, in bridge.session.query(FileClass.contentnode_id)
        .filter(FileClass.local_file_id.in_(unavailable_local_file_ids_statement))
        .distinct()
        .all()
    ]
    return (
        ContentNode.objects.filter_by_uuids(contentnode_ids, validate=False)
        .filter(available=True, channel_id=channel_id)
        .values_list("id", flat=True)
    )
