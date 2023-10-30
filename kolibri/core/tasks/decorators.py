from functools import partial

from kolibri.core.tasks.constants import DEFAULT_QUEUE
from kolibri.core.tasks.constants import Priority
from kolibri.core.tasks.registry import RegisteredTask
from kolibri.core.tasks.validation import JobValidator


def register_task(
    func=None,
    job_id=None,
    queue=DEFAULT_QUEUE,
    validator=JobValidator,
    priority=Priority.REGULAR,
    cancellable=False,
    track_progress=False,
    permission_classes=None,
    long_running=False,
    status_fn=None,
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
            long_running=long_running,
            status_fn=status_fn,
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
        long_running=long_running,
        status_fn=status_fn,
    )
