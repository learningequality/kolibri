import logging
from datetime import timedelta

from django import db
from django.apps import apps
from django.db.models import Q
from morango.models import SyncSession

from kolibri.core.logger.models import UserSessionLog
from kolibri.core.sqlite.statistics import refresh_planner_statistics
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.job import State
from kolibri.core.tasks.models import Job as ORMJob
from kolibri.core.tasks.schedules import Cron
from kolibri.core.tasks.utils import get_current_job
from kolibri.utils.conf import OPTIONS
from kolibri.utils.file_transfer import ChunkedFileDirectoryManager
from kolibri.utils.time_utils import local_now

logger = logging.getLogger(__name__)

# Constant job_id for vacuum task
SCH_VACUUM_JOB_ID = "1"

VACUUM_SCHEDULE = Cron(hour=4)
VACUUM_IDLE_WINDOW = timedelta(minutes=10)
VACUUM_RETRY_DELAY = timedelta(minutes=30)
VACUUM_CUTOFF_HOUR = 6


def _device_is_busy(current_job_id):
    now = local_now()
    idle_since = now - VACUUM_IDLE_WINDOW
    other_jobs = ORMJob.objects.filter(
        Q(state__in=[State.SELECTED, State.RUNNING, State.CANCELING])
        | Q(state=State.QUEUED, scheduled_time__lte=now)
    ).exclude(id=current_job_id)
    return (
        other_jobs.exists()
        or UserSessionLog.objects.filter(
            last_interaction_timestamp__gte=idle_since
        ).exists()
        or SyncSession.objects.filter(
            active=True, last_activity_timestamp__gte=idle_since
        ).exists()
    )


def _realign(job):
    job.retry_in(VACUUM_SCHEDULE.next_occurrence() - local_now())


def _defer(job):
    now = local_now()
    cutoff = now.replace(hour=VACUUM_CUTOFF_HOUR, minute=0, second=0, microsecond=0)
    if now < cutoff:
        logger.info("Device is busy, deferring vacuum by %s.", VACUUM_RETRY_DELAY)
        job.retry_in(VACUUM_RETRY_DELAY)
    else:
        logger.warning(
            "Device is still busy after %02d:00, skipping vacuum until its next scheduled run.",
            VACUUM_CUTOFF_HOUR,
        )
        _realign(job)


def _optimize_sqlite_db(database):
    connection = db.connections[database]
    db_name = connection.settings_dict["NAME"]
    try:
        connection.close()
        cursor = connection.cursor()
        cursor.execute("vacuum;")
        refresh_planner_statistics(cursor)
        connection.close()
    except Exception as e:
        logger.error(e)
        new_msg = (
            f"Vacuum of database {db_name} couldn't be executed. Possible reasons:\n"
            "  * There is an open transaction in the db.\n"
            "  * There are one or more active SQL statements.\n"
            f"The full error: {e}"
        )
        logger.error(new_msg)
    else:
        logger.info("Sqlite database vacuum and optimize for %s finished.", db_name)


def _vacuum(database, full):
    connection = db.connections[database or db.DEFAULT_DB_ALIAS]
    if connection.vendor == "sqlite":
        databases = [database] if database is not None else list(db.connections)
        for db_name in databases:
            _optimize_sqlite_db(db_name)
    elif connection.vendor == "postgresql":
        if full:
            morango_models = ("morango_recordmaxcounterbuffer", "morango_buffer")
        else:
            morango_models = [
                m
                for m in apps.get_models(include_auto_created=True)
                if "morango.models" in str(m)
            ]
        cursor = connection.cursor()
        for m in morango_models:
            if full:
                cursor.execute(f"vacuum full analyze {m};")
            else:
                cursor.execute(f"vacuum analyze {m._meta.db_table};")
        connection.close()


@register_task(job_id=SCH_VACUUM_JOB_ID, schedule=VACUUM_SCHEDULE)
def perform_vacuum(database=None, full=False):
    job = get_current_job()
    if job is not None and _device_is_busy(job.job_id):
        _defer(job)
        return
    _vacuum(database, full)
    if job is not None:
        _realign(job)


# Constant job id for streamed cache cleanup task
STREAMED_CACHE_CLEANUP_JOB_ID = "streamed_cache_cleanup"


@register_task(job_id=STREAMED_CACHE_CLEANUP_JOB_ID, schedule=Cron(minute=0))
def streamed_cache_cleanup():
    manager = ChunkedFileDirectoryManager(OPTIONS["Paths"]["CONTENT_DIR"])
    manager.limit_files(OPTIONS["Cache"]["STREAMED_FILE_CACHE_SIZE"])
