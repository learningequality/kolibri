import copy
import logging
import traceback
import uuid

from django.db import connection as django_connection

from kolibri.core.tasks.exceptions import UserCancelledError
from kolibri.core.tasks.utils import current_state_tracker
from kolibri.core.tasks.utils import import_stringified_func
from kolibri.core.tasks.utils import stringify_func

logger = logging.getLogger(__name__)


class JobRegistry(object):
    """
    All jobs that get registered via `register_task` decorator are placed
    in below REGISTERED_JOBS dictionary.

    REGISTERED_JOBS dictionary's key is the stringified form of decorated function and value
    is an instance of `RegisteredJob`. For example,

        {
            ...
            "kolibri.core.content.tasks.importchannel": <RegisteredJob>,
            "kolibri.core.content.tasks.exportchannel": <RegisteredJob>,
            ...
        }
    """

    REGISTERED_JOBS = {}


class State(object):
    """
    The State object enumerates a Job's possible valid states.

    PENDING means the Job object has been created, but it has not been queued
    for running.

    SCHEDULED means the Job has been accepted by the client, but has not been
    sent to the workers for running.

    QUEUED means the Job has been sent to the workers for running, but has not
    been run yet (to our knowledge).

    RUNNING means that one of the workers has started running the job, but is not
    complete yet. If the job has been set to track progress, then the job's progress
    and total_progress fields should be continuously updated.

    FAILED means that the job's function has raised an exception during runtime.
    The job's exception and traceback fields should be set.

    CANCELING means that the system has received the user's request to cancel, and will
    cancel the job once an opportunity arises.

    CANCELED means that the job has been canceled from running.

    COMPLETED means that the function has run to completion. The job's result field
    should be set with the function's return value.
    """

    PENDING = "PENDING"
    SCHEDULED = "SCHEDULED"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    FAILED = "FAILED"
    CANCELING = "CANCELING"
    CANCELED = "CANCELED"
    COMPLETED = "COMPLETED"


class Priority(object):
    """
    This class defines the priority levels and their corresponding string values.

    REGULAR priority is for tasks that can wait for some time before it actually
    starts executing. Tasks that are tracked on task manager should use this priority.

    HIGH priority is for tasks that want execution as soon as possible. Tasks that
    might affect user experience (e.g. on screen loading animation) like importing
    channel metadata.
    """

    REGULAR = "REGULAR"
    HIGH = "HIGH"


def execute_job(job_id, db_type, db_url):
    """
    Call the function stored in the job.func.
    :return: Any
    """
    from kolibri.core.tasks.main import make_connection
    from kolibri.core.tasks.storage import Storage

    connection = make_connection(db_type, db_url)

    storage = Storage(connection)

    job = storage.get_job(job_id)

    setattr(current_state_tracker, "job", job)

    func = import_stringified_func(job.func)

    args, kwargs = copy.copy(job.args), copy.copy(job.kwargs)

    try:
        result = func(*args, **kwargs)
    except Exception as e:
        # If any error occurs, clear the job tracker and reraise
        setattr(current_state_tracker, "job", None)
        traceback_str = traceback.format_exc()
        e.traceback = traceback_str
        connection.dispose()
        # Close any django connections opened here
        django_connection.close()
        raise

    setattr(current_state_tracker, "job", None)

    connection.dispose()

    # Close any django connections opened here
    django_connection.close()

    return result


