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


class State(object):
    """
    the State object enumerates a Job's possible valid states.

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

    SCHEDULED = "SCHEDULED"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    FAILED = "FAILED"
    CANCELING = "CANCELING"
    CANCELED = "CANCELED"
    COMPLETED = "COMPLETED"


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
        # Close any django connections opened here
        django_connection.close()
        raise

    setattr(current_state_tracker, "job", None)

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

        job_id = kwargs.pop("job_id", None)
        if job_id is None:
            job_id = uuid.uuid4().hex

        self.job_id = job_id
        self.state = kwargs.pop("state", State.QUEUED)
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

        if callable(func):
            funcstring = stringify_func(func)
        elif isinstance(func, str):
            funcstring = func
        else:
            raise Exception(
                "Error in creating job. We do not know how to "
                "handle a function of type {}".format(type(func))
            )

        self.func = funcstring

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
