from functools import partial

from kolibri.core.tasks.constants import DEFAULT_QUEUE
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.registry import RegisteredTask


def register_task(
    func=None,
    job_id=None,
    queue=DEFAULT_QUEUE,
    validator=None,
    priority=Priority.REGULAR,
    cancellable=False,
    track_progress=False,
    permission_classes=None,
):
    """
    Registers the decorated function as task.
    :rtype: RegisteredJob|callable
    """
    if permission_classes is None:
        permission_classes = []
    if func is None:
        return partial(
            register_task,
            job_id=job_id,
            queue=queue,
            validator=validator,
            priority=priority,
            cancellable=cancellable,
            track_progress=track_progress,
            permission_classes=permission_classes,
        )

    return RegisteredTask(
        func,
        job_id=job_id,
        queue=queue,
        validator=validator,
        priority=priority,
        cancellable=cancellable,
        track_progress=track_progress,
        permission_classes=permission_classes,
    )
