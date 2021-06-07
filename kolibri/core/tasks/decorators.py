from functools import partial

from kolibri.core.tasks.exceptions import FunctionNotRegisteredAsJob
from kolibri.core.tasks.job import JobRegistry
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.job import RegisteredJob
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
        validator=None,
        permission=None,
        priority=Priority.REGULAR,
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

        # Expose methods to func.
        setattr(func, "enqueue_in", registered_job.set_enqueue_in)
        setattr(func, "enqueue_at", registered_job.set_enqueue_at)
        setattr(func, "initiatetask", registered_job.initiatetask)

        funcstring = stringify_func(func)
        JobRegistry.REGISTERED_JOBS[funcstring] = registered_job

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


task = TaskDecorators()
