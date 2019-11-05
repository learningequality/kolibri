import tempfile
import time

import pytest
from mock import patch
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.worker import Worker


QUEUE = "pytest"


@pytest.fixture
def worker():
    with tempfile.NamedTemporaryFile() as f:
        connection = create_engine(
            "sqlite:///{path}".format(path=f.name),
            connect_args={"check_same_thread": False},
            poolclass=NullPool,
        )
        b = Worker(QUEUE, connection)
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
