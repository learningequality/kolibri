import logging
from functools import partial

from kolibri.core.tasks.job import JobRegistry
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.job import RegisteredJob
from kolibri.core.tasks.utils import stringify_func


logger = logging.getLogger(__name__)


def register_task(
    func=None,
    job_id=None,
    validator=None,
    priority=Priority.REGULAR,
    cancellable=False,
    track_progress=False,
    permission_classes=[],
):
    """
    Registers the decorated function as task.
    """
    if func is None:
        return partial(
            register_task,
            job_id=job_id,
            validator=validator,
            priority=priority,
            cancellable=cancellable,
            track_progress=track_progress,
            permission_classes=permission_classes,
        )

    registered_job = RegisteredJob(
        func,
        job_id=job_id,
        validator=validator,
        priority=priority,
        cancellable=cancellable,
        track_progress=track_progress,
        permission_classes=permission_classes,
    )

    func.enqueue = registered_job.enqueue
    func.enqueue_in = registered_job.enqueue_in
    func.enqueue_at = registered_job.enqueue_at

    funcstring = stringify_func(func)
    JobRegistry.REGISTERED_JOBS[funcstring] = registered_job

    logger.debug("Successfully registered '%s' as job.", funcstring)

    return func
