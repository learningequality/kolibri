import logging
from contextlib import contextmanager
from datetime import datetime
from datetime import timedelta

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import func
from sqlalchemy import Index
from sqlalchemy import Integer
from sqlalchemy import or_
from sqlalchemy import String
from sqlalchemy import update
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from kolibri.core.tasks.constants import DEFAULT_QUEUE
from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.exceptions import JobNotRestartable
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.job import State
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

    # The job's priority. Helps to decide which job to run next.
    priority = Column(Integer, index=True)

    # The queue name passed to the client when the job is scheduled.
    queue = Column(String, index=True)

    # The JSON string that represents the job
    saved_job = Column(String)

    time_created = Column(DateTime(timezone=True), server_default=func.now())
    time_updated = Column(DateTime(timezone=True), server_onupdate=func.now())

    # Repeat interval in seconds.
    interval = Column(Integer, default=0)

    # Retry interval in seconds.
    retry_interval = Column(Integer, nullable=True)

    # Number of times to repeat - None means repeat forever.
    repeat = Column(Integer, nullable=True)

    scheduled_time = Column(DateTime())

    __table_args__ = (Index("queue__scheduled_time", "queue", "scheduled_time"),)


def _validate_hooks(hooks):
    if hooks is None:
        return []
    if not isinstance(hooks, list) or any(not callable(h) for h in hooks):
        raise RuntimeError("hooks must be a list of callables")
    return hooks


