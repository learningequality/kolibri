import logging
import traceback
from concurrent.futures import CancelledError

from kolibri.core.tasks.compat import PoolExecutor
from kolibri.core.tasks.job import execute_job
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.utils import InfiniteLoopThread

logger = logging.getLogger(__name__)


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

        # Regular workers run both 'high' and 'regular' priority jobs.
        # High workers run only 'high' priority jobs.
        self.regular_workers = regular_workers
        self.max_workers = regular_workers + high_workers

        self.workers = self.start_workers()
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
            job = self.storage.get_next_queued_job(priority_order=[Priority.HIGH])
        else:
            logger.debug("All workers busy.")
            return None

        return job

    def start_next_job(self, job):
        """
        start the next scheduled job to the type of workers spawned by self.start_workers.

        :return future:
        """
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
        if future.running():
            # Already running, so we manually mark the future as cancelled
            setattr(future, "_is_cancelled", True)
            return False
        return False
