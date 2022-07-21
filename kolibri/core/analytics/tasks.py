import logging

from django.db import connection
from requests.exceptions import ConnectionError
from requests.exceptions import RequestException
from requests.exceptions import Timeout

from kolibri.core.analytics.utils import DEFAULT_SERVER_URL
from kolibri.core.analytics.utils import ping_once
from kolibri.core.tasks.decorators import register_task
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
    except ConnectionError:
        logger.warning(
            "Ping failed (could not connect). Trying again in {} minutes.".format(
                checkrate
            )
        )
        raise
    except Timeout:
        logger.warning(
            "Ping failed (connection timed out). Trying again in {} minutes.".format(
                checkrate
            )
        )
        raise
    except RequestException as e:
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
        _ping.enqueue_at(
            now,
            interval=interval * 60,
            retry_interval=checkrate * 60,
            repeat=None,
            kwargs=dict(started=started, server=server, checkrate=checkrate),
        )
    elif conf.OPTIONS["Deployment"]["DISABLE_PING"]:
        job_storage.clear(job_id=DEFAULT_PING_JOB_ID)
