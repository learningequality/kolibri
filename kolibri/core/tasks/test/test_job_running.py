import tempfile
import time
import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

from kolibri.core.tasks.compat import Event
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.queue import Queue
from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.tasks.utils import import_stringified_func
from kolibri.core.tasks.utils import stringify_func
from kolibri.core.tasks.worker import Worker


@pytest.fixture
def backend():
    with tempfile.NamedTemporaryFile() as f:
        connection = create_engine(
            "sqlite:///{path}".format(path=f.name),
            connect_args={"check_same_thread": False},
            poolclass=NullPool,
        )
        b = Storage(connection)
        yield b
        b.clear()


@pytest.fixture
def inmem_queue():
    with tempfile.NamedTemporaryFile() as f:
        connection = create_engine(
            "sqlite:///{path}".format(path=f.name),
            connect_args={"check_same_thread": False},
            poolclass=NullPool,
        )
        e = Worker(queues="pytest", connection=connection)
        c = Queue(queue="pytest", connection=connection)
        c.e = e
        yield c
        e.shutdown()


@pytest.fixture
def simplejob():
    return Job("builtins.id")


@pytest.fixture
def enqueued_job(inmem_queue, simplejob):
    job_id = inmem_queue.enqueue(simplejob)
    return inmem_queue.storage.get_job(job_id)


def cancelable_job():
    """
    Test function for checking if a job is cancelable. Meant to be used in a job cancel
    test case.

    It then calls the check_for_cancel, followed by a time.sleep function, 3 times.

    :param check_for_cancel: A function that the BBQ framework passes in when a job is set to be cancellable.
    Calling this function makes the thread check if a cancellation has been requested, and then exits early if true.
    :return: None
    """
    job = get_current_job()
    for _ in range(10):
        time.sleep(0.5)
        if job.check_for_cancel():
            return


FLAG = False

EVENT_PROXY_MAPPINGS = {}


def _underlying_event(f):
    def func(self, *args, **kwargs):
        """
        Return the function f that's called with the EventProxy's
        matching Event, as the first argument.
        Returns:

        """
        event = EVENT_PROXY_MAPPINGS[self.event_id]
        return f(self, event, *args, **kwargs)

    return func


class EventProxy(object):
    """
    The tests in this file were originally written when we didn't need
    to pickle objects in storage. That way, we could use threading.Event
    objects to synchronize test and job function execution, and verify that
    things work across threads easily.

    With the move to ORMJob and pickling arguments, that means we can't
    pass in vanilla events anymore. The pickle module would either error out,
    or (with the dill extension to pickle), unpickle an event that's totally
    different from the previous event.

    To solve this, we use the EventProxy object. Whenever we instantiate this,
    we generate an id, and a corresponding event, and then store that event
    in a global dict with the id as the key. Calling in the EventProxy.wait, is_set
    or set methods makes us look up the event object based on the id stored
    in this event proxy instance, and then just call the appropriate method
    in that event class.

    Any extra args in the __init__ function is just passed to the event object
    creation.
    """

    def __init__(self, *args, **kwargs):
        self.event_id = uuid.uuid4().hex
        EVENT_PROXY_MAPPINGS[self.event_id] = Event(*args, **kwargs)

    @_underlying_event
    def wait(self, event, timeout=None):
        return event.wait(timeout=timeout)

    @_underlying_event
    def set(self, event):
        return event.set()

    @_underlying_event
    def is_set(self, event):
        return event.is_set()

    @_underlying_event
    def clear(self, event):
        return event.clear()


@pytest.fixture
def flag():
    e = EventProxy()
    yield e
    e.clear()


def set_flag(threading_flag):
    threading_flag.set()


def make_job_updates(flag):
    job = get_current_job()
    for i in range(3):
        job.update_progress(i, 2)
    set_flag(flag)


def failing_func():
    raise Exception("Test function failing_func has failed as it's supposed to.")


def update_progress_cancelable_job():
    """
    Test function for checking if a job is cancelable when it updates progress.
    Meant to be used in a job cancel with progress update test case.

    It then calls the check_for_cancel, followed by a time.sleep function, 10 times.

    :param update_progress: A function that is called to update progress
    :param check_for_cancel: A function that the iceqube framework passes in when a job is set to be cancellable.
    Calling this function makes the thread check if a cancellation has been requested, and then exits early if true.
    :return: None
    """
    job = get_current_job()
    for i in range(10):
        time.sleep(0.5)
        job.update_progress(i, 9)
        if job.check_for_cancel():
            return


