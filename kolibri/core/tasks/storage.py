import logging
from datetime import datetime
from datetime import timedelta

from django.db import connections
from django.db import transaction
from django.db.models import Q

from kolibri.core.tasks.constants import DEFAULT_QUEUE
from kolibri.core.tasks.constants import Priority
from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.exceptions import JobNotRestartable
from kolibri.core.tasks.exceptions import JobRunning
from kolibri.core.tasks.hooks import StorageHook
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.models import Job as ORMJob
from kolibri.core.tasks.validation import validate_exception
from kolibri.core.tasks.validation import validate_interval
from kolibri.core.tasks.validation import validate_priority
from kolibri.core.tasks.validation import validate_repeat
from kolibri.core.tasks.validation import validate_timedelay
from kolibri.deployment.default.sqlite_db_names import JOB_STORAGE
from kolibri.utils.time_utils import local_now

logger = logging.getLogger(__name__)


NO_VALUE = object()


class Storage:
    def __init__(self):
        self._hooks = list(StorageHook.registered_hooks)

    def __len__(self):
        """
        Returns the number of jobs currently in the storage.
        """
        return ORMJob.objects.count()

    def __contains__(self, item):
        """
        Returns a boolean indicating whether the given job instance or job id
        is scheduled for execution.
        """
        job_id = item
        if isinstance(item, Job):
            job_id = item.job_id
        return ORMJob.objects.filter(id=job_id).exists()

    def _get_job_database_alias(self):
        db_backend = connections[ORMJob.objects.db].vendor
        if db_backend == "sqlite":
            return JOB_STORAGE
        return None  # Use default database

    def _orm_to_job(self, orm_job):
        """
        Extracts a Job object from the saved_job string column of ORMJob

        Sets the storage attribute on the job so the job can persist
        state updates to the database.
        """
        job = Job.from_json(orm_job.saved_job)

        job.storage = self
        return job

    def enqueue_job(
        self,
        job,
        queue=DEFAULT_QUEUE,
        priority=Priority.REGULAR,
        retry_interval=None,
        max_retries=None,
    ):
        """
        Add the job given by j to the job queue.

        Note: Does not actually run the job.
        """
        dt = self._now()
        try:
            return self.schedule(
                dt,
                job,
                queue,
                priority=priority,
                interval=0,
                repeat=0,
                retry_interval=retry_interval,
                max_retries=max_retries,
            )
        except JobRunning:
            logger.debug(
                "Attempted to enqueue a running job {job_id}, ignoring.".format(
                    job_id=job.job_id
                )
            )
            return job.job_id

    def enqueue_lifo(
        self,
        job,
        queue=DEFAULT_QUEUE,
        priority=Priority.REGULAR,
        retry_interval=None,
        max_retries=None,
    ):
        now = self._now()
        soonest_job = (
            ORMJob.objects.filter(state=State.QUEUED)
            .filter(scheduled_time__lte=now)
            .order_by("scheduled_time")
            .first()
        )
        dt = (
            soonest_job.scheduled_time - timedelta(microseconds=1)
            if soonest_job
            else self._now()
        )
        try:
            return self.schedule(
                dt,
                job,
                queue,
                priority=priority,
                interval=0,
                repeat=0,
                retry_interval=retry_interval,
                max_retries=max_retries,
            )
        except JobRunning:
            logger.debug(
                "Attempted to enqueue a running job {job_id}, ignoring.".format(
                    job_id=job.job_id
                )
            )
            return job.job_id

    def enqueue_job_if_not_enqueued(
        self, job, queue=DEFAULT_QUEUE, priority=Priority.REGULAR, retry_interval=None
    ):
        """
        Enqueue the function with arguments passed to this method if there is no queued job for the same task.

        N.B. This method does not curently match by job arguments (args and kwargs) but only by the function name.

        :return: enqueued job's id.
        """

        queued_jobs = self.filter_jobs(func=job.func, queue=queue, state=State.QUEUED)
        if queued_jobs:
            return queued_jobs[0].job_id

        return self.enqueue_job(
            job, queue=queue, priority=priority, retry_interval=retry_interval
        )

    def mark_job_as_canceled(self, job_id):
        """
        Mark the job as canceled. Does not actually try to cancel a running job.
        """
        self._update_job(job_id, State.CANCELED)

    def mark_job_as_canceling(self, job_id):
        """
        Mark the job as requested for canceling. Does not actually try to cancel a running job.

        :param job_id: the job to be marked as canceling.
        :return: None
        """
        self._update_job(job_id, State.CANCELING)

    def _filter_next_query(self, queryset, priority):
        now = self._now()
        return queryset.filter(
            Q(scheduled_time__lte=now), state=State.QUEUED, priority__lte=priority
        ).order_by("priority", "scheduled_time", "time_created")

    def _postgres_next_queued_job(self, priority):
        """
        For postgres we are doing our best to ensure that the selected job
        is not then also selected by another potentially concurrent worker controller
        process. We do this by doing a select for update within a subquery.
        This should work as long as our connection uses the default isolation level
        of READ_COMMITTED.
        More details here: https://dba.stackexchange.com/a/69497
        """
        with transaction.atomic(using=self._get_job_database_alias()):
            next_job = (
                self._filter_next_query(ORMJob.objects.all(), priority)
                .select_for_update(skip_locked=True)
                .first()
            )

            if next_job:
                next_job.state = State.SELECTED
                next_job.save()
                return next_job
        return None

    def _sqlite_next_queued_job(self, priority):
        """
        Due to the difficulty in appropriately locking the task row
        we do not support multiple task runners potentially duelling
        to lock tasks for SQLite, so here we just do a minimal
        best effort to mark the job as selected for running.
        """
        orm_job = self._filter_next_query(ORMJob.objects.all(), priority).first()

        if orm_job:
            orm_job.state = State.SELECTED
            orm_job.save()
        return orm_job

    def get_next_queued_job(self, priority=Priority.REGULAR):
        db_backend = connections[ORMJob.objects.db].vendor

        if db_backend == "sqlite":
            orm_job = self._sqlite_next_queued_job(priority)
        else:
            orm_job = self._postgres_next_queued_job(priority)

        if orm_job:
            return self._orm_to_job(orm_job)
        return None

    def filter_jobs(
        self, queue=None, queues=None, state=None, repeating=None, func=None
    ):
        if queue and queues:
            raise ValueError("Cannot specify both queue and queues")

        queryset = ORMJob.objects.all()

        if queue:
            queryset = queryset.filter(queue=queue)

        if queues:
            queryset = queryset.filter(queue__in=queues)

        if state:
            queryset = queryset.filter(state=state)

        if repeating is True:
            queryset = queryset.filter(Q(repeat__gt=0) | Q(repeat__isnull=True))
        elif repeating is False:
            queryset = queryset.filter(repeat=0)

        if func:
            queryset = queryset.filter(func=func)

        return [self._orm_to_job(o) for o in queryset]

    def get_canceling_jobs(self, queues=None):
        return self.get_jobs_by_state(state=State.CANCELING, queues=queues)

    def get_running_jobs(self, queues=None):
        return self.get_jobs_by_state(state=State.RUNNING, queues=queues)

    def get_jobs_by_state(self, state, queues=None):
        return self.filter_jobs(state=state, queues=queues)

    def get_all_jobs(self, queue=None, repeating=None):
        return self.filter_jobs(queue=queue, repeating=repeating)

    def get_job(self, job_id):
        orm_job = self.get_orm_job(job_id)
        job = self._orm_to_job(orm_job)
        return job

    def get_orm_job(self, job_id):
        try:
            orm_job = ORMJob.objects.get(id=job_id)
            return orm_job
        except ORMJob.DoesNotExist:
            raise JobNotFound()

    def restart_job(self, job_id):
        """
        First deletes the job with id = job_id then enqueues a new job with the same
        job_id as the one we deleted, with same args and kwargs.

        Returns the job_id of enqueued job.

        Raises `JobNotRestartable` exception if the job with id = job_id state is
        not in CANCELED or FAILED.
        """
        orm_job = self.get_orm_job(job_id)
        job_to_restart = self._orm_to_job(orm_job)

        if job_to_restart.state in [State.CANCELED, State.FAILED]:
            self.clear(job_id=job_to_restart.job_id, force=False)
            job = Job.from_job(
                job_to_restart,
                job_id=job_to_restart.job_id,
            )
            return self.enqueue_job(job, queue=orm_job.queue, priority=orm_job.priority)
        else:
            raise JobNotRestartable(
                "Cannot restart job with state={}".format(job_to_restart.state)
            )

    def check_job_canceled(self, job_id):
        try:
            job = self.get_job(job_id)
        except JobNotFound:
            return True

        return job.state == State.CANCELED or job.state == State.CANCELING

    def cancel(self, job_id):
        """
        Mark a job as canceling, and let the worker pick this up to initiate
        the cancel of the job.

        :param job_id: the job_id of the Job to cancel.
        """
        job = self.get_job(job_id)
        if job.state == State.QUEUED:
            self.clear(job_id=job_id, force=True)
        else:
            self.mark_job_as_canceling(job_id)

    def cancel_if_exists(self, job_id):
        """
        Mark a job as canceling, but only if it exists and
        does not raise 'JobNotFound' if it doesn't

        :param job_id: the job_id of the Job to cancel.
        """
        try:
            self.cancel(job_id)
        except JobNotFound:
            pass

    def cancel_jobs(
        self, queue=None, queues=None, state=None, repeating=None, func=None
    ):
        """
        Cancel all jobs matching the given criteria.
        """
        jobs = self.filter_jobs(queue=queue, queues=queues, state=state, func=func)
        for job in jobs:
            self.cancel(job.job_id)

    def clear(self, queue=None, job_id=None, force=False):
        """
        Clear the queue and the job data.
        If force is True, clear all jobs, otherwise only delete jobs that are in a finished state,
        COMPLETED, FAILED, or CANCELED.
        :type job_id: NoneType or str
        :param job_id: the job_id to clear. If None, clear all jobs.
        :type force: bool
        :param force: If True, clear the job (or jobs), even if it hasn't completed, failed or been cancelled.
        """
        with transaction.atomic(using=self._get_job_database_alias()):
            queryset = ORMJob.objects.all()
            if queue:
                queryset = queryset.filter(queue=queue)
            if job_id:
                queryset = queryset.filter(id=job_id)

            # filter only by the finished jobs, if we are not specified to force
            if not force:
                queryset = queryset.filter(
                    Q(state=State.COMPLETED)
                    | Q(state=State.FAILED)
                    | Q(state=State.CANCELED)
                )

            if self._hooks:
                for orm_job in queryset:
                    job = self._orm_to_job(orm_job)
                    for hook in self._hooks:
                        hook.clear(job, orm_job)

            queryset.delete()

    def update_job_progress(
        self, job_id, progress, total_progress, extra_metadata=None
    ):
        """
        Update the job given by job_id's progress info.
        :type total_progress: int
        :type progress: int
        :type job_id: str
        :param job_id: The id of the job to update
        :param progress: The current progress achieved by the job
        :param total_progress: The total progress achievable by the job.
        :return: None
        """
        kwargs = {
            "progress": progress,
            "total_progress": total_progress,
        }
        if extra_metadata is not None:
            kwargs["extra_metadata"] = extra_metadata
        self._update_job(job_id, **kwargs)

    def mark_job_as_failed(self, job_id, exception, traceback):
        """
        Mark the job as failed, and record the traceback and exception.
        Args:
            job_id: The job_id of the job that failed.
            exception: The exception object thrown by the job.
            traceback: The traceback, if any. Note (aron): Not implemented yet. We need to find a way
            for the conncurrent.futures workers to throw back the error to us.

        Returns: None

        """
        exception = type(exception).__name__
        self._update_job(job_id, State.FAILED, exception=exception, traceback=traceback)

    def mark_job_as_running(self, job_id):
        self._update_job(job_id, State.RUNNING)

    def mark_job_as_queued(self, job_id):
        self._update_job(job_id, State.QUEUED)

    def complete_job(self, job_id, result=None):
        self._update_job(job_id, State.COMPLETED, result=result)

    def save_job_meta(self, job):
        self._update_job(job.job_id, extra_metadata=job.extra_metadata)

    def save_job_as_cancellable(self, job_id, cancellable=True):
        self._update_job(job_id, cancellable=cancellable)

    def save_worker_info(
        self, job_id, host=None, process=None, thread=None, extra=None
    ):
        """
        Generally we only want to capture/update, not erase, any of this information so we only
        update the fields that are non-None.
        """
        if not any([host, process, thread, extra]):
            # nothing to do
            return

        with transaction.atomic(using=self._get_job_database_alias()):
            try:
                _, orm_job = self._get_job_and_orm_job(job_id)
                if host is not None:
                    orm_job.worker_host = host
                if process is not None:
                    orm_job.worker_process = process
                if thread is not None:
                    orm_job.worker_thread = thread
                if extra is not None:
                    orm_job.worker_extra = extra
                orm_job.save()
            except JobNotFound:
                logger.error(
                    "Tried to update job with id {} but it was not found".format(job_id)
                )

    # Turning off the complexity warning for this function as moving the conditional validation checks
    # inline would be the simplest way to 'reduce' the complexity, but would make it less readable.
    def reschedule_finished_job_if_needed(  # noqa: C901
        self,
        job_id,
        delay=None,
        priority=None,
        interval=None,
        repeat=NO_VALUE,
        retry_interval=NO_VALUE,
        exception=None,
    ):
        """
        Because repeat and retry_interval are nullable, None is a semantic value, so we need to use a sentinel value NO_VALUE
        as the default when no value is passed in.
        """

        # Validate all passed in values that have been set.
        if repeat is not NO_VALUE:
            validate_repeat(repeat)

        if interval is not None:
            validate_interval(interval)

        if retry_interval is not NO_VALUE:
            validate_interval(retry_interval)

        if priority is not None:
            validate_priority(priority)

        if delay is not None:
            validate_timedelay(delay)

        if exception is not None:
            validate_exception(exception)

        orm_job = self.get_orm_job(job_id)

        # Only allow this function to be run on a job that is in a finished state.
        if orm_job.state not in {State.COMPLETED, State.FAILED, State.CANCELED}:
            raise JobNotRestartable(
                "Cannot reschedule job with state={}".format(orm_job.state)
            )

        # Create the schedule kwargs by reading from the database, and overriding with any passed in values.
        kwargs = dict(
            queue=orm_job.queue,
            priority=priority if priority is not None else orm_job.priority,
            interval=interval if interval is not None else orm_job.interval,
            repeat=repeat if repeat is not NO_VALUE else orm_job.repeat,
            retry_interval=retry_interval
            if retry_interval is not NO_VALUE
            else orm_job.retry_interval,
            max_retries=orm_job.max_retries,
            retries=orm_job.retries,
        )

        # Set a null new_scheduled_time so that we finish processing if none of the cases below pertain.
        new_scheduled_time = None
        if delay is not None:
            # If delay is specified, all other logic is overridden, and we just schedule the job
            # as specified with the delay.
            # This is to allow for the job just to be re-run after a delay, without any other
            # enqueuing changes - so if it is still set to repeat, it will repeat again after the
            # delayed rerun.
            new_scheduled_time = self._now() + delay
        elif self._should_retry_on_failed_task(
            orm_job, exception, kwargs["retry_interval"]
        ):
            new_scheduled_time = self._now() + timedelta(
                seconds=kwargs["retry_interval"]
                if kwargs["retry_interval"] is not None
                else 10
            )
            # Increment the retries count.
            current_retries = orm_job.retries if orm_job.retries is not None else 0
            kwargs["retries"] = current_retries + 1

        elif (
            orm_job.state in {State.COMPLETED, State.FAILED, State.CANCELED}
            and kwargs["repeat"] != 0
        ):
            # Otherwise, if we are in a finished state and repeat is not 0, then we can reschedule, either because
            # repeat is None, or because repeat is not None and is greater than 0.
            if kwargs["repeat"] is not None:
                # If repeat is not None, then we are 'consuming' one of our repeats by rescheduling, so decrement now.
                kwargs["repeat"] = kwargs["repeat"] - 1
            # Set the new scheduled time based on the specified interval.
            new_scheduled_time = self._now() + timedelta(seconds=kwargs["interval"])
        if new_scheduled_time is not None:
            # Convert the orm job to a job object for requeuing.
            job = self._orm_to_job(orm_job)
            # Use the schedule method so that any scheduling hooks are run for this next run of the job.
            self.schedule(new_scheduled_time, job, **kwargs)

    def _should_retry_on_failed_task(self, orm_job, exception, retry_interval):
        """
        Determine if a job should be retried based on its retry settings and the exception raised.
        """
        if orm_job.state != State.FAILED:
            return False

        if retry_interval is None and orm_job.max_retries is None:
            # retry_interval or max_retries should be set to enable retries
            return False

        current_retries = orm_job.retries if orm_job.retries is not None else 0
        if orm_job.max_retries is not None and current_retries >= orm_job.max_retries:
            return False

        job = self._orm_to_job(orm_job)
        retry_on = job.task.retry_on
        if retry_on and exception:
            return any(isinstance(exception, exc) for exc in retry_on)

        return True

    def _update_job(self, job_id, state=None, **kwargs):
        with transaction.atomic(using=self._get_job_database_alias()):
            try:
                job, orm_job = self._get_job_and_orm_job(job_id)
                if state is not None:
                    orm_job.state = job.state = state
                for kwarg in kwargs:
                    if kwarg in Job.UPDATEABLE_KEYS:
                        setattr(job, kwarg, kwargs[kwarg])
                    else:
                        logger.error(
                            "Tried to update job with id {} with non-updateable key {}".format(
                                job.job_id, kwarg
                            )
                        )
                orm_job.saved_job = job.to_json()
                orm_job.save()
                for hook in self._hooks:
                    hook.update(job, orm_job, state=state, **kwargs)
                return job, orm_job
            except JobNotFound:
                if state:
                    logger.error(
                        "Tried to update job with id {} with state {} but it was not found".format(
                            job_id, state
                        )
                    )
                else:
                    logger.error(
                        "Tried to update job with id {} but it was not found".format(
                            job_id
                        )
                    )

    def _get_job_and_orm_job(self, job_id):
        try:
            orm_job = ORMJob.objects.get(id=job_id)
        except ORMJob.DoesNotExist:
            raise JobNotFound()
        job = self._orm_to_job(orm_job)
        return job, orm_job

    def enqueue_at(
        self,
        dt,
        job,
        queue=DEFAULT_QUEUE,
        priority=Priority.REGULAR,
        interval=0,
        repeat=0,
        retry_interval=None,
        max_retries=None,
    ):
        """
        Add the job for the specified time
        """
        return self.schedule(
            dt,
            job,
            queue,
            priority=priority,
            interval=interval,
            repeat=repeat,
            retry_interval=retry_interval,
            max_retries=max_retries,
        )

    def enqueue_in(
        self,
        delta_t,
        job,
        queue=DEFAULT_QUEUE,
        priority=Priority.REGULAR,
        interval=0,
        repeat=0,
        retry_interval=None,
        max_retries=None,
    ):
        """
        Add the job in the specified time delta
        """
        if not isinstance(delta_t, timedelta):
            raise TypeError("Time argument must be a timedelta object.")
        dt = self._now() + delta_t
        return self.schedule(
            dt,
            job,
            queue=queue,
            priority=priority,
            interval=interval,
            repeat=repeat,
            retry_interval=retry_interval,
            max_retries=max_retries,
        )

    def schedule(
        self,
        dt,
        job,
        queue=DEFAULT_QUEUE,
        priority=Priority.REGULAR,
        interval=0,
        repeat=0,
        retry_interval=None,
        retries=None,
        max_retries=None,
    ):
        """
        Add the job for the specified time, interval, and number of repeats.
        Repeat of None with a specified interval means the job will repeat forever at that
        interval.
        """
        if not isinstance(dt, datetime):
            raise ValueError("Time argument must be a datetime object.")

        validate_repeat(repeat)

        if not interval and repeat != 0:
            raise ValueError("Must specify an interval if the task is repeating")
        if dt.tzinfo is None:
            raise ValueError(
                "Must use a timezone aware datetime object for scheduling tasks"
            )
        if not isinstance(job, Job):
            raise ValueError("Job argument must be a Job object.")

        with transaction.atomic(using=self._get_job_database_alias()):
            orm_job = ORMJob.objects.filter(id=job.job_id).first()
            if orm_job and orm_job.state == State.RUNNING:
                raise JobRunning()

            job.state = State.QUEUED
            orm_job_data = {
                "id": job.job_id,
                "state": job.state,
                "func": job.func,
                "priority": priority,
                "queue": queue,
                "interval": interval,
                "repeat": repeat,
                "retry_interval": retry_interval,
                "retries": retries,
                "max_retries": max_retries,
                "scheduled_time": dt,
                "saved_job": job.to_json(),
            }

            if orm_job:
                # Update existing job
                for key, value in orm_job_data.items():
                    setattr(orm_job, key, value)
                orm_job.save()
            else:
                orm_job = ORMJob.objects.create(**orm_job_data)

            self._run_scheduled_hooks(orm_job)

        return job.job_id

    def _run_scheduled_hooks(self, orm_job):
        job = self._orm_to_job(orm_job)
        for hook in self._hooks:
            hook.schedule(job, orm_job)

    def _now(self):
        return local_now()