class Storage(object):
    def __init__(self, connection, Base=Base, schedule_hooks=None, update_hooks=None):
        self.engine = connection
        if self.engine.name == "sqlite":
            self.set_sqlite_pragmas()
        self.Base = Base
        self.Base.metadata.create_all(self.engine)
        self.sessionmaker = sessionmaker(bind=self.engine)
        self.schedule_hooks = _validate_hooks(schedule_hooks)
        self.update_hooks = _validate_hooks(update_hooks)

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
        with self.session_scope() as session:
            return session.query(ORMJob).count()

    def __contains__(self, item):
        """
        Returns a boolean indicating whether the given job instance or job id
        is scheduled for execution.
        """
        job_id = item
        if isinstance(item, Job):
            job_id = item.job_id
        with self.session_scope() as session:
            return session.query(
                session.query(ORMJob).filter_by(id=job_id).exists()
            ).scalar()

    def recreate_tables(self):
        self.Base.metadata.drop_all(self.engine)
        self.Base.metadata.create_all(self.engine)

    def set_sqlite_pragmas(self):
        """
        Sets the connection PRAGMAs for the sqlalchemy engine stored in self.engine.

        It currently sets:
        - journal_mode to WAL

        :return: None
        """
        try:
            self.engine.execute("PRAGMA journal_mode = WAL;")
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
        return self.schedule(
            dt,
            job,
            queue,
            priority=priority,
            interval=0,
            repeat=0,
            retry_interval=retry_interval,
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
            .order_by(ORMJob.priority, ORMJob.time_created)
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
            .where(ORMJob.id == subquery.as_scalar())
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

    def get_canceling_jobs(self, queues=None):
        with self.session_scope() as s:
            q = s.query(ORMJob).filter(ORMJob.state == State.CANCELING)

            if queues:
                q = q.filter(ORMJob.queue.in_(queues))

            jobs = q.order_by(ORMJob.time_created).all()

            return [self._orm_to_job(job) for job in jobs]

    def get_running_jobs(self, queues=None):
        with self.session_scope() as s:
            q = s.query(ORMJob).filter(ORMJob.state == State.RUNNING)

            if queues:
                q = q.filter(ORMJob.queue.in_(queues))

            jobs = q.order_by(ORMJob.time_created).all()

            return [self._orm_to_job(job) for job in jobs]

    def get_all_jobs(self, queue=None):
        with self.session_scope() as s:
            q = s.query(ORMJob)

            if queue:
                q = q.filter(ORMJob.queue == queue)

            orm_jobs = q.all()

            return [self._orm_to_job(o) for o in orm_jobs]

    def count_all_jobs(self, queue=None):
        with self.session_scope() as s:
            q = s.query(ORMJob)

            if queue:
                q = q.filter(ORMJob.queue == queue)

            return q.count()

    def get_job(self, job_id):
        with self.session_scope() as session:
            job, _ = self._get_job_and_orm_job(job_id, session)
            return job

    def restart_job(self, job_id):
        """
        First deletes the job with id = job_id then enqueues a new job with the same
        job_id as the one we deleted, with same args and kwargs.

        Returns the job_id of enqueued job.

        Raises `JobNotRestartable` exception if the job with id = job_id state is
        not in CANCELED or FAILED.
        """
        with self.session_scope() as session:
            job_to_restart, orm_job = self._get_job_and_orm_job(job_id, session)
            queue = orm_job.queue
            priority = orm_job.priority

        if job_to_restart.state in [State.CANCELED, State.FAILED]:
            self.clear(job_id=job_to_restart.job_id, force=False)
            job = Job.from_job(
                job_to_restart,
                job_id=job_to_restart.job_id,
            )
            return self.enqueue_job(job, queue=queue, priority=priority)
        else:
            raise JobNotRestartable(
                "Cannot restart job with state={}".format(job_to_restart.state)
            )

    def check_job_canceled(self, job_id):
        job = self.get_job(job_id)
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

    def _update_job(self, job_id, state=None, **kwargs):
        with self.session_scope() as session:
            try:
                job, orm_job = self._get_job_and_orm_job(job_id, session)
                for update_hook in self.update_hooks:
                    update_hook(job, orm_job, state=state, **kwargs)
                if state is not None:
                    orm_job.state = job.state = state
                    if state == State.FAILED and orm_job.retry_interval is not None:
                        orm_job.state = State.QUEUED
                        orm_job.scheduled_time = naive_utc_datetime(
                            self._now() + timedelta(seconds=orm_job.retry_interval)
                        )
                    elif state in {State.COMPLETED, State.FAILED, State.CANCELED}:
                        if orm_job.repeat is None or orm_job.repeat > 0:
                            orm_job.repeat = (
                                orm_job.repeat - 1
                                if orm_job.repeat is not None
                                else None
                            )
                            orm_job.state = State.QUEUED
                            orm_job.scheduled_time = naive_utc_datetime(
                                self._now() + timedelta(seconds=orm_job.interval)
                            )
                for kwarg in kwargs:
                    setattr(job, kwarg, kwargs[kwarg])
                orm_job.saved_job = job.to_json()
                session.add(orm_job)
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
            raise ValueError("Time argument must be a timedelta object.")
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
        if not interval and repeat != 0:
            raise ValueError("Must specify an interval if the task is repeating")
        if dt.tzinfo is None:
            raise ValueError(
                "Must use a timezone aware datetime object for scheduling tasks"
            )
        if not isinstance(job, Job):
            raise ValueError("Job argument must be a Job object.")

        with self.session_scope() as session:
            orm_job = session.query(ORMJob).get(job.job_id)
            if orm_job and orm_job.state not in {
                State.COMPLETED,
                State.FAILED,
                State.CANCELED,
            }:
                # If this job is already queued or running, don't try to replace it.
                # Call our schedule hooks anyway to ensure that job storage
                # is synchronized with any other task runner.
                self._run_scheduled_hooks(orm_job)
                return job.job_id

            job.state = State.QUEUED
            orm_job = ORMJob(
                id=job.job_id,
                state=job.state,
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
        for schedule_hook in self.schedule_hooks:
            schedule_hook(
                id=orm_job.id,
                priority=orm_job.priority,
                interval=orm_job.interval,
                repeat=orm_job.repeat,
                retry_interval=orm_job.retry_interval,
                scheduled_time=orm_job.scheduled_time,
            )

    def _now(self):
        return local_now()
