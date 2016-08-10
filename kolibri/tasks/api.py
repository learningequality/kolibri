import json
from celery import Celery
from celery.backends.database.models import Task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from django.core.management import call_command
from rest_framework import viewsets
from rest_framework.decorators import list_route
from rest_framework.response import Response

from kolibri.content.utils.channels import find_kolibri_data_in_mountpoints

import logging as logger

logging = logger.getLogger(__name__)


app = Celery()
app.config_from_object('kolibri.deployment.default.celeryconfig.default')


CELERY_BACKEND_CONNECTION = create_engine(app.broker_connection().hostname)
Session = sessionmaker(bind=CELERY_BACKEND_CONNECTION)
CALL_COMMAND_SHORTNAME = 'kolibri.call_command'


def setup_celery_for_management_commands():

    # register the call_command command, which will be our main interface
    # for calling commands asynchronously
    cc_task = app.task(call_command)

    # avoid the need to put in the full module path for call_command. Instead,
    # shortcut it to call_command.
    app.tasks[CALL_COMMAND_SHORTNAME] = app.tasks.get(cc_task.name)


def schedule_command(funcname, *args, **kwargs):
    call_command = app.tasks[CALL_COMMAND_SHORTNAME]
    task = call_command.delay(
        funcname,
        update_state=call_command.update_state,
        *args, **kwargs
    )
    return task.task_id


def get_task_state(task_id):
    session = Session()
    query = session.query(Task).filter(Task.task_id == task_id)

    return query.one().to_dict()


def get_tasks():
    # current implementation heavily depends on the fact that celery's result
    # backend is an sqlalchemy sqlite DB. Otherwise, celery provides no fast way
    # of querying tasks (since it was designed to be distributed.)

    session = Session()

    for task in session.query(Task):
        yield task.to_dict()


def cancel_task(task_id):
    pass


class TasksViewSet(viewsets.ViewSet):

    def list(self, request):
        return Response(get_tasks())

    def create(self, request):
        data = request.data

        task_id = schedule_command(data["command"], *data["args"], **data["kwargs"])

        return Response(task_id)

    def retrieve(self, request, pk=None):
        if pk:
            return Response(get_task_state(pk))

    def destroy(self, request, pk=None):
        if pk:
            return Response(cancel_task(pk))

    # convenience functions for triggering often used tasks

    @list_route(methods=['post'])
    def startdownloadchannel(self, request):
        '''Download a channel's database from the main curation server, and then
        download its content.

        '''
        pass

    @list_route(methods=['post'])
    def startlocalimportchannel(self, request):
        '''
        Import a channel locally, and move content to the local machine.

        '''
        pass

    @list_route(methods=['get'])
    def localdrive(self, request):
        drives = find_kolibri_data_in_mountpoints()

        # make sure everything is a dict, before converting to JSON
        assert isinstance(drives, dict)

        out = []
        for mountdata in drives.values():
            mountdata = mountdata._asdict()
            if mountdata['has_content']:
                mountdata['channels'] = [c._asdict() for c in mountdata['channels']]

            out.append(mountdata)

        return Response(out)
