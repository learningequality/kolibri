# -*- coding: utf-8 -*-
import time

import pytest

from kolibri.core.tasks.constants import Priority
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.test.base import connection
from kolibri.core.tasks.test.taskrunner.test_job_running import EventProxy
from kolibri.core.tasks.worker import Worker
from kolibri.utils import conf

QUEUE = "pytest"


error_text = "كوليبري is not a function"


def error_func():
    """
    Function that raises an error that contains unicode.
    Made this a module function due to the need to have a module path to pass to the Job constructor.
    """
    raise TypeError(error_text)


@pytest.fixture
def flag():
    e = EventProxy()
    yield e
    e.clear()


def toggle_flag(flag_id):
    evt = EventProxy(event_id=flag_id)
    if evt.is_set():
        evt.clear()
    else:
        evt.set()


@pytest.fixture
def worker():
    with connection() as c:
        b = Worker(c, regular_workers=1, high_workers=1)
        b.storage.clear(force=True)
        yield b
        b.storage.clear(force=True)
        b.shutdown()


def test_keyerror_prevention(worker):
    # Create a job with the same ID as the one in worker.enqueue_job_runs_job
    job = Job(id, args=(9,))
    worker.storage.enqueue_job(job, QUEUE)

    while job.state != "COMPLETED":
        if job.job_id in worker.future_job_mapping:
            del worker.future_job_mapping[job.job_id]
        job = worker.storage.get_job(job.job_id)
        time.sleep(0.1)

    assert job.state == "COMPLETED"


def test_keyerror_prevention_multiple_jobs(worker):
    # Create multiple jobs with the same ID to trigger the race condition
    job1 = Job(id, args=(9,))
    job2 = Job(id, args=(9,))

    # Enqueue the first job
    worker.storage.enqueue_job(job1, QUEUE)

    # Enqueue the second job
    worker.storage.enqueue_job(job2, QUEUE)

    while job1.state != "COMPLETED":
        if job1.job_id in worker.future_job_mapping:
            del worker.future_job_mapping[job1.job_id]
        job1 = worker.storage.get_job(job1.job_id)
        time.sleep(0.1)

    assert job1.state == "COMPLETED"

    # Wait for the second job to complete
    while job2.state != "COMPLETED":
        job2 = worker.storage.get_job(job2.job_id)
        time.sleep(0.1)

    assert job2.state == "COMPLETED"


class TestWorker:
    def test_enqueue_job_runs_job(self, worker):
        job = Job(id, args=(9,))
        worker.storage.enqueue_job(job, QUEUE)

        while job.state != State.COMPLETED:
            job = worker.storage.get_job(job.job_id)
            time.sleep(0.5)

        assert job.state == State.COMPLETED

    def test_enqueue_job_runs_job_once(self, worker, flag):
        # Do conditional check in here, as it seems to not work properly
        # inside a pytest.mark.skipIf
        if conf.OPTIONS["Database"]["DATABASE_ENGINE"] == "postgres":
            b = Worker(worker.storage.engine, regular_workers=1, high_workers=1)
            job = Job(toggle_flag, args=(flag.event_id,))
            worker.storage.enqueue_job(job, QUEUE)

            while job.state != State.COMPLETED:
                job = worker.storage.get_job(job.job_id)
                time.sleep(0.5)

            assert job.state == State.COMPLETED
            assert flag.is_set()
            b.shutdown()

    def test_can_handle_unicode_exceptions(self, worker):
        # Make sure task exception info is not an object, but is either a string or None.
        # See Storage.mark_job_as_failed in kolibri.core.tasks.storage for more details on why we do this.

        # create a job that triggers an exception
        job = Job("kolibri.core.tasks.test.taskrunner.test_worker.error_func")

        job_id = worker.storage.enqueue_job(job, QUEUE)

        while job.state == State.QUEUED:
            job = worker.storage.get_job(job.job_id)
            time.sleep(0.5)

        returned_job = worker.storage.get_job(job_id)
        assert returned_job.state == "FAILED"
        assert returned_job.exception == "TypeError"
        assert error_text in returned_job.traceback

    def test_enqueue_job_writes_to_storage_on_success(self, worker):
        # this job should never fail.
        job = Job(id, args=(9,))
        worker.storage.enqueue_job(job, QUEUE)

        while job.state == State.QUEUED:
            job = worker.storage.get_job(job.job_id)
            time.sleep(0.5)

        try:
            # Get the future, or pass if it has already been cleaned up.
            future = worker.future_job_mapping[job.job_id]

            future.result()
        except KeyError:
            pass

        job = worker.storage.get_job(job.job_id)

        assert job.state == State.COMPLETED

    def test_regular_tasks_wait_when_regular_workers_busy(self, worker):
        # We have one task running right now.
        worker.future_job_mapping = {"job_id": "future"}

        job = Job(id, args=(10,))
        worker.storage.enqueue_job(job, QUEUE, Priority.REGULAR)

        job = worker.get_next_job()
        worker.future_job_mapping.clear()

        # Worker must not get this job since our regular worker is busy.
        assert job is None

    def test_high_tasks_dont_wait_when_regular_workers_busy(self, worker):
        # We have one task running right now.
        worker.future_job_mapping = {"job_id": "future"}

        job = Job(id, args=(10,))
        worker.storage.enqueue_job(job, QUEUE, Priority.HIGH)

        job = worker.get_next_job()
        worker.future_job_mapping.clear()

        # Worker must get this job since its a 'high' priority job.
        assert isinstance(job, Job) is True
