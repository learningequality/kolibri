import logging
import traceback

from concurrent.futures import CancelledError

from kolibri.core.tasks.compat import PoolExecutor
from kolibri.core.tasks.job import execute_job
from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.utils import InfiniteLoopThread

logger = logging.getLogger(__name__)


class Empty(Exception):
    # An exception to raise when there are now queued jobs waiting to be started.
    pass


class Worker(object):
    def __init__(self, queues, connection=None, num_workers=3):
        # Internally, we use concurrent.future.Future to run and track
        # job executions. We need to keep track of which future maps to which
        # job they were made from, and we use the job_future_mapping dict to do
        # so.
        if connection is None:
            raise ValueError("Connection must be defined")

        # Queues that this worker executes tasks for
        if type(queues) is not list:
            queues = [queues]
        self.queues = queues
        # Key: future object, Value: job object
        self.job_future_mapping = {}
        # Key: job_id, Value: future object
        self.future_job_mapping = {}
        self.storage = Storage(connection)
        self.num_workers = num_workers

        self.workers = self.start_workers(num_workers=self.num_workers)
        self.job_checker = self.start_job_checker()

    def shutdown_workers(self, wait=True):
        # First cancel all running jobs
        # Coerce to a list, as otherwise the iterable can change size
        # during iteration, as jobs are cancelled and removed from the mapping
        job_ids = list(self.future_job_mapping.keys())
        for job_id in job_ids:
            logger.info("Canceling job id {}.".format(job_id))
            self.cancel(job_id)
        # Now shutdown the workers
        self.workers.shutdown(wait=wait)

    def start_workers(self, num_workers):
        pool = PoolExecutor(max_workers=num_workers)
        return pool

    def handle_finished_future(self, future):
        # get back the job assigned to the future
        job = self.job_future_mapping[future]

        # Clean up tracking of this job and its future
        del self.job_future_mapping[future]
        del self.future_job_mapping[job.job_id]

        try:
            result = future.result()
        except CancelledError:
            self.report_cancelled(job.job_id)
            return
        except Exception as e:
            if hasattr(e, "traceback"):
                traceback = e.traceback
            else:
                traceback = ""
            self.report_error(job.job_id, e, traceback)
            return

        self.report_success(job.job_id, result)

    def shutdown(self, wait=True):
        logger.info("Asking job schedulers to shut down.")
        self.job_checker.stop()
        self.shutdown_workers(wait=wait)
        if wait:
            self.job_checker.join()

    def start_job_checker(self):
        """
        Starts up the job checker thread, that starts scheduled jobs when there are workers free,
        and checks for cancellation requests for jobs currently assigned to a worker.
        Returns: the Thread object.
        """
        t = InfiniteLoopThread(
            self.check_jobs, thread_name="JOBCHECKER", wait_between_runs=0.5
        )
        t.start()
        return t

    def check_jobs(self):
        """
        Check how many workers are currently running.
        If fewer workers are running than there are available workers, start a new job!
        Returns: None
        """
        try:
            while len(self.future_job_mapping) < self.num_workers:
                self.start_next_job()
        except Empty:
            logger.debug("No jobs to start.")
        for job in self.storage.get_canceling_jobs(self.queues):
            job_id = job.job_id
            if job_id in self.future_job_mapping:
                self.cancel(job_id)
            else:
                self.report_cancelled(job_id)

    def report_cancelled(self, job_id):
        self.storage.mark_job_as_canceled(job_id)

    def report_success(self, job_id, result):
        self.storage.complete_job(job_id, result=result)

    def report_error(self, job_id, exc, trace):
        trace = traceback.format_exc()
        logger.error("Job {} raised an exception: {}".format(job_id, trace))
        self.storage.mark_job_as_failed(job_id, exc, trace)

    def update_progress(self, job_id, progress, total_progress, stage=""):
        self.storage.update_job_progress(job_id, progress, total_progress)

    def start_next_job(self):
        """
        start the next scheduled job to the type of workers spawned by self.start_workers.

        :return future:
        """
        job = self.storage.get_next_queued_job(self.queues)

        if not job:
            raise Empty

        self.storage.mark_job_as_running(job.job_id)

        db_type_lookup = {
            "sqlite": "sqlite",
            "postgresql": "postgres",
        }

        db_type = db_type_lookup[self.storage.engine.dialect.name]

        future = self.workers.submit(
            execute_job,
            job_id=job.job_id,
            db_type=db_type,
            db_url=self.storage.engine.url,
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
        If that didn't work (because it's already running), then mark
        a special variable inside the future that we can check
        inside a special check_for_cancel function passed to the
        job.
        :param job_id:
        :return:
        """
        try:
            future = self.future_job_mapping[job_id]
            is_future_cancelled = future.cancel()
        except KeyError:
            # In the case that the future does not even exist, say it has been cancelled.
            is_future_cancelled = True

        if is_future_cancelled:  # success!
            return True
        else:
            if future.running():
                # Already running, so we manually mark the future as cancelled
                setattr(future, "_is_cancelled", True)
                return False
            else:  # probably finished already, too late to cancel!
                return False
