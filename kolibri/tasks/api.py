import importlib
from celery import Celery
from celery.backends.database.models import Task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from django.core.management import get_commands, call_command

import logging as logger

logging = logger.getLogger(__name__)


app = Celery()
app.config_from_object('kolibri.deployment.default.celeryconfig.default')


CELERY_BACKEND_CONNECTION = create_engine(app.broker_connection().hostname)
Session = sessionmaker(bind=CELERY_BACKEND_CONNECTION)
CALL_COMMAND_SHORTNAME = 'kolibri.call_command'


def setup_celery_for_management_commands():

    # import all management commands, so when the worker forks, it has them in memory.

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


def _get_function_object(name):
    module_name, function_name = name.rsplit('.', 1)
    module = importlib.import_module(module_name)
    return getattr(module, function_name)


# look into viewsets
# management commands?
