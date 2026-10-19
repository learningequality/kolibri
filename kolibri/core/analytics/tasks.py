import logging
from datetime import timedelta

from django.db import connection

from kolibri.core.analytics.local_notifications import (
    create_impact_stories_notification_if_needed,
)
from kolibri.core.analytics.utils import DEFAULT_SERVER_URL
from kolibri.core.analytics.utils import ping_once
from kolibri.core.discovery.utils.network.errors import NetworkLocationConnectionFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseTimeout
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.exceptions import JobRunning
from kolibri.core.tasks.schedules import Cron
from kolibri.core.tasks.schedules import EnqueueIn
from kolibri.core.tasks.utils import get_current_job
from kolibri.utils import conf
from kolibri.utils.time_utils import local_now

logger = logging.getLogger(__name__)


DEFAULT_PING_JOB_ID = "0"
DEFAULT_PING_CHECKRATE = 15
DEFAULT_PING_INTERVAL = 24 * 60


class PingAtStartup(EnqueueIn):
    def apply(self, task):
        self.kwargs = dict(self.kwargs, started=local_now().isoformat())
        super().apply(task)


@register_task(
    job_id=DEFAULT_PING_JOB_ID,
    schedule=PingAtStartup(
        timedelta(0),
        interval=DEFAULT_PING_INTERVAL * 60,
        repeat=None,
        retry_interval=DEFAULT_PING_CHECKRATE * 60,
    ),
)
def _ping(started, server=DEFAULT_SERVER_URL, checkrate=DEFAULT_PING_CHECKRATE):
    if conf.OPTIONS["Deployment"]["DISABLE_PING"]:
        get_current_job().stop_repeating()
        return
    try:
        ping_once(started, server=server)
    except NetworkLocationConnectionFailure:
        logger.warning(
            "Ping failed (could not connect). Trying again in %s minutes.", checkrate
        )
        raise
    except NetworkLocationResponseTimeout:
        logger.warning(
            "Ping failed (connection timed out). Trying again in %s minutes.", checkrate
        )
        raise
    except NetworkLocationResponseFailure as e:
        logger.warning("Ping failed (%s)! Trying again in %s minutes.", e, checkrate)
        raise
    finally:
        connection.close()


def schedule_ping(
    server=DEFAULT_SERVER_URL,
    checkrate=DEFAULT_PING_CHECKRATE,
    interval=DEFAULT_PING_INTERVAL,
):
    # Scheduler needs a datetime object, but the job needs a serializable string.
    now = local_now()
    try:
        _ping.enqueue_at(
            now,
            interval=interval * 60,
            repeat=None,
            retry_interval=checkrate * 60,
            kwargs={
                "started": now.isoformat(),
                "server": server,
                "checkrate": checkrate,
            },
        )
    except JobRunning:
        pass


LOCAL_NOTIFICATION_JOB_ID = "local-notifications"
COOLDOWN_DAYS = 90


@register_task(job_id=LOCAL_NOTIFICATION_JOB_ID, schedule=Cron(hour=12))
def _generate_local_notifications():
    if create_impact_stories_notification_if_needed():
        get_current_job().retry_in(timedelta(days=COOLDOWN_DAYS))
