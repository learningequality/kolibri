from datetime import datetime

from jnius import autoclass
from kolibri.core.tasks.hooks import StorageHook
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.job import State
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook

Locale = autoclass("java.util.Locale")
Task = autoclass("org.learningequality.Task")
PythonWorker = autoclass("org.kivy.android.PythonWorker")
Notifications = autoclass("org.learningequality.Notifications")


class AndroidApp(KolibriPluginBase):
    pass


@register_hook
class StorageHook(StorageHook):
    def schedule(
        self,
        job,
        orm_job,
        keep=True,
    ):
        if orm_job.id:

            delay = (
                max(0, (orm_job.scheduled_time - datetime.now()).total_seconds())
                if orm_job.scheduled_time
                else 0
            )
            retry_interval = orm_job.retry_interval if orm_job.retry_interval else 0

            high_priority = orm_job.priority <= Priority.HIGH

            if orm_job.repeat is None:
                # Kolibri uses `None` for repeat to indicate a task that repeats indefinitely
                # in this case it is suitable for the Android PeriodicWorkRequest as that is
                # designed for indefinitely repeating tasks.
                Task.enqueueIndefinitely(
                    orm_job.id,
                    orm_job.interval,
                    delay,
                    retry_interval,
                    high_priority,
                    job.func,
                    job.long_running,
                )
            else:
                # Android has no mechanism for scheduling a limited run of repeating tasks
                # so anything else is just scheduled once, and we use the task_updates function
                # below to reschedule the next invocation.
                Task.enqueueOnce(
                    orm_job.id,
                    delay,
                    retry_interval,
                    keep,
                    high_priority,
                    job.func,
                    job.long_running,
                )

    def update(self, job, orm_job, state=None, **kwargs):
        currentLocale = Locale.getDefault().toLanguageTag()

        status = job.status(currentLocale)

        notification_id = PythonWorker.getNotificationId()

        if status and notification_id:
            if job.total_progress:
                progress = job.progress
                total_progress = job.total_progress
            else:
                progress = -1
                total_progress = -1
            Notifications.showNotification(
                notification_id,
                status.title,
                status.text,
                progress,
                total_progress,
            )

        if (
            notification_id
            and not job.long_running
            and state
            in {
                State.COMPLETED,
                State.CANCELED,
                State.FAILED,
            }
        ):
            # This is a short running job and it has just finished
            # Remove the notification
            Notifications.hideNotification(notification_id)

        # Only do this special handling if repeat is not None or if it is not 0
        # meaning it is a task that repeats a limited number of times, and Kolibri
        # is repeating it again.
        if state is not None and orm_job.repeat:
            if state in {State.COMPLETED, State.CANCELED} or (
                state == State.FAILED and not orm_job.retry_interval
            ):
                self.schedule(
                    job,
                    orm_job,
                    keep=False,
                )

    def clear(self, job, orm_job):
        Task.clear(orm_job.id)
