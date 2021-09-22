import time
from datetime import datetime
from datetime import timedelta

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Index
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy.ext.declarative import declarative_base

from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.queue import Queue
from kolibri.core.tasks.storage import StorageMixin
from kolibri.core.tasks.utils import InfiniteLoopThread
from kolibri.utils.time_utils import local_now
from kolibri.utils.time_utils import naive_utc_datetime

Base = declarative_base()


class ScheduledJob(Base):
    """
    The DB representation of a scheduled job,
    storing the relevant details needed to schedule jobs.
    """

    __tablename__ = "scheduledjobs"

    # The hex UUID given to the job upon first creation
    id = Column(String, primary_key=True, autoincrement=False)

    # Repeat interval in seconds.
    interval = Column(Integer, default=0)

    # Number of times to repeat - None means repeat forever.
    repeat = Column(Integer, nullable=True)

    # The app name passed to the client when the job is scheduled.
    queue = Column(String, index=True)

    # The JSON string that represents the job
    saved_job = Column(String)

    scheduled_time = Column(DateTime())

    __table_args__ = (Index("queue__scheduled_time", "queue", "scheduled_time"),)


class Scheduler(StorageMixin):
    def __init__(self, queue=None, connection=None):
        if connection is None and not isinstance(queue, Queue):
            raise ValueError("One of either connection or queue must be specified")
        elif isinstance(queue, Queue):
            self.queue = queue
            if connection is None:
                connection = self.queue.storage.engine
        elif connection:
            self.queue = Queue(connection=connection)

        self._schedule_checker = None

        super(Scheduler, self).__init__(connection, Base=Base)

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
                self._ns_query(session).filter_by(id=job_id).exists()
            ).scalar()

    def change_execution_time(self, job, date_time):
        """
        Change a job's execution time.
        """
        if date_time.tzinfo is None:
            raise ValueError(
                "Must use a timezone aware datetime object for scheduling tasks"
            )

        with self.session_scope() as session:
            scheduled_job = (
                session.query(ScheduledJob).filter_by(id=job.job_id).one_or_none()
            )
            if scheduled_job:
                scheduled_job.scheduled_time = naive_utc_datetime(date_time)
                session.merge(scheduled_job)
            else:
                raise ValueError("Job not in scheduled jobs queue")

    def start_schedule_checker(self):
        """
        Starts up the job checker thread, that starts scheduled jobs when there are workers free,
        and checks for cancellation requests for jobs currently assigned to a worker.
        Returns: the Thread object.
        """
        t = InfiniteLoopThread(
            self.check_schedule, thread_name="SCHEDULECHECKER", wait_between_runs=0.5
        )
        t.start()
        return t

    def run(self):
        """
        Start the schedule checker in a blocking way to be parallel to the rq-scheduler method.
        """
        thread = self.start_schedule_checker()
        thread.join()

    def start_scheduler(self):
        if not (self._schedule_checker and self._schedule_checker.is_alive()):
            self._schedule_checker = self.start_schedule_checker()

    def shutdown_scheduler(self):
        if self._schedule_checker:
            self._schedule_checker.stop()

    def enqueue_at(self, dt, func, interval=0, repeat=0, *args, **kwargs):
        """
        Add the job to the scheduler for the specified time
        """
        return self.schedule(
            dt, func, interval=interval, repeat=repeat, *args, **kwargs
        )

    def enqueue_in(self, delta_t, func, interval=0, repeat=0, *args, **kwargs):
        """
        Add the job to the scheduler in the specified time delta
        """
        if not isinstance(delta_t, timedelta):
            raise ValueError("Time argument must be a timedelta object.")
        dt = self._now() + delta_t
        return self.schedule(
            dt, func, interval=interval, repeat=repeat, *args, **kwargs
        )

    def schedule(self, dt, func, interval=0, repeat=0, *args, **kwargs):
        """
        Add the job to the scheduler for the specified time, interval, and number of repeats.
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
        if isinstance(func, Job):
            job = func
        # else, turn it into a job first.
        else:
            job = Job(func, *args, **kwargs)

        job.state = State.SCHEDULED

        with self.session_scope() as session:
            scheduled_job = ScheduledJob(
                id=job.job_id,
                queue=self.queue.name,
                interval=interval,
                repeat=repeat,
                scheduled_time=naive_utc_datetime(dt),
                saved_job=job.to_json(),
            )
            session.merge(scheduled_job)

            return job.job_id

    def get_jobs(self):
        with self.session_scope() as s:
            scheduled_jobs = self._ns_query(s).all()
            return [Job.from_json(o.saved_job) for o in scheduled_jobs]

    def count(self):
        with self.session_scope() as s:
            return self._ns_query(s).count()

    def get_job(self, job_id):
        with self.session_scope() as session:
            scheduled_job = session.query(ScheduledJob).get(job_id)
            if scheduled_job is None:
                raise JobNotFound()
            return Job.from_json(scheduled_job.saved_job)

    def cancel(self, job_id):
        """
        Clear a scheduled job.
        :type job_id: NoneType or str
        :param job_id: the job_id to clear. If None, clear all jobs.
        """
        with self.session_scope() as s:
            q = self._ns_query(s)
            if job_id:
                q = q.filter_by(id=job_id)

            q.delete(synchronize_session=False)

    def clear_scheduler(self):
        """
        Clear all scheduled jobs
        """
        self.cancel(None)

    def check_schedule(self):
        start = time.time()
        naive_utc_now = datetime.utcnow()
        with self.session_scope() as s:
            scheduled_jobs = self._ns_query(s).filter(
                ScheduledJob.scheduled_time <= naive_utc_now
            )
            for scheduled_job in scheduled_jobs:
                new_repeat = 0
                repeat = False
                if scheduled_job.repeat is None:
                    new_repeat = None
                    repeat = True
                elif scheduled_job.repeat > 0:
                    new_repeat = scheduled_job.repeat - 1
                    repeat = True
                job_for_queue = Job.from_json(scheduled_job.saved_job)
                self.queue.enqueue(job_for_queue)
                if repeat:
                    # Update this scheduled job to repeat this
                    self.schedule(
                        self._now() + timedelta(seconds=scheduled_job.interval),
                        job_for_queue,
                        interval=scheduled_job.interval,
                        repeat=new_repeat,
                    )
                else:
                    s.delete(scheduled_job)
            return time.time() - start

    def _ns_query(self, session):
        """
        Return a SQLAlchemy query that is already namespaced by the queue.
        Returns: a SQLAlchemy query object
        """
        return session.query(ScheduledJob).filter(ScheduledJob.queue == self.queue.name)

    def _now(self):
        return local_now()
