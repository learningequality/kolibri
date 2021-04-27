import datetime

import pytest

from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.queue import Queue
from kolibri.core.tasks.scheduler import Scheduler
from kolibri.core.tasks.test.base import connection
from kolibri.utils.time_utils import local_now
from kolibri.utils.time_utils import naive_utc_datetime


@pytest.fixture
def queue():
    with connection() as c:
        q = Queue("pytest", c)
        yield q


@pytest.fixture
def scheduler(queue):
    s = Scheduler(queue=queue)
    s.clear_scheduler()
    yield s
    s.clear_scheduler()


@pytest.mark.django_db
class TestScheduler(object):
    def test_enqueue_at_a_function(self, scheduler):
        job_id = scheduler.enqueue_at(local_now(), id)

        # is the job recorded in the chosen backend?
        assert scheduler.get_job(job_id).job_id == job_id

    def test_enqueue_at_a_function_sets_time(self, scheduler):
        now = local_now()
        job_id = scheduler.enqueue_at(now, id)

        with scheduler.session_scope() as session:
            scheduled_job = (
                scheduler._ns_query(session).filter_by(id=job_id).one_or_none()
            )
            scheduled_time = scheduled_job.scheduled_time
        assert scheduled_time == naive_utc_datetime(now)

    def test_enqueue_at_preserves_extra_metadata(self, scheduler):
        metadata = {"saved": True}
        job_id = scheduler.enqueue_at(local_now(), id, extra_metadata=metadata)

        # Do we get back the metadata we save?
        assert scheduler.get_job(job_id).extra_metadata == metadata

    def test_enqueue_in_a_function(self, scheduler):
        job_id = scheduler.enqueue_in(datetime.timedelta(seconds=1000), id)

        # is the job recorded in the chosen backend?
        assert scheduler.get_job(job_id).job_id == job_id

    def test_enqueue_in_a_function_sets_time(self, scheduler):
        diff = datetime.timedelta(seconds=1000)
        now = local_now()
        scheduler._now = lambda: now
        job_id = scheduler.enqueue_in(diff, id)

        with scheduler.session_scope() as session:
            scheduled_job = (
                scheduler._ns_query(session).filter_by(id=job_id).one_or_none()
            )
            scheduled_time = scheduled_job.scheduled_time
        assert scheduled_time == naive_utc_datetime(now) + diff

    def test_cancel_removes_job(self, scheduler):
        job_id = scheduler.enqueue_at(local_now(), id)

        scheduler.cancel(job_id)

        with pytest.raises(JobNotFound):
            scheduler.get_job(job_id)

    def test_schedule_a_function_sets_time(self, scheduler):
        now = local_now()
        job_id = scheduler.schedule(now, id)

        with scheduler.session_scope() as session:
            scheduled_job = (
                scheduler._ns_query(session).filter_by(id=job_id).one_or_none()
            )
            scheduled_time = scheduled_job.scheduled_time
        assert scheduled_time == naive_utc_datetime(now)

    def test_schedule_a_function_gives_value_error_without_datetime(self, scheduler):
        now = "test"
        with pytest.raises(ValueError) as error:
            scheduler.schedule(now, id)
            assert "must be a datetime object" in str(error.value)

    def test_schedule_a_function_gives_value_error_repeat_zero_interval(
        self, scheduler
    ):
        now = local_now()
        with pytest.raises(ValueError) as error:
            scheduler.schedule(now, id, interval=0, repeat=None)
            assert "specify an interval" in str(error.value)

    def test_schedule_a_function_gives_value_error_not_timezone_aware_datetime(
        self, scheduler
    ):
        now = datetime.datetime.utcnow()
        with pytest.raises(ValueError) as error:
            scheduler.schedule(now, id)
            assert "timezone aware datetime object" in str(error.value)

    def test_scheduled_repeating_function_updates_old_job(self, scheduler):
        now = local_now()
        old_id = scheduler.schedule(now, id, interval=1000, repeat=None)
        scheduler.check_schedule()
        new_id = scheduler.get_jobs()[0].job_id
        assert old_id == new_id

    def test_scheduled_repeating_function_sets_endless_repeat_new_job(self, scheduler):
        now = local_now()
        scheduler.schedule(now, id, interval=1000, repeat=None)
        scheduler.check_schedule()
        with scheduler.session_scope() as session:
            scheduled_job = scheduler._ns_query(session).one_or_none()
            repeat = scheduled_job.repeat
        assert repeat is None

    def test_scheduled_repeating_function_enqueues_job(self, scheduler):
        now = local_now()
        job_id = scheduler.schedule(now, id, interval=1000, repeat=None)
        scheduler.check_schedule()
        assert scheduler.queue.fetch_job(job_id).job_id == job_id

    def test_scheduled_repeating_function_sets_new_job_with_one_fewer_repeats(
        self, scheduler
    ):
        now = local_now()
        scheduler.schedule(now, id, interval=1000, repeat=1)
        scheduler.check_schedule()
        with scheduler.session_scope() as session:
            scheduled_job = scheduler._ns_query(session).one_or_none()
            repeat = scheduled_job.repeat
        assert repeat == 0

    def test_scheduled_repeating_function_sets_new_job_at_interval(self, scheduler):
        now = local_now()
        scheduler.schedule(now, id, interval=1000, repeat=1)
        scheduler._now = lambda: now
        scheduler.check_schedule()
        with scheduler.session_scope() as session:
            scheduled_job = scheduler._ns_query(session).one_or_none()
            scheduled_time = scheduled_job.scheduled_time
        assert scheduled_time == naive_utc_datetime(now) + datetime.timedelta(
            seconds=1000
        )
