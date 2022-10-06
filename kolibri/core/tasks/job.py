import copy
import json
import logging
import traceback
import uuid

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

    SELECTED means the Job has been picked up by the worker controller as a next
    job to pass to its workers, but that it has not actually started running yet.

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
    SELECTED = "SELECTED"
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
            "long_running",
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
        kwargs["long_running"] = job.long_running
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
        long_running=False,
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
        self.long_running = long_running
        self.extra_metadata = extra_metadata or {}
        self.progress = progress
        self.total_progress = total_progress
        self.result = result
        self.args = args
        self.kwargs = kwargs or {}
        self._storage = None
        self.func = stringify_func(func)

    def _check_storage_attached(self):
        if self._storage is None:
            raise ReferenceError(
                "storage is not defined on this job, cannot update status or execute job"
            )

    @property
    def storage(self):
        self._check_storage_attached()
        return self._storage

    @storage.setter
    def storage(self, value):
        self._storage = value

    def save_meta(self):
        self.storage.save_job_meta(self)

    def update_progress(self, progress, total_progress):
        if self.track_progress:
            self.progress = progress
            self.total_progress = total_progress
            self.storage.update_job_progress(self.job_id, progress, total_progress)

    def check_for_cancel(self):
        if self.cancellable:
            if self.storage.check_job_canceled(self.job_id):
                raise UserCancelledError()

    def save_as_cancellable(self, cancellable=True):
        # if we're not changing cancellability then ignore
        if self.cancellable == cancellable:
            return
        self.cancellable = cancellable
        self.storage.save_job_as_cancellable(self.job_id, cancellable=cancellable)

    def execute(self):
        self._check_storage_attached()

        setattr(current_state_tracker, "job", self)

        func = import_stringified_func(self.func)

        args, kwargs = copy.copy(self.args), copy.copy(self.kwargs)

        try:
            # First check whether the job has been cancelled
            self.check_for_cancel()
            result = func(*args, **kwargs)
            self.storage.complete_job(self.job_id, result=result)
        except UserCancelledError:
            self.storage.mark_job_as_canceled(self.job_id)
        except Exception as e:
            # If any error occurs, mark the job as failed and save the exception
            traceback_str = traceback.format_exc()
            e.traceback = traceback_str
            logger.error(
                "Job {} raised an exception: {}".format(self.job_id, traceback_str)
            )
            self.storage.mark_job_as_failed(self.job_id, e, traceback_str)

        setattr(current_state_tracker, "job", None)

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
