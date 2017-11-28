import logging as logger
import os

import requests
from barbequeue.common.classes import State
from barbequeue.exceptions import UserCancelledError
from django.apps.registry import AppRegistryNotReady
from django.core.management import call_command
from django.db import connections
from django.http import Http404
from django.utils.translation import ugettext as _
from kolibri.content.models import ChannelMetadataCache
from kolibri.content.utils.channels import get_mounted_drives_with_channel_info
from kolibri.content.utils.paths import get_content_database_file_path, get_content_database_file_url
from rest_framework import serializers, viewsets
from rest_framework.decorators import list_route
from rest_framework.response import Response

from .client import get_client
from .permissions import IsDeviceOwnerOnly

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

id_tasktype = {}

class TasksViewSet(viewsets.ViewSet):
    permission_classes = (IsDeviceOwnerOnly,)

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

    @list_route(methods=['post'])
    def startremoteimport(self, request):
        '''
        Download a channel's database from the main curation server, and then
        download its content.
        '''

        if "channel_id" not in request.data:
            raise serializers.ValidationError(
                "The 'channel_id' field is required.")

        channel_id = request.data['channel_id']

        # ensure the requested channel_id can be found on the central server, otherwise error
        status = requests.head(
            get_content_database_file_url(channel_id)).status_code
        if status == 404:
            raise Http404(
                _("The requested channel does not exist on the content server")
            )

        task_id = get_client().schedule(
            _networkimport, channel_id, track_progress=True, cancellable=True)

        id_tasktype[task_id] = REMOTE_IMPORT

        # attempt to get the created Task, otherwise return pending status
        resp = _job_to_response(get_client().status(task_id))

        return Response(resp)

    @list_route(methods=['post'])
    def startlocalimport(self, request):
        """
        Import a channel from a local drive, and copy content to the local machine.
        """
        # Importing django/running setup because Windows...

        if "drive_id" not in request.data:
            raise serializers.ValidationError(
                "The 'drive_id' field is required.")

        task_id = get_client().schedule(
            _localimport, request.data['drive_id'], track_progress=True, cancellable=True)

        id_tasktype[task_id] = LOCAL_IMPORT

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


def _networkimport(channel_id, update_progress=None, check_for_cancel=None):
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
            update_progress=update_progress,
            check_for_cancel=check_for_cancel)
    except UserCancelledError:
        connections.close_all()  # close all DB connections (FIX for #1818)
        try:
            os.remove(get_content_database_file_path(channel_id))
        except OSError:
            pass
        ChannelMetadataCache.objects.filter(id=channel_id).delete()
        raise
    connections.close_all()  # close all DB connections (FIX for #1818)

def _localimport(drive_id, update_progress=None, check_for_cancel=None):
    drives = get_mounted_drives_with_channel_info()
    drive = drives[drive_id]
    # copy channel's db file then copy all the content files from storage dir
    try:
        for channel in drive.metadata["channels"]:
            call_command(
                "importchannel",
                "local",
                channel["id"],
                drive.datafolder,
                update_progress=update_progress,
                check_for_cancel=check_for_cancel)
            call_command(
                "importcontent",
                "local",
                channel["id"],
                drive.datafolder,
                update_progress=update_progress,
                check_for_cancel=check_for_cancel)
    except UserCancelledError:
        connections.close_all()  # close all DB connections (FIX for #1818)
        for channel in drive.metadata["channels"]:
            channel_id = channel["id"]
            try:
                os.remove(get_content_database_file_path(channel_id))
            except OSError:
                pass
            ChannelMetadataCache.objects.filter(id=channel_id).delete()
        connections.close_all()  # close all DB connections (FIX for #1818)s
        raise
    connections.close_all()  # close all DB connections (FIX for #1818)


def _localexport(drive_id, update_progress=None, check_for_cancel=None):
    drives = get_mounted_drives_with_channel_info()
    drive = drives[drive_id]
    for channel in ChannelMetadataCache.objects.all():
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
            connections.close_all()  # close all DB connections (FIX for #1818)
            raise
    connections.close_all()  # close all DB connections (FIX for #1818)


def _job_to_response(job):
    if not job:
        return {
            "type": None,
            "status": State.SCHEDULED,
            "percentage": 0,
            "progress": [],
            "id": None,
        }
    else:
        return {
            "type": id_tasktype.get(job.job_id),
            "status": job.state,
            "exception": str(job.exception),
            "traceback": str(job.traceback),
            "percentage": job.percentage_progress,
            "id": job.job_id,
        }
