# -*- coding: utf-8 -*-
import datetime
import time

import pytest
import pytz
from mock import patch

from kolibri.core.tasks.constants import DEFAULT_QUEUE
from kolibri.core.tasks.constants import Priority
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.exceptions import JobNotRestartable
from kolibri.core.tasks.job import Job
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

    def test_lifo_behavior_with_scheduled_time(self, defaultbackend, simplejob):
        # Enqueue multiple jobs as LIFO
        job1 = Job(open)
        job2 = Job(open)
        job3 = Job(open)
        defaultbackend.enqueue_lifo(job1, QUEUE)
        defaultbackend.enqueue_lifo(job2, QUEUE)
        job3_id = defaultbackend.enqueue_lifo(job3, QUEUE)

        # Ensure that the last queued job is returned by get_next_queued_job
        last_queued_job_id = defaultbackend.get_next_queued_job().job_id

        # Assert that the last queued job matches the expected job
        assert last_queued_job_id == job3_id

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

    def test_reschedule_finished_job_no_delay(self, defaultbackend, simplejob):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.complete_job(job_id)

        orm_job = defaultbackend.get_orm_job(job_id)

        previous_scheduled_time = orm_job.scheduled_time

        defaultbackend.reschedule_finished_job_if_needed(simplejob.job_id)
        requeued_orm_job = defaultbackend.get_orm_job(job_id)
        requeued_job = defaultbackend.get_job(job_id)

        assert requeued_job.state == State.COMPLETED
        assert requeued_orm_job.scheduled_time == previous_scheduled_time

    def test_can_reschedule_finished_job(self, defaultbackend, simplejob):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.complete_job(job_id)

        orm_job = defaultbackend.get_orm_job(job_id)

        previous_scheduled_time = orm_job.scheduled_time

        defaultbackend.reschedule_finished_job_if_needed(
            simplejob.job_id, delay=datetime.timedelta(seconds=5)
        )
        requeued_orm_job = defaultbackend.get_orm_job(job_id)
        requeued_job = defaultbackend.get_job(job_id)

        assert requeued_job.state == State.QUEUED
        assert requeued_orm_job.scheduled_time > previous_scheduled_time

    def test_reschedule_finished_job_canceled(self, defaultbackend, simplejob):
        # Test case where the job is canceled.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_canceled(job_id)

        orm_job = defaultbackend.get_orm_job(job_id)

        previous_scheduled_time = orm_job.scheduled_time

        defaultbackend.reschedule_finished_job_if_needed(
            simplejob.job_id, delay=datetime.timedelta(seconds=5)
        )
        requeued_orm_job = defaultbackend.get_orm_job(job_id)
        requeued_job = defaultbackend.get_job(job_id)

        assert requeued_job.state == State.QUEUED
        assert requeued_orm_job.scheduled_time > previous_scheduled_time

    def test_reschedule_finished_job_failed(self, defaultbackend, simplejob):
        # Test case where the job is failed.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_failed(job_id, RuntimeError(), "Traceback")

        orm_job = defaultbackend.get_orm_job(job_id)

        previous_scheduled_time = orm_job.scheduled_time

        defaultbackend.reschedule_finished_job_if_needed(
            simplejob.job_id, delay=datetime.timedelta(seconds=5)
        )
        requeued_orm_job = defaultbackend.get_orm_job(job_id)
        requeued_job = defaultbackend.get_job(job_id)

        assert requeued_job.state == State.QUEUED
        assert requeued_orm_job.scheduled_time > previous_scheduled_time

    def test_reschedule_finished_job_invalid_state_queued(
        self, defaultbackend, simplejob
    ):
        # Test case where the job state is not finished.
        # Ensure an error is raised since only finished jobs can be rescheduled.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)

        with pytest.raises(JobNotRestartable):
            defaultbackend.reschedule_finished_job_if_needed(job_id)

    def test_reschedule_finished_job_invalid_state_running(
        self, defaultbackend, simplejob
    ):
        # Test case where the job state is not finished.
        # Ensure an error is raised since only finished jobs can be rescheduled.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)

        defaultbackend.mark_job_as_running(job_id)

        with pytest.raises(JobNotRestartable):
            defaultbackend.reschedule_finished_job_if_needed(job_id)

    def test_reschedule_finished_job_failed_retry_interval_scheduled(
        self, defaultbackend, simplejob
    ):
        # Test case where the job has failed and a retry_interval is specified.
        # Ensure the job is scheduled with a retry_interval.
        retry_interval = 60 * 30
        job_id = defaultbackend.enqueue_job(
            simplejob, QUEUE, retry_interval=retry_interval
        )
        defaultbackend.mark_job_as_failed(job_id, RuntimeError(), "Traceback")

        orm_job = defaultbackend.get_orm_job(job_id)
        previous_scheduled_time = orm_job.scheduled_time

        defaultbackend.reschedule_finished_job_if_needed(job_id)

        requeued_orm_job = defaultbackend.get_orm_job(job_id)
        requeued_job = defaultbackend.get_job(job_id)

        assert requeued_job.state == State.QUEUED
        assert (
            requeued_orm_job.scheduled_time
            >= previous_scheduled_time + datetime.timedelta(seconds=retry_interval)
        )

    def test_reschedule_finished_job_failed_retry_interval(
        self, defaultbackend, simplejob
    ):
        # Test case where the job has failed and a retry_interval is specified.
        # Ensure the job is scheduled with a retry_interval.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_failed(job_id, RuntimeError(), "Traceback")

        orm_job = defaultbackend.get_orm_job(job_id)
        previous_scheduled_time = orm_job.scheduled_time

        retry_interval = 60 * 30

        defaultbackend.reschedule_finished_job_if_needed(
            job_id, retry_interval=retry_interval
        )

        requeued_orm_job = defaultbackend.get_orm_job(job_id)
        requeued_job = defaultbackend.get_job(job_id)

        assert requeued_job.state == State.QUEUED
        assert (
            requeued_orm_job.scheduled_time
            >= previous_scheduled_time + datetime.timedelta(seconds=retry_interval)
        )

    def test_reschedule_finished_job_failed_retry_interval_scheduled_override(
        self, defaultbackend, simplejob
    ):
        # Test case where the job has failed and a retry_interval is specified.
        # Ensure the job is scheduled with a retry_interval.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE, retry_interval=3)
        defaultbackend.mark_job_as_failed(job_id, RuntimeError(), "Traceback")

        orm_job = defaultbackend.get_orm_job(job_id)
        previous_scheduled_time = orm_job.scheduled_time

        retry_interval = 60 * 30

        defaultbackend.reschedule_finished_job_if_needed(
            job_id, retry_interval=retry_interval
        )

        requeued_orm_job = defaultbackend.get_orm_job(job_id)
        requeued_job = defaultbackend.get_job(job_id)

        assert requeued_job.state == State.QUEUED
        assert (
            requeued_orm_job.scheduled_time
            >= previous_scheduled_time + datetime.timedelta(seconds=retry_interval)
        )

    def test_reschedule_finished_job_completed_with_repeat(
        self, defaultbackend, simplejob
    ):
        # Test case where the job is completed, repeat is not 0, and other parameters are None.
        # Ensure the job is scheduled with the correct interval.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.complete_job(job_id)

        orm_job = defaultbackend.get_orm_job(job_id)
        previous_scheduled_time = orm_job.scheduled_time

        interval = 60 * 10
        repeat = 3

        defaultbackend.reschedule_finished_job_if_needed(
            job_id, interval=interval, repeat=repeat
        )

        requeued_orm_job = defaultbackend.get_orm_job(job_id)
        requeued_job = defaultbackend.get_job(job_id)

        assert requeued_job.state == State.QUEUED
        assert (
            requeued_orm_job.scheduled_time
            >= previous_scheduled_time + datetime.timedelta(seconds=interval)
        )
        assert requeued_orm_job.repeat == repeat - 1

    def test_reschedule_finished_job_invalid_priority(self, defaultbackend, simplejob):
        # Test case where an invalid priority is specified.
        # Ensure an error is raised for invalid priority.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.complete_job(job_id)

        with pytest.raises(ValueError):
            defaultbackend.reschedule_finished_job_if_needed(
                job_id, priority="invalid_priority"
            )

    def test_reschedule_finished_job_invalid_interval(self, defaultbackend, simplejob):
        # Test case where an invalid interval is specified.
        # Ensure an error is raised for invalid interval.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.complete_job(job_id)

        with pytest.raises(ValueError):
            defaultbackend.reschedule_finished_job_if_needed(job_id, interval=-1)

    def test_reschedule_finished_job_invalid_retry_interval(
        self, defaultbackend, simplejob
    ):
        # Test case where an invalid retry_interval is specified.
        # Ensure an error is raised for invalid retry_interval.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_failed(job_id, RuntimeError(), "Traceback")

        with pytest.raises(ValueError):
            defaultbackend.reschedule_finished_job_if_needed(job_id, retry_interval=0)

    def test_reschedule_finished_job_invalid_repeat(self, defaultbackend, simplejob):
        # Test case where an invalid repeat is specified.
        # Ensure an error is raised for invalid repeat.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.complete_job(job_id)

        with pytest.raises(ValueError):
            defaultbackend.reschedule_finished_job_if_needed(job_id, repeat=-1)

    def test_reschedule_finished_scheduled_job_override_repeat(
        self, defaultbackend, simplejob
    ):
        # Test case where the job is completed, repeat is set to something other than the scheduled repeat.
        # Ensure the job is scheduled with the correct repeat.
        job_id = defaultbackend.schedule(
            defaultbackend._now(), simplejob, queue=QUEUE, repeat=1, interval=3
        )
        defaultbackend.complete_job(job_id)

        orm_job = defaultbackend.get_orm_job(job_id)
        previous_scheduled_time = orm_job.scheduled_time

        repeat = 3

        defaultbackend.reschedule_finished_job_if_needed(job_id, repeat=repeat)

        requeued_orm_job = defaultbackend.get_orm_job(job_id)
        requeued_job = defaultbackend.get_job(job_id)

        assert requeued_job.state == State.QUEUED
        assert (
            requeued_orm_job.scheduled_time
            >= previous_scheduled_time + datetime.timedelta(seconds=3)
        )
        assert requeued_orm_job.repeat == repeat - 1

    def test_reschedule_finished_scheduled_job_override_interval(
        self, defaultbackend, simplejob
    ):
        # Test case where the job is completed, interval is not None.
        # Ensure the job is scheduled with the correct interval.
        job_id = defaultbackend.schedule(
            defaultbackend._now(), simplejob, queue=QUEUE, repeat=1, interval=3
        )
        defaultbackend.complete_job(job_id)

        orm_job = defaultbackend.get_orm_job(job_id)
        previous_scheduled_time = orm_job.scheduled_time

        interval = 60 * 10

        defaultbackend.reschedule_finished_job_if_needed(job_id, interval=interval)

        requeued_orm_job = defaultbackend.get_orm_job(job_id)
        requeued_job = defaultbackend.get_job(job_id)

        assert requeued_job.state == State.QUEUED
        assert (
            requeued_orm_job.scheduled_time
            >= previous_scheduled_time + datetime.timedelta(seconds=interval)
        )
        assert requeued_orm_job.repeat == 0

    def test_reschedule_finished_scheduled_job_override_priority(
        self, defaultbackend, simplejob
    ):
        # Test case where the job is completed, priority is not None.
        # Ensure the job is scheduled with the correct priority.
        job_id = defaultbackend.schedule(
            defaultbackend._now(), simplejob, queue=QUEUE, repeat=1, interval=3
        )
        defaultbackend.complete_job(job_id)

        orm_job = defaultbackend.get_orm_job(job_id)
        previous_scheduled_time = orm_job.scheduled_time

        assert orm_job.priority == Priority.REGULAR

        defaultbackend.reschedule_finished_job_if_needed(job_id, priority=Priority.HIGH)

        requeued_orm_job = defaultbackend.get_orm_job(job_id)
        requeued_job = defaultbackend.get_job(job_id)

        assert requeued_job.state == State.QUEUED
        assert (
            requeued_orm_job.scheduled_time
            >= previous_scheduled_time + datetime.timedelta(seconds=3)
        )
        assert requeued_orm_job.priority == Priority.HIGH
        assert requeued_orm_job.repeat == 0

    def test_reschedule_finished_job_with_zero_repeat(self, defaultbackend, simplejob):
        # Test case where repeat is set to 0.
        # Ensure the job is not rescheduled.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.complete_job(job_id)

        orm_job = defaultbackend.get_orm_job(job_id)
        previous_scheduled_time = orm_job.scheduled_time

        defaultbackend.reschedule_finished_job_if_needed(simplejob.job_id, repeat=0)

        requeued_orm_job = defaultbackend.get_orm_job(job_id)
        requeued_job = defaultbackend.get_job(job_id)

        assert requeued_job.state == State.COMPLETED
        assert requeued_orm_job.scheduled_time == previous_scheduled_time

    def test_reschedule_finished_job_with_negative_repeat(
        self, defaultbackend, simplejob
    ):
        # Test case where repeat is set to a negative value.
        # Ensure an error is raised.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.complete_job(job_id)

        with pytest.raises(ValueError):
            defaultbackend.reschedule_finished_job_if_needed(
                simplejob.job_id, repeat=-1
            )

    def test_reschedule_finished_job_combined(self, defaultbackend, simplejob):
        # Test a combination of parameters to cover different branches in the method.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.complete_job(job_id)

        orm_job = defaultbackend.get_orm_job(job_id)
        previous_scheduled_time = orm_job.scheduled_time

        # Specify custom values for priority, interval, repeat, and retry_interval
        priority = Priority.HIGH
        interval = 60 * 15
        repeat = 2
        retry_interval = 30

        defaultbackend.reschedule_finished_job_if_needed(
            simplejob.job_id,
            priority=priority,
            interval=interval,
            repeat=repeat,
            retry_interval=retry_interval,
        )

        requeued_orm_job = defaultbackend.get_orm_job(job_id)
        requeued_job = defaultbackend.get_job(job_id)

        # Ensure that the job is scheduled with the specified parameters
        assert requeued_job.state == State.QUEUED
        assert (
            requeued_orm_job.scheduled_time
            >= previous_scheduled_time + datetime.timedelta(seconds=interval)
        )
        assert requeued_orm_job.priority == priority
        assert requeued_orm_job.repeat == repeat - 1
        assert requeued_orm_job.retry_interval == retry_interval
