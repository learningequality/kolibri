from unittest import mock

from android_app_plugin.kolibri_plugin import AndroidJobHook

from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.job import State

TASK_PATH = "android_app_plugin.kolibri_plugin.Task"


def _make_orm_job():
    orm_job = mock.MagicMock()
    orm_job.id = "job-1"
    orm_job.scheduled_time = None
    orm_job.priority = Priority.REGULAR
    return orm_job


def _make_job():
    job = mock.MagicMock()
    job.func = "kolibri.x"
    job.long_running = False
    # No status → update()'s notification branch is skipped, isolating enqueue.
    job.status.return_value = None
    return job


def test_update_on_queued_transition_reenqueues():
    hook = AndroidJobHook()
    with mock.patch(TASK_PATH) as Task:
        hook.update(_make_job(), _make_orm_job(), state=State.QUEUED)
    assert Task.enqueueOnce.called


def test_update_on_non_queued_state_does_not_reenqueue():
    hook = AndroidJobHook()
    with mock.patch(TASK_PATH) as Task:
        hook.update(_make_job(), _make_orm_job(), state=State.RUNNING)
    assert not Task.enqueueOnce.called


def test_schedule_still_reenqueues():
    hook = AndroidJobHook()
    with mock.patch(TASK_PATH) as Task:
        hook.schedule(_make_job(), _make_orm_job())
    assert Task.enqueueOnce.called
