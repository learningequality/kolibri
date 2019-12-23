import logging
from contextlib import contextmanager
from copy import copy

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import func
from sqlalchemy import Integer
from sqlalchemy import or_
from sqlalchemy import PickleType
from sqlalchemy import String
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.job import State
from kolibri.utils.conf import OPTIONS

Base = declarative_base()

logger = logging.getLogger(__name__)


class ORMJob(Base):
    """
    The DB representation of a common.classes.Job object,
    storing the relevant details needed by the job storage
    backend.
    """

    __tablename__ = "jobs"

    # The hex UUID given to the job upon first creation
    id = Column(String, primary_key=True, autoincrement=False)

    # The job's state. Inflated here for easier querying to the job's state.
    state = Column(String, index=True)

    # The job's order in the entire global queue of jobs.
    queue_order = Column(Integer, autoincrement=True)

    # The queue name passed to the client when the job is scheduled.
    queue = Column(String, index=True)

    # The original Job object, pickled here for so we can easily access it.
    obj = Column(PickleType(protocol=OPTIONS["Python"]["PICKLE_PROTOCOL"]))

    time_created = Column(DateTime(timezone=True), server_default=func.now())
    time_updated = Column(DateTime(timezone=True), server_onupdate=func.now())


class StorageMixin(object):
    def __init__(self, connection, Base=Base):
        self.engine = connection
        if self.engine.name == "sqlite":
            self.set_sqlite_pragmas()
        self.Base = Base
        self.Base.metadata.create_all(self.engine)
        self.sessionmaker = sessionmaker(bind=self.engine)

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


class Storage(StorageMixin):
    def _add_save_meta_method(self, job):
        """
        Adds a save_meta method to a job object so that a job
        can update itself.
        """

        job.save_meta_method = self.save_job_meta
        return job

    def enqueue_job(self, j, queue):
        """
        Add the job given by j to the job queue.

        Note: Does not actually run the job.
        """
        with self.session_scope() as session:
            orm_job = session.query(ORMJob).get(j.job_id)
            if orm_job and orm_job.state not in [
                State.COMPLETED,
                State.FAILED,
                State.CANCELED,
            ]:
                # If this job is already queued or running, don't try to replace it.
                return j.job_id
            orm_job = ORMJob(id=j.job_id, state=j.state, queue=queue, obj=j)
            session.merge(orm_job)
            try:
                session.commit()
            except Exception as e:
                logger.error("Got an error running session.commit(): {}".format(e))

            return j.job_id

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

    def get_next_queued_job(self, queues):
        with self.session_scope() as s:
            orm_job = (
                s.query(ORMJob)
                .filter(ORMJob.queue.in_(queues))
                .filter_by(state=State.QUEUED)
                .order_by(ORMJob.queue_order)
                .first()
            )
            if orm_job:
                job = self._add_save_meta_method(orm_job.obj)
            else:
                job = None
            return job

    def get_canceling_jobs(self, queues):
        with self.session_scope() as s:
            jobs = (
                s.query(ORMJob)
                .filter(ORMJob.queue.in_(queues))
                .filter_by(state=State.CANCELING)
                .order_by(ORMJob.queue_order)
            )
            return [self._add_save_meta_method(job.obj) for job in jobs]

    def get_all_jobs(self, queue):
        with self.session_scope() as s:
            orm_jobs = s.query(ORMJob).filter(ORMJob.queue == queue).all()
            return [self._add_save_meta_method(o.obj) for o in orm_jobs]

    def count_all_jobs(self, queue):
        with self.session_scope() as s:
            return s.query(ORMJob).filter(ORMJob.queue == queue).count()

    def get_job(self, job_id):
        with self.session_scope() as session:
            job, _ = self._get_job_and_orm_job(job_id, session)
            return job

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
        self._update_job(job_id, State.FAILED, exception=exception, traceback=traceback)

    def mark_job_as_running(self, job_id):
        self._update_job(job_id, State.RUNNING)

    def complete_job(self, job_id):
        self._update_job(job_id, State.COMPLETED)

    def save_job_meta(self, job):
        self._update_job(job.job_id, extra_metadata=job.extra_metadata)

    def _update_job(self, job_id, state=None, **kwargs):
        with self.session_scope() as session:
            try:
                job, orm_job = self._get_job_and_orm_job(job_id, session)
                # Note (aron): looks like SQLAlchemy doesn't automatically
                # save any pickletype fields even if we re-set (orm_job.obj = job) that
                # field. My hunch is that it's tracking the id of the object,
                # and if that doesn't change, then SQLAlchemy doesn't repickle the object
                # and save to the DB.
                # Our hack here is to just copy the job object, and then set thespecific
                # field we want to edit, in this case the job.state. That forces
                # SQLAlchemy to re-pickle the object, thus setting it to the correct state.
                job = copy(job)
                if state is not None:
                    orm_job.state = job.state = state
                for kwarg in kwargs:
                    setattr(job, kwarg, kwargs[kwarg])
                orm_job.obj = job
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
        job = self._add_save_meta_method(orm_job.obj)
        return job, orm_job
