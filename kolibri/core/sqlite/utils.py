import logging
import os
import sqlite3
from datetime import datetime
from shutil import copyfile

from django.conf import settings
from django.core.management import call_command
from django.db.utils import DatabaseError
from django.db.utils import OperationalError

from kolibri.core.sqlite.pragmas import START_PRAGMAS
from kolibri.deployment.default.sqlite_db_names import NOTIFICATIONS

logger = logging.getLogger(__name__)


def _default_db_is_sqlite():
    # Kolibri deploys its own SQLite backend, so match a substring.
    return "sqlite3" in settings.DATABASES["default"]["ENGINE"]


def _remove_if_exists(path):
    if os.path.exists(path):
        os.remove(path)


def _reopen(connection, was_open):
    if was_open:
        connection.ensure_connection()


def _replay_dump(dump_path, db_path):
    """
    Build a database at db_path by replaying the SQL text dump at dump_path.
    """
    from kolibri.core.deviceadmin.utils import KWARGS_IO_READ

    # A .2 from an interrupted repair would fail every CREATE TABLE in the dump.
    _remove_if_exists(db_path)
    target = sqlite3.connect(db_path)
    try:
        # A dump carries no journal mode, and START_PRAGMAS only runs at start.
        target.execute(START_PRAGMAS)
        with open(dump_path, **KWARGS_IO_READ) as f:
            target.executescript(f.read())
        target.commit()
    finally:
        target.close()


def common_clean(db_name, db_file):
    # let's remove the damaged db files
    if not _default_db_is_sqlite():
        return
    os.remove(db_file)
    logger.error("{} is corrupted".format(db_name))


def regenerate_database(connection):
    # procedure to create from scratch a sqlite database when using Django ORM
    from django.db.migrations.recorder import MigrationRecorder

    connection.close()
    common_clean(connection.alias, connection.get_connection_params()["database"])
    if connection.alias == NOTIFICATIONS:
        logger.error("Regenerating {}".format(connection.alias))
        # delete the db migrations and run them again
        connection_migrations = MigrationRecorder(connection).Migration
        connection_migrations.objects.filter(app="notifications").delete()
        call_command(
            "migrate",
            interactive=False,
            verbosity=False,
            app_label="notifications",
            database=NOTIFICATIONS,
        )
        call_command("migrate", interactive=False, verbosity=False)


def _rebuild_database(connection, original_path):
    """
    Dump the database behind connection, replay it into a fresh one and swap
    that over original_path. Returns None once swapped, or a reason for
    declining - the database is untouched in that case.
    """
    from kolibri.core.deviceadmin.utils import KWARGS_IO_WRITE

    dump_path = "{}.dump".format(original_path)
    fixed_db_path = "{}.2".format(original_path)
    try:
        connection.ensure_connection()
        if not connection.connection:
            # connect() sends connection_created, which can re-enter and close it.
            return "it was repaired while connecting"
        with open(dump_path, **KWARGS_IO_WRITE) as f:
            for line in connection.connection.iterdump():
                f.write(line)
        connection.close()
        # SQLite deletes a journal only when the last connection closes, so one
        # outliving ours means another connection holds this database open.
        # Swapping then loses that journal's transactions, or lets the next
        # opener replay the damaged pages over the rebuilt file.
        for suffix in ("-wal", "-journal"):
            if os.path.exists(original_path + suffix):
                return "another connection still has it open"
        # A -shm holds no committed data, but must not outlive its database.
        _remove_if_exists(original_path + "-shm")
        _replay_dump(dump_path, fixed_db_path)
        # Copied aside here rather than up front: the swap is the first thing
        # that can lose data, and backups/ is never pruned.
        if _back_up_database(connection.alias, original_path) is None:
            return "it could not be copied aside first"
        os.replace(fixed_db_path, original_path)
    finally:
        _remove_if_exists(dump_path)
        _remove_if_exists(fixed_db_path)


def _back_up_database(conn_name, original_path):
    """
    Copy the database file aside before something destructive happens to it.
    Returns the path of the copy, or None if none could be made.
    """
    from kolibri.core.deviceadmin.utils import default_backup_folder

    dest_folder = default_backup_folder()
    fname = "{con}_{dtm}.dump".format(
        con=conn_name, dtm=datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    )
    backup_path = os.path.join(dest_folder, fname)
    try:
        if not os.path.exists(dest_folder):
            os.makedirs(dest_folder)
        copyfile(original_path, backup_path)
    except OSError as e:
        # A full disk, a read-only home, or an already-removed file. Must not
        # escape: we run from inside connect().
        logger.warning("Could not copy {} aside: {}".format(conn_name, e))
        return None
    logger.info("Copied {} aside to {}".format(conn_name, backup_path))
    return backup_path


def repair_sqlite_db(connection):
    """
    Recover the database behind a Django connection by rebuilding it from a dump
    of itself and swapping that over the damaged file. Falls back to
    regenerating it when there is nothing left to recover. A copy is kept before
    either.
    """
    if not _default_db_is_sqlite():
        return
    if getattr(connection, "_kolibri_repairing", False):
        # Reopening on the leave-as-is paths fires connection_created, which is
        # what calls us.
        return
    connection._kolibri_repairing = True
    try:
        _repair_sqlite_db(connection)
    finally:
        connection._kolibri_repairing = False


def _repair_sqlite_db(connection):
    conn_name = connection.alias
    original_path = connection.get_connection_params()["database"]

    if connection.is_in_memory_db():
        # The backend knows the shared-cache spelling as well as ":memory:".
        return

    was_open = connection.connection is not None
    logger.warning("Attempting to repair {}".format(conn_name))
    corrupt = False
    copy_taken = False
    try:
        declined = _rebuild_database(connection, original_path)
        # _rebuild_database only reaches the swap by way of a copy.
        copy_taken = declined is None
        if declined:
            logger.warning(
                "Did not repair {}, left as is: {}".format(conn_name, declined)
            )
        elif connection.introspection.table_names():
            logger.info("Recovered {}".format(conn_name))
        else:
            corrupt = True
    except (OperationalError, sqlite3.OperationalError) as e:
        # A lock timeout, a read-only file or a disk I/O error is not
        # corruption, and every call site but apps.py gets here without checking.
        logger.warning("Could not repair {}, left as is: {}".format(conn_name, e))
    except (DatabaseError, sqlite3.DatabaseError) as e:
        logger.error("Could not recover {}: {}".format(conn_name, e))
        corrupt = True
    except OSError as e:
        # Windows will not replace a file another connection has open, and a
        # rebuild needs room for a dump and a copy. The original survives either.
        logger.warning("Could not rebuild {}: {}".format(conn_name, e))
    # Reopen on every leave-as-is path while the re-entrancy guard is still up,
    # or the caller's own reconnect fires connection_created back at us.
    if not corrupt:
        _reopen(connection, was_open)
        return
    # Regenerating deletes the database; a damaged file beats a fresh empty one.
    if not copy_taken and _back_up_database(conn_name, original_path) is None:
        logger.error("Not regenerating {} without a copy of it".format(conn_name))
        _reopen(connection, was_open)
        return
    # Outside the try deliberately: swallowing what regenerating raises would
    # leave a database with no tables, failing quick_check on every connection.
    regenerate_database(connection)
