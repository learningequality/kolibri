import importlib
import logging
import os
import time
import uuid

try:
    from thread import get_ident
except ImportError:
    from threading import get_ident

from kolibri.core.tasks import compat
from kolibri.core.utils.cache import process_cache


# An object on which to store data about the current job
# So far the only use is to track the job, but other metadata
# could be added.
current_state_tracker = compat.local()


def get_current_job():
    return getattr(current_state_tracker, "job", None)


def stringify_func(func):
    if not callable(func):
        raise TypeError(
            "function {} passed to stringify_func isn't a function!".format(func)
        )

    fqn = "{module}.{funcname}".format(module=func.__module__, funcname=func.__name__)
    return fqn


def import_stringified_func(funcstring):
    """
    Import a string that represents a module and function, e.g. {module}.{funcname}.

    Given a function f, import_stringified_func(stringify_func(f)) will return the same function.
    :param funcstring: String to try to import
    :return: callable
    """
    if not isinstance(funcstring, str):
        raise TypeError("Argument must be a string")

    modulestring, funcname = funcstring.rsplit(".", 1)

    mod = importlib.import_module(modulestring)

    func = getattr(mod, funcname)
    return func


class InfiniteLoopThread(compat.Thread):
    """A class that runs a given function an infinite number of times, until told to shut down."""

    DEFAULT_TIMEOUT_SECONDS = 0.2

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
        self.logger.info(
            "Started new {name} thread ID#{id}".format(
                name=self.thread_name, id=self.thread_id
            )
        )

        while True:
            if self.shutdown_event.wait(self.DEFAULT_TIMEOUT_SECONDS):
                self.logger.warning(
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


class DiskCacheRLock(object):
    """
    Vendored from
    https://github.com/grantjenks/python-diskcache/blob/2d1f43ea2be4c82a430d245de6260c3e18059ba1/diskcache/recipes.py
    """

    def __init__(self, cache, key, expire=None):
        self._cache = cache
        self._key = key
        self._expire = expire

    def acquire(self):
        "Acquire lock by incrementing count using spin-lock algorithm."
        pid = os.getpid()
        tid = get_ident()
        pid_tid = "{}-{}".format(pid, tid)

        while True:
            value, count = self._cache.get(self._key, (None, 0))
            if pid_tid == value or count == 0:
                self._cache.set(
                    self._key, (pid_tid, count + 1), self._expire,
                )
                return
            time.sleep(0.001)

    def release(self):
        "Release lock by decrementing count."
        pid = os.getpid()
        tid = get_ident()
        pid_tid = "{}-{}".format(pid, tid)

        value, count = self._cache.get(self._key, default=(None, 0))
        is_owned = pid_tid == value and count > 0
        assert is_owned, "cannot release un-acquired lock"
        self._cache.set(self._key, (value, count - 1), self._expire)

        # RLOCK leaves the db connection open after releasing the lock
        # Let's ensure it's correctly closed
        self._cache.close()

    def __enter__(self):
        self.acquire()

    def __exit__(self, *exc_info):
        self.release()


db_task_write_lock = DiskCacheRLock(process_cache, "db_task_write_lock")
