import copy
import json
import logging
import traceback
import uuid
from collections import namedtuple

from kolibri.core.tasks.constants import (  # noqa F401 - imported for backwards compatibility
    Priority,
)
from kolibri.core.tasks.exceptions import JobNotRunning
from kolibri.core.tasks.exceptions import UserCancelledError
from kolibri.core.tasks.utils import callable_to_import_path
from kolibri.core.tasks.utils import current_state_tracker
from kolibri.core.tasks.utils import import_path_to_callable
from kolibri.core.tasks.validation import validate_interval
from kolibri.core.tasks.validation import validate_priority
from kolibri.core.tasks.validation import validate_repeat
from kolibri.core.tasks.validation import validate_timedelay
from kolibri.utils import translation
from kolibri.utils.translation import gettext as _

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


JobStatus = namedtuple("Status", ("title", "text"))


def default_status_text(job):
    if job.state == State.COMPLETED:
        # Translators: Message shown to indicate that a background process has finished successfully.
        return _("Complete")
    elif job.state == State.FAILED or job.state == State.CANCELED:
        # Translators: Message shown to indicate that a background process has failed.
        return _("Failed")
    elif job.state == State.CANCELED:
        # Translators: Message shown to indicate that a background process has been cancelled.
        return _("Cancelled")
    elif job.state == State.RUNNING and job.percentage_progress:
        # Translators: Message shown to indicate the percentage completed of a background process.
        return _("In progress - {percent}%").format(
            percent=round(job.percentage_progress * 100)
        )
    # Translators: Message shown to indicate that while a background process has started, no progress can be reported yet.
    return _("Waiting")


ALLOWED_RETRY_IN_KWARGS = {"priority", "repeat", "interval", "retry_interval"}


class Job(object):
    """
    Job represents a function whose execution has been deferred through the Client's schedule function.

    Jobs are stored on the storage backend for persistence through restarts, and are scheduled for running
    to the workers.
    """

    UPDATEABLE_KEYS = {
        "state",
        "exception",
        "traceback",
        "track_progress",
        "cancellable",
        "extra_metadata",
        "progress",
        "total_progress",
        "result",
        "args",
        "kwargs",
    }

    JSON_KEYS = UPDATEABLE_KEYS | {
        "job_id",
        "facility_id",
        "func",
        "long_running",
    }

    def to_json(self):
        """
        Creates and returns a JSON-serialized string representing this Job.
        This is how Job objects are persisted through restarts.
        This storage method is why task exceptions are stored as strings.
        """

        working_dictionary = {
            key: self.__dict__[key] for key in self.JSON_KEYS if key in self.__dict__
        }

        try:
            # Ensure a consistent and compact JSON representation across Python versions
            string_result = json.dumps(working_dictionary, separators=(",", ":"))
        except TypeError as e:
            # A Job's arguments, results, or metadata are prime suspects for
            # what might cause this error.
            raise TypeError("Job objects need to be JSON-serializable") from e
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
        if not callable(func) and not isinstance(func, str):
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
        self.func = callable_to_import_path(func)

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

    def update_metadata(self, **kwargs):
        for key, value in kwargs.items():
            self.extra_metadata[key] = value
        self.save_meta()

    def update_worker_info(self, host=None, process=None, thread=None, extra=None):
        self.storage.save_worker_info(
            self.job_id,
            host=host,
            process=process,
            thread=thread,
            extra=extra,
        )

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

    def retry_in(self, dt, **kwargs):
        if getattr(current_state_tracker, "job", None) is not self:
            raise JobNotRunning(
                "retry_in can only be called from within a running job about the currently running job"
            )
        validate_timedelay(dt)
        self._retry_in_delay = dt
        for key in kwargs:
            if key not in ALLOWED_RETRY_IN_KWARGS:
                raise ValueError(
                    "retry_in got an unexpected keyword argument '{}'".format(key)
                )
        if "priority" in kwargs:
            validate_priority(kwargs["priority"])

        if "repeat" in kwargs:
            validate_repeat(kwargs["repeat"])

        if "interval" in kwargs:
            validate_interval(kwargs["interval"])

        if "retry_interval" in kwargs:
            validate_interval(kwargs["retry_interval"])

        self._retry_in_kwargs = kwargs

    def execute(self):
        self._check_storage_attached()

        self.storage.mark_job_as_running(self.job_id)

        setattr(current_state_tracker, "job", self)

        self._retry_in_delay = None
        self._retry_in_kwargs = {}

        func = self.task

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

        self.storage.reschedule_finished_job_if_needed(
            self.job_id, delay=self._retry_in_delay, **self._retry_in_kwargs
        )
        setattr(current_state_tracker, "job", None)

    @property
    def task(self):
        """
        In theory we could read this from the task registry instead
        but as this is running inside an ephemeral task runner thread
        or process, we can potentially save ourselves some initialization
        time and memory by just importing just this function - whereas initializing
        the registry would import all of the registered tasks for this Kolibri.
        This is less of an issue when the task runner is using threads and has
        shared memory, but when it is using multiprocessing or is running in another
        context, this will save some time.

        We don't bother caching this property, as we rely on the Python module import cache instead.
        """
        return import_path_to_callable(self.func)

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

    def status(self, lang):
        with translation.override(lang):
            return self.task.generate_status(self)


def log_status(job, orm_job, state=None, **kwargs):
    """
    An example handler for task update hooks.
    All it does is attempt to generate a status object for the job
    and log it if it returns one.
    """

    status = job.status(translation.get_language())
    if status:
        logging.info(status.title)
        if status.text:
            logging.info(status.text)
