import logging

import initialization  # noqa: F401 keep this first, to ensure we're set up for other imports
from android_utils import make_service_foreground
from kolibri.main import initialize

logging.info("Starting Kolibri task workers")

# ensure the service stays running by "foregrounding" it with a persistent notification
make_service_foreground("Kolibri service", "Running tasks.")

initialize(skip_update=True)

from kolibri.core.tasks.main import initialize_workers  # noqa: E402
from kolibri.core.tasks.main import job_storage  # noqa: E402
from kolibri.core.analytics.utils import DEFAULT_PING_JOB_ID  # noqa: E402
from kolibri.core.deviceadmin.tasks import SCH_VACUUM_JOB_ID  # noqa: E402

# schedule the pingback job if not already scheduled
if DEFAULT_PING_JOB_ID not in job_storage:
    from kolibri.core.analytics.utils import schedule_ping

    schedule_ping()

# schedule the vacuum job if not already scheduled
if SCH_VACUUM_JOB_ID not in job_storage:
    from kolibri.core.deviceadmin.tasks import schedule_vacuum

    schedule_vacuum()

# Initialize the iceqube engine to handle queued tasks
worker = initialize_workers()
# Join the job checker thread to loop forever
worker.job_checker.join()
