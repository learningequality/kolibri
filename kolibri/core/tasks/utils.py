import logging
import os
import sqlite3
import time
import uuid
from threading import Thread

from django.utils.functional import SimpleLazyObject
from django.utils.module_loading import import_string
from six import string_types
from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy import exc

from kolibri.core.sqlite.utils import check_sqlite_integrity
from kolibri.core.sqlite.utils import repair_sqlite_db
from kolibri.core.tasks import compat
from kolibri.utils import conf


logger = logging.getLogger(__name__)

# An object on which to store data about the current job
# So far the only use is to track the job, but other metadata
# could be added.
current_state_tracker = SimpleLazyObject(compat.local)


def get_current_job():
    return getattr(current_state_tracker, "job", None)


def stringify_func(func):
    if callable(func):
        funcstring = "{module}.{funcname}".format(
            module=func.__module__, funcname=func.__name__
        )
    elif isinstance(func, string_types):
        funcstring = func
    else:
        raise TypeError("Can't handle a function of type {}".format(type(func)))

    return funcstring


def import_stringified_func(funcstring):
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
        self.shutdown_event = compat.Event()
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
