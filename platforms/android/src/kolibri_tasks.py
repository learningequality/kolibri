from datetime import datetime
from datetime import timedelta

from jnius import autoclass

Locale = autoclass("java.util.Locale")
Task = autoclass("org.learningequality.Task")
PythonWorker = autoclass("org.kivy.android.PythonWorker")


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
        from kolibri.core.tasks.job import Priority

        id = str(id)
        delay = (
            max(0, (scheduled_time - datetime.now()).total_seconds())
            if scheduled_time
            else 0
        )
        retry_interval = retry_interval if retry_interval else 0

        high_priority = priority <= Priority.HIGH

        if repeat is None:
            # Kolibri uses `None` for repeat to indicate a task that repeats indefinitely
            # in this case it is suitable for the Android PeriodicWorkRequest as that is
            # designed for indefinitely repeating tasks.
            Task.enqueueIndefinitely(id, interval, delay, retry_interval, high_priority)
        else:
            # Android has no mechanism for scheduling a limited run of repeating tasks
            # so anything else is just scheduled once, and we use the task_updates function
            # below to reschedule the next invocation.
            Task.enqueueOnce(id, delay, retry_interval, keep, high_priority)


def task_updates(job, orm_job, state=None, **kwargs):
    from kolibri.core.tasks.job import State

    currentLocale = Locale.getDefault().toLanguageTag()

    status = job.status(currentLocale)

    if status:
        PythonWorker.mWorker.updateNotificationText(status.title, status.text)

    if job.total_progress:
        PythonWorker.mWorker.updateNotificationProgress(
            job.progress, job.total_progress
        )

    if status:
        PythonWorker.mWorker.showNotification()

    if job.long_running and state == State.RUNNING:
        # This is a long running job and it has just started running
        # Set to running as foreground
        PythonWorker.mWorker.runAsForeground()

    if state is not None and orm_job.repeat is None or orm_job.repeat > 0:
        if state in {State.COMPLETED, State.CANCELED} or (
            state == State.FAILED and not orm_job.retry_interval
        ):
            queue_task(
                id=orm_job.id,
                priority=orm_job.priority,
                interval=orm_job.interval,
                repeat=orm_job.repeat - 1,
                retry_interval=orm_job.retry_interval,
                scheduled_time=datetime.now() + timedelta(seconds=orm_job.interval),
                keep=False,
            )


def start_default_tasks():
    from kolibri.core.analytics.tasks import schedule_ping
    from kolibri.core.deviceadmin.tasks import schedule_vacuum

    schedule_ping()
    schedule_vacuum()
