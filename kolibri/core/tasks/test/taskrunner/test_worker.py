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


class TestSelectedStateRecovery:
    """
    Tests for the fix to recover jobs stuck in SELECTED state.

    Background: When a worker picks up a job from the queue, the job state
    transitions from QUEUED -> SELECTED. If execute_job() fails before
    job.execute() is called (e.g., database connection failure, JobNotFound,
    or any exception), the job remains in SELECTED state forever.

    The fix ensures that:
    1. requeue_stalled_jobs() requeues jobs in SELECTED state on startup
    2. handle_finished_future() handles exceptions from execute_job()
    """

    def test_requeue_stalled_jobs_recovers_selected_state_jobs(self):
        """
        Test that jobs stuck in SELECTED state are requeued on worker startup.

        This simulates the scenario where:
        1. A job is picked up by a worker (state becomes SELECTED)
        2. The worker crashes before job.execute() is called
        3. On restart, the job should be requeued (not orphaned)
        """
        with connection() as c:
            from kolibri.core.tasks.storage import Storage

            storage = Storage(c)
            storage.clear(force=True)

            # Create and enqueue a job
            job = Job(id, args=(42,))
            job_id = storage.enqueue_job(job, QUEUE)

            # Simulate the job being picked up by a worker:
            # get_next_queued_job() marks the job as SELECTED in the state column
            selected_job = storage.get_next_queued_job()
            assert selected_job is not None
            assert selected_job.job_id == job_id

            # Verify the job is now in SELECTED state by checking jobs with that state
            # (get_next_queued_job updates state column but not saved_job JSON)
            selected_jobs = storage.get_jobs_by_state(state=State.SELECTED)
            assert len(selected_jobs) == 1
            assert selected_jobs[0].job_id == job_id

            # At this point, if the worker crashed before execute_job() completed,
            # the job would be stuck in SELECTED state forever (without the fix).

            # Now simulate a server restart by creating a new Worker.
            # The Worker's __init__ calls requeue_stalled_jobs() which should
            # requeue both RUNNING and SELECTED jobs.
            worker = Worker(c, regular_workers=1, high_workers=1)

            try:
                # The job should now be back in QUEUED state (no jobs in SELECTED)
                selected_jobs_after = storage.get_jobs_by_state(state=State.SELECTED)
                assert len(selected_jobs_after) == 0, (
                    "Expected no jobs in SELECTED state after recovery, "
                    f"but found {len(selected_jobs_after)}. "
                    "Jobs in SELECTED state should be requeued on startup."
                )

                # Verify job is now QUEUED
                queued_jobs = storage.get_jobs_by_state(state=State.QUEUED)
                job_ids_queued = [j.job_id for j in queued_jobs]
                assert job_id in job_ids_queued, (
                    "Expected job to be requeued after recovery"
                )
            finally:
                storage.clear(force=True)
                worker.shutdown()

    def test_handle_finished_future_handles_execute_job_exception(self):
        """
        Test that exceptions in execute_job (before job.execute()) are handled.

        This simulates the scenario where execute_job() raises an exception
        before job.execute() is called (e.g., database connection failure,
        JobNotFound). Without proper handling, the job would remain in
        SELECTED state forever.
        """
        from concurrent.futures import Future

        with connection() as c:
            worker = Worker(c, regular_workers=1, high_workers=1)
            worker.storage.clear(force=True)

            try:
                # Create and enqueue a job
                job = Job(id, args=(42,))
                job_id = worker.storage.enqueue_job(job, QUEUE)

                # Get the job (simulating it being selected)
                selected_job = worker.storage.get_next_queued_job()

                # Verify job is in SELECTED state
                selected_jobs = worker.storage.get_jobs_by_state(state=State.SELECTED)
                assert len(selected_jobs) == 1

                # Create a future that simulates execute_job raising an exception
                # (this happens when execute_job fails before job.execute())
                future = Future()
                future.set_exception(RuntimeError("Simulated execute_job failure"))

                # Set up the job-future mappings as the worker would
                worker.job_future_mapping[future] = selected_job
                worker.future_job_mapping[job_id] = future

                # Call handle_finished_future - this should handle the exception
                # and mark the job as failed (not leave it in SELECTED state)
                worker.handle_finished_future(future)

                # The job should now be marked as FAILED, not stuck in SELECTED
                failed_jobs = worker.storage.get_jobs_by_state(state=State.FAILED)
                assert len(failed_jobs) == 1, (
                    f"Expected 1 job in FAILED state after execute_job exception, "
                    f"but found {len(failed_jobs)}. "
                    "Exceptions in execute_job should mark the job as failed."
                )
                assert failed_jobs[0].job_id == job_id

                # Verify no jobs stuck in SELECTED
                selected_jobs_after = worker.storage.get_jobs_by_state(state=State.SELECTED)
                assert len(selected_jobs_after) == 0

                # Check traceback contains useful info
                final_job = worker.storage.get_job(job_id)
                assert "worker execution" in final_job.traceback.lower()
            finally:
                worker.storage.clear(force=True)
                worker.shutdown()

    def test_multiple_selected_jobs_all_recovered(self):
        """
        Test that multiple jobs stuck in SELECTED state are all recovered.
        """
        with connection() as c:
            from kolibri.core.tasks.storage import Storage

            storage = Storage(c)
            storage.clear(force=True)

            # Create and enqueue multiple jobs
            job_ids = []
            for i in range(3):
                job = Job(id, args=(i,))
                job_id = storage.enqueue_job(job, QUEUE)
                job_ids.append(job_id)
                # Simulate each job being picked up (state -> SELECTED)
                storage.get_next_queued_job()

            # Verify all jobs are in SELECTED state
            selected_jobs = storage.get_jobs_by_state(state=State.SELECTED)
            assert len(selected_jobs) == 3

            # Create a new worker (simulating server restart)
            worker = Worker(c, regular_workers=1, high_workers=1)

            try:
                # All jobs should be recovered - no jobs in SELECTED state
                selected_jobs_after = storage.get_jobs_by_state(state=State.SELECTED)
                assert len(selected_jobs_after) == 0, (
                    f"Expected no jobs in SELECTED state after recovery, "
                    f"but found {len(selected_jobs_after)}"
                )

                # All jobs should now be QUEUED
                queued_jobs = storage.get_jobs_by_state(state=State.QUEUED)
                queued_job_ids = [j.job_id for j in queued_jobs]
                for job_id in job_ids:
                    assert job_id in queued_job_ids, (
                        f"Job {job_id} should be QUEUED after recovery"
                    )
            finally:
                storage.clear(force=True)
                worker.shutdown()
