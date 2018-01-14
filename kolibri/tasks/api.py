import logging as logger
import os

from django.apps.registry import AppRegistryNotReady
from django.conf import settings
from django.core.management import CommandError, call_command
from iceqube.common.classes import State
from iceqube.exceptions import UserCancelledError
from kolibri.content.permissions import CanManageContent
from kolibri.content.utils.channels import get_mounted_drives_with_channel_info
from kolibri.content.utils.paths import get_content_database_file_path
from rest_framework import serializers, viewsets
from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import list_route
from rest_framework.response import Response

from .client import get_client

try:
    from django.apps import apps

    apps.check_apps_ready()
except AppRegistryNotReady:
    import django

    django.setup()

logging = logger.getLogger(__name__)


NETWORK_ERROR_STRING = _("There was a network error.")

DISK_IO_ERROR_STRING = _("There was a disk access error.")

CATCHALL_SERVER_ERROR_STRING = _("There was an unknown error.")


class TasksViewSet(viewsets.ViewSet):
    permission_classes = (CanManageContent,)

    def list(self, request):
        jobs_response = [_job_to_response(j) for j in get_client().all_jobs()]

        return Response(jobs_response)

    def create(self, request):
        # unimplemented. Call out to the task-specific APIs for now.
        pass

    def retrieve(self, request, pk=None):
        task = _job_to_response(get_client().status(pk))
        return Response(task)

    def destroy(self, request, pk=None):
        # unimplemented for now.
        pass

    @list_route(methods=["post"])
    def startremotechannelimport(self, request):

        try:
            channel_id = request.data["channel_id"]
        except KeyError:
            raise serializers.ValidationError("The channel_id field is required.")

        baseurl = request.data.get("baseurl", settings.CENTRAL_CONTENT_DOWNLOAD_BASE_URL)

        job_metadata = {
            "type": "REMOTECHANNELIMPORT",
            "started_by": request.user.pk,
        }

        job_id = get_client().schedule(
            call_command,
            "importchannel",
            "network",
            channel_id,
            baseurl=baseurl,
            extra_metadata=job_metadata,
        )
        resp = _job_to_response(get_client().status(job_id))

        return Response(resp)

    @list_route(methods=["post"])
    def startremotecontentimport(self, request):

        try:
            channel_id = request.data["channel_id"]
        except KeyError:
            raise serializers.ValidationError("The channel_id field is required.")

        # optional arguments
        baseurl = request.data.get("base_url", settings.CENTRAL_CONTENT_DOWNLOAD_BASE_URL)
        node_ids = request.data.get("node_ids", None)
        exclude_node_ids = request.data.get("exclude_node_ids", None)

        if node_ids and not isinstance(node_ids, list):
            raise serializers.ValidationError("node_ids must be a list.")

        if exclude_node_ids and not isinstance(exclude_node_ids, list):
            raise serializers.ValidationError("exclude_node_ids must be a list.")

        job_metadata = {
            "type": "REMOTECONTENTIMPORT",
            "started_by": request.user.pk,
        }

        job_id = get_client().schedule(
            call_command,
            "importcontent",
            "network",
            channel_id,
            base_url=baseurl,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            extra_metadata=job_metadata,
            track_progress=True,
            cancellable=True,
        )

        resp = _job_to_response(get_client().status(job_id))

        return Response(resp)

    @list_route(methods=["post"])
    def startdiskchannelimport(self, request):

        # Load the required parameters
        try:
            channel_id = request.data["channel_id"]
        except KeyError:
            raise serializers.ValidationError("The channel_id field is required.")

        try:
            drive_id = request.data["drive_id"]
        except KeyError:
            raise serializers.ValidationError("The drive_id field is required.")

        try:
            drives = get_mounted_drives_with_channel_info()
            drive = drives[drive_id]
        except KeyError:
            raise serializers.ValidationError("That drive_id was not found in the list of drives.")

        job_metadata = {
            "type": "DISKCHANNELIMPORT",
            "started_by": request.user.pk,
        }

        job_id = get_client().schedule(
            call_command,
            "importchannel",
            "disk",
            channel_id,
            drive.datafolder,
            extra_metadata=job_metadata,
        )

        resp = _job_to_response(get_client().status(job_id))
        return Response(resp)

    @list_route(methods=["post"])
    def startdiskcontentimport(self, request):

        try:
            channel_id = request.data["channel_id"]
        except KeyError:
            raise serializers.ValidationError("The channel_id field is required.")

        try:
            drive_id = request.data["drive_id"]
        except KeyError:
            raise serializers.ValidationError("The drive_id field is required.")

        try:
            drives = get_mounted_drives_with_channel_info()
            drive = drives[drive_id]
        except KeyError:
            raise serializers.ValidationError("That drive_id was not found in the list of drives.")

        # optional arguments
        node_ids = request.data.get("node_ids", None)
        exclude_node_ids = request.data.get("exclude_node_ids", None)

        if node_ids and not isinstance(node_ids, list):
            raise serializers.ValidationError("node_ids must be a list.")

        if exclude_node_ids and not isinstance(exclude_node_ids, list):
            raise serializers.ValidationError("exclude_node_ids must be a list.")

        job_metadata = {
            "type": "DISKCONTENTIMPORT",
            "started_by": request.user.pk,
        }

        job_id = get_client().schedule(
            call_command,
            "importcontent",
            "disk",
            channel_id,
            drive.datafolder,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            extra_metadata=job_metadata,
            track_progress=True,
            cancellable=True,
        )

        resp = _job_to_response(get_client().status(job_id))

        return Response(resp)

    # TODO: complete startdiskexport

    @list_route(methods=['post'])
    def startdeletechannel(self, request):
        '''
        Delete a channel and all its associated content from the server
        '''

        if "channel_id" not in request.data:
            raise serializers.ValidationError(
                "The 'channel_id' field is required.")

        channel_id = request.data['channel_id']

        job_metadata = {
            "type": "DELETECHANNEL",
            "started_by": request.user.pk,
        }

        task_id = get_client().schedule(
            call_command,
            "deletechannel",
            channel_id,
            track_progress=True,
            extra_metadata=job_metadata,
        )

        # attempt to get the created Task, otherwise return pending status
        resp = _job_to_response(get_client().status(task_id))

        return Response(resp)

    @list_route(methods=['post'])
    def startdiskexport(self, request):
        '''
        Export a channel to a local drive, and copy content to the drive.

        '''

        # Load the required parameters
        try:
            channel_id = request.data["channel_id"]
        except KeyError:
            raise serializers.ValidationError("The channel_id field is required.")

        try:
            drive_id = request.data["drive_id"]
        except KeyError:
            raise serializers.ValidationError("The drive_id field is required.")

        # optional arguments
        node_ids = request.data.get("node_ids", None)
        exclude_node_ids = request.data.get("exclude_node_ids", None)

        if node_ids and not isinstance(node_ids, list):
            raise serializers.ValidationError("node_ids must be a list.")

        if exclude_node_ids and not isinstance(exclude_node_ids, list):
            raise serializers.ValidationError("exclude_node_ids must be a list.")

        job_metadata = {
            "type": "DISKEXPORT",
            "started_by": request.user.pk,
        }

        task_id = get_client().schedule(
            _localexport,
            channel_id,
            drive_id,
            track_progress=True,
            cancellable=True,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            extra_metadata=job_metadata,
        )

        # attempt to get the created Task, otherwise return pending status
        resp = _job_to_response(get_client().status(task_id))

        return Response(resp)

    @list_route(methods=['post'])
    def canceltask(self, request):
        '''
        Cancel a task with its task id given in the task_id parameter.
        '''

        if 'task_id' not in request.data:
            raise serializers.ValidationError(
                "The 'task_id' field is required.")

        get_client().cancel(request.data['task_id'])
        get_client().clear(force=True)
        return Response({})

    @list_route(methods=['post'])
    def cleartasks(self, request):
        '''
        Cancels all running tasks.
        '''

        get_client().clear(force=True)
        return Response({})

    @list_route(methods=['get'])
    def localdrive(self, request):
        drives = get_mounted_drives_with_channel_info()

        # make sure everything is a dict, before converting to JSON
        assert isinstance(drives, dict)
        out = [mountdata._asdict() for mountdata in drives.values()]

        return Response(out)


