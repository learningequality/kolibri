import logging
import os
import threading

from task_identity import supervisor_id_from_request

from kolibri.core.tasks.worker import execute_job as kolibri_execute_job

logger = logging.getLogger(__name__)


def execute_job(job_id, request_id):
    """
    Execute a Kolibri job given its job ID (UUID)
    Called from Java TaskWorkerImpl via Chaquopy

    Args:
        job_id: The Kolibri job ID (UUID as string)
        request_id: The WorkManager request ID (UUID as string), used for debug tracing

    Returns:
        bool: True if job executed successfully, False otherwise
    """
    logger.info(
        "Starting Kolibri task worker for job {} (request {})".format(
            job_id, request_id
        )
    )

    try:
        kolibri_execute_job(
            str(job_id),
            worker_process=str(os.getpid()),
            worker_thread=str(threading.get_ident()),
            worker_extra=str(request_id),
            supervisor_id=supervisor_id_from_request(request_id),
        )
        logger.info(
            "Completed Kolibri task worker for job {} (request {})".format(
                job_id, request_id
            )
        )
        return True

    except Exception:
        logger.exception("Error occurred executing job")
        return False
