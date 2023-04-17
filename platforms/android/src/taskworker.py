import logging
from os import environ

import initialization  # noqa: F401 keep this first, to ensure we're set up for other imports
from kolibri.main import initialize

logging.info("Starting Kolibri task worker")

initialize(skip_update=True)

job_id = environ.get("PYTHON_WORKER_ARGUMENT", "")

# Import this after we have initialized Kolibri
from kolibri.core.tasks.worker import execute_job  # noqa: E402

execute_job(job_id)
