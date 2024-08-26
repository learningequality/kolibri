import logging
from contextlib import contextmanager
from datetime import datetime
from datetime import timedelta

import pytz
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import func as sql_func
from sqlalchemy import Index
from sqlalchemy import Integer
from sqlalchemy import or_
from sqlalchemy import select
from sqlalchemy import String
from sqlalchemy import Table
from sqlalchemy import text
from sqlalchemy import update
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

from kolibri.core.tasks.constants import DEFAULT_QUEUE
from kolibri.core.tasks.constants import Priority
from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.exceptions import JobNotRestartable
from kolibri.core.tasks.exceptions import JobRunning
from kolibri.core.tasks.hooks import StorageHook
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.validation import validate_interval
from kolibri.core.tasks.validation import validate_priority
from kolibri.core.tasks.validation import validate_repeat
from kolibri.core.tasks.validation import validate_timedelay
from kolibri.utils.sql_alchemy import db_matches_schema
from kolibri.utils.time_utils import local_now
from kolibri.utils.time_utils import naive_utc_datetime

Base = declarative_base()

logger = logging.getLogger(__name__)


class ORMJob(Base):
    """
    The DB representation of a common.classes.Job object,
    storing the relevant details needed by the job storage
    backend.
    """

    __tablename__ = "jobs"

    # The hex UUID given to the job upon first creation.
    id = Column(String, primary_key=True, autoincrement=False)

    # The job's state. Inflated here for easier querying to the job's state.
    state = Column(String, index=True)

    # The job's function string. Inflated here for easier querying of which task type it is.
    func = Column(String, index=True)

    # The job's priority. Helps to decide which job to run next.
    priority = Column(Integer, index=True)

    # The queue name passed to the client when the job is scheduled.
    queue = Column(String, index=True)

    # The JSON string that represents the job
    saved_job = Column(String)

    time_created = Column(DateTime(timezone=True), server_default=sql_func.now())
    time_updated = Column(DateTime(timezone=True), onupdate=sql_func.now())

    # Repeat interval in seconds.
    interval = Column(Integer, default=0)

    # Retry interval in seconds.
    retry_interval = Column(Integer, nullable=True)

    # Number of times to repeat - None means repeat forever.
    repeat = Column(Integer, nullable=True)

    scheduled_time = Column(DateTime())

    # Optional references to the worker host, process and thread that are running this job,
    # and any extra metadata that can be used by specific worker implementations.
    worker_host = Column(String, nullable=True)
    worker_process = Column(String, nullable=True)
    worker_thread = Column(String, nullable=True)
    worker_extra = Column(String, nullable=True)

    __table_args__ = (Index("queue__scheduled_time", "queue", "scheduled_time"),)


NO_VALUE = object()


