import copy
import os

import requests
from django.core.management import call_command
from rest_framework import serializers

from kolibri.core.content.permissions import CanManageContent
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.content.utils.channels import read_channel_metadata_from_db_file
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.content.utils.paths import get_content_database_file_path
from kolibri.core.content.utils.task_validators_utils import add_drive_info
from kolibri.core.content.utils.task_validators_utils import get_channel_name
from kolibri.core.content.utils.task_validators_utils import validate_content_task
from kolibri.core.content.utils.task_validators_utils import validate_local_export_task
from kolibri.core.content.utils.task_validators_utils import validate_local_import_task
from kolibri.core.content.utils.task_validators_utils import validate_remote_import_task
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.exceptions import UserCancelledError
from kolibri.core.tasks.utils import get_current_job
from kolibri.utils import conf


def validate_startdiskcontentimport(request, request_data):
    task = validate_local_import_task(request, request_data)
    task.update({"type": "DISKCONTENTIMPORT"})
    task["extra_metadata"] = copy.deepcopy(task)
    return task


@register_task(
    validator=validate_startdiskcontentimport,
    cancellable=True,
    track_progress=True,
    permission_classes=[CanManageContent],
)
def startdiskcontentimport(**kwargs):
    return call_command(
        "importcontent",
        "disk",
        kwargs["channel_id"],
        kwargs["datafolder"],
        drive_id=kwargs["drive_id"],
        node_ids=kwargs["node_ids"],
        exclude_node_ids=kwargs["exclude_node_ids"],
    )


def validate_startchannelupdate(request, request_data):
    sourcetype = request_data.get("sourcetype", None)
    new_version = request_data.get("new_version", None)

    if sourcetype == "remote":
        task = validate_remote_import_task(request, request_data)
    elif sourcetype == "local":
        task = validate_local_import_task(request, request_data)
    else:
        raise serializers.ValidationError("sourcetype must be 'remote' or 'local'.")

    task.update(
        {
            "type": "UPDATECHANNEL",
            "new_version": new_version,
            "sourcetype": sourcetype,
        }
    )
    task["extra_metadata"] = copy.deepcopy(task)

    return task


@register_task(
    validator=validate_startchannelupdate,
    cancellable=True,
    track_progress=True,
    permission_classes=[CanManageContent],
)
def startchannelupdate(
    channel_id=None,
    baseurl=None,
    peer_id=None,
    update_progress=None,
    check_for_cancel=None,
    node_ids=None,
    is_updating=False,
    exclude_node_ids=None,
    sourcetype=None,
    directory=None,
    drive_id=None,
):
    if sourcetype == "remote":
        call_command(
            "importchannel",
            "network",
            channel_id,
            baseurl=baseurl,
            update_progress=update_progress,
            check_for_cancel=check_for_cancel,
        )

        # Make some real-time updates to the metadata
        job = get_current_job()

        # Signal to UI that the DB-downloading step is done so it knows to display
        # progress correctly
        job.update_progress(0, 1.0)
        job.extra_metadata["database_ready"] = True

        # Add the channel name if it wasn't added initially
        if job and job.extra_metadata.get("channel_name", "") == "":
            job.extra_metadata["channel_name"] = get_channel_name(channel_id)

        job.save_meta()

        call_command(
            "importcontent",
            "network",
            channel_id,
            baseurl=baseurl,
            peer_id=peer_id,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            import_updates=is_updating,
            update_progress=update_progress,
            check_for_cancel=check_for_cancel,
        )
    elif sourcetype == "local":
        call_command(
            "importchannel",
            "disk",
            channel_id,
            directory,
            update_progress=update_progress,
            check_for_cancel=check_for_cancel,
        )

        # Make some real-time updates to the metadata
        job = get_current_job()

        # Signal to UI that the DB-downloading step is done so it knows to display
        # progress correctly
        job.update_progress(0, 1.0)
        job.extra_metadata["database_ready"] = True

        # Add the channel name if it wasn't added initially
        if job and job.extra_metadata.get("channel_name", "") == "":
            job.extra_metadata["channel_name"] = get_channel_name(channel_id)

        job.save_meta()

        # Skip importcontent step if updating and no nodes have changed
        if is_updating and (node_ids is not None) and len(node_ids) == 0:
            pass
        else:
            call_command(
                "importcontent",
                "disk",
                channel_id,
                directory,
                drive_id=drive_id,
                node_ids=node_ids,
                exclude_node_ids=exclude_node_ids,
                update_progress=update_progress,
                check_for_cancel=check_for_cancel,
            )


