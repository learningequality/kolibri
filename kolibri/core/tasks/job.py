import copy
import json
import logging
import traceback
import uuid

from django.db import connection as django_connection
from six import string_types

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

    # PriorityOrder is for ordering all the priority levels in their
    # descending order of priority. Used for fetching the next queued job.
    PriorityOrder = [HIGH, REGULAR]


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

    def to_json(self):
        """
        Creates and returns a JSON-serialized string representing this Job.
        This is how Job objects are persisted through restarts.
        This storage method is why task exceptions are stored as strings.
        """

        keys = [
            "job_id",
            "state",
            "exception",
            "traceback",
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

        working_dictionary = {
            key: self.__dict__[key] for key in keys if key in self.__dict__
        }

        try:
            string_result = json.dumps(working_dictionary)
        except TypeError as e:
            # A Job's arguments, results, or metadata are prime suspects for
            # what might cause this error.
            raise TypeError(
                "Job objects need to be JSON-serializable: {}".format(str(e))
            )
        return string_result

    @classmethod
    def from_json(cls, json_string):
        working_dictionary = json.loads(json_string)

        # func is required for a Job so it will always be in working_dictionary
        func = working_dictionary.pop("func")
        args = working_dictionary.pop("args", ())
        kwargs = working_dictionary.pop("kwargs", {})
        working_dictionary.update(kwargs)

        return Job(func, *args, **working_dictionary)

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
        elif not callable(func) and not isinstance(func, string_types):
            raise TypeError(
                "Cannot create Job for object of type {}".format(type(func))
            )

        job_id = kwargs.pop("job_id", None)
        if job_id is None:
            job_id = uuid.uuid4().hex

        exc = kwargs.pop("exception", None)
        if isinstance(exc, Exception):
            exc = type(exc).__name__

        self.job_id = job_id
        self.state = kwargs.pop("state", State.PENDING)
        self.exception = exc
        self.traceback = kwargs.pop("traceback", None)
        self.track_progress = kwargs.pop("track_progress", False)
        self.cancellable = kwargs.pop("cancellable", False)
        self.extra_metadata = kwargs.pop("extra_metadata", {})
        self.progress = kwargs.pop("progress", 0)
        self.total_progress = kwargs.pop("total_progress", 0)
        self.result = kwargs.pop("result", None)
        self.args = args
        self.kwargs = kwargs
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
            self.progress = progress
            self.total_progress = total_progress
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
        self.cancellable = cancellable
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
        validator,
        priority,
        permission_classes,
        queue,
        job_id,
        cancellable,
        track_progress,
    ):
        if permission_classes is None:
            permission_classes = []
        if validator is not None and not callable(validator):
            raise TypeError("Can't assign validator of type {}".format(type(validator)))
        elif priority.upper() not in Priority.PriorityOrder:
            raise ValueError("priority must be one of 'regular' or 'high' (string).")
        elif not isinstance(permission_classes, list):
            raise TypeError("permission_classes must be of list type.")
        elif not isinstance(queue, string_types):
            raise TypeError("queue must be of string type.")

        self.func = func
        self.validator = validator
        self.priority = priority.upper()
        self.queue = queue

        self.permissions = [perm() for perm in permission_classes]

        self.job_id = job_id
        self.cancellable = cancellable
        self.track_progress = track_progress

    def enqueue(self, *args, **kwargs):
        """
        Enqueue the function with arguments passed to this method.

        :return: enqueued job's id.
        """
        from kolibri.core.tasks.main import job_storage

        job_obj = self._ready_job(*args, **kwargs)
        return job_storage.enqueue_job(job_obj, self.queue, self.priority)

    def enqueue_in(self, delta_time, interval=0, repeat=0, args=(), kwargs=None):
        """
        Schedule the function to get enqueued in `delta_time` with args and
        kwargs as its positional and keyword arguments.

        Repeat of None with a specified interval means the job will repeat
        forever at that interval.

        :return: scheduled job's id.
        """
        if kwargs is None:
            kwargs = {}
        from kolibri.core.tasks.main import scheduler

        job_obj = self._ready_job(*args, **kwargs)
        return scheduler.enqueue_in(
            func=job_obj,
            delta_t=delta_time,
            interval=interval,
            repeat=repeat,
        )

    def enqueue_at(self, datetime, interval=0, repeat=0, args=(), kwargs=None):
        """
        Schedule the function to get enqueued at a specific `datetime` with
        args and kwargs as its positional and keyword arguments.

        Repeat of None with a specified interval means the job will repeat
        forever at that interval.

        :return: scheduled job's id.
        """
        if kwargs is None:
            kwargs = {}
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
