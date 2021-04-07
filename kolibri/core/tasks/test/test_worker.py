# -*- coding: utf-8 -*-
import time

import pytest
from mock import patch

from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.test.base import connection
from kolibri.core.tasks.worker import Worker

QUEUE = "pytest"


class RaisedError(Exception):
    pass


def error_func():
    """
    Function that raises an error that contains unicode.
    Made this a module function due to the need to have a module path to pass to the Job constructor.
    """
    raise RaisedError("كوليبري is not a function")


@pytest.fixture
def worker():
    with connection() as c:
        b = Worker(QUEUE, c)
        yield b
        b.shutdown()


class TestWorker:
    def test_enqueue_job_runs_job(self, worker):
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

        assert job.state == State.COMPLETED

    def test_can_handle_unicode_exceptions(self, worker):
        # Make sure task exception info is not an object, but is either a string or None.
        # See Storage.mark_job_as_failed in kolibri.core.tasks.storage for more details on why we do this.

        # create a job that triggers an exception
        job = Job("kolibri.core.tasks.test.test_worker.error_func")

        job_id = worker.storage.enqueue_job(job, QUEUE)

        while job.state == State.QUEUED:
            job = worker.storage.get_job(job.job_id)
            time.sleep(0.5)

        returned_job = worker.storage.get_job(job_id)
        assert returned_job.state == "FAILED"
        assert isinstance(returned_job.exception, RaisedError)

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