def validate_startremotechannelimport(request, request_data):
    task = validate_remote_import_task(request, request_data)
    task.update({"type": "REMOTECHANNELIMPORT"})
    task["extra_metadata"] = copy.deepcopy(task)
    return task


@register_task(
    validator=validate_startremotechannelimport,
    cancellable=True,
    permission_classes=[CanManageContent],
)
def startremotechannelimport(channel_id=None, baseurl=None, peer_id=None):
    return call_command(
        "importchannel",
        "network",
        channel_id,
        baseurl=baseurl,
        peer_id=peer_id,
    )


def validate_startremotecontentimport(request, request_data):
    task = validate_remote_import_task(request, request_data)
    task.update({"type": "REMOTECONTENTIMPORT"})
    task["extra_metadata"] = copy.deepcopy(task)
    return task


@register_task(
    validator=validate_startremotecontentimport,
    track_progress=True,
    cancellable=True,
    permission_classes=[CanManageContent],
)
def startremotecontentimport(
    channel_id=None,
    baseurl=None,
    peer_id=None,
    node_ids=None,
    exclude_node_ids=None,
):
    return call_command(
        "importcontent",
        "network",
        channel_id,
        baseurl=baseurl,
        peer_id=peer_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
    )


def validate_startdiskexport(request, request_data):
    task = validate_local_export_task(request, request_data)
    task.update({"type": "DISKCONTENTEXPORT"})
    task["extra_metadata"] = copy.deepcopy(task)
    return task


@register_task(
    validator=validate_startdiskexport,
    track_progress=True,
    cancellable=True,
    permission_classes=[CanManageContent],
)
def startdiskexport(
    channel_id=None,
    update_progress=None,
    check_for_cancel=None,
    drive_id=None,
    node_ids=None,
    exclude_node_ids=None,
):
    """
    Export a channel to a local drive, and copy content to the drive.
    """
    from kolibri.core.content.utils.channels import get_mounted_drive_by_id

    drive = get_mounted_drive_by_id(drive_id)

    call_command(
        "exportchannel",
        channel_id,
        drive.datafolder,
        update_progress=update_progress,
        check_for_cancel=check_for_cancel,
    )
    try:
        call_command(
            "exportcontent",
            channel_id,
            drive.datafolder,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            update_progress=update_progress,
            check_for_cancel=check_for_cancel,
        )
    except UserCancelledError:
        try:
            os.remove(
                get_content_database_file_path(channel_id, datafolder=drive.datafolder)
            )
        except OSError:
            pass
        raise


def validate_startdeletechannel(request, request_data):
    task = validate_content_task(request, request_data, require_channel=True)
    task["force_delete"] = bool(request_data.get("force_delete"))
    task.update({"type": "DELETECONTENT"})
    if task["node_ids"] or task["exclude_node_ids"]:
        task["file_size"] = None
        task["total_resources"] = None
    task["extra_metadata"] = copy.deepcopy(task)
    return task


@register_task(
    validator=validate_startdeletechannel,
    track_progress=True,
    permission_classes=[CanManageContent],
)
def startdeletechannel(
    channel_id=None,
    node_ids=None,
    exclude_node_ids=None,
    force_delete=False,
):
    """
    Delete a channel and all its associated content from the server.
    """
    return call_command(
        "deletecontent",
        channel_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
        force_delete=force_delete,
    )


def validate_startremoteimport(request, request_data):
    task = validate_remote_import_task(request, request_data)
    task.update({"type": "REMOTEIMPORT", "database_ready": False})
    task["extra_metadata"] = copy.deepcopy(task)

    return task


@register_task(
    validator=validate_startremoteimport,
    cancellable=True,
    track_progress=True,
    permission_classes=[CanManageContent],
)
def startremoteimport(
    channel_id=None,
    baseurl=None,
    peer_id=None,
    update_progress=None,
    check_for_cancel=None,
    node_ids=None,
    is_updating=False,
    exclude_node_ids=None,
):
    call_command(
        "importchannel",
        "network",
        channel_id,
        baseurl=baseurl,
        update_progress=update_progress,
        check_for_cancel=check_for_cancel,
    )

    # Make some real-time updates to the metadata
    job = get_current_job()

    # Signal to UI that the DB-downloading step is done so it knows to display
    # progress correctly
    job.update_progress(0, 1.0)
    job.extra_metadata["database_ready"] = True

    # Add the channel name if it wasn't added initially
    if job and job.extra_metadata.get("channel_name", "") == "":
        job.extra_metadata["channel_name"] = get_channel_name(channel_id)

    job.save_meta()

    call_command(
        "importcontent",
        "network",
        channel_id,
        baseurl=baseurl,
        peer_id=peer_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
        import_updates=is_updating,
        update_progress=update_progress,
        check_for_cancel=check_for_cancel,
    )