class Job(object):
    """
    Job represents a function whose execution has been deferred through the Client's schedule function.

    Jobs are stored on the storage backend for persistence through restarts, and are scheduled for running
    to the workers.
    """

    def __getstate__(self):
        keys = [
            "job_id",
            "state",
            "traceback",
            "exception",
            "track_progress",
            "cancellable",
            "extra_metadata",
            "progress",
            "total_progress",
            "args",
            "kwargs",
            "func",
            "result",
        ]
        return {key: self.__dict__[key] for key in keys}

    def __init__(self, func, *args, **kwargs):
        """
        Create a new Job that will run func given the arguments passed to Job(). If the track_progress keyword parameter
        is given, the worker will pass an update_progress function to update interested parties about the function's
        progress. See Client.__doc__ for update_progress's function parameters.

        :param func: func can be a callable object, in which case it is turned into an importable string,
        or it can be an importable string already.
        """
        if isinstance(func, Job):
            args = copy.copy(func.args)
            kwargs = copy.copy(func.kwargs)
            kwargs["track_progress"] = func.track_progress
            kwargs["cancellable"] = func.cancellable
            kwargs["extra_metadata"] = func.extra_metadata.copy()
            func = func.func
        elif not callable(func) and not isinstance(func, str):
            raise TypeError(
                "Cannot create Job for object of type {}".format(type(func))
            )

        job_id = kwargs.pop("job_id", None)
        if job_id is None:
            job_id = uuid.uuid4().hex

        self.job_id = job_id
        self.state = kwargs.pop("state", State.PENDING)
        self.traceback = ""
        self.exception = None
        self.track_progress = kwargs.pop("track_progress", False)
        self.cancellable = kwargs.pop("cancellable", False)
        self.extra_metadata = kwargs.pop("extra_metadata", {})
        self.progress = 0
        self.total_progress = 0
        self.args = args
        self.kwargs = kwargs
        self.result = None
        self.storage = None
        self.func = stringify_func(func)

    def save_meta(self):
        if self.storage is None:
            raise ReferenceError(
                "storage is not defined on this job, cannot save metadata"
            )
        self.storage.save_job_meta(self)

    def update_progress(self, progress, total_progress):
        if self.track_progress:
            if self.storage is None:
                raise ReferenceError(
                    "storage is not defined on this job, cannot update progress"
                )
            self.storage.update_job_progress(self.job_id, progress, total_progress)

    def check_for_cancel(self):
        if self.cancellable:
            if self.storage is None:
                raise ReferenceError(
                    "storage is not defined on this job, cannot check for cancellation"
                )
            if self.storage.check_job_canceled(self.job_id):
                raise UserCancelledError()

    def save_as_cancellable(self, cancellable=True):
        # if we're not changing cancellability then ignore
        if self.cancellable == cancellable:
            return
        if self.storage is None:
            raise ReferenceError(
                "storage is not defined on this job, cannot save as cancellable"
            )
        self.storage.save_job_as_cancellable(self.job_id, cancellable=cancellable)

    @property
    def percentage_progress(self):
        """
        Returns a float between 0 and 1, representing the current job's progress in its task.
        If total_progress is not given or 0, just return self.progress.

        :return: float corresponding to the total percentage progress of the job.
        """

        if self.total_progress != 0:
            return float(self.progress) / self.total_progress
        else:
            return self.progress

    def __repr__(self):
        return (
            "<Job id: {id} state: {state} progress: {p}/{total} func: {func}>".format(
                id=self.job_id,
                state=self.state,
                func=self.func,
                p=self.progress,
                total=self.total_progress,
            )
        )


class RegisteredJob(object):
    """
    This class's instance methods: enqueue, enqueue_at and enqueue_in are binded
    as attributes to functions registered via `register_task` decorator.

    For example, if `add` is registered as:

        @register_task(priority="high", cancellable=True)
        def add(x, y):
            return x + y

        Then, we can enqueue `add` by calling `add.enqueue(4, 2)`.

        Also, we can schedule `add` by calling `add.enqueue_in(timedelta(1), args=(4, 2))`
        or `add.enqueue_at(datetime.now(), args=(4, 2))`.

        Look at each method's docstring for more info.
    """

    def __init__(
        self,
        func,
        validator=None,
        priority=Priority.REGULAR,
        permission_classes=[],
        **kwargs
    ):
        if validator is not None and not callable(validator):
            raise TypeError("Can't assign validator of type {}".format(type(validator)))
        elif priority.upper() not in [Priority.REGULAR, Priority.HIGH]:
            raise ValueError("priority must be one of 'regular' or 'high'.")
        elif not isinstance(permission_classes, list):
            raise TypeError("permission_classes must be of list type.")

        self.func = func
        self.validator = validator
        self.priority = priority.upper()

        self.permissions = [perm() for perm in permission_classes]

        self.job_id = kwargs.pop("job_id", None)
        self.cancellable = kwargs.pop("cancellable", False)
        self.track_progress = kwargs.pop("track_progress", False)

    def enqueue(self, *args, **kwargs):
        """
        Enqueue the function with arguments passed to this method.

        :return: enqueued job's id.
        """
        from kolibri.core.tasks.main import PRIORITY_TO_QUEUE_MAP

        job_obj = self._ready_job(*args, **kwargs)
        queue = PRIORITY_TO_QUEUE_MAP[self.priority]
        return queue.enqueue(func=job_obj)

    def enqueue_in(self, delta_time, interval=0, repeat=0, args=(), kwargs={}):
        """
        Schedule the function to get enqueued in `delta_time` with args and
        kwargs as its positional and keyword arguments.

        Repeat of None with a specified interval means the job will repeat
        forever at that interval.

        :return: scheduled job's id.
        """
        from kolibri.core.tasks.main import scheduler

        job_obj = self._ready_job(*args, **kwargs)
        return scheduler.enqueue_in(
            func=job_obj,
            delta_t=delta_time,
            interval=interval,
            repeat=repeat,
        )

    def enqueue_at(self, datetime, interval=0, repeat=0, args=(), kwargs={}):
        """
        Schedule the function to get enqueued at a specific `datetime` with
        args and kwargs as its positional and keyword arguments.

        Repeat of None with a specified interval means the job will repeat
        forever at that interval.

        :return: scheduled job's id.
        """
        from kolibri.core.tasks.main import scheduler

        job_obj = self._ready_job(*args, **kwargs)
        return scheduler.enqueue_at(
            func=job_obj,
            dt=datetime,
            interval=interval,
            repeat=repeat,
        )

    def _ready_job(self, *args, **kwargs):
        """
        Returns a job object with args and kwargs as its positional and keyword arguments.
        """
        job_obj = Job(
            self.func,
            *args,
            job_id=self.job_id,
            cancellable=self.cancellable,
            track_progress=self.track_progress,
            **kwargs
        )
        return job_obj
