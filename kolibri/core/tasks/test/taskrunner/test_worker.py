# -*- coding: utf-8 -*-
import time

import pytest
from mock import patch

from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.test.base import connection
from kolibri.core.tasks.worker import Worker

QUEUE = "pytest"


error_text = "كوليبري is not a function"


def error_func():
    """
    Function that raises an error that contains unicode.
    Made this a module function due to the need to have a module path to pass to the Job constructor.
    """
    raise TypeError(error_text)


@pytest.fixture
def worker():
    with connection() as c:
        b = Worker(c, regular_workers=1, high_workers=1)
        b.storage.clear(force=True)
        yield b
        b.storage.clear(force=True)
        b.shutdown()


@pytest.mark.django_db
class TestWorker:
    def test_enqueue_job_runs_job(self, worker):
        job = Job(id, 9)
        worker.storage.enqueue_job(job, QUEUE)

        while job.state != State.COMPLETED:
            job = worker.storage.get_job(job.job_id)
            time.sleep(0.5)
        try:
            # Get the future, or pass if it has already been cleaned up.
            future = worker.future_job_mapping[job.job_id]

            future.result()
        except KeyError:
            pass

        assert job.state == State.COMPLETED

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
        with patch.object(
            worker.storage, "complete_job", wraps=worker.storage.complete_job
        ) as spy:

            # this job should never fail.
            job = Job(id, 9)
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

            # verify that we sent a message through our backend
            assert spy.call_count == 1

            call_args = spy.call_args
            job_id = call_args[0][0]
            # verify that we're setting the correct job_id
            assert job_id == job.job_id

    def test_regular_tasks_wait_when_regular_workers_busy(self, worker):
        # We have one task running right now.
        worker.future_job_mapping = {"job_id": "future"}

        job = Job(id, 10)
        worker.storage.enqueue_job(job, QUEUE, "REGULAR")

        job = worker.get_next_job()
        worker.future_job_mapping.clear()

        # Worker must not get this job since our regular worker is busy.
        assert job is None

    def test_high_tasks_dont_wait_when_regular_workers_busy(self, worker):
        # We have one task running right now.
        worker.future_job_mapping = {"job_id": "future"}

        job = Job(id, 10)
        worker.storage.enqueue_job(job, QUEUE, "HIGH")

        job = worker.get_next_job()
        worker.future_job_mapping.clear()

        # Worker must get this job since its a 'high' priority job.
        assert isinstance(job, Job) is True
