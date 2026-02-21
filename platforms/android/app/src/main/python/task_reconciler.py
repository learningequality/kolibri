"""
Task reconciliation system for Android
Syncs WorkManager state with Kolibri job database
"""

import logging
import os

from java import jclass

from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import job_storage

logger = logging.getLogger(__name__)

# Java classes for WorkManager interaction
Task = jclass("org.learningequality.Kolibri.task.Task")


def _get_workmanager_job_ids():
    """
    Get all active job IDs from WorkManager (ENQUEUED and RUNNING states)

    Returns:
        set: Set of job ID strings
    """
    WorkManager = jclass("androidx.work.WorkManager")
    WorkInfo = jclass("androidx.work.WorkInfo")
    WorkQuery = jclass("androidx.work.WorkQuery")
    ContextUtil = jclass("org.learningequality.Kolibri.util.ContextUtil")
    Arrays = jclass("java.util.Arrays")

    context = ContextUtil.getApplicationContext()
    work_manager = WorkManager.getInstance(context)

    # Query for ENQUEUED and RUNNING work
    states = Arrays.asList(WorkInfo.State.ENQUEUED, WorkInfo.State.RUNNING)
    work_query = WorkQuery.fromStates(states)
    work_info_list = work_manager.getWorkInfos(work_query).get()

    # Extract Kolibri job IDs from tags
    # Tags include both worker class FQNs and our job ID tag set via Task.enqueueOnce
    # We use an explicit prefix to identify our tags rather than excluding known patterns
    job_ids = set()
    for work_info in work_info_list.toArray():
        tags = work_info.getTags()
        for tag in tags.toArray():
            if tag.startswith("kolibri:job:"):
                job_ids.add(tag[len("kolibri:job:") :])

    return job_ids


def _get_kolibri_active_jobs():
    """
    Get all active jobs from Kolibri database

    Returns:
        dict: Mapping of job_id string to job object
    """
    active_states = [
        State.PENDING,
        State.QUEUED,
        State.SCHEDULED,
        State.SELECTED,
        State.RUNNING,
    ]
    kolibri_jobs = {}

    for state in active_states:
        for job in job_storage.filter_jobs(state=state):
            kolibri_jobs[str(job.job_id)] = job

    return kolibri_jobs


def _reenqueue_missing_task(job_id, job):
    """
    Re-enqueue a single missing task

    Returns:
        bool: True if successfully re-enqueued
    """
    try:
        request_id = Task.enqueueOnce(
            job_id,
            0,  # delay - immediate
            False,  # high_priority - use normal for reconciliation
            job.func,
            job.long_running,
        )
        if request_id:
            logger.info(f"Re-enqueued missing task: {job_id}")
            return True
        else:
            logger.error(f"Failed to re-enqueue task: {job_id}")
            return False
    except Exception as e:
        logger.error(f"Error re-enqueuing task {job_id}: {e}", exc_info=True)
        return False


def _cancel_orphaned_task(job_id):
    """
    Cancel a single orphaned task

    Returns:
        bool: True if successfully cancelled
    """
    try:
        Task.clear(job_id)
        logger.info(f"Cancelled orphaned task: {job_id}")
        return True
    except Exception as e:
        logger.error(f"Error cancelling task {job_id}: {e}", exc_info=True)
        return False


def _do_reconciliation():
    """
    Internal reconciliation logic
    Compares Kolibri database with WorkManager state and reconciles:
    - Re-enqueues missing tasks (in Kolibri but not in WorkManager)
    - Cancels orphaned tasks (in WorkManager but not in Kolibri)
    """
    logger.info("Starting task reconciliation")

    try:
        kolibri_jobs = _get_kolibri_active_jobs()
        kolibri_job_ids = set(kolibri_jobs.keys())
        logger.info(
            f"Found {len(kolibri_job_ids)} active jobs in Kolibri database"
        )

        workmanager_job_ids = _get_workmanager_job_ids()
        logger.info(
            f"Found {len(workmanager_job_ids)} active tasks in WorkManager"
        )

        # Re-enqueue missing tasks (in Kolibri but not in WorkManager)
        missing_job_ids = kolibri_job_ids - workmanager_job_ids
        added_count = 0
        if missing_job_ids:
            logger.info(
                f"Found {len(missing_job_ids)} missing tasks to re-enqueue"
            )
            for job_id in missing_job_ids:
                job = kolibri_jobs.get(job_id)
                if job and _reenqueue_missing_task(job_id, job):
                    added_count += 1

        # Cancel orphaned tasks (in WorkManager but not in Kolibri)
        orphaned_job_ids = workmanager_job_ids - kolibri_job_ids
        cancelled_count = 0
        if orphaned_job_ids:
            logger.info(
                f"Found {len(orphaned_job_ids)} orphaned tasks to cancel"
            )
            for job_id in orphaned_job_ids:
                if _cancel_orphaned_task(job_id):
                    cancelled_count += 1

        logger.info("Task reconciliation completed")
        logger.info(f"Added: {added_count}, Cancelled: {cancelled_count}")

        return {"added": added_count, "cancelled": cancelled_count}

    except Exception as e:
        logger.error(f"Error in reconciliation logic: {e}", exc_info=True)
        return {"added": 0, "cancelled": 0}


def _get_lock_file_path():
    """Get the path for the reconciliation lock file"""
    kolibri_home = os.environ.get("KOLIBRI_HOME", "")
    return os.path.join(kolibri_home, "kolibri_reconciler.lock")


def reconcile_tasks():
    """
    Reconcile WorkManager state with Kolibri database
    Called from Java WorkController

    Uses a file-based lock for cross-process safety, since workers
    run in a separate process from the main app.

    Returns:
        tuple: (added_count, cancelled_count) - reconciliation summary
    """
    import fcntl

    lock_file_path = _get_lock_file_path()
    lock_fd = None

    try:
        lock_fd = os.open(lock_file_path, os.O_CREAT | os.O_RDWR)
        # Non-blocking exclusive lock
        try:
            fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except (IOError, OSError):
            logger.info("Reconciliation already in progress, skipping")
            return (0, 0)

        result = _do_reconciliation()
        return (result["added"], result["cancelled"])

    except Exception as e:
        logger.error(f"Error during task reconciliation: {e}", exc_info=True)
        return (0, 0)

    finally:
        if lock_fd is not None:
            try:
                fcntl.flock(lock_fd, fcntl.LOCK_UN)
            except (IOError, OSError):
                pass
            os.close(lock_fd)
