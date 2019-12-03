import io
import logging
import os
import re
import sys
from datetime import datetime
from datetime import timedelta

from django import db
from django.conf import settings

import kolibri
from kolibri.core.tasks.main import scheduler
from kolibri.core.tasks.utils import db_task_write_lock
from kolibri.utils.conf import KOLIBRI_HOME
from kolibri.utils.time_utils import local_now

# Import db instead of db.connections because we want to use an instance of
# connections that might be updated from outside.


logger = logging.getLogger(__name__)


# Use encoded text for Python 3 (doesn't work in Python 2!)
KWARGS_IO_READ = {"mode": "r", "encoding": "utf-8"}
KWARGS_IO_WRITE = {"mode": "w", "encoding": "utf-8"}

# Use binary file mode for Python 2 (doesn't work in Python 3!)
if sys.version_info < (3,):
    KWARGS_IO_READ = {"mode": "rb"}
    KWARGS_IO_WRITE = {"mode": "wb"}


class IncompatibleDatabase(Exception):
    pass


def default_backup_folder():
    return os.path.join(KOLIBRI_HOME, "backups")


def get_dtm_from_backup_name(fname):
    """
    Returns the date time string from our automated backup filenames
    """
    p = re.compile(r"^db\-v[^_]+_(?P<dtm>[\d\-_]+).*\.dump$")
    m = p.search(fname)
    if m:
        label = m.groups("dtm")[0]
        date = label.split("_")[0]
        time = label.split("_")[1]
        return "{date} {time}".format(date=date, time=time.replace("-", ":"))
    raise ValueError(
        "Tried to get date component of unparsed filename: {}".format(fname)
    )


def is_full_version(fname):
    """
    Tells us if a backup file name is named as if it's from the exact same
    version.

    Supposes versions do not contain underscores '_'
    """
    # Can contain suffixes denoting alpha, beta, post, dev etc.
    full_version = kolibri.__version__
    return fname.startswith("db-v{}_".format(full_version))


def dbbackup(old_version, dest_folder=None):
    """
    Sqlite3 only

    Backup database to dest_folder. Uses SQLite's built in iterdump():
    https://docs.python.org/3/library/sqlite3.html#sqlite3.Connection.iterdump

    Notice that it's important to add at least version and date to the path
    of the backup, otherwise you risk that upgrade activities carried out on
    the same date overwrite each other. It's also quite important for the user
    to know which version of Kolibri that a certain database should match.

    :param: dest_folder: Default is ~/.kolibri/backups/db-[version]-[date].dump

    :returns: Path of new backup file
    """

    if "sqlite3" not in settings.DATABASES["default"]["ENGINE"]:
        raise IncompatibleDatabase()

    if not dest_folder:
        dest_folder = default_backup_folder()

    # This file name is a convention, used to figure out the latest backup
    # that was made (by the dbrestore command)
    fname = "db-v{version}_{dtm}.dump".format(
        version=old_version, dtm=datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    )

    if not os.path.exists(dest_folder):
        os.makedirs(dest_folder)

    backup_path = os.path.join(dest_folder, fname)

    # Setting encoding=utf-8: io.open() is Python 2 compatible
    # See: https://github.com/learningequality/kolibri/issues/2875
    with io.open(backup_path, **KWARGS_IO_WRITE) as f:
        # If the connection hasn't been opened yet, then open it
        if not db.connections["default"].connection:
            db.connections["default"].connect()
        for line in db.connections["default"].connection.iterdump():
            f.write(line)

    return backup_path


def dbrestore(from_file):
    """
    Sqlite3 only

    Restores the database given a special database dump file containing SQL
    statements.
    """

    if "sqlite3" not in settings.DATABASES["default"]["ENGINE"]:
        raise IncompatibleDatabase()

    dst_file = settings.DATABASES["default"]["NAME"]

    # Close connections
    db.connections.close_all()

    # Wipe current database file
    if not db.connections["default"].is_in_memory_db():
        with open(dst_file, "w") as f:
            f.truncate()
    else:
        logger.info("In memory database, not truncating: {}".format(dst_file))

    # Setting encoding=utf-8: io.open() is Python 2 compatible
    # See: https://github.com/learningequality/kolibri/issues/2875
    with open(from_file, **KWARGS_IO_READ) as f:
        db.connections["default"].connect()
        db.connections["default"].connection.executescript(f.read())

    # Finally, it's okay to import models and open database connections.
    # We need this to avoid generating records with identical 'Instance ID'
    # and conflicting counters, in case the database we're overwriting had
    # already been synced with other devices.:
    from morango.models import DatabaseIDModel

    DatabaseIDModel.objects.create()


def search_latest(search_root, fallback_version):
    logger.info("Searching latest backup in {}...".format(search_root))

    newest = ""  # Should be a path/filename.sqlite3
    newest_dtm = ""

    # All file names have to be according to the fall back version.
    prefix = "db-v{}".format(fallback_version)

    backups = os.listdir(search_root)
    backups = filter(lambda f: f.endswith(".dump"), backups)
    backups = filter(lambda f: f.startswith(prefix), backups)

    # Everything is sorted alphanumerically, and since dates in the
    # filenames behave accordingly, we can now traverse the list
    # without having to access meta data, just use the file name.
    backups = list(backups)
    backups.sort()

    for backup in backups:
        try:
            dtm = get_dtm_from_backup_name(backup)
        except ValueError:
            continue
        # Always pick the newest version
        if is_full_version(backup) or dtm > newest_dtm:
            newest_dtm = dtm
            newest = backup

    if newest:
        return os.path.join(search_root, newest)


def perform_vacuum(database=db.DEFAULT_DB_ALIAS):
    connection = db.connections[database]
    if connection.vendor == "sqlite":
        try:
            with db_task_write_lock:
                db.close_old_connections()
                db.connections.close_all()
                cursor = connection.cursor()
                cursor.execute("vacuum;")
                connection.close()
        except Exception as e:
            logger.error(e)
            new_msg = (
                "Vacuum of database {db_name} couldn't be executed. Possible reasons:\n"
                "  * There is an open transaction in the db.\n"
                "  * There are one or more active SQL statements.\n"
                "The full error: {error_msg}"
            ).format(
                db_name=db.connections[database].settings_dict["NAME"], error_msg=e
            )
            logger.error(new_msg)
        else:
            logger.info("Sqlite database Vacuum finished.")


def schedule_vacuum():
    current_dt = local_now()
    vacuum_time = current_dt.replace(hour=3, minute=0, second=0, microsecond=0)
    if vacuum_time < current_dt:
        # If it is past 3AM, change the day to tomorrow.
        vacuum_time = vacuum_time + timedelta(days=1)
    # Repeat indefinitely
    scheduler.schedule(vacuum_time, perform_vacuum, repeat=None, interval=24 * 60 * 60)
