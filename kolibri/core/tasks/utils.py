import concurrent.futures
import logging
import os
import sqlite3
import time
import uuid
from threading import Thread

import click
from django.utils.functional import SimpleLazyObject
from django.utils.module_loading import import_string
from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy import exc

from kolibri.core.sqlite.utils import check_sqlite_integrity
from kolibri.core.sqlite.utils import repair_sqlite_db
from kolibri.core.tasks.exceptions import UserCancelledError
from kolibri.utils import conf
from kolibri.utils import multiprocessing_compat
from kolibri.utils.options import FD_PER_THREAD
from kolibri.utils.system import get_fd_limit


logger = logging.getLogger(__name__)

# An object on which to store data about the current job
# So far the only use is to track the job, but other metadata
# could be added.
current_state_tracker = SimpleLazyObject(multiprocessing_compat.local)


def get_current_job():
    """
    :rtype: kolibri.core.tasks.job.Job
    """
    return getattr(current_state_tracker, "job", None)


def callable_to_import_path(func):
    if callable(func):
        funcstring = "{module}.{funcname}".format(
            module=func.__module__, funcname=func.__name__
        )
    elif isinstance(func, str):
        funcstring = func
    else:
        raise TypeError("Can't handle a function of type {}".format(type(func)))

    return funcstring


def import_path_to_callable(funcstring):
    """
    Import a string that represents a module and function, e.g. {module}.{funcname}.

    Given a function f, import_stringified_func(stringify_func(f)) will return the same function.
    :param funcstring: String to try to import
    :return: callable
    """
    try:
        return import_string(funcstring)
    except AttributeError:
        raise ImportError("Invalid module path: {}".format(funcstring))


class InfiniteLoopThread(Thread):
    """A class that runs a given function an infinite number of times, until told to shut down."""

    DEFAULT_TIMEOUT_SECONDS = 0.001

    def __init__(self, func, thread_name, wait_between_runs=1, *args, **kwargs):
        """
        Run the given func continuously until either shutdown_event is set, or the python interpreter exits.
        :param func: the function to run. This should accept no arguments.
        :param thread_name: the name of the thread to use during logging and debugging
        :param wait_between_runs: how many seconds to wait in between func calls.
        """
        self.shutdown_event = multiprocessing_compat.Event()
        self.thread_name = thread_name
        self.thread_id = uuid.uuid4().hex
        self.logger = logging.getLogger(
            "{module}".format(module=__name__.split(".")[0])
        )
        self.full_thread_name = "{thread_name}-{thread_id}".format(
            thread_name=self.thread_name, thread_id=self.thread_id
        )
        super(InfiniteLoopThread, self).__init__(
            name=self.full_thread_name, *args, **kwargs
        )
        self.func = func
        self.wait = wait_between_runs

    def run(self):
        self.logger.debug(
            "Started new {name} thread ID#{id}".format(
                name=self.thread_name, id=self.thread_id
            )
        )

        while True:
            if self.shutdown_event.wait(self.DEFAULT_TIMEOUT_SECONDS):
                self.logger.debug(
                    "{name} shut down event received; closing.".format(
                        name=self.thread_name
                    )
                )
                break
            else:
                self.main_loop()
                continue

    def main_loop(self):
        """
        The main loop of a thread. Run this loop if we haven't received any shutdown events in the last
        timeout seconds. Normally this is used to read from a queue; the func can return an argument that
        indicates how long the function took to execute, and to correct the waiting time on the next
        interval - this is useful if you want the function to run at a fixed interval.
        :return: None
        """
        try:
            corrected_time = self.func()
        except Exception as e:
            self.logger.warning(
                "Got an exception running {func}: {e}".format(func=self.func, e=str(e))
            )
            corrected_time = 0

        wait = self.wait - (corrected_time if corrected_time is not None else 0)

        if wait > 0:
            time.sleep(wait)

    def stop(self):
        self.shutdown_event.set()

    def shutdown(self):
        self.stop()


