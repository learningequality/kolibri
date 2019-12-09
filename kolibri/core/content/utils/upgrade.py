import logging
import os

from django.core.management import call_command
from le_utils.constants import content_kinds
from sqlalchemy import select

from .annotation import CONTENT_APP_NAME
from .sqlalchemybridge import Bridge
from kolibri.core.content.constants.schema_versions import CURRENT_SCHEMA_VERSION
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils import annotation
from kolibri.core.content.utils import channel_import
from kolibri.core.content.utils import paths
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.tasks.exceptions import UserCancelledError
from kolibri.core.tasks.utils import get_current_job


logger = logging.getLogger(__name__)


def diff_stats(channel_id, method, drive_id=None, baseurl=None):
    """
    Download the channel database to an upgraded path.
    Annotate the local file availability of the upgraded channel db.
    Calculate diff stats comparing default db and annotated channel db.
    """
    # upgraded content database path
    source_path = paths.get_upgrade_content_database_file_path(channel_id)
    # annotated db to be used for calculating diff stats
    destination_path = paths.get_annotated_content_database_file_path(channel_id)
    try:
        if method == "network":
            call_command(
                "importchannel", "network", channel_id, baseurl=baseurl, no_upgrade=True
            )
        elif method == "disk":
            drive = get_mounted_drive_by_id(drive_id)
            call_command(
                "importchannel", "disk", channel_id, drive.datafolder, no_upgrade=True,
            )

        # create all fields/tables at the annotated destination db, based on the current schema version
        bridge = Bridge(
            sqlite_file_path=destination_path, schema_version=CURRENT_SCHEMA_VERSION
        )
        bridge.Base.metadata.create_all(bridge.engine)

        # initialize import manager based on annotated destination path, pulling from source db path
        import_manager = channel_import.initialize_import_manager(
            channel_id,
            cancel_check=False,
            source=source_path,
            destination=destination_path,
        )

        # import channel data from source db path
        import_manager.import_channel_data()
        import_manager.end()

        # annotate file availability on destination db
        annotation.set_local_file_availability_from_disk(destination=destination_path)
        # get the diff count between whats on the default db and the annotated db
        new_resources_count = count_new_resources_available_for_import(
            destination_path, channel_id
        )
        # get the count for leaf nodes which are in the default db, but not in the annotated db
        resources_to_be_deleted_count = count_removed_resources(
            destination_path, channel_id
        )
        # get the ids of leaf nodes which are now incomplete due to missing local files
        updated_resources_ids = automatically_updated_resource_ids(
            destination_path, channel_id
        )
        # remove the annotated database
        try:
            os.remove(destination_path)
        except OSError as e:
            logger.info(
                "Tried to remove {}, but exception {} occurred.".format(
                    destination_path, e
                )
            )
        # annotate job metadata with diff stats
        job = get_current_job()
        if job:
            job.extra_metadata["new_resources_count"] = new_resources_count
            job.extra_metadata[
                "deleted_resources_count"
            ] = resources_to_be_deleted_count
            job.extra_metadata["updated_node_ids"] = updated_resources_ids
            job.save_meta()

    except UserCancelledError:
        # remove the annotated database
        try:
            os.remove(destination_path)
        except OSError:
            pass
        raise


def count_new_resources_available_for_import(destination, channel_id):
    """
    Queries the destination db to get leaf nodes.
    Subtract total number of leaf nodes by the count of leaf nodes on default db to get the number of new resources.
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
        len(leaf_node_ids)
        - ContentNode.objects.filter_by_uuids(leaf_node_ids, validate=False)
        .filter(channel_id=channel_id)
        .count()
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
