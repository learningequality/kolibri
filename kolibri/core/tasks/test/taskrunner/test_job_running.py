import time
import uuid

import pytest

from kolibri.core.tasks.compat import Event
from kolibri.core.tasks.exceptions import JobNotRestartable
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.queue import Queue
from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.test.base import connection
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.tasks.utils import import_stringified_func
from kolibri.core.tasks.utils import stringify_func
from kolibri.core.tasks.worker import Worker


@pytest.fixture
def backend():
    with connection() as c:
        b = Storage(c)
        b.clear(force=True)
        yield b
        b.clear(force=True)


@pytest.fixture
def inmem_queue():
    with connection() as conn:
        e = Worker(connection=conn)
        c = Queue(queue="pytest", connection=conn)
        c.e = e
        c.storage.clear(force=True)
        yield c
        e.shutdown()


@pytest.fixture
def queue_no_worker():
    with connection() as conn:
        c = Queue(queue="pytest", connection=conn)
        c.storage.clear(force=True)
        yield c


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


def wait_for_state_change(inmem_queue, job_id, state):
    interval = 0.1
    time_spent = 0

    job = inmem_queue.fetch_job(job_id)

    while job.state != state:
        time.sleep(interval)
        time_spent += interval
        job = inmem_queue.fetch_job(job_id)
        assert time_spent < 5


@pytest.mark.django_db
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
        job_id = inmem_queue.enqueue(set_flag, flag.event_id)

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
            inmem_queue.enqueue(set_flag, e.event_id)

        for e in events:
            assert e.wait(timeout=2)

    def test_enqueued_job_can_receive_job_updates(self, inmem_queue, flag):
        job_id = inmem_queue.enqueue(
            make_job_updates, flag.event_id, track_progress=True
        )

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

    def test_failed_job_can_restart(self, inmem_queue):
        # Start a failng function and check for failure and
        # the case of it being present in jobs as a failed state job
        old_job_id = inmem_queue.enqueue(failing_func)

        wait_for_state_change(inmem_queue, old_job_id, State.FAILED)

        job = inmem_queue.fetch_job(old_job_id)
        assert len(inmem_queue.jobs) == 1
        assert job.state == State.FAILED

        # Restart the function and assert the same case as above along with
        # the new created job should have the same id.
        new_job_id = inmem_queue.restart_job(old_job_id)

        assert new_job_id == old_job_id

        wait_for_state_change(inmem_queue, new_job_id, State.FAILED)

        job = inmem_queue.fetch_job(new_job_id)

        assert len(inmem_queue.jobs) == 1
        assert job.state == State.FAILED

    def test_cancelled_job_can_restart(self, inmem_queue):
        # Start a function waiting to be cancelled. Once cancelled check
        # the case of it being present in jobs as a cancelled state job
        old_job_id = inmem_queue.enqueue(cancelable_job, cancellable=True)

        # The job should go from Queued to Running. At that point we mark it for
        # cancellation. Then the state should go from Cancelling to Cancelled.
        wait_for_state_change(inmem_queue, old_job_id, State.RUNNING)

        inmem_queue.cancel(old_job_id)
        job = inmem_queue.fetch_job(old_job_id)
        assert job.state == State.CANCELING

        wait_for_state_change(inmem_queue, old_job_id, State.CANCELED)
        job = inmem_queue.fetch_job(old_job_id)
        assert job.state == State.CANCELED

        # Restart the job, check that the new created job should have the
        # same id.
        new_job_id = inmem_queue.restart_job(old_job_id)
        assert new_job_id == old_job_id

        # Test the remaing cases same as above.
        wait_for_state_change(inmem_queue, new_job_id, State.RUNNING)

        inmem_queue.cancel(new_job_id)
        job = inmem_queue.fetch_job(new_job_id)
        assert job.state == State.CANCELING

        wait_for_state_change(inmem_queue, new_job_id, State.CANCELED)
        job = inmem_queue.fetch_job(new_job_id)
        assert job.state == State.CANCELED

    def test_queued_job_cannot_restart(self, queue_no_worker):
        # Start a failing function task, but do not wait for it to change it's
        # state from QUEUED. Initating an immediate restart raises the
        # JobNotRestartable Exception
        old_job_id = queue_no_worker.enqueue(failing_func)

        job = queue_no_worker.fetch_job(old_job_id)
        assert job.state == State.QUEUED

        with pytest.raises(JobNotRestartable) as excinfo:
            queue_no_worker.restart_job(old_job_id)

        assert str(excinfo.value) == "Cannot restart job with state=QUEUED"

    def test_successful_job_cannot_restart(self, inmem_queue, flag):
        # Start a function and wait for it to be completed. Initiate a restart
        # request for the task which should raise a JobNotRestartable Exception
        old_job_id = inmem_queue.enqueue(set_flag, flag.event_id)

        flag.wait(timeout=5)
        assert flag.is_set()

        time.sleep(0.5)

        job = inmem_queue.fetch_job(old_job_id)
        assert job.state == State.COMPLETED

        with pytest.raises(JobNotRestartable) as excinfo:
            inmem_queue.restart_job(old_job_id)

        assert str(excinfo.value) == "Cannot restart job with state=COMPLETED"