def create_db_url(
    db_type, path=None, name=None, password=None, user=None, host=None, port=None
):
    if db_type == "sqlite":
        return "sqlite:///{path}".format(path=path)
    elif db_type == "postgres":
        return "postgresql://{user}:{password}@{host}{port}/{name}".format(
            name=name,
            password=password,
            user=user,
            host=host,
            port=":" + port if port else "",
        )


def make_connection(db_type, url):
    if db_type == "sqlite":
        kwargs = dict(
            connect_args={"check_same_thread": False},
        )

    elif db_type == "postgres":
        kwargs = dict(
            pool_pre_ping=True,
            client_encoding="utf8",
        )
    else:
        raise Exception("Unknown database engine option: {}".format(db_type))

    connection = create_engine(url, **kwargs)

    # Add multiprocessing safeguards as recommended by:
    # https://docs.sqlalchemy.org/en/13/core/pooling.html#pooling-multiprocessing
    # Don't make a connection before we've added the multiprocessing guards
    # as otherwise we will have a connection that doesn't have the 'pid' attribute set.
    @event.listens_for(connection, "connect")
    def connect(dbapi_connection, connection_record):
        connection_record.info["pid"] = os.getpid()

    @event.listens_for(connection, "checkout")
    def checkout(dbapi_connection, connection_record, connection_proxy):
        pid = os.getpid()
        if connection_record.info["pid"] != pid:
            connection_record.connection = connection_proxy.connection = None
            raise exc.DisconnectionError(
                "Connection record belongs to pid %s, attempting to check out in pid %s"
                % (connection_record.info["pid"], pid)
            )

    return connection


def db_connection():
    db_url = create_db_url(
        conf.OPTIONS["Database"]["DATABASE_ENGINE"],
        path=conf.OPTIONS["Tasks"]["JOB_STORAGE_FILEPATH"],
        name=conf.OPTIONS["Database"]["DATABASE_NAME"],
        password=conf.OPTIONS["Database"]["DATABASE_PASSWORD"],
        user=conf.OPTIONS["Database"]["DATABASE_USER"],
        host=conf.OPTIONS["Database"]["DATABASE_HOST"],
        port=conf.OPTIONS["Database"]["DATABASE_PORT"],
    )
    connection = make_connection(
        conf.OPTIONS["Database"]["DATABASE_ENGINE"],
        db_url,
    )

    # Check if the database is corrupted
    try:
        check_sqlite_integrity(connection)
    except (exc.DatabaseError, sqlite3.DatabaseError):
        logger.warning("Job storage database has been corrupted, regenerating")
        repair_sqlite_db(connection)

    return connection


class ProgressTracker:
    def __init__(self, total=100):

        # set default values
        self.progress = 0
        self.message = ""
        self.extra_data = None

        # store provided arguments
        self.total = total

        # Check that we are executing inside a click context
        # as we only want to display progress bars from the command line.
        try:
            click.get_current_context()
            # Coerce to an integer for safety, as click uses Python `range` on this
            # value, which requires an integer argument
            # N.B. because we are only doing this in Python3, safe to just use int,
            # as long is Py2 only
            self.progressbar = click.progressbar(length=int(total), width=0)
        except RuntimeError:
            self.progressbar = None

    def set_progress(self, current_progress, message):
        increment = current_progress - self.progress
        self.progress = current_progress
        self._update_progress_state(increment, message)

    def update_progress(self, increment, message):
        self.progress += increment
        self._update_progress_state(increment, message)

    def _update_progress_state(self, increment, message):
        # Ensure that we don't go over the total
        if self.progress > self.total:
            logger.debug(
                "Attempted to increment progress by {} on current progress {} and total progress {}".format(
                    increment, self.progress - increment, self.total
                )
            )
            self.progress = min(self.progress, self.total)

        if self.progressbar:
            # Click only enforces integers on the total (because it is implemented assuming a length)
            # it also handles clamping to the total internally.
            self.progressbar.update(increment)
            if message:
                self.progressbar.label = message


