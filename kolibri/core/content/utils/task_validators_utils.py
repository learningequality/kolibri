from rest_framework import serializers

from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.discovery.models import NetworkLocation
from kolibri.utils import conf


def add_drive_info(import_task, task_description):
    try:
        drive_id = task_description["drive_id"]
    except KeyError:
        raise serializers.ValidationError("The drive_id field is required.")

    try:
        drive = get_mounted_drive_by_id(drive_id)
    except KeyError:
        raise serializers.ValidationError(
            "That drive_id was not found in the list of drives."
        )

    import_task.update({"drive_id": drive_id, "datafolder": drive.datafolder})

    return import_task


def get_channel_name(channel_id, require_channel=False):
    try:
        channel = ChannelMetadata.objects.get(id=channel_id)
    except ChannelMetadata.DoesNotExist:
        channel = None
        if require_channel:
            raise serializers.ValidationError("This channel does not exist.")

    return "" if channel is None else channel.name


def validate_content_task(request, task_description, require_channel=False):
    try:
        channel_id = task_description["channel_id"]
    except KeyError:
        raise serializers.ValidationError("The channel_id field is required.")

    channel_name = task_description.get(
        "channel_name", get_channel_name(channel_id, require_channel)
    )

    node_ids = task_description.get("node_ids", None)
    exclude_node_ids = task_description.get("exclude_node_ids", None)

    if node_ids and not isinstance(node_ids, list):
        raise serializers.ValidationError("node_ids must be a list.")

    if exclude_node_ids and not isinstance(exclude_node_ids, list):
        raise serializers.ValidationError("exclude_node_ids must be a list.")

    return {
        "channel_id": channel_id,
        "channel_name": channel_name,
        "exclude_node_ids": exclude_node_ids,
        "node_ids": node_ids,
        "started_by": request.user.pk,
        "started_by_username": request.user.username,
    }


def validate_remote_import_task(request, task_description):
    import_task = validate_content_task(request, task_description)
    try:
        peer_id = task_description["peer_id"]
        baseurl = NetworkLocation.objects.values_list("base_url", flat=True).get(
            id=peer_id
        )
    except NetworkLocation.DoesNotExist:
        raise serializers.ValidationError(
            "Peer with id {} does not exist".format(peer_id)
        )
    except KeyError:
        baseurl = conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"]
        peer_id = None

    import_task.update({"baseurl": baseurl, "peer_id": peer_id})
    return import_task


def validate_local_import_task(request, task_description):
    task = validate_content_task(request, task_description)
    task = add_drive_info(task, task_description)
    return task


def validate_local_export_task(request, task_description):
    task = validate_content_task(request, task_description, require_channel=True)
    task = add_drive_info(task, task_description)
    return task


def validate_deletion_task(request, task_description):
    task = validate_content_task(request, task_description, require_channel=True)
    task["force_delete"] = bool(task_description.get("force_delete"))
    task.update({"type": "DELETECONTENT"})
    if task["node_ids"] or task["exclude_node_ids"]:
        task["file_size"] = None
        task["total_resources"] = None
    task["extra_metadata"] = task
    return task
