import logging
from functools import partial
from importlib import import_module

from django.apps import apps as django_apps

from kolibri.core.tasks.job import JobRegistry
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.job import RegisteredJob
from kolibri.core.tasks.utils import stringify_func


logger = logging.getLogger(__name__)


class _TaskDecorators(object):
    """
    Task related decorators.
    """

    def register(
        self,
        func=None,
        job_id=None,
        validator=None,
        priority=Priority.REGULAR,
        group=None,
        cancellable=False,
        track_progress=False,
    ):
        if func is None:
            return partial(
                self.register,
                job_id=job_id,
                validator=validator,
                priority=priority,
                group=group,
                cancellable=cancellable,
                track_progress=track_progress,
            )

        registered_job = RegisteredJob(
            func,
            job_id=job_id,
            validator=validator,
            priority=priority,
            group=group,
            cancellable=cancellable,
            track_progress=track_progress,
        )

        # Expose registered_job's api to func.
        setattr(func, "task", registered_job)

        funcstring = stringify_func(func)
        JobRegistry.REGISTERED_JOBS[funcstring] = registered_job

        logger.debug("Successfully registered '%s' as job", funcstring)

        return func


# The below instance is to be used when decorating task functions.
task = _TaskDecorators()


def import_tasks_module_from_django_apps(app_configs=None):
    if app_configs is None:
        app_configs = django_apps.get_app_configs()

    logger.info("Importing 'tasks' module from django apps")

    for app_config in app_configs:
        try:
            import_module(".tasks", app_config.module.__name__)
        except ImportError:
            pass
