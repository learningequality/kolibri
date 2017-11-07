import logging as logger
import os

from django.apps.registry import AppRegistryNotReady
from django.conf import settings
from django.core.management import CommandError, call_command
from iceqube.common.classes import State
from iceqube.exceptions import UserCancelledError
from kolibri.content.models import ChannelMetadata
from kolibri.content.permissions import CanManageContent
from kolibri.content.utils.channels import get_mounted_drives_with_channel_info
from kolibri.content.utils.paths import get_content_database_file_path
from rest_framework import serializers, viewsets
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

REMOTE_IMPORT = 'remoteimport'
LOCAL_IMPORT = 'localimport'
LOCAL_EXPORT = 'localexport'
DELETE_CHANNEL = 'deletechannel'

id_tasktype = {}


class TasksViewSet(viewsets.ViewSet):
    permission_classes = (CanManageContent,)

    def list(self, request):
        jobs_response = [_job_to_response(j) for j in get_client().all_jobs()]
        ids = [job["id"] for job in jobs_response]
        # Clean up old job tasktypes
        keys_to_pop = [key for key in id_tasktype.keys() if key not in ids]
        for key in keys_to_pop:
            id_tasktype.pop(key)

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

        job_id = get_client().schedule(call_command, "importchannel", "network", channel_id, baseurl=baseurl)
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

        job_id = get_client().schedule(
            call_command,
            "importcontent",
            "network",
            channel_id,
            base_url=baseurl,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
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

        job_id = get_client().schedule(
            call_command,
            "importchannel",
            "disk",
            drive.datafolder,
            channel_id,
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

        job_id = get_client().schedule(
            call_command,
            "importcontent",
            "disk",
            channel_id,
            drive.datafolder,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
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

        task_id = get_client().schedule(
            _deletechannel, channel_id, track_progress=True)

        id_tasktype[task_id] = DELETE_CHANNEL

        # attempt to get the created Task, otherwise return pending status
        resp = _job_to_response(get_client().status(task_id))

        return Response(resp)

    @list_route(methods=['post'])
    def startlocalexport(self, request):
        '''
        Export a channel to a local drive, and copy content to the drive.

        '''

        if "drive_id" not in request.data:
            raise serializers.ValidationError(
                "The 'drive_id' field is required.")

        task_id = get_client().schedule(
            _localexport, request.data['drive_id'], track_progress=True, cancellable=True)

        id_tasktype[task_id] = LOCAL_EXPORT

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


def _localexport(drive_id, update_progress=None, check_for_cancel=None):
    drives = get_mounted_drives_with_channel_info()
    drive = drives[drive_id]
    for channel in ChannelMetadata.objects.all():
        call_command(
            "exportchannel",
            channel.id,
            drive.datafolder,
            update_progress=update_progress,
            check_for_cancel=check_for_cancel)
        try:
            call_command(
                "exportcontent",
                channel.id,
                drive.datafolder,
                update_progress=update_progress,
                check_for_cancel=check_for_cancel)
        except UserCancelledError:
            try:
                os.remove(get_content_database_file_path(channel.id, datafolder=drive.datafolder))
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
            "type": job.extra_metadata.get("type"),
            "started_by": job.extra_metadata.get("started_by"),
            "status": job.state,
            "exception": str(job.exception),
            "traceback": str(job.traceback),
            "percentage": job.percentage_progress,
            "id": job.job_id,
            "cancellable": job.cancellable,
        }
