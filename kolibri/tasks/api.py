import logging as logger

from django.core.management import call_command
from kolibri.content.utils.channels import get_mounted_drives_with_channel_info
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

    # convenience functions for triggering often used tasks

    @list_route(methods=['post'])
    def startremoteimport(self, request):
        '''Download a channel's database from the main curation server, and then
        download its content.

        '''
        TASKTYPE = "remoteimport"

        # loading django_q apparently requires django settings to load first.
        # Import here to avoid circular imports.
        from django_q.tasks import async
        from django_q.models import Task

        if "id" not in request.data:
            raise serializers.ValidationError("The 'id' field is required.")

        channel_id = request.data['id']

        task_id = async(_importchannel, channel_id, group=TASKTYPE, progress_updates=True)

        # id status metadata

        # wait for the task instance to be saved first before continuing
        taskobj = Task.get_task(task_id)
        if taskobj:             # the task object has been saved!
            resp = _task_to_response(taskobj)
        else:                   # task object hasn't been saved yet, fake the response for now
            resp = {
                "type": TASKTYPE,
                "status": "PENDING",
                "percentage": 0,
                "metadata": {},
                "id": task_id,
            }

        return Response(resp)

    @list_route(methods=['post'])
    def startlocalimportchannel(self, request):
        '''
        Import a channel locally, and move content to the local machine.

        '''

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

def _importchannel(channel_id, update_state=None):
    call_command("importchannel", "network", channel_id, update_state=update_state)
    call_command("importcontent", "network", channel_id, update_state=update_state)


def _task_to_response(task_instance):
    """"
    Converts a Task object to a dict with the attributes that the
    frontend expects.
    """
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
