from jnius import autoclass
from datetime import datetime
from datetime import timedelta
from android_utils import PythonActivity


WorkManager = autoclass('androidx.work.WorkManager')
OneTimeWorkRequestBuilder = autoclass('androidx.work.OneTimeWorkRequest$Builder')
PeriodicWorkRequestBuilder = autoclass('androidx.work.PeriodicWorkRequest$Builder')
BackoffPolicy = autoclass('androidx.work.BackoffPolicy')
ExistingWorkPolicy = autoclass("androidx.work.ExistingWorkPolicy")
ExistingPeriodicWorkPolicy = autoclass("androidx.work.ExistingPeriodicWorkPolicy")
TimeUnit = autoclass('java.util.concurrent$TimeUnit')

TaskWorker = autoclass('org.learningequality.Kolibri.TaskWorker')


def get_work_manager():
    return WorkManager.getInstance(PythonActivity.mActivity)


def queue_task(
    id=None,
    priority=10,
    interval=None,
    repeat=0,
    retry_interval=None,
    scheduled_time=None,
    keep=True,
):
    if id:
        id = str(id)
        data = TaskWorker.buildInputData(id)

        if repeat is None:
            # Kolibri uses `None` for repeat to indicate a task that repeats indefinitely
            # in this case it is suitable for the Android PeriodicWorkRequest as that is
            # designed for indefinitely repeating tasks.
            work_request = PeriodicWorkRequestBuilder(TaskWorker._class, interval, TimeUnit.SECONDS)
            existing_work_policy = ExistingPeriodicWorkPolicy.KEEP
            enqueue_method = get_work_manager().enqueueUniquePeriodicWork
        else:
            work_request = OneTimeWorkRequestBuilder(TaskWorker._class)
            existing_work_policy = ExistingWorkPolicy.KEEP if keep else ExistingWorkPolicy.APPEND_OR_REPLACE
            enqueue_method = get_work_manager().enqueueUniqueWork
        if retry_interval is not None:
            work_request.setBackOffCriteria(BackoffPolicy.LINEAR, retry_interval, TimeUnit.SECONDS)
        if scheduled_time:
            delay = max(0, (scheduled_time - datetime.now()).total_seconds())
            if delay:
                work_request.setInitialDelay(delay, TimeUnit.SECONDS)
        work_request.setInputData(data).build()
        enqueue_method(id, existing_work_policy, work_request)


def task_updates(job, orm_job, state=None, **kwargs):
    from kolibri.core.tasks.job import State

    if state is not None and orm_job.repeat is None or orm_job.repeat > 0:
        if state in {State.COMPLETED, State.CANCELED} or (state == State.FAILED and not orm_job.retry_interval):
            queue_task(id=orm_job.id, priority=orm_job.priority, interval=orm_job.interval, repeat=orm_job.repeat - 1, retry_interval=orm_job.retry_interval, scheduled_time=datetime.now() + timedelta(seconds=orm_job.interval), keep=False)


def start_default_tasks():
    from kolibri.core.analytics.tasks import schedule_ping
    from kolibri.core.deviceadmin.tasks import schedule_vacuum
    schedule_ping()
    schedule_vacuum()
