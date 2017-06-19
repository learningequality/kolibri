import logging as logger

from django.apps.registry import AppRegistryNotReady

try:
    from django.apps import apps

    apps.check_apps_ready()
except AppRegistryNotReady:
    import django

    django.setup()

import requests
from django.core.management import call_command
from django.conf import settings
from django.http import Http404
from django.utils.translation import ugettext as _
from kolibri.content.models import ChannelMetadataCache
from kolibri.content.utils.channels import get_mounted_drives_with_channel_info
from kolibri.content.utils.paths import get_content_database_file_url
from rest_framework import serializers, viewsets
from rest_framework.decorators import list_route
from rest_framework.response import Response
from barbequeue.client import SimpleClient

from .permissions import IsDeviceOwnerOnly

logging = logger.getLogger(__name__)

client = SimpleClient(
    app="kolibri", storage_path=settings.QUEUE_JOB_STORAGE_PATH)


class TasksViewSet(viewsets.ViewSet):
    permission_classes = (IsDeviceOwnerOnly, )

    def list(self, request):
        jobs_response = [_job_to_response(j) for j in client.all_jobs()]
        return Response(jobs_response)

    def create(self, request):
        # unimplemented. Call out to the task-specific APIs for now.
        pass

    def retrieve(self, request, pk=None):
        task = _job_to_response(client.status(pk))
        return Response(task)

    def destroy(self, request, pk=None):
        # unimplemented for now.
        pass

    @list_route(methods=['post'])
    def startremoteimport(self, request):
        '''Download a channel's database from the main curation server, and then
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

        task_id = client.schedule(
            _networkimport, channel_id, track_progress=True)

        # attempt to get the created Task, otherwise return pending status
        resp = _job_to_response(client.status(task_id))

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

        job_id = client.schedule(
            _localimport, request.data['drive_id'], track_progress=True)

        # attempt to get the created Task, otherwise return pending status
        resp = _job_to_response(client.status(job_id))

        return Response(resp)

    @list_route(methods=['post'])
    def startlocalexport(self, request):
        '''
        Export a channel to a local drive, and copy content to the drive.

        '''

        if "drive_id" not in request.data:
            raise serializers.ValidationError(
                "The 'drive_id' field is required.")

        job_id = client.schedule(
            _localexport, request.data['drive_id'], track_progress=True)

        # attempt to get the created Task, otherwise return pending status
        resp = _job_to_response(client.status(job_id))

        return Response(resp)

    @list_route(methods=['post'])
    def cleartask(self, request):
        '''
        Clears a task with its task id given in the task_id parameter.
        '''

        if 'task_id' not in request.data:
            raise serializers.ValidationError(
                "The 'task_id' field is required.")

        client.clear()
        return Response({})

    @list_route(methods=['get'])
    def localdrive(self, request):
        drives = get_mounted_drives_with_channel_info()

        # make sure everything is a dict, before converting to JSON
        assert isinstance(drives, dict)
        out = [mountdata._asdict() for mountdata in drives.values()]

        return Response(out)


def _networkimport(channel_id, update_progress=None):
    call_command("importchannel", "network", channel_id)
    call_command(
        "importcontent",
        "network",
        channel_id,
        update_progress=update_progress)


def _localimport(drive_id, update_progress=None):
    drives = get_mounted_drives_with_channel_info()
    drive = drives[drive_id]
    for channel in drive.metadata["channels"]:
        call_command("importchannel", "local", channel["id"], drive.datafolder)
        call_command(
            "importcontent",
            "local",
            channel["id"],
            drive.datafolder,
            update_progress=update_progress)


def _localexport(drive_id, update_progress=None):
    drives = get_mounted_drives_with_channel_info()
    drive = drives[drive_id]
    for channel in ChannelMetadataCache.objects.all():
        call_command("exportchannel", channel.id, drive.datafolder)
        call_command(
            "exportcontent",
            channel.id,
            drive.datafolder,
            update_progress=update_progress)


def _job_to_response(job):
    if not job:
        return {
            "type": "remoteimport",
            "status": "SCHEDULED",
            "percentage": 0,
            "progress": [],
            "id": job.job_id,
        }
    else:
        return {
            "type": "remoteimport",
            "status": job.state,
            "exception": str(job.exception),
            "traceback": str(job.traceback),
            "percentage": job.percentage_progress,
            "id": job.job_id,
        }
