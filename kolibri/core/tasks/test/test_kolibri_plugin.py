from datetime import timedelta
from unittest import mock

import pytest

from kolibri.core.analytics.tasks import DEFAULT_PING_JOB_ID
from kolibri.core.analytics.tasks import LOCAL_NOTIFICATION_JOB_ID
from kolibri.core.deviceadmin.tasks import SCH_VACUUM_JOB_ID
from kolibri.core.deviceadmin.tasks import STREAMED_CACHE_CLEANUP_JOB_ID
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.kolibri_plugin import ScheduledTasksPlugin
from kolibri.core.tasks.registry import TaskRegistry
from kolibri.core.tasks.storage import Storage
from kolibri.utils.time_utils import local_now


@pytest.fixture
def job_storage():
    s = Storage()
    s.clear()
    yield s
    s.clear()


@pytest.mark.django_db(databases="__all__", transaction=True)
class TestScheduledTasksPlugin:
    def test_scheduled_jobs_persist_on_restart(self, job_storage):
        with mock.patch("kolibri.core.tasks.registry.job_storage", wraps=job_storage):
            # Schedule two user-defined jobs alongside the declared ones.
            schedule_time = local_now() + timedelta(hours=1)
            test1 = job_storage.schedule(schedule_time, Job(id))
            test2 = job_storage.schedule(schedule_time, Job(id))

            scheduled_tasks_plugin = ScheduledTasksPlugin(mock.MagicMock(name="bus"))
            scheduled_tasks_plugin.START()

            # START must enqueue every task that declares a schedule, on top of
            # the two user-defined jobs above.
            scheduled = [t for t in TaskRegistry.values() if t.schedule is not None]
            assert len(job_storage) == 2 + len(scheduled)
            assert job_storage.get_job(test1) is not None
            assert job_storage.get_job(test2) is not None
            assert job_storage.get_job(DEFAULT_PING_JOB_ID) is not None
            assert job_storage.get_job(LOCAL_NOTIFICATION_JOB_ID) is not None
            assert job_storage.get_job(SCH_VACUUM_JOB_ID) is not None
            assert job_storage.get_job(STREAMED_CACHE_CLEANUP_JOB_ID) is not None

            # A restart re-runs START; already-scheduled jobs must not duplicate.
            scheduled_tasks_plugin.START()

            assert len(job_storage) == 2 + len(scheduled)
            assert job_storage.get_job(DEFAULT_PING_JOB_ID) is not None
            assert job_storage.get_job(LOCAL_NOTIFICATION_JOB_ID) is not None
            assert job_storage.get_job(SCH_VACUUM_JOB_ID) is not None
            assert job_storage.get_job(STREAMED_CACHE_CLEANUP_JOB_ID) is not None
