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

    States = {
        PENDING,
        SCHEDULED,
        QUEUED,
        RUNNING,
        FAILED,
        CANCELING,
        CANCELED,
        COMPLETED,
    }


class Priority(object):
    """
    This class defines the priority levels and their corresponding integer values.

    REGULAR priority is for tasks that can wait for some time before it actually
    starts executing. Tasks that are tracked on task manager should use this priority.

    HIGH priority is for tasks that want execution as soon as possible. Tasks that
    might affect user experience (e.g. on screen loading animation) like importing
    channel metadata.
    """

    REGULAR = 10
    HIGH = 5

    # A set of all valid priorities
    Priorities = {HIGH, REGULAR}


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
        # First check whether the job has been cancelled
        job.check_for_cancel()
        result = func(*args, **kwargs)
        storage.complete_job(job_id, result=result)
    except UserCancelledError:
        storage.mark_job_as_canceled(job_id)
    except Exception as e:
        # If any error occurs, mark the job as failed and save the exception
        traceback_str = traceback.format_exc()
        e.traceback = traceback_str
        logger.error("Job {} raised an exception: {}".format(job_id, traceback_str))
        storage.mark_job_as_failed(job_id, e, traceback_str)

    setattr(current_state_tracker, "job", None)

    connection.dispose()

    # Close any django connections opened here
    django_connection.close()


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
            "facility_id",
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
            # Ensure a consistent and compact JSON representation across Python versions
            string_result = json.dumps(working_dictionary, separators=(",", ":"))
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

        return Job(func, **working_dictionary)

    @classmethod
    def from_job(cls, job, **kwargs):
        if not isinstance(job, cls):
            raise TypeError("job must be an instance of {}".format(cls))
        kwargs["args"] = copy.copy(job.args)
        kwargs["kwargs"] = copy.copy(job.kwargs)
        kwargs["track_progress"] = job.track_progress
        kwargs["cancellable"] = job.cancellable
        kwargs["extra_metadata"] = job.extra_metadata.copy()
        kwargs["facility_id"] = job.facility_id
        return cls(job.func, **kwargs)

    def __init__(
        self,
        func,
        args=(),
        kwargs=None,
        facility_id=None,
        job_id=None,
        state=State.PENDING,
        exception=None,
        traceback="",
        track_progress=False,
        cancellable=False,
        extra_metadata=None,
        progress=0,
        total_progress=0,
        result=None,
    ):
        """
        Create a new Job that will run func given the arguments passed to Job(). If the track_progress keyword parameter
        is given, the worker will pass an update_progress function to update interested parties about the function's
        progress.

        :param func: func can be a callable object, in which case it is turned into an importable string,
        or it can be an importable string already.
        """
        if not callable(func) and not isinstance(func, string_types):
            raise TypeError(
                "Cannot create Job for object of type {}".format(type(func))
            )

        if not isinstance(args, (list, tuple)):
            raise TypeError("args must be a list or tuple")

        if kwargs is not None and not isinstance(kwargs, dict):
            raise TypeError("kwargs must be a dict")

        if isinstance(exception, Exception):
            exception = type(exception).__name__

        self.job_id = job_id or uuid.uuid4().hex
        self.facility_id = facility_id
        self.state = state
        self.exception = exception
        self.traceback = traceback
        self.track_progress = track_progress
        self.cancellable = cancellable
        self.extra_metadata = extra_metadata or {}
        self.progress = progress
        self.total_progress = total_progress
        self.result = result
        self.args = args
        self.kwargs = kwargs or {}
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
