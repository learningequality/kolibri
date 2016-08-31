import logging as logger

from django.core.management import call_command
from django_q.models import Task
from django_q.tasks import async
from kolibri.content.utils.channels import get_channels_for_data_folder, get_mounted_drives_with_channel_info
from kolibri.tasks.management.commands.base import Progress
from rest_framework import serializers, viewsets
from rest_framework.decorators import list_route
from rest_framework.response import Response

logging = logger.getLogger(__name__)


class TasksViewSet(viewsets.ViewSet):

    def list(self, request):
        from django_q.models import Task
        tasks_response = [_task_to_response(t) for t in Task.objects.all()]
        return Response(tasks_response)

    def create(self, request):
        # unimplemented. Call out to the task-specific APIs for now.
        pass

    def retrieve(self, request, pk=None):
        from django_q.models import Task

        task = _task_to_response(Task.get_task(pk))
        return Response(task)

    def destroy(self, request, pk=None):
        # unimplemented for now.
        pass

    @list_route(methods=['post'])
    def startremoteimport(self, request):
        '''Download a channel's database from the main curation server, and then
        download its content.

        '''
        TASKTYPE = "remoteimport"

        if "channel_id" not in request.data:
            raise serializers.ValidationError("The 'channel_id' field is required.")

        task_id = async(_networkimport, request.data['channel_id'], group=TASKTYPE, progress_updates=True)

        # attempt to get the created Task, otherwise return pending status
        resp = _task_to_response(Task.get_task(task_id), task_type=TASKTYPE, task_id=task_id)

        return Response(resp)

    @list_route(methods=['post'])
    def startlocalimport(self, request):
        '''
        Import a channel from a local drive, and copy content to the local machine.

        '''
        TASKTYPE = "localimport"

        if "drive_id" not in request.data:
            raise serializers.ValidationError("The 'drive_id' field is required.")

        task_id = async(_localimport, request.data['drive_id'], group=TASKTYPE, progress_updates=True)

        # attempt to get the created Task, otherwise return pending status
        resp = _task_to_response(Task.get_task(task_id), task_type=TASKTYPE, task_id=task_id)

        return Response(resp)

    @list_route(methods=['post'])
    def startlocalexport(self, request):
        '''
        Export a channel to a local drive, and copy content to the drive.

        '''
        TASKTYPE = "localexport"

        if "drive_id" not in request.data:
            raise serializers.ValidationError("The 'drive_id' field is required.")

        task_id = async(_localexport, request.data['drive_id'], group=TASKTYPE, progress_updates=True)

        # attempt to get the created Task, otherwise return pending status
        resp = _task_to_response(Task.get_task(task_id), task_type=TASKTYPE, task_id=task_id)

        return Response(resp)

    @list_route(methods=['get'])
    def localdrive(self, request):
        drives = get_mounted_drives_with_channel_info()

        # make sure everything is a dict, before converting to JSON
        assert isinstance(drives, dict)

        out = []
        for mountdata in drives.values():
            mountdata = mountdata._asdict()
            if mountdata['metadata']['channels']:
                mountdata['channels'] = [c._asdict() for c in mountdata['channels']]

            out.append(mountdata)

        return Response(out)

def _networkimport(channel_id, update_state=None):
    call_command("importchannel", "network", channel_id, update_state=update_state)
    call_command("importcontent", "network", channel_id, update_state=update_state)

def _localimport(drive_id, update_state=None):
    drives = get_mounted_drives_with_channel_info()
    drive = drives[drive_id]
    for channel in drive.metadata["channels"]:
        call_command("importchannel", "local", channel["id"], drive.datafolder, update_state=update_state)
        call_command("importcontent", "local", channel["id"], drive.datafolder, update_state=update_state)

def _localexport(drive_id, update_state=None):
    drives = get_mounted_drives_with_channel_info()
    drive = drives[drive_id]
    for channel in get_channels_for_data_folder(drive.datafolder):
        call_command("exportchannel", channel["id"], drive.datafolder, update_state=update_state)
        call_command("exportcontent", channel["id"], drive.datafolder, update_state=update_state)

def _task_to_response(task_instance, task_type=None, task_id=None):
    """"
    Converts a Task object to a dict with the attributes that the
    frontend expects.
    """

    if not task_instance:
        pending_response = {
            "type": task_type,
            "status": "PENDING",
            "percentage": 0,
            "metadata": {},
            "id": task_id,
        }
        return pending_response

    tasktype = task_instance.group
    status = task_instance.task_status
    percentage = task_instance.progress_fraction
    id = task_instance.id

    p = task_instance.progress_data
    # ARON: find out why progress metadata isn't being added. Check if this if statement below is getting processed properly.

    if not isinstance(p, Progress):
        task_type_specific_metadata = {}
    else:
        percentage = p.progress_fraction
        message = p.message
        extra_data = p.extra_data

        task_type_specific_metadata = {
            "msg": message,
        }

        try:
            task_type_specific_metadata.update(extra_data)
        except TypeError:       # extra_data isn't iterable, do nothing
            pass

    return {
        "type": tasktype,
        "status": status,
        "percentage": percentage,
        "metadata": task_type_specific_metadata,
        "id": id,
    }
