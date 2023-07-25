import logging

import initialization  # noqa: F401 keep this first, to ensure we're set up for other imports
from kolibri.main import initialize

import __main__

job_id = __main__.PYTHON_WORKER_ARGUMENT

logging.info("Starting Kolibri task worker, for job {}".format(job_id))

initialize(skip_update=True)

# Import this after we have initialized Kolibri
from kolibri.core.tasks.worker import execute_job  # noqa: E402

execute_job(job_id)

logging.info("Ending Kolibri task worker, for job {}".format(job_id))
