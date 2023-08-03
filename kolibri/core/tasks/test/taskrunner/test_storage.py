# -*- coding: utf-8 -*-
import datetime
import time

import pytest
import pytz
from mock import patch

from kolibri.core.tasks.constants import DEFAULT_QUEUE
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.exceptions import JobAlreadyRetrying
from kolibri.core.tasks.exceptions import JobNotRestartable
from kolibri.core.tasks.exceptions import JobNotRunning
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.job import State
from kolibri.core.tasks.registry import TaskRegistry
from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.test.base import connection
from kolibri.core.tasks.utils import callable_to_import_path
from kolibri.utils.time_utils import local_now


QUEUE = "pytest"


@pytest.fixture
def defaultbackend():
    with connection() as c:
        b = Storage(c)
        b.clear(force=True)
        yield b
        b.clear(force=True)


@pytest.fixture
def func():
    @register_task
    def add(x, y):
        return x + y

    TaskRegistry["kolibri.core.tasks.test.taskrunner.test_storage.add"] = add

    yield add
    TaskRegistry.clear()


@pytest.fixture
def simplejob(func):
    return Job(func)


@pytest.mark.django_db
class TestBackend:
    def test_can_enqueue_single_job(self, defaultbackend, simplejob, func):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)

        new_job = defaultbackend.get_job(job_id)

        # Does the returned job record the function we set to run?
        assert str(new_job.func) == callable_to_import_path(func)

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

        # Sleep to prevent same time_created timestamp.
        time.sleep(2)
        defaultbackend.enqueue_job(job2, QUEUE)

        assert defaultbackend.get_next_queued_job().job_id == job1_id

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

    def test_save_job_as_cancellable(self, defaultbackend, simplejob):
        simplejob.cancellable = True
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)

        job = defaultbackend.get_job(job_id)
        assert job.cancellable, "Job is not cancellable"

        defaultbackend.save_job_as_cancellable(job_id, cancellable=False)
        job = defaultbackend.get_job(job_id)
        assert not job.cancellable, "Job is still cancellable"

        # default should be back to True
        defaultbackend.save_job_as_cancellable(job_id)
        job = defaultbackend.get_job(job_id)
        assert job.cancellable, "Job is not cancellable default"

    def test_can_get_high_priority_job_first(self, defaultbackend, simplejob):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE, Priority.HIGH)

        defaultbackend.enqueue_job(simplejob, QUEUE, Priority.REGULAR)
        defaultbackend.enqueue_job(simplejob, QUEUE, Priority.REGULAR)

        assert defaultbackend.get_next_queued_job().job_id == job_id

    def test_gets_oldest_high_priority_job_first(self, defaultbackend, simplejob):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE, Priority.HIGH)

        # Sleep to prevent same time_created timestamp.
        time.sleep(2)
        defaultbackend.enqueue_job(simplejob, QUEUE, Priority.HIGH)

        assert defaultbackend.get_next_queued_job().job_id == job_id

    def test_restart_job(self, defaultbackend, simplejob):
        with patch("kolibri.core.tasks.main.job_storage", wraps=defaultbackend):
            job_id = defaultbackend.enqueue_job(simplejob, QUEUE)

            for state in [
                State.COMPLETED,
                State.RUNNING,
                State.QUEUED,
                State.SCHEDULED,
                State.CANCELING,
            ]:
                defaultbackend._update_job(job_id, state)
                with pytest.raises(JobNotRestartable):
                    defaultbackend.restart_job(job_id)

            for state in [State.CANCELED, State.FAILED]:
                defaultbackend._update_job(job_id, state)

                restarted_job_id = defaultbackend.restart_job(job_id)
                restarted_job = defaultbackend.get_job(restarted_job_id)

                assert restarted_job_id == job_id
                assert restarted_job.state == State.QUEUED

    def test_get_all_jobs(self, defaultbackend, simplejob):
        tz_aware_now = datetime.datetime.now(tz=pytz.utc)
        # 3 repeating tasks.
        simplejob.job_id = "1"
        defaultbackend.enqueue_at(tz_aware_now, simplejob, repeat=2, interval=1)
        simplejob.job_id = "2"
        defaultbackend.enqueue_at(tz_aware_now, simplejob, repeat=1, interval=1)
        simplejob.job_id = "3"
        defaultbackend.enqueue_at(
            tz_aware_now, simplejob, queue="forever", repeat=None, interval=1
        )
        # 1 non-repeating task.
        simplejob.job_id = "4"
        defaultbackend.enqueue_at(tz_aware_now, simplejob)

        assert len(defaultbackend.get_all_jobs()) == 4
        assert len(defaultbackend.get_all_jobs(queue="forever")) == 1
        assert len(defaultbackend.get_all_jobs(repeating=True)) == 3
        assert len(defaultbackend.get_all_jobs(repeating=False)) == 1
        assert len(defaultbackend.get_all_jobs(repeating=True, queue="forever")) == 1

    def test_get_running_jobs(self, defaultbackend):
        # Schedule jobs
        schedule_time = local_now() + datetime.timedelta(hours=1)
        job1 = defaultbackend.schedule(schedule_time, Job(id))
        job2 = defaultbackend.schedule(schedule_time, Job(id))
        job3 = defaultbackend.schedule(schedule_time, Job(id), QUEUE)

        # mark jobs as running
        defaultbackend.mark_job_as_running(job1)
        defaultbackend.mark_job_as_running(job2)
        defaultbackend.mark_job_as_running(job3)

        # don't mark this as running to test the method only returns running jobs
        defaultbackend.schedule(schedule_time, Job(id))

        assert len(defaultbackend.get_running_jobs()) == 3
        assert len(defaultbackend.get_running_jobs(queues=[DEFAULT_QUEUE])) == 2
        assert len(defaultbackend.get_running_jobs(queues=[QUEUE])) == 1
        assert len(defaultbackend.get_running_jobs(queues=[DEFAULT_QUEUE, QUEUE])) == 3

    def test_get_canceling_jobs(self, defaultbackend):
        # Schedule jobs
        schedule_time = local_now() + datetime.timedelta(hours=1)
        job1 = defaultbackend.schedule(schedule_time, Job(id))
        job2 = defaultbackend.schedule(schedule_time, Job(id))
        job3 = defaultbackend.schedule(schedule_time, Job(id), QUEUE)

        # mark jobs as canceling
        defaultbackend.mark_job_as_canceling(job1)
        defaultbackend.mark_job_as_canceling(job2)
        defaultbackend.mark_job_as_canceling(job3)

        # don't mark this as canceling to test the method only returns canceling jobs
        defaultbackend.schedule(schedule_time, Job(id))

        assert len(defaultbackend.get_canceling_jobs()) == 3
        assert len(defaultbackend.get_canceling_jobs(queues=[DEFAULT_QUEUE])) == 2
        assert len(defaultbackend.get_canceling_jobs(queues=[QUEUE])) == 1
        assert (
            len(defaultbackend.get_canceling_jobs(queues=[DEFAULT_QUEUE, QUEUE])) == 3
        )

    def test_get_jobs_by_state(self, defaultbackend):
        # Schedule jobs
        schedule_time = local_now() + datetime.timedelta(hours=1)
        defaultbackend.schedule(schedule_time, Job(id))
        job2 = defaultbackend.schedule(schedule_time, Job(id))
        job3 = defaultbackend.schedule(schedule_time, Job(id), QUEUE)

        # mark jobs status
        defaultbackend.mark_job_as_canceling(job2)
        defaultbackend.mark_job_as_running(job3)

        assert len(defaultbackend.get_jobs_by_state(state=State.QUEUED)) == 1
        assert len(defaultbackend.get_jobs_by_state(state=State.RUNNING)) == 1
        assert len(defaultbackend.get_jobs_by_state(state=State.CANCELING)) == 1
        assert (
            len(defaultbackend.get_jobs_by_state(state=State.RUNNING, queues=[QUEUE]))
            == 1
        )
        assert (
            len(
                defaultbackend.get_jobs_by_state(state=State.RUNNING, queues=["random"])
            )
            == 0
        )

    def test_schedule_error_on_wrong_repeat(self, defaultbackend, simplejob):
        tz_aware_now = datetime.datetime.now(tz=pytz.utc)
        with pytest.raises(ValueError):
            defaultbackend.enqueue_at(tz_aware_now, simplejob, repeat=-1, interval=1)

    def test_can_retry_running_job(self, defaultbackend, simplejob):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id)

        job = defaultbackend.get_job(job_id)

        # is the job marked as running?
        assert job.state == State.RUNNING

        defaultbackend.retry_job_in(simplejob.job_id, datetime.timedelta(seconds=5))
        requeued_job = defaultbackend.get_orm_job(job_id)

        assert requeued_job.repeat == 1
        assert requeued_job.interval == 5

    def test_cant_retry_queued_job(self, defaultbackend, simplejob):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)

        job = defaultbackend.get_job(job_id)

        assert job.state == State.QUEUED
        with pytest.raises(JobNotRunning):
            defaultbackend.retry_job_in(simplejob.job_id, datetime.timedelta(seconds=5))

    def test_cant_retry_already_retrying_job(self, defaultbackend, simplejob):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE, retry_interval=5)
        defaultbackend.mark_job_as_running(job_id)

        job = defaultbackend.get_job(job_id)

        # is the job marked as running?
        assert job.state == State.RUNNING
        with pytest.raises(JobAlreadyRetrying):
            defaultbackend.retry_job_in(simplejob.job_id, datetime.timedelta(seconds=5))

    def test_cant_retry_already_indefinitely_repeating_job(
        self, defaultbackend, simplejob
    ):
        job_id = defaultbackend.enqueue_in(
            datetime.timedelta(seconds=5), simplejob, QUEUE, repeat=None, interval=30
        )
        defaultbackend.mark_job_as_running(job_id)

        job = defaultbackend.get_job(job_id)

        # is the job marked as running?
        assert job.state == State.RUNNING
        with pytest.raises(JobAlreadyRetrying):
            defaultbackend.retry_job_in(simplejob.job_id, datetime.timedelta(seconds=5))

    def test_cant_retry_already_finitely_repeating_job(self, defaultbackend, simplejob):
        job_id = defaultbackend.enqueue_in(
            datetime.timedelta(seconds=5), simplejob, QUEUE, repeat=3, interval=30
        )
        defaultbackend.mark_job_as_running(job_id)

        job = defaultbackend.get_job(job_id)

        # is the job marked as running?
        assert job.state == State.RUNNING
        with pytest.raises(JobAlreadyRetrying):
            defaultbackend.retry_job_in(simplejob.job_id, datetime.timedelta(seconds=5))
