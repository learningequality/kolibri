import logging

import initialization  # noqa: F401 keep this first, to ensure we're set up for other imports
from kolibri.main import initialize


initialize(skip_update=True)

logger = logging.getLogger(__name__)


def main(job_request):
    request_id, job_id, process_id, thread_id = job_request.split(",")
    logger.info(
        "Starting Kolibri task worker, for job {} and request {}".format(
            job_id, request_id
        )
    )

    # Import this after we have initialized Kolibri
    from kolibri.core.tasks.worker import execute_job  # noqa: E402

    execute_job(
        job_id,
        worker_process=str(process_id),
        worker_thread=str(thread_id),
        worker_extra=str(request_id),
    )

    logger.info(
        "Ending Kolibri task worker, for job {} and request {}".format(
            job_id, request_id
        )
    )
