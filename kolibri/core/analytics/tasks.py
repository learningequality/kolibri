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
from kolibri.core.tasks.main import job_storage
from kolibri.utils import conf
from kolibri.utils.time_utils import local_now

logger = logging.getLogger(__name__)


DEFAULT_PING_JOB_ID = "0"
DEFAULT_PING_CHECKRATE = 15
DEFAULT_PING_INTERVAL = 24 * 60


@register_task(job_id=DEFAULT_PING_JOB_ID)
def _ping(started, server, checkrate):
    try:
        ping_once(started, server=server)
    except NetworkLocationConnectionFailure:
        logger.warning(
            "Ping failed (could not connect). Trying again in {} minutes.".format(
                checkrate
            )
        )
        raise
    except NetworkLocationResponseTimeout:
        logger.warning(
            "Ping failed (connection timed out). Trying again in {} minutes.".format(
                checkrate
            )
        )
        raise
    except NetworkLocationResponseFailure as e:
        logger.warning(
            "Ping failed ({})! Trying again in {} minutes.".format(e, checkrate)
        )
        raise
    finally:
        connection.close()


def schedule_ping(
    server=DEFAULT_SERVER_URL,
    checkrate=DEFAULT_PING_CHECKRATE,
    interval=DEFAULT_PING_INTERVAL,
):
    # If pinging is not disabled by the environment
    if not conf.OPTIONS["Deployment"]["DISABLE_PING"]:
        # Scheduler needs datetime object, but job needs (serializable) string
        now = local_now()
        started = now.isoformat()
        try:
            _ping.enqueue_at(
                now,
                interval=interval * 60,
                retry_interval=checkrate * 60,
                repeat=None,
                kwargs=dict(started=started, server=server, checkrate=checkrate),
            )
        except JobRunning:
            pass
    elif conf.OPTIONS["Deployment"]["DISABLE_PING"]:
        job_storage.clear(job_id=DEFAULT_PING_JOB_ID)


LOCAL_NOTIFICATION_JOB_ID = "local-notifications"
COOLDOWN_DAYS = 90
DEFAULT_CADENCE_DAYS = 1


def _run_local_notification_generation():
    # Plain-function body so tests can drive the body without invoking the
    # registered-task wrapper. The reschedule is in a finally block so the
    # task stays scheduled even if the trigger evaluator raises.
    next_run = timedelta(days=DEFAULT_CADENCE_DAYS)
    try:
        if create_impact_stories_notification_if_needed():
            next_run = timedelta(days=COOLDOWN_DAYS)
    finally:
        _generate_local_notifications.enqueue_in(next_run)


@register_task(job_id=LOCAL_NOTIFICATION_JOB_ID)
def _generate_local_notifications():
    _run_local_notification_generation()


def schedule_local_notification_generation():
    try:
        _generate_local_notifications.enqueue_in(timedelta(days=DEFAULT_CADENCE_DAYS))
    except JobRunning:
        pass