class TestQueue(object):
    def test_enqueues_a_function(self, inmem_queue):
        job_id = inmem_queue.enqueue(id, 1)

        # is the job recorded in the chosen backend?
        assert inmem_queue.fetch_job(job_id).job_id == job_id

    def test_enqueue_preserves_extra_metadata(self, inmem_queue):
        metadata = {"saved": True}
        job_id = inmem_queue.enqueue(id, 1, extra_metadata=metadata)

        # Do we get back the metadata we save?
        assert inmem_queue.fetch_job(job_id).extra_metadata == metadata

    def test_enqueue_runs_function(self, inmem_queue, flag):
        job_id = inmem_queue.enqueue(set_flag, flag)

        flag.wait(timeout=5)
        assert flag.is_set()

        # sleep for half a second to make us switch to another thread
        time.sleep(0.5)

        job = inmem_queue.fetch_job(job_id)
        assert job.state == State.COMPLETED

    def test_enqueue_can_run_n_functions(self, inmem_queue):
        n = 10
        events = [EventProxy() for _ in range(n)]
        for e in events:
            inmem_queue.enqueue(set_flag, e)

        for e in events:
            assert e.wait(timeout=2)

    def test_enqueued_job_can_receive_job_updates(self, inmem_queue, flag):
        job_id = inmem_queue.enqueue(make_job_updates, flag, track_progress=True)

        # sleep for half a second to make us switch to another thread
        time.sleep(0.5)

        for i in range(2):
            job = inmem_queue.fetch_job(job_id)
            assert job.state in [State.QUEUED, State.RUNNING, State.COMPLETED]

    def test_can_get_notified_of_job_failure(self, inmem_queue):
        job_id = inmem_queue.enqueue(failing_func)

        interval = 0.1
        time_spent = 0
        job = inmem_queue.fetch_job(job_id)
        while job.state != State.FAILED:
            time.sleep(interval)
            time_spent += interval
            job = inmem_queue.fetch_job(job_id)
            assert time_spent < 5
        assert job.state == State.FAILED

    def test_stringify_func_is_importable(self):
        funcstring = stringify_func(set_flag)
        func = import_stringified_func(funcstring)

        assert set_flag == func

    def test_can_get_job_details(self, inmem_queue, enqueued_job):
        assert inmem_queue.fetch_job(enqueued_job.job_id).job_id == enqueued_job.job_id

    def test_can_cancel_a_job(self, inmem_queue):
        job_id = inmem_queue.enqueue(cancelable_job, cancellable=True)

        interval = 0.1
        time_spent = 0
        job = inmem_queue.fetch_job(job_id)
        while job.state != State.RUNNING:
            time.sleep(interval)
            time_spent += interval
            job = inmem_queue.fetch_job(job_id)
            assert time_spent < 5
        # Job should be running after this point

        # Now let's cancel...
        inmem_queue.cancel(job_id)
        # And check the job state to make sure it's marked as cancelling
        job = inmem_queue.fetch_job(job_id)
        assert job.state == State.CANCELING
        time_spent = 0
        while job.state != State.CANCELED:
            time.sleep(interval)
            time_spent += interval
            job = inmem_queue.fetch_job(job_id)
            assert time_spent < 5
        # and hopefully it's canceled by this point
        assert job.state == State.CANCELED

    def test_can_cancel_a_job_that_updates_progress(self, inmem_queue):
        job_id = inmem_queue.enqueue(
            update_progress_cancelable_job, cancellable=True, track_progress=True
        )

        interval = 0.1
        time_spent = 0
        job = inmem_queue.fetch_job(job_id)
        while job.state != State.RUNNING:
            time.sleep(interval)
            time_spent += interval
            job = inmem_queue.fetch_job(job_id)
            assert time_spent < 5
        # Job should be running after this point

        # Now let's cancel...
        inmem_queue.cancel(job_id)
        # And check the job state to make sure it's marked as cancelling
        job = inmem_queue.fetch_job(job_id)
        assert job.state == State.CANCELING
        time_spent = 0
        while job.state != State.CANCELED:
            time.sleep(interval)
            time_spent += interval
            job = inmem_queue.fetch_job(job_id)
            assert time_spent < 5
        # and hopefully it's canceled by this point
        assert job.state == State.CANCELED
