from functools import partial

from kolibri.core.tasks.job import Default
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.job import RegisteredJob
from kolibri.core.tasks.job import Registry
from kolibri.core.tasks.utils import stringify_func


class TaskDecorators(object):
    """
    Task related decorators.
    """

    def __init__(self):
        self.priority = Priority

    def register(
        self,
        func=None,
        validator=Default.VALIDATOR,
        permission=Default.PERMISSION,
        priority=Default.PRIORITY,
    ):
        if func is None:
            return partial(
                self.register,
                validator=validator,
                permission=permission,
                priority=priority,
            )

        registered_job = RegisteredJob(
            func, validator=validator, permission=permission, priority=priority
        )

        funcstring = stringify_func(func)
        Registry.REGISTERED_JOBS[funcstring] = registered_job

        return func

    def config(
        self,
        func=None,
        group=Default.GROUP,
        cancellable=Default.CANCELLABLE,
        track_progress=Default.TRACK_PROGRESS,
    ):
        pass
