import logging
from os import environ

import initialization  # noqa: F401 keep this first, to ensure we're set up for other imports
from kolibri_tasks import queue_task
from kolibri_tasks import task_updates
from kolibri.main import initialize

logging.info("Starting Kolibri task worker")

initialize(skip_update=True)

job_id = environ.get('PYTHON_SERVICE_ARGUMENT', '')

from django.db import connection as django_connection

from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.utils import db_connection

connection = db_connection()

storage = Storage(connection, schedule_hooks=[queue_task], update_hooks=[task_updates])

job = storage.get_job(job_id)

job.execute()

connection.dispose()

# Close any django connections opened here
django_connection.close()