class Storage(object):
    def __init__(self, connection, Base=Base):
        self.engine = connection
        if self.engine.name == "sqlite":
            self.set_sqlite_pragmas()
        self.Base = Base
        self.Base.metadata.create_all(self.engine)
        self.sessionmaker = sessionmaker(bind=self.engine)
        self._hooks = list(StorageHook.registered_hooks)

    @contextmanager
    def session_scope(self):
        session = self.sessionmaker()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def __len__(self):
        """
        Returns the number of jobs currently in the storage.
        """
        with self.engine.connect() as conn:
            return conn.execute(sql_func.count(ORMJob.id)).scalar()

    def __contains__(self, item):
        """
        Returns a boolean indicating whether the given job instance or job id
        is scheduled for execution.
        """
        job_id = item
        if isinstance(item, Job):
            job_id = item.job_id
        with self.engine.connect() as connection:
            return (
                connection.execute(select(ORMJob).where(ORMJob.id == job_id)).fetchone()
                is not None
            )

    @staticmethod
    def recreate_default_tables(engine):
        """
        Recreates the default tables for the job storage backend.
        """
        Base.metadata.drop_all(engine)
        scheduledjobs_base = declarative_base()
        scheduledjobs_table = Table("scheduledjobs", scheduledjobs_base.metadata)
        scheduledjobs_table.drop(engine, checkfirst=True)
        Base.metadata.create_all(engine)

    def set_sqlite_pragmas(self):
        """
        Sets the connection PRAGMAs for the sqlalchemy engine stored in self.engine.

        It currently sets:
        - journal_mode to WAL

        :return: None
        """
        try:
            with self.engine.connect() as conn:
                conn.execute(text("PRAGMA journal_mode = WAL;"))
        except OperationalError:
            pass

    def _orm_to_job(self, orm_job):
        """
        Extracts a Job object from the saved_job string column of ORMJob

        Also adds a save_meta method to a job object so that a job
        can update itself.
        """
        job = Job.from_json(orm_job.saved_job)

        job.storage = self
        return job

    def enqueue_job(
        self, job, queue=DEFAULT_QUEUE, priority=Priority.REGULAR, retry_interval=None
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
            )
        except JobRunning:
            logger.debug(
                "Attempted to enqueue a running job {job_id}, ignoring.".format(
                    job_id=job.job_id
                )
            )
            return job.job_id

    def enqueue_lifo(
        self, job, queue=DEFAULT_QUEUE, priority=Priority.REGULAR, retry_interval=None
    ):
        naive_utc_now = datetime.utcnow()
        with self.session_scope() as session:
            soonest_job = (
                session.query(ORMJob)
                .filter(ORMJob.state == State.QUEUED)
                .filter(ORMJob.scheduled_time <= naive_utc_now)
                .order_by(ORMJob.scheduled_time)
                .first()
            )
            dt = (
                pytz.timezone("UTC").localize(soonest_job.scheduled_time)
                - timedelta(microseconds=1)
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

    def _filter_next_query(self, query, priority):
        naive_utc_now = datetime.utcnow()
        return (
            query.filter(ORMJob.state == State.QUEUED)
            .filter(ORMJob.scheduled_time <= naive_utc_now)
            .filter(ORMJob.priority <= priority)
            .order_by(ORMJob.priority, ORMJob.scheduled_time, ORMJob.time_created)
        )

    def _postgres_next_queued_job(self, session, priority):
        """
        For postgres we are doing our best to ensure that the selected job
        is not then also selected by another potentially concurrent worker controller
        process. We do this by doing a select for update within a subquery.
        This should work as long as our connection uses the default isolation level
        of READ_COMMITTED.
        More details here: https://dba.stackexchange.com/a/69497
        For SQLAlchemy details here: https://stackoverflow.com/a/25943713
        """
        subquery = (
            self._filter_next_query(session.query(ORMJob.id), priority)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        return self.engine.execute(
            update(ORMJob)
            .values(state=State.SELECTED)
            .where(ORMJob.id == subquery.scalar_subquery())
            .returning(ORMJob.saved_job)
        ).fetchone()

    def _sqlite_next_queued_job(self, session, priority):
        """
        Due to the difficulty in appropriately locking the task row
        we do not support multiple task runners potentially duelling
        to lock tasks for SQLite, so here we just do a minimal
        best effort to mark the job as selected for running.
        """
        orm_job = self._filter_next_query(session.query(ORMJob), priority).first()
        if orm_job:
            orm_job.state = State.SELECTED
            session.add(orm_job)
        return orm_job

    def get_next_queued_job(self, priority=Priority.REGULAR):
        with self.session_scope() as s:
            method = (
                self._sqlite_next_queued_job
                if self.engine.dialect.name == "sqlite"
                else self._postgres_next_queued_job
            )
            orm_job = method(s, priority)

            if orm_job:
                job = self._orm_to_job(orm_job)
            else:
                job = None

            return job

    def filter_jobs(
        self, queue=None, queues=None, state=None, repeating=None, func=None
    ):
        if queue and queues:
            raise ValueError("Cannot specify both queue and queues")
        with self.engine.connect() as conn:
            q = select(ORMJob)

            if queue:
                q = q.where(ORMJob.queue == queue)

            if queues:
                q = q.where(ORMJob.queue.in_(queues))

            if state:
                q = q.where(ORMJob.state == state)

            if repeating is True:
                q = q.where(or_(ORMJob.repeat > 0, ORMJob.repeat == None))  # noqa E711
            elif repeating is False:
                q = q.where(ORMJob.repeat == 0)

            if func:
                q = q.where(ORMJob.func == func)

            orm_jobs = conn.execute(q)

            return [self._orm_to_job(o) for o in orm_jobs]

    def get_canceling_jobs(self, queues=None):
        return self.get_jobs_by_state(state=State.CANCELING, queues=queues)

    def get_running_jobs(self, queues=None):
        return self.get_jobs_by_state(state=State.RUNNING, queues=queues)

    def get_jobs_by_state(self, state, queues=None):
        return self.filter_jobs(state=state, queues=queues)

    def get_all_jobs(self, queue=None, repeating=None):
        return self.filter_jobs(queue=queue, repeating=repeating)

    def test_table_readable(self):
        # Have to use the self-referential `self.engine.engine` as the inspection
        # used inside this function complains if we use the `self.engine` object
        # as it is a Django SimpleLazyObject and it doesn't like it!
        db_matches_schema({ORMJob.__tablename__: ORMJob}, self.engine.engine)

    def get_job(self, job_id):
        orm_job = self.get_orm_job(job_id)
        job = self._orm_to_job(orm_job)
        return job

    def get_orm_job(self, job_id):
        with self.engine.connect() as connection:
            orm_job = connection.execute(
                select(ORMJob).where(ORMJob.id == job_id)
            ).fetchone()
        if orm_job is None:
            raise JobNotFound()
        return orm_job

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
        with self.session_scope() as s:
            q = s.query(ORMJob)
            if queue:
                q = q.filter_by(queue=queue)
            if job_id:
                q = q.filter_by(id=job_id)

            # filter only by the finished jobs, if we are not specified to force
            if not force:
                q = q.filter(
                    or_(
                        ORMJob.state == State.COMPLETED,
                        ORMJob.state == State.FAILED,
                        ORMJob.state == State.CANCELED,
                    )
                )
            if self._hooks:
                for orm_job in q:
                    job = self._orm_to_job(orm_job)
                    for hook in self._hooks:
                        hook.clear(job, orm_job)
            q.delete(synchronize_session=False)

    def update_job_progress(self, job_id, progress, total_progress):
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
        self._update_job(job_id, progress=progress, total_progress=total_progress)

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

        with self.session_scope() as session:
            try:
                _, orm_job = self._get_job_and_orm_job(job_id, session)
                if host is not None:
                    orm_job.worker_host = host
                if process is not None:
                    orm_job.worker_process = process
                if thread is not None:
                    orm_job.worker_thread = thread
                if extra is not None:
                    orm_job.worker_extra = extra
                session.add(orm_job)
                try:
                    session.commit()
                except Exception as e:
                    logger.error("Got an error running session.commit(): {}".format(e))
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
        elif orm_job.state == State.FAILED and kwargs["retry_interval"] is not None:
            # If the task has failed, and a retry interval has been specified (either in the original enqueue,
            # or from the passed in kwargs) then requeue as a retry.
            new_scheduled_time = self._now() + timedelta(
                seconds=kwargs["retry_interval"]
            )

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

    def _update_job(self, job_id, state=None, **kwargs):
        with self.session_scope() as session:
            try:
                job, orm_job = self._get_job_and_orm_job(job_id, session)
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
                session.add(orm_job)
                try:
                    session.commit()
                except Exception as e:
                    logger.error("Got an error running session.commit(): {}".format(e))
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

    def _get_job_and_orm_job(self, job_id, session):
        orm_job = session.query(ORMJob).filter_by(id=job_id).one_or_none()
        if orm_job is None:
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

        with self.session_scope() as session:
            orm_job = session.get(ORMJob, job.job_id)
            if orm_job and orm_job.state == State.RUNNING:
                raise JobRunning()

            job.state = State.QUEUED
            orm_job = ORMJob(
                id=job.job_id,
                state=job.state,
                func=job.func,
                priority=priority,
                queue=queue,
                interval=interval,
                repeat=repeat,
                retry_interval=retry_interval,
                scheduled_time=naive_utc_datetime(dt),
                saved_job=job.to_json(),
            )
            session.merge(orm_job)
            try:
                session.commit()
            except Exception as e:
                logger.error("Got an error running session.commit(): {}".format(e))

            self._run_scheduled_hooks(orm_job)

            return job.job_id

    def _run_scheduled_hooks(self, orm_job):
        job = self._orm_to_job(orm_job)
        for hook in self._hooks:
            hook.schedule(job, orm_job)

    def _now(self):
        return local_now()
