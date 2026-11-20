import logging
import os
from datetime import timedelta

from django import db
from django.apps import apps
from morango.models import SyncSession

from kolibri.core.logger.models import UserSessionLog
from kolibri.core.sqlite.statistics import refresh_planner_statistics
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.main import job_storage
from kolibri.core.tasks.schedules import Cron
from kolibri.core.tasks.utils import get_current_job
from kolibri.utils.conf import OPTIONS
from kolibri.utils.data import bytes_for_humans
from kolibri.utils.file_transfer import ChunkedFileDirectoryManager
from kolibri.utils.system import get_free_space
from kolibri.utils.time_utils import local_now

logger = logging.getLogger(__name__)

# Constant job_id for vacuum task
SCH_VACUUM_JOB_ID = "1"

VACUUM_SCHEDULE = Cron(hour=4, minute=15)
VACUUM_IDLE_WINDOW = timedelta(minutes=10)
VACUUM_RETRY_DELAY = timedelta(minutes=30)
VACUUM_CUTOFF_HOUR = 6
VACUUM_MIN_FREE_PAGE_RATIO = 0.1


def _device_is_busy(current_job_id, now):
    idle_since = now - VACUUM_IDLE_WINDOW
    return (
        job_storage.has_due_or_active_jobs(exclude_job_id=current_job_id)
        or UserSessionLog.objects.filter(
            last_interaction_timestamp__range=(idle_since, now)
        ).exists()
        or SyncSession.objects.filter(
            active=True, last_activity_timestamp__range=(idle_since, now)
        ).exists()
    )


def _realign(job):
    job.retry_in(VACUUM_SCHEDULE.next_occurrence() - local_now())


def _skip(job, reason, level=logging.WARNING):
    logger.log(level, "%s, skipping vacuum until its next scheduled run.", reason)
    _realign(job)


def _defer_if_not_ready(job):
    now = local_now()
    cutoff = now.replace(hour=VACUUM_CUTOFF_HOUR, minute=0, second=0, microsecond=0)
    if now >= cutoff:
        _skip(job, f"Vacuum started after {VACUUM_CUTOFF_HOUR:02d}:00", logging.INFO)
        return True
    if not _device_is_busy(job.job_id, now):
        return False
    if now + VACUUM_RETRY_DELAY < cutoff:
        logger.info("Device is busy, deferring vacuum by %s.", VACUUM_RETRY_DELAY)
        job.retry_in(VACUUM_RETRY_DELAY)
    else:
        _skip(job, f"Device is busy and a retry would pass {VACUUM_CUTOFF_HOUR:02d}:00")
    return True


def _pragma(cursor, name):
    cursor.execute(f"PRAGMA {name};")
    return cursor.fetchone()[0]


def _needs_vacuum(cursor, db_name):
    page_count = _pragma(cursor, "page_count")
    free_pages = _pragma(cursor, "freelist_count")
    if free_pages <= page_count * VACUUM_MIN_FREE_PAGE_RATIO:
        logger.info(
            "%s has %d of %d pages free, not vacuuming.",
            db_name,
            free_pages,
            page_count,
        )
        return False
    size = page_count * _pragma(cursor, "page_size")
    if not _has_space_to_vacuum(os.path.dirname(db_name) or os.curdir, size):
        logger.warning(
            "Not enough free disk space to vacuum %s, which needs about %s beside "
            "the database and %s in %s.",
            db_name,
            bytes_for_humans(size),
            bytes_for_humans(size),
            _sqlite_temp_dir(),
        )
        return False
    return True


def _sqlite_temp_dir():
    # SQLite's temp file directory search: unixTempFileDir() in os_unix.c, and
    # GetTempPathW (TMP, TEMP, USERPROFILE) on Windows.
    if os.name == "nt":
        candidates = ("TMP", "TEMP", "USERPROFILE")
        dirs = [os.environ.get(name) for name in candidates]
    else:
        dirs = [os.environ.get("SQLITE_TMPDIR"), os.environ.get("TMPDIR")]
        dirs += ["/var/tmp", "/usr/tmp", "/tmp"]
    for directory in dirs:
        if (
            directory
            and os.path.isdir(directory)
            and os.access(directory, os.W_OK | os.X_OK)
        ):
            return directory
    return os.curdir


def _has_space_to_vacuum(db_dir, size):
    # https://www.sqlite.org/lang_vacuum.html: VACUUM writes a temporary copy of the
    # database, then the WAL beside it grows by up to the database size.
    temp_dir = _sqlite_temp_dir()
    if os.stat(db_dir).st_dev == os.stat(temp_dir).st_dev:
        return get_free_space(db_dir) >= 2 * size
    return get_free_space(db_dir) >= size and get_free_space(temp_dir) >= size


def _optimize_sqlite_db(database):
    connection = db.connections[database]
    db_name = connection.settings_dict["NAME"]
    connection.close()
    vacuum_error = None
    try:
        with connection.cursor() as cursor:
            if _needs_vacuum(cursor, db_name):
                try:
                    cursor.execute("VACUUM;")
                except Exception as e:
                    vacuum_error = e
            refresh_planner_statistics(cursor)
            cursor.execute("PRAGMA wal_checkpoint(TRUNCATE);")
            busy, _, _ = cursor.fetchone()
            if busy:
                logger.warning(
                    "WAL checkpoint of %s was blocked by another connection, "
                    "so the WAL was not truncated.",
                    db_name,
                )
    finally:
        connection.close()
    if vacuum_error is not None:
        raise vacuum_error
    logger.info("SQLite maintenance of %s finished.", db_name)


def _optimize_sqlite_dbs(databases):
    failed = []
    for alias in databases:
        try:
            _optimize_sqlite_db(alias)
        except Exception:
            logger.exception("SQLite maintenance of %s failed.", alias)
            failed.append(alias)
    if failed:
        raise db.DatabaseError(f"SQLite maintenance failed for {', '.join(failed)}.")


def _vacuum(database, full):
    connection = db.connections[database or db.DEFAULT_DB_ALIAS]
    if connection.vendor == "sqlite":
        _optimize_sqlite_dbs(
            [database] if database is not None else list(db.connections)
        )
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
    if job is not None and _defer_if_not_ready(job):
        return
    try:
        _vacuum(database, full)
    finally:
        if job is not None:
            _realign(job)


# Constant job id for streamed cache cleanup task
STREAMED_CACHE_CLEANUP_JOB_ID = "streamed_cache_cleanup"


@register_task(job_id=STREAMED_CACHE_CLEANUP_JOB_ID, schedule=Cron(minute=0))
def streamed_cache_cleanup():
    manager = ChunkedFileDirectoryManager(OPTIONS["Paths"]["CONTENT_DIR"])
    manager.limit_files(OPTIONS["Cache"]["STREAMED_FILE_CACHE_SIZE"])
