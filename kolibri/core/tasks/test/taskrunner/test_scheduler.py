import datetime

import pytest

from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.test.base import connection
from kolibri.utils.time_utils import local_now
from kolibri.utils.time_utils import naive_utc_datetime


@pytest.fixture
def job_storage():
    with connection() as c:
        s = Storage(connection=c)
        s.clear(force=True)
        yield s
        s.clear(force=True)


@pytest.mark.django_db
class TestScheduler(object):
    def test_enqueue_at_a_function(self, job_storage):
        job_id = job_storage.enqueue_at(local_now(), id)

        # is the job recorded in the chosen backend?
        assert job_storage.get_job(job_id).job_id == job_id

    def test_enqueue_at_a_function_sets_time(self, job_storage):
        now = local_now()
        job_id = job_storage.enqueue_at(now, id)

        with job_storage.session_scope() as session:
            _, scheduled_job = job_storage._get_job_and_orm_job(job_id, session)
            scheduled_time = scheduled_job.scheduled_time
        assert scheduled_time == naive_utc_datetime(now)

    def test_enqueue_at_preserves_extra_metadata(self, job_storage):
        metadata = {"saved": True}
        job_id = job_storage.enqueue_at(
            local_now(), id, kwargs=dict(extra_metadata=metadata)
        )

        # Do we get back the metadata we save?
        assert job_storage.get_job(job_id).extra_metadata == metadata

    def test_enqueue_in_a_function(self, job_storage):
        job_id = job_storage.enqueue_in(datetime.timedelta(seconds=1000), id)

        # is the job recorded in the chosen backend?
        assert job_storage.get_job(job_id).job_id == job_id

    def test_enqueue_in_a_function_sets_time(self, job_storage):
        diff = datetime.timedelta(seconds=1000)
        now = local_now()
        job_storage._now = lambda: now
        job_id = job_storage.enqueue_in(diff, id)

        with job_storage.session_scope() as session:
            _, scheduled_job = job_storage._get_job_and_orm_job(job_id, session)
            scheduled_time = scheduled_job.scheduled_time
        assert scheduled_time == naive_utc_datetime(now) + diff

    def test_schedule_a_function_sets_time(self, job_storage):
        now = local_now()
        job_id = job_storage.schedule(now, id)

        with job_storage.session_scope() as session:
            _, scheduled_job = job_storage._get_job_and_orm_job(job_id, session)
            scheduled_time = scheduled_job.scheduled_time
        assert scheduled_time == naive_utc_datetime(now)

    def test_schedule_a_function_gives_value_error_without_datetime(self, job_storage):
        now = "test"
        with pytest.raises(ValueError) as error:
            job_storage.schedule(now, id)
            assert "must be a datetime object" in str(error.value)

    def test_schedule_a_function_gives_value_error_repeat_zero_interval(
        self, job_storage
    ):
        now = local_now()
        with pytest.raises(ValueError) as error:
            job_storage.schedule(now, id, interval=0, repeat=None)
            assert "specify an interval" in str(error.value)

    def test_schedule_a_function_gives_value_error_not_timezone_aware_datetime(
        self, job_storage
    ):
        now = datetime.datetime.utcnow()
        with pytest.raises(ValueError) as error:
            job_storage.schedule(now, id)
            assert "timezone aware datetime object" in str(error.value)

    def test_scheduled_repeating_function_updates_old_job(self, job_storage):
        now = local_now()
        old_id = job_storage.schedule(now, id, interval=1000, repeat=None)
        job_storage.complete_job(old_id)
        new_id = job_storage.get_all_jobs()[0].job_id
        assert old_id == new_id

    def test_scheduled_repeating_function_sets_endless_repeat_new_job(
        self, job_storage
    ):
        now = local_now()
        job_id = job_storage.schedule(now, id, interval=1000, repeat=None)
        job_storage.complete_job(job_id)
        with job_storage.session_scope() as session:
            _, scheduled_job = job_storage._get_job_and_orm_job(job_id, session)
            repeat = scheduled_job.repeat
        assert repeat is None

    def test_scheduled_repeating_function_enqueues_job(self, job_storage):
        now = local_now()
        job_id = job_storage.schedule(now, id, interval=1000, repeat=None)
        job_storage.complete_job(job_id)
        assert job_storage.get_job(job_id).job_id == job_id

    def test_scheduled_repeating_function_sets_new_job_with_one_fewer_repeats(
        self, job_storage
    ):
        now = local_now()
        job_id = job_storage.schedule(now, id, interval=1000, repeat=1)
        job_storage.complete_job(job_id)
        with job_storage.session_scope() as session:
            _, scheduled_job = job_storage._get_job_and_orm_job(job_id, session)
            repeat = scheduled_job.repeat
        assert repeat == 0

    def test_scheduled_repeating_function_sets_new_job_at_interval(self, job_storage):
        now = local_now()
        job_id = job_storage.schedule(now, id, interval=1000, repeat=1)
        job_storage._now = lambda: now
        job_storage.complete_job(job_id)
        with job_storage.session_scope() as session:
            _, scheduled_job = job_storage._get_job_and_orm_job(job_id, session)
            scheduled_time = scheduled_job.scheduled_time
        assert scheduled_time == naive_utc_datetime(now) + datetime.timedelta(
            seconds=1000
        )
