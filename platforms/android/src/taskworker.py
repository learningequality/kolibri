import logging
from os import environ

import initialization  # noqa: F401 keep this first, to ensure we're set up for other imports
from kolibri.main import initialize
from kolibri_tasks import execute_job

logging.info("Starting Kolibri task worker")

initialize(skip_update=True)

job_id = environ.get("PYTHON_SERVICE_ARGUMENT", "")

execute_job(job_id)
