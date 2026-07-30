import logging
import os
import sqlite3
from datetime import datetime
from shutil import copyfile

from django.conf import settings
from django.core.management import call_command
from django.db.utils import DatabaseError

from kolibri.deployment.default.sqlite_db_names import NOTIFICATIONS

logger = logging.getLogger(__name__)


def common_clean(db_name, db_file):
    # let's remove the damaged db files
    if settings.DATABASES["default"]["ENGINE"] != "django.db.backends.sqlite3":
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


def repair_sqlite_db(connection):
    """
    Back up the database behind a Django connection and attempt an in-place
    repair. Django connections only.

    Known broken: the ENGINE guard never passes in a real deployment, and the
    repair destroys the database, leaving only the backup.
    https://github.com/learningequality/kolibri/issues/15108
    """
    from kolibri.core.deviceadmin.utils import default_backup_folder
    from kolibri.core.deviceadmin.utils import KWARGS_IO_WRITE

    if settings.DATABASES["default"]["ENGINE"] != "django.db.backends.sqlite3":
        return
    # First let's do a file_backup
    dest_folder = default_backup_folder()
    conn_name = connection.alias
    original_path = connection.get_connection_params()["database"]

    if original_path == ":memory:":
        # If it's an in memory database we can't do anything
        return

    fname = "{con}_{dtm}.dump".format(
        con=conn_name, dtm=datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    )
    if not os.path.exists(dest_folder):
        os.makedirs(dest_folder)
    backup_path = os.path.join(dest_folder, fname)
    copyfile(original_path, backup_path)

    # now, let's try to repair it, if possible:
    # os.remove(original_path)
    fixed_db_path = "{}.2".format(original_path)
    with open(fixed_db_path, **KWARGS_IO_WRITE) as f:
        # If the connection hasn't been opened yet, then open it
        try:
            for line in connection.connection.iterdump():
                f.write(line)
            connection.close()
            copyfile(fixed_db_path, original_path)
            # let's check if the tables are there:
            cursor = connection.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            if len(cursor.fetchall()) == 0:  # no way, the db has no tables
                regenerate_database(connection)
        except (DatabaseError, sqlite3.DatabaseError):
            # no way, the db is totally broken
            regenerate_database(connection)
        finally:
            os.remove(fixed_db_path)