def _networkimport(channel_id, node_ids, update_progress=None, check_for_cancel=None):
    call_command(
        "importchannel",
        "network",
        channel_id,
        update_progress=update_progress,
        check_for_cancel=check_for_cancel)
    try:
        call_command(
            "importcontent",
            "network",
            channel_id,
            node_ids=node_ids,
            update_progress=update_progress,
            check_for_cancel=check_for_cancel)
    except UserCancelledError:
        call_command("deletechannel", channel_id, update_progress=update_progress)
        raise


def _localimport(drive_id, channel_id, node_ids=None, update_progress=None, check_for_cancel=None):
    drives = get_mounted_drives_with_channel_info()
    drive = drives[drive_id]
    # copy channel's db file then copy all the content files from storage dir

    available_channel_ids = [c["id"] for c in drive.metadata["channels"]]
    assert channel_id in available_channel_ids, "The given channel was not found in the drive."

    try:
        call_command(
            "importchannel",
            "local",
            channel_id,
            drive.datafolder,
            update_progress=update_progress,
            check_for_cancel=check_for_cancel
        )
        call_command(
            "importcontent",
            "local",
            channel_id,
            drive.datafolder,
            node_ids=node_ids,
            update_progress=update_progress,
            check_for_cancel=check_for_cancel
        )
    except UserCancelledError:
        try:
            call_command("deletechannel", channel_id, update_progress=update_progress)
        except CommandError:
            pass
        raise


def _localexport(channel_id, drive_id, update_progress=None, check_for_cancel=None, node_ids=None, exclude_node_ids=None, extra_metadata=None):
    drives = get_mounted_drives_with_channel_info()
    drive = drives[drive_id]

    call_command(
        "exportchannel",
        channel_id,
        drive.datafolder,
        update_progress=update_progress,
        check_for_cancel=check_for_cancel)
    try:
        call_command(
            "exportcontent",
            channel_id,
            drive.datafolder,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            update_progress=update_progress,
            check_for_cancel=check_for_cancel)
    except UserCancelledError:
        try:
            os.remove(get_content_database_file_path(channel_id, datafolder=drive.datafolder))
        except OSError:
            pass
        raise


def _deletechannel(channel_id, update_progress=None):
    call_command("deletechannel", channel_id, update_progress=update_progress)


def _job_to_response(job):
    if not job:
        return {
            "type": None,
            "started_by": None,
            "status": State.SCHEDULED,
            "percentage": 0,
            "progress": [],
            "id": None,
            "cancellable": False,
        }
    else:
        return {
            "type": getattr(job, "extra_metadata", {}).get("type"),
            "started_by": getattr(job, "extra_metadata", {}).get("started_by"),
            "status": job.state,
            "exception": str(job.exception),
            "traceback": str(job.traceback),
            "percentage": job.percentage_progress,
            "id": job.job_id,
            "cancellable": job.cancellable,
        }
