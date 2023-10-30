import logging
from concurrent.futures import CancelledError

from django.db import connection as django_connection

from kolibri.core.tasks.compat import PoolExecutor
from kolibri.core.tasks.constants import Priority
from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.utils import db_connection
from kolibri.core.tasks.utils import InfiniteLoopThread

logger = logging.getLogger(__name__)


def execute_job(job_id):
    """
    Call the function stored in the job.func.
    :return: None
    """

    connection = db_connection()

    storage = Storage(connection)

    job = storage.get_job(job_id)

    job.execute()

    connection.dispose()

    # Close any django connections opened here
    django_connection.close()


class Worker(object):
    def __init__(self, connection, regular_workers=2, high_workers=1):
        # Internally, we use concurrent.future.Future to run and track
        # job executions. We need to keep track of which future maps to which
        # job they were made from, and we use the job_future_mapping dict to do
        # so.

        # Key: future object, Value: job object
        self.job_future_mapping = {}

        # Key: job_id, Value: future object
        self.future_job_mapping = {}

        self.storage = Storage(connection)

        self.requeue_stalled_jobs()

        # Regular workers run both 'high' and 'regular' priority jobs.
        # High workers run only 'high' priority jobs.
        self.regular_workers = regular_workers
        self.max_workers = regular_workers + high_workers

        self.workers = self.start_workers()
        self.job_checker = self.start_job_checker()

    def requeue_stalled_jobs(self):
        logger.info("Requeuing stalled jobs.")
        for job in self.storage.get_running_jobs():
            logger.info("Requeuing job id {}.".format(job.job_id))
            self.storage.mark_job_as_queued(job.job_id)

    def shutdown_workers(self, wait=True):
        # First cancel all running jobs
        # Coerce to a list, as otherwise the iterable can change size
        # during iteration, as jobs are cancelled and removed from the mapping
        for job in self.storage.get_running_jobs():
            logger.info("Canceling job id {}.".format(job.job_id))
            self.storage.mark_job_as_canceling(job.job_id)
            if self.cancel(job.job_id):
                self.storage.mark_job_as_canceled(job.job_id)
        # Now shutdown the workers
        self.workers.shutdown(wait=wait)

    def start_workers(self):
        pool = PoolExecutor(max_workers=self.max_workers)
        return pool

    def handle_finished_future(self, future):
        # get back the job assigned to the future
        job = self.job_future_mapping[future]

        # Clean up tracking of this job and its future
        del self.job_future_mapping[future]
        del self.future_job_mapping[job.job_id]

        try:
            future.result()
        except CancelledError:
            self.storage.mark_job_as_canceled(job.job_id)

    def shutdown(self, wait=True):
        logger.info("Asking job schedulers to shut down.")
        self.job_checker.stop()
        # Wait for the job checker to finish
        # before attempting to pause any running jobs
        if wait:
            self.job_checker.join()
        self.shutdown_workers(wait=wait)

    def start_job_checker(self):
        """
        Starts up the job checker thread, that starts scheduled jobs when there are workers free,
        and checks for cancellation requests for jobs currently assigned to a worker.
        Returns: the Thread object.
        """
        t = InfiniteLoopThread(
            self.check_jobs, thread_name="JOBCHECKER", wait_between_runs=0.2
        )
        t.start()
        return t

    def check_jobs(self):
        """
        Checks for the next job to run and also checks for jobs that should be cancelled.

        Returns: None
        """
        job_to_start = self.get_next_job()
        while job_to_start:
            self.start_next_job(job_to_start)
            job_to_start = self.get_next_job()

        for job in self.storage.get_canceling_jobs():
            job_id = job.job_id
            if job_id in self.future_job_mapping:
                self.cancel(job_id)
            else:
                self.storage.mark_job_as_canceled(job_id)

    def get_next_job(self):
        """
        Fetches the next potential QUEUED job.

        If less workers are running than there are regular workers, we look first for
        jobs with 'high' priority, if found one we run it else we look for jobs with 'regular'
        priority, if found we run it.

        If all regular workers are busy, then the remaining workers only look for
        'high' priority jobs. If found one, we run it.

        This algorithm will make sure 'high' jobs don't wait :)

        Returns the job object if a job is available based on the above algorithm else None.
        """
        job = None
        workers_currently_busy = len(self.future_job_mapping)

        if workers_currently_busy < self.regular_workers:
            job = self.storage.get_next_queued_job()
        elif workers_currently_busy < self.max_workers:
            job = self.storage.get_next_queued_job(priority=Priority.HIGH)
        else:
            logger.debug("All workers busy.")
            return None

        return job

    def start_next_job(self, job):
        """
        start the next scheduled job to the type of workers spawned by self.start_workers.

        :return future:
        """
        future = self.workers.submit(
            execute_job,
            job_id=job.job_id,
        )

        # assign the futures to a dict, mapping them to a job
        self.job_future_mapping[future] = job
        self.future_job_mapping[job.job_id] = future

        # callback for when the future is now!
        future.add_done_callback(self.handle_finished_future)

        return future

    def cancel(self, job_id):
        """
        Request a cancellation from the futures executor pool.
        :param job_id:
        :return:
        """
        try:
            future = self.future_job_mapping[job_id]
            is_future_cancelled = future.cancel()
        except KeyError:
            # In the case that the future does not even exist, say it has been cancelled.
            is_future_cancelled = True

        return is_future_cancelled
