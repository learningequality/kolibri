import logging
from functools import partial
from importlib import import_module

from django.apps import apps as django_apps

from kolibri.core.tasks.exceptions import FunctionNotRegisteredAsJob
from kolibri.core.tasks.job import JobRegistry
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.job import RegisteredJob
from kolibri.core.tasks.utils import stringify_func


logger = logging.getLogger(__name__)


class _TaskDecorators(object):
    """
    Task related decorators.
    """

    def __init__(self):
        self.priority = Priority

    def register(
        self,
        func=None,
        job_id=None,
        validator=None,
        permission=None,
        priority=Priority.REGULAR,
    ):
        if func is None:
            return partial(
                self.register,
                job_id=job_id,
                validator=validator,
                permission=permission,
                priority=priority,
            )

        registered_job = RegisteredJob(
            func,
            job_id=job_id,
            validator=validator,
            permission=permission,
            priority=priority,
        )

        # Expose methods to func.
        setattr(func, "enqueue_in", registered_job.set_enqueue_in)
        setattr(func, "enqueue_at", registered_job.set_enqueue_at)
        setattr(func, "initiatetask", registered_job.initiatetask)

        funcstring = stringify_func(func)
        JobRegistry.REGISTERED_JOBS[funcstring] = registered_job

        logger.debug("Successfully registered %s as job", funcstring)

        return func

    def config(
        self,
        func=None,
        group=None,
        cancellable=False,
        track_progress=False,
    ):
        if func is None:
            return partial(
                self.config,
                group=group,
                cancellable=cancellable,
                track_progress=track_progress,
            )

        funcstring = stringify_func(func)

        try:
            registered_job = JobRegistry.REGISTERED_JOBS[funcstring]
        except KeyError:
            raise FunctionNotRegisteredAsJob(
                "Can't apply config decorator. {func} is not registered. First,\
                you must apply register decorator.".format(
                    func=func
                )
            )

        setattr(registered_job.job, "group", group)
        setattr(registered_job.job, "cancellable", cancellable)
        setattr(registered_job.job, "track_progress", track_progress)

        return func


# The below instance is to be used when decorating task functions.
task = _TaskDecorators()


def import_task_modules_frm_django_apps(app_configs=None):
    if app_configs is None:
        app_configs = django_apps.get_app_configs()

    logger.info("Importing 'tasks' modules from django apps...")

    for app_config in app_configs:
        try:
            import_module(".tasks", app_config.module.__name__)
        except ImportError:
            pass
