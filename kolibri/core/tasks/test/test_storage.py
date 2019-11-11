import tempfile

import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.utils import stringify_func


QUEUE = "pytest"


@pytest.fixture
def defaultbackend():
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
def simplejob():
    return Job(id)


class TestBackend:
    def test_can_enqueue_single_job(self, defaultbackend, simplejob):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)

        new_job = defaultbackend.get_job(job_id)

        # Does the returned job record the function we set to run?
        assert str(new_job.func) == stringify_func(id)

        # Does the job have the right state (QUEUED)?
        assert new_job.state == State.QUEUED

    def test_can_cancel_nonrunning_job(self, defaultbackend, simplejob):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)

        defaultbackend.mark_job_as_canceled(job_id)

        # is the job marked with the CANCELED state?
        assert defaultbackend.get_job(job_id).state == State.CANCELED

    def test_can_get_first_job_queued(self, defaultbackend):
        job1 = Job(open)
        job2 = Job(open)

        job1_id = defaultbackend.enqueue_job(job1, QUEUE)
        defaultbackend.enqueue_job(job2, QUEUE)

        assert defaultbackend.get_next_queued_job([QUEUE]).job_id == job1_id

    def test_can_complete_job(self, defaultbackend, simplejob):
        """
        When we call backend.complete_job, it should mark the job as finished, and
        remove it from the queue.
        """

        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.complete_job(job_id)

        job = defaultbackend.get_job(job_id)

        # is the job marked as completed?
        assert job.state == State.COMPLETED

    def test_can_requeue_complete_job(self, defaultbackend, simplejob):
        """
        When we call backend.complete_job, it should mark the job as finished, and
        remove it from the queue.
        """

        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.complete_job(job_id)

        job = defaultbackend.get_job(job_id)

        # is the job marked as completed?
        assert job.state == State.COMPLETED

        defaultbackend.enqueue_job(simplejob, QUEUE)
        requeued_job = defaultbackend.get_job(job_id)

        assert requeued_job.state == State.QUEUED