class JobProgressMixin(object):
    """A mixin with convenience functions for displaying
    progress to the user, and updating progress on a job.

    If ran from the command line, code here displays a progress bar to the
    user. If ran asynchronously this mixin sends results through the Job class
    to the main job storage database. Anyone who knows the task id for the
    job instance can check the intermediate progress by looking at the Job's progress.
    """

    def __init__(self, *args, **kwargs):
        self.progresstracker = None
        self.job = get_current_job()
        super(JobProgressMixin, self).__init__(*args, **kwargs)

    def update_progress(
        self, increment=None, message="", current_progress=None, extra_data=None
    ):
        if current_progress is None and increment is None:
            increment = 1
        if self.progresstracker:
            if current_progress is not None:
                self.progresstracker.set_progress(current_progress, message)
            else:
                self.progresstracker.update_progress(increment, message)
        if self.job:
            new_progress = (
                self.job.progress + increment
                if increment is not None
                else current_progress
            )
            if new_progress > self.job.total_progress:
                logger.debug(
                    "Attempted to increment progress by {} on current progress {} and total progress {}".format(
                        increment, self.job.progress, self.job.total_progress
                    )
                )
                # Only set the job progress to a max of the total progress
                new_progress = self.job.total_progress
            self.job.update_progress(new_progress, self.job.total_progress)
            if extra_data and isinstance(extra_data, dict):
                self.job.update_metadata(**extra_data)

    def update_job_metadata(self, **kwargs):
        if self.job:
            self.job.update_metadata(**kwargs)

    def check_for_cancel(self):
        if self.job:
            self.job.check_for_cancel()

    def start_progress(self, total=100):
        self.progresstracker = ProgressTracker(total=total)
        if self.job:
            self.job.update_progress(0, total)
        return self

    def __enter__(self):
        return self.update_progress

    def __exit__(self, *args, **kwargs):
        self.progresstracker = None

    def is_cancelled(self):
        try:
            self.check_for_cancel()
            return False
        except (UserCancelledError, KeyError):
            return True


def fd_safe_executor(fds_per_task=2):
    """
    Context manager to give an executor that should be safe for not overloading
    file descriptors.
    """
    # We should be deferring to conf.OPTIONS["Tasks"]["USE_WORKER_MULTIPROCESSING"]
    # for this value, but unfortunately, the current way that the import logic
    # is setup relies on shared memory that can only be used with threads.
    use_multiprocessing = False

    executor = (
        concurrent.futures.ProcessPoolExecutor
        if use_multiprocessing
        else concurrent.futures.ThreadPoolExecutor
    )

    max_workers = 10

    if not use_multiprocessing:
        # If we're not using multiprocessing for workers, we may need
        # to limit the number of workers depending on the number of allowed
        # file descriptors.
        # This is a heuristic method, where we know there can be issues if
        # the max number of file descriptors for a process is 256, and we use 10
        # workers, with potentially 4 concurrent tasks downloading files.
        # The number of concurrent tasks that might be downloading files is determined
        # by the number of regular workers running in the task runner
        # (although the high priority task queue could also be running a channel database download).
        server_reserved_fd_count = (
            FD_PER_THREAD * conf.OPTIONS["Server"]["CHERRYPY_THREAD_POOL"]
        )
        max_descriptors_per_task = (
            get_fd_limit() - server_reserved_fd_count
        ) / conf.OPTIONS["Tasks"]["REGULAR_PRIORITY_WORKERS"]
        # Each task only needs to have a maximum of `fds_per_task` open file descriptors at once.
        # To add tolerance, we divide the number of file descriptors that could be allocated to
        # this task by double this number which should give us leeway in case of unforeseen
        # descriptor use during the process.
        max_workers = min(
            max_workers, min(1, max_descriptors_per_task // (fds_per_task * 2))
        )

    return executor(max_workers=max_workers)
