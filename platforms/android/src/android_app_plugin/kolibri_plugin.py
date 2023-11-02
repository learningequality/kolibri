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
    ):
        if orm_job.id:

            delay = (
                max(0, (orm_job.scheduled_time - datetime.now()).total_seconds())
                if orm_job.scheduled_time
                else 0
            )

            high_priority = orm_job.priority <= Priority.HIGH

            # Android has no mechanism for scheduling a limited run of repeating tasks,
            # so we just schedule it as a one-off task, and then re-schedule it when the task
            # is completed.
            # We could use WorkManager's PeriodicWorkRequest, but this gives us more control
            # over execution, and also allows us to use the same mechanism for all tasks.
            # Similarly, retry_intervals are handled by the schedule mechanism, so we don't
            # leverage Android's retry mechanism either.
            Task.enqueueOnce(
                orm_job.id,
                delay,
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

    def clear(self, job, orm_job):
        Task.clear(orm_job.id)
