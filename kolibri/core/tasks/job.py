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
    All jobs that get registered via `task.register` decorator are placed
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
    might affect user experience (e.g. on screen loading animation) like facility syncing,
    csv export/import should use this priority.
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
            "group",
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
            kwargs["group"] = func.group
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
        self.group = kwargs.pop("group", None)
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
    This class's instance represents the API available to functions registered via decorator.

    Suppose, `add` is registered as:

        @task.config(group="math")
        @task.register(priority=task.priority.HIGH)
        def add(x, y):
            return x + y

    Then, we can schedule `add` as `add.enqueue_in(delta_time_arg).initiatetask(args)` or
    `add.enqueue_at(datetime_arg).initiatetask(args)`.

    Also, we can directly queue the task by calling `add.initiatetask(args)`.
    `add` will get enqueued in "math" group and on HIGH priority.

    This design should allow very easy expansion of capabilities.
    """

    def __init__(self, func, *args, **kwargs):
        # These three attributes are specific to a job that is registered.
        # When func.initiatetask(...) is called, first self.validator is run, upon success,
        # we enqueue func based on self.priority.
        # self.permission will ONLY be used when the task gets submitted via the API endpoint.
        self.validator = kwargs.pop("validator", None)
        self.permission = kwargs.pop("permission", None)
        self.priority = kwargs.pop("priority", Priority.REGULAR)

        self.job = Job(func, *args, **kwargs)

        self.enqueue_in_params = None
        self.enqueue_at_params = None

    def set_enqueue_in(self, delta_time, interval=0, repeat=0):
        """
        Set required attributes for enqueuing in given timedelta.
        :return: the instance itself (self).
        """
        setattr(self.enqueue_in_params, "delta_time", delta_time)
        setattr(self.enqueue_in_params, "interval", interval)
        setattr(self.enqueue_in_params, "repeat", repeat)
        self.enqueue_at_params = None
        return self

    def set_enqueue_at(self, specific_time, interval=0, repeat=0):
        """
        Set required attributes for enqueuing at a given datetime.
        :return: the instance itself (self).
        """
        setattr(self.enqueue_at_params, "specific_time", specific_time)
        setattr(self.enqueue_at_params, "interval", interval)
        setattr(self.enqueue_at_params, "repeat", repeat)
        self.enqueue_in_params = None
        return self

    def initiatetask(self, *args, **kwargs):
        print("Task initiated")
