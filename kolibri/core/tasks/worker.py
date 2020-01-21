import logging
import traceback

from concurrent.futures import CancelledError
from concurrent.futures._base import CANCELLED
from concurrent.futures._base import CANCELLED_AND_NOTIFIED

from kolibri.core.tasks.compat import MULTIPROCESS
from kolibri.core.tasks.exceptions import UserCancelledError
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
        for job_id in self.future_job_mapping:
            self.cancel(job_id)
        # Now shutdown the workers
        self.workers.shutdown(wait=wait)

    def start_workers(self, num_workers):
        if MULTIPROCESS:
            from concurrent.futures import ProcessPoolExecutor

            worker_executor = ProcessPoolExecutor
        else:
            from concurrent.futures import ThreadPoolExecutor

            worker_executor = ThreadPoolExecutor

        pool = worker_executor(max_workers=num_workers)
        return pool

    def handle_finished_future(self, future):
        # get back the job assigned to the future
        job = self.job_future_mapping[future]

        # Clean up tracking of this job and its future
        del self.job_future_mapping[future]
        del self.future_job_mapping[job.job_id]

        try:
            result = future.result()
        except CancelledError as e:
            self.report_cancelled(job.job_id)
            return
        except Exception as e:
            self.report_error(job.job_id, e, e.traceback)
            return

        self.report_success(job.job_id, result)

    def shutdown(self, wait=False):
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
        self.storage.complete_job(job_id)

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

        lambda_to_execute = _reraise_with_traceback(job.get_lambda_to_execute())

        future = self.workers.submit(
            lambda_to_execute,
            update_progress_func=self.update_progress,
            cancel_job_func=self._check_for_cancel,
            save_job_meta_func=self.storage.save_job_meta,
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
        future = self.future_job_mapping[job_id]
        is_future_cancelled = future.cancel()

        if is_future_cancelled:  # success!
            return True
        else:
            if future.running():
                # Already running, but let's mark the future as cancelled
                # anyway, to make sure that calling future.result() will raise an error.
                # Our cancelling callback will then check this variable to see its state,
                # and exit if it's cancelled.
                from concurrent.futures._base import CANCELLED

                future._state = CANCELLED
                return False
            else:  # probably finished already, too late to cancel!
                return False

    def _check_for_cancel(self, job_id):
        """
        Check if a job has been requested to be cancelled. When called, the calling function can
        optionally give the stage it is currently in, so the user has information on where the job
        was before it was cancelled.

        :param job_id: The job_id to check
        :param current_stage: Where the job currently is

        :return: raises a UserCancelledError if we find out that we were cancelled.
        """

        future = self.future_job_mapping[job_id]
        is_cancelled = future._state in [CANCELLED, CANCELLED_AND_NOTIFIED]

        if is_cancelled:
            raise UserCancelledError()


def _reraise_with_traceback(f):
    """
    Call the function normally. But if the function raises an error, attach the str(traceback)
    into the function.traceback attribute, then reraise the error.
    Args:
        f: The function to run.

    Returns: A function that wraps f, attaching the traceback if an error occurred.

    """

    def wrap(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            traceback_str = traceback.format_exc()
            e.traceback = traceback_str
            raise

    return wrap
