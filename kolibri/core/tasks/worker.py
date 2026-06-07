import logging
import os
import socket
import threading
import time
from concurrent.futures import CancelledError
from concurrent.futures import ThreadPoolExecutor

from django.db import connection as django_connection

from kolibri.core.tasks.constants import Priority
from kolibri.core.tasks.utils import InfiniteLoopThread
from kolibri.utils.conf import OPTIONS

logger = logging.getLogger(__name__)


def execute_job(
    job_id,
    worker_host=None,
    worker_process=None,
    worker_thread=None,
    worker_extra=None,
    supervisor_id=None,
):
    """
    Call the function stored in the job.func.

    supervisor_id is the dispatcher owning this execution (the WorkerSupervisor,
    or an external dispatcher like Android's WorkManager) and doubles as the
    execution's fence token (see Job.execute).
    """
    from kolibri.core.tasks.main import job_storage

    job = job_storage.get_job(job_id)

    try:
        if supervisor_id is not None:
            # Claim only if unowned; a peer that reclaimed the job keeps it. On
            # the python worker path the supervisor already stamped ownership,
            # so this is an identical re-mark that no-ops.
            applied = job_storage.mark_job_as_running(
                job_id, supervisor_id=supervisor_id, expected_supervisor_id=None
            )
            if not applied:
                # Owned by a peer - bail before running a duplicate whose writes
                # the fence would discard anyway.
                logger.info(
                    f"Not executing job {job_id} - it is owned by another supervisor."
                )
                return

        # Fenced so a peer's reclaimed execution is not misattributed to us.
        job_storage.save_worker_info(
            job_id,
            host=worker_host,
            process=worker_process,
            thread=worker_thread,
            extra=worker_extra,
            expected_supervisor_id=supervisor_id,
        )

        job.execute(supervisor_id=supervisor_id)
    finally:
        # Close any django connections opened here
        django_connection.close()


def _python_worker_identity():
    """
    The host/process/thread identity of the current python worker context,
    taken directly from python internals.
    """
    return {
        "host": socket.gethostname(),
        "process": str(os.getpid()),
        "thread": str(threading.get_ident()),
    }


def execute_job_with_python_worker(job_id, supervisor_id=None):
    """
    Call execute_job but additionally with the current host, process and thread information taken
    directly from python internals.
    """
    identity = _python_worker_identity()
    execute_job(
        job_id,
        worker_host=identity["host"],
        worker_process=identity["process"],
        worker_thread=identity["thread"],
        supervisor_id=supervisor_id,
    )


