import time
import uuid

import pytest

from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.test.base import connection
from kolibri.core.tasks.utils import callable_to_import_path
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.tasks.utils import import_path_to_callable
from kolibri.core.tasks.worker import Worker
from kolibri.utils.multiprocessing_compat import Event


@pytest.fixture
def storage_fixture():
    with connection() as conn:
        e = Worker(connection=conn)
        b = Storage(conn)
        b.clear(force=True)
        yield b
        e.shutdown()


@pytest.fixture
def simplejob():
    return Job("builtins.id")


@pytest.fixture
def enqueued_job(storage_fixture, simplejob):
    job_id = storage_fixture.enqueue_job(simplejob)
    return storage_fixture.get_job(job_id)


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

    With the move to ORMJob, which is now serializing any arguments, that means we
    can't pass in vanilla events anymore, since non-primitive types aren't
    serializable.

    To solve this, we use the EventProxy object. Whenever we instantiate this,
    we generate an id, and a corresponding event, and then store that event
    in a global dict with the id as the key. Calling in the EventProxy.wait, is_set
    or set methods makes us look up the event object based on the id stored
    in this event proxy instance, and then just call the appropriate method
    in that event class.

    Any extra args in the __init__ function is just passed to the event object
    creation.
    """

    def __init__(self, event_id=None, *args, **kwargs):
        if event_id is None:
            event_id = uuid.uuid4().hex
        self.event_id = event_id
        if event_id not in EVENT_PROXY_MAPPINGS:
            EVENT_PROXY_MAPPINGS[event_id] = Event(*args, **kwargs)

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


def set_flag(flag_id):
    evt = EventProxy(event_id=flag_id)
    evt.set()


def make_job_updates(flag_id):
    job = get_current_job()
    for i in range(3):
        job.update_progress(i, 2)
    set_flag(flag_id)


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


class TestJobStorage(object):
    def test_does_not_enqueue_a_function(self, storage_fixture):
        try:
            storage_fixture.enqueue_job(id)
            assert False, "Enqueued something that isn't a job."
        except ValueError:
            pass

    def test_enqueues_a_job(self, storage_fixture):
        job_id = storage_fixture.enqueue_job(Job(id, args=(1,)))

        # is the job recorded in the chosen backend?
        assert storage_fixture.get_job(job_id).job_id == job_id

    def test_enqueue_preserves_extra_metadata(self, storage_fixture):
        metadata = {"saved": True}
        job_id = storage_fixture.enqueue_job(
            Job(id, args=(1,), extra_metadata=metadata)
        )

        # Do we get back the metadata we save?
        assert storage_fixture.get_job(job_id).extra_metadata == metadata

    def test_enqueue_runs_function(self, storage_fixture, flag):
        job_id = storage_fixture.enqueue_job(Job(set_flag, args=(flag.event_id,)))

        flag.wait(timeout=5)
        assert flag.is_set()

        # sleep for half a second to make us switch to another thread
        time.sleep(0.5)

        job = storage_fixture.get_job(job_id)
        assert job.state == State.COMPLETED

    def test_enqueue_can_run_n_functions(self, storage_fixture):
        n = 10
        events = [EventProxy() for _ in range(n)]
        for e in events:
            storage_fixture.enqueue_job(Job(set_flag, args=(e.event_id,)))

        for e in events:
            assert e.wait(timeout=2)

    def test_enqueued_job_can_receive_job_updates(self, storage_fixture, flag):
        job_id = storage_fixture.enqueue_job(
            Job(make_job_updates, args=(flag.event_id,), track_progress=True)
        )

        # sleep for half a second to make us switch to another thread
        time.sleep(0.5)

        for i in range(2):
            job = storage_fixture.get_job(job_id)
            assert job.state in [State.QUEUED, State.RUNNING, State.COMPLETED]

    def test_can_get_notified_of_job_failure(self, storage_fixture):
        job_id = storage_fixture.enqueue_job(Job(failing_func))

        interval = 0.1
        time_spent = 0
        job = storage_fixture.get_job(job_id)
        while job.state != State.FAILED:
            time.sleep(interval)
            time_spent += interval
            job = storage_fixture.get_job(job_id)
            assert time_spent < 5
        assert job.state == State.FAILED

    def test_stringify_func_is_importable(self):
        funcstring = callable_to_import_path(set_flag)
        func = import_path_to_callable(funcstring)

        assert set_flag == func

    def test_can_get_job_details(self, storage_fixture, enqueued_job):
        assert (
            storage_fixture.get_job(enqueued_job.job_id).job_id == enqueued_job.job_id
        )

    def test_cancel_if_exists(self, storage_fixture):
        try:
            storage_fixture.cancel_if_exists("does not exist")
        except JobNotFound as e:
            pytest.fail("Raised 'JobNotFound' error | {}".format(e))
        except Exception as e:
            pytest.fail("Raised unexpected error | {}".format(e))

    def test_can_cancel_a_job(self, storage_fixture):
        job_id = storage_fixture.enqueue_job(Job(cancelable_job, cancellable=True))

        interval = 0.1
        time_spent = 0
        job = storage_fixture.get_job(job_id)
        while job.state != State.RUNNING:
            time.sleep(interval)
            time_spent += interval
            job = storage_fixture.get_job(job_id)
            assert time_spent < 5
        # Job should be running after this point

        # Now let's cancel...
        storage_fixture.cancel(job_id)
        job = storage_fixture.get_job(job_id)
        time_spent = 0
        while job.state != State.CANCELED:
            time.sleep(interval)
            time_spent += interval
            job = storage_fixture.get_job(job_id)
            assert time_spent < 5
        # and hopefully it's canceled by this point
        assert job.state == State.CANCELED

    def test_can_cancel_a_job_that_updates_progress(self, storage_fixture):
        job_id = storage_fixture.enqueue_job(
            Job(update_progress_cancelable_job, cancellable=True, track_progress=True),
        )

        interval = 0.1
        time_spent = 0
        job = storage_fixture.get_job(job_id)
        while job.state != State.RUNNING:
            time.sleep(interval)
            time_spent += interval
            job = storage_fixture.get_job(job_id)
            assert time_spent < 5
        # Job should be running after this point

        # Now let's cancel...
        storage_fixture.cancel(job_id)
        job = storage_fixture.get_job(job_id)
        time_spent = 0
        while job.state != State.CANCELED:
            time.sleep(interval)
            time_spent += interval
            job = storage_fixture.get_job(job_id)
            assert time_spent < 5
        # and hopefully it's canceled by this point
        assert job.state == State.CANCELED