def validate_startdiskimport(request, request_data):
    task = validate_startdiskcontentimport(request, request_data)
    task.update({"type": "DISKIMPORT", "database_ready": False})
    task["extra_metadata"] = copy.deepcopy(task)

    return task


@register_task(
    validator=validate_startdiskimport,
    track_progress=True,
    cancellable=True,
    permission_classes=[CanManageContent],
)
def startdiskimport(
    channel_id=None,
    directory=None,
    drive_id=None,
    update_progress=None,
    check_for_cancel=None,
    node_ids=None,
    is_updating=False,
    exclude_node_ids=None,
):

    call_command(
        "importchannel",
        "disk",
        channel_id,
        directory,
        update_progress=update_progress,
        check_for_cancel=check_for_cancel,
    )

    # Make some real-time updates to the metadata
    job = get_current_job()

    # Signal to UI that the DB-downloading step is done so it knows to display
    # progress correctly
    job.update_progress(0, 1.0)
    job.extra_metadata["database_ready"] = True

    # Add the channel name if it wasn't added initially
    if job and job.extra_metadata.get("channel_name", "") == "":
        job.extra_metadata["channel_name"] = get_channel_name(channel_id)

    job.save_meta()

    # Skip importcontent step if updating and no nodes have changed
    if is_updating and (node_ids is not None) and len(node_ids) == 0:
        pass
    else:
        call_command(
            "importcontent",
            "disk",
            channel_id,
            directory,
            drive_id=drive_id,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            update_progress=update_progress,
            check_for_cancel=check_for_cancel,
        )


def validate_startdiskchannelimport(request, request_data):
    task = validate_local_import_task(request, request_data)
    task.update({"type": "DISKCHANNELIMPORT"})
    task["extra_metadata"] = copy.deepcopy(task)

    return task


@register_task(
    validator=validate_startdiskchannelimport,
    cancellable=True,
    permission_classes=[CanManageContent],
)
def startdiskchannelimport(
    channel_id=None,
    datafolder=None,
    drive_id=None,
):
    return call_command(
        "importchannel",
        "disk",
        channel_id,
        datafolder,
        drive_id=drive_id,
    )


def validate_channeldiffstats(request, request_data):
    job_metadata = {}
    channel_id = request_data.get("channel_id")
    method = request_data.get("method")
    drive_id = request_data.get("drive_id")
    baseurl = request_data.get("baseurl")

    # request validation and job metadata info
    if not channel_id:
        raise serializers.ValidationError("The channel_id field is required.")
    if not method:
        raise serializers.ValidationError("The method field is required.")

    if method == "network":
        baseurl = baseurl or conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"]
        job_metadata["baseurl"] = baseurl
        # get channel version metadata
        url = get_channel_lookup_url(baseurl=baseurl, identifier=channel_id)
        resp = requests.get(url)
        channel_metadata = resp.json()
        job_metadata["new_channel_version"] = channel_metadata[0]["version"]
    elif method == "disk":
        if not drive_id:
            raise serializers.ValidationError(
                "The drive_id field is required when using 'disk' method."
            )
        job_metadata = add_drive_info(job_metadata, request_data)
        # get channel version metadata
        drive = get_mounted_drive_by_id(drive_id)
        channel_metadata = read_channel_metadata_from_db_file(
            get_content_database_file_path(channel_id, drive.datafolder)
        )
        job_metadata["new_channel_version"] = channel_metadata["version"]
    else:
        raise serializers.ValidationError(
            "'method' field should either be 'network' or 'disk'."
        )

    job_metadata.update(
        {
            "type": "CHANNELDIFFSTATS",
            "started_by": request.user.pk,
            "channel_id": channel_id,
        }
    )
    return {
        "channel_id": channel_id,
        "method": method,
        "drive_id": drive_id,
        "baseurl": baseurl,
        "extra_metadata": job_metadata,
    }


@register_task(
    validator=validate_channeldiffstats,
    track_progress=False,
    cancellable=True,
    permission_classes=[CanManageContent],
)
def channeldiffstats(
    channel_id=None,
    method=None,
    drive_id=None,
    baseurl=None,
):
    from kolibri.core.content.utils.upgrade import diff_stats

    return diff_stats(
        channel_id,
        method,
        drive_id=drive_id,
        baseurl=baseurl,
    )