class WorkerSupervisor:
    """
    Supervises a pool of worker executors. Each supervisor registers itself in
    the supervisor registry and periodically updates a heartbeat so that, if it
    dies, other supervisors can detect the stale heartbeat and requeue the jobs
    it was responsible for.
    """

    def __init__(self, regular_workers=2, high_workers=1):
        # Internally, we use concurrent.future.Future to run and track
        # job executions. We need to keep track of which future maps to which
        # job they were made from, and we use the job_future_mapping dict to do
        # so.

        # Key: future object, Value: job object
        self.job_future_mapping = {}

        # Key: job_id, Value: future object
        self.future_job_mapping = {}

        from kolibri.core.tasks.main import job_storage

        self.storage = job_storage

        # Register this supervisor in the registry, keeping the identity
        # so that the heartbeat can re-register if a peer wrongly declares
        # this supervisor dead and removes its record.
        self._identity = _python_worker_identity()
        self.supervisor_id = self.storage.register_supervisor(**self._identity)

        self.supervisor_stale_threshold = OPTIONS["Tasks"]["SUPERVISOR_STALE_THRESHOLD"]

        # Requeue jobs from any dead supervisors and clean up the registry.
        self._reconcile_stalled_jobs()

        # Regular workers run both 'high' and 'regular' priority jobs.
        # High workers run only 'high' priority jobs.
        self.regular_workers = regular_workers
        self.max_workers = regular_workers + high_workers

        # Heartbeat a third of the stale threshold, so three must be missed
        # before a peer declares this supervisor dead.
        self._heartbeat_interval = self.supervisor_stale_threshold / 3
        self._last_heartbeat = time.monotonic()
        # Set during shutdown to stop claiming new jobs while the loop keeps
        # heartbeating until in-flight jobs drain.
        self._draining = threading.Event()

        self.workers = self.start_workers()
        self.supervisor_thread = self.start_supervisor_thread()

    def start_supervisor_thread(self):
        """
        Start the single supervisor loop: claim and dispatch jobs, finalize
        cancellations, and periodically heartbeat and reconcile.
        Returns: the Thread object.
        """
        t = InfiniteLoopThread(
            self._supervise, thread_name="SUPERVISOR", wait_between_runs=0.2
        )
        t.start()
        return t

    def _supervise(self):
        # While draining (shutdown), stop claiming but keep heartbeating so a
        # peer does not declare us dead and requeue our still-running jobs.
        if not self._draining.is_set():
            self.check_jobs()
        self._maybe_heartbeat()

    def _maybe_heartbeat(self):
        now = time.monotonic()
        if now - self._last_heartbeat >= self._heartbeat_interval:
            self._last_heartbeat = now
            self._do_supervisor_heartbeat()

    def _do_supervisor_heartbeat(self):
        """
        Update this supervisor's last_seen timestamp, then requeue jobs from
        any supervisors that have died since this one started. Heartbeating
        first keeps our own record fresh when reconciliation runs.
        """
        self.storage.heartbeat_supervisor(self.supervisor_id, **self._identity)
        self._reconcile_stalled_jobs()

    def _reconcile_stalled_jobs(self):
        self.storage.reconcile_stalled_jobs(
            supervisor_stale_threshold=self.supervisor_stale_threshold
        )

    def shutdown_workers(self, wait=True):
        # Cancel only our own running jobs (orphans are reconciliation's), each
        # write fenced on our id so a peer that reclaimed one is not clobbered.
        for job in self.storage.get_running_jobs(supervisor_id=self.supervisor_id):
            logger.info(f"Canceling job id {job.job_id}.")
            self.storage.mark_job_as_canceling(
                job.job_id, expected_supervisor_id=self.supervisor_id
            )
            if self.cancel(job.job_id):
                self.storage.mark_job_as_canceled(
                    job.job_id, expected_supervisor_id=self.supervisor_id
                )
        # Now shutdown the workers
        self.workers.shutdown(wait=wait)

    def start_workers(self):
        pool = ThreadPoolExecutor(max_workers=self.max_workers)
        return pool

    def handle_finished_future(self, future):
        try:
            # get back the job assigned to the future
            job = self.job_future_mapping[future]
            # Clean up tracking of this job and its future
            del self.job_future_mapping[future]
            del self.future_job_mapping[job.job_id]

            try:
                future.result()
            except CancelledError:
                # Fenced on our id so a peer that reclaimed the job is not
                # clobbered.
                self.storage.mark_job_as_canceled(
                    job.job_id, expected_supervisor_id=self.supervisor_id
                )
        except KeyError:
            pass

    def shutdown(self, wait=True):
        logger.info("Asking job schedulers to shut down.")
        # Stop claiming new jobs but keep the loop heartbeating through the
        # drain: a job outlasting the stale threshold would otherwise let a peer
        # declare us dead and requeue our still-running jobs.
        self._draining.set()
        self.shutdown_workers(wait=wait)
        # Drained - stop the loop and deregister.
        self.supervisor_thread.stop()
        if wait:
            self.supervisor_thread.join()
        self.storage.unregister_supervisor(self.supervisor_id)

    def check_jobs(self):
        """
        Checks for the next job to run and also checks for jobs that should be cancelled.

        Returns: None
        """
        job_to_start = self.get_next_job()
        while job_to_start:
            self.start_next_job(job_to_start)
            job_to_start = self.get_next_job()

        # Finalize CANCELING jobs we own, plus unowned ones (canceled before
        # pickup); a live peer's are its own to finalize.
        for job in self.storage.get_canceling_jobs(
            supervisor_id=self.supervisor_id, include_unowned=True
        ):
            job_id = job.job_id
            if job_id in self.future_job_mapping:
                self.cancel(job_id)
            else:
                # Only unowned jobs reach here (ours are in the mapping above);
                # fence on "still unowned" so a reclaiming peer is not clobbered.
                self.storage.mark_job_as_canceled(job_id, expected_supervisor_id=None)

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
            job = self.storage.get_next_queued_job(supervisor_id=self.supervisor_id)
        elif workers_currently_busy < self.max_workers:
            job = self.storage.get_next_queued_job(
                priority=Priority.HIGH, supervisor_id=self.supervisor_id
            )
        else:
            logger.debug("All workers busy.")
            return None

        return job

    def start_next_job(self, job):
        """
        start the next scheduled job to the type of workers spawned by self.start_workers.

        :return future:
        """
        # Mark RUNNING before dispatching, fenced on our claim: if we lost the
        # job between claim and here, don't dispatch a disowned execution.
        applied = self.storage.mark_job_as_running(
            job.job_id,
            supervisor_id=self.supervisor_id,
            expected_supervisor_id=self.supervisor_id,
        )
        if not applied:
            logger.info(
                f"Not dispatching job {job.job_id} - it is no longer owned by this supervisor."
            )
            return None

        future = self.workers.submit(
            execute_job_with_python_worker,
            job_id=job.job_id,
            supervisor_id=self.supervisor_id,
        )

        # Check if the job ID already exists in the future_job_mapping dictionary
        if job.job_id in self.future_job_mapping:
            logger.warn(
                "Job id {} is already in future_job_mapping.".format(job.job_id)
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
