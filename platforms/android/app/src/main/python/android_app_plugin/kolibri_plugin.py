import logging

from auth import os_user
from django.utils import timezone
from java import jclass
from java.util import Locale

from kolibri.core.content.hooks import ShareFileHook
from kolibri.core.device.hooks import CheckIsMeteredHook
from kolibri.core.device.hooks import GetOSUserHook
from kolibri.core.tasks.hooks import JobHook
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.job import State
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook

NetworkUtils = jclass("org.learningequality.Kolibri.util.NetworkUtils")
ShareUtils = jclass("org.learningequality.Kolibri.util.ShareUtils")
Task = jclass("org.learningequality.Kolibri.task.Task")
TaskWorker = jclass("org.learningequality.Kolibri.task.TaskWorkerImpl")
PROGRESS_LIMIT = 10000


logger = logging.getLogger(__name__)


class AndroidApp(KolibriPluginBase):
    pass


@register_hook
class AndroidGetOSUserHook(GetOSUserHook):
    def get_os_user(self, auth_token=None):
        return os_user(auth_token)


@register_hook
class AndroidCheckIsMeteredHook(CheckIsMeteredHook):
    def check_is_metered(self):
        try:
            return bool(NetworkUtils.isActiveNetworkMetered())
        except Exception:
            return False


@register_hook
class AndroidShareFileHook(ShareFileHook):
    def share_file(self, filename, message):
        ShareUtils.shareByIntent(filename or "", message or "")


@register_hook
class AndroidJobHook(JobHook):
    def schedule(
        self,
        job,
        orm_job,
    ):
        self._enqueue_task(job, orm_job)

    def _enqueue_task(self, job, orm_job):
        if orm_job.id:
            delay = 0
            if orm_job.scheduled_time:
                now = timezone.now()
                delay = max(0, (orm_job.scheduled_time - now).total_seconds())

            high_priority = orm_job.priority <= Priority.HIGH

            # Android has no mechanism for scheduling a limited run of repeating tasks,
            # so we just schedule it as a one-off task, and then re-schedule it when the task
            # is completed.
            # We could use WorkManager's PeriodicWorkRequest, but this gives us more control
            # over execution, and also allows us to use the same mechanism for all tasks.
            # Similarly, retry_intervals are handled by the schedule mechanism, so we don't
            # leverage Android's retry mechanism either.
            logger.info(
                "Scheduling task {} for job {} with delay {} and high priority {}".format(
                    job.func, orm_job.id, delay, high_priority
                )
            )
            request_id = Task.enqueueOnce(
                orm_job.id,
                delay,
                high_priority,
                job.func,
                job.long_running,
            )
            job.update_worker_info(extra=request_id)

    def update(self, job, orm_job, state=None, **kwargs):
        if state == State.QUEUED:
            self._enqueue_task(job, orm_job)

        currentLocale = Locale.getDefault().toLanguageTag()

        status = job.status(currentLocale)

        if status:
            if job.total_progress:
                progress = job.progress
                total_progress = job.total_progress
            else:
                progress = -1
                total_progress = -1

            # avoid passing integers that are too large
            # PROGRESS_LIMIT gives sufficient precision for a % progress calculation
            if total_progress > PROGRESS_LIMIT:
                progress = PROGRESS_LIMIT * progress // total_progress
                total_progress = PROGRESS_LIMIT

            TaskWorker.notifyLocalObservers(
                status.title,
                status.text,
                progress,
                total_progress,
            )

    def clear(self, job, orm_job):
        logger.info("Clearing task {} for job {}".format(job.func, orm_job.id))
        Task.clear(orm_job.id)
