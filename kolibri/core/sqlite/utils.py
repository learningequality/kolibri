import io
import logging
import os
import sqlite3
from datetime import datetime
from shutil import copyfile

from django.conf import settings
from django.core.management import call_command
from django.db.utils import DatabaseError
from sqlalchemy import exc

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


def check_sqlite_integrity(connection):
    """
    Runs integrity check on sqlite db.
    Raises ORM specific DatabaseError when db api communication is halted.
    Raises sqlite3.DatabaseError when integrity check fails.
    """
    if settings.DATABASES["default"]["ENGINE"] != "django.db.backends.sqlite3":
        return

    if hasattr(connection, "name"):
        # SQLAlchemy ORM db api connection
        conn = connection.connect()
    else:
        # Django ORM db api connection cursor
        conn = connection.cursor()

    try:
        result = conn.execute("PRAGMA integrity_check;").fetchall()
    except (DatabaseError, exc.DatabaseError):
        raise
    finally:
        conn.close()

    if not (len(result) == 1 and result[0] == ("ok",)):
        raise sqlite3.DatabaseError


def repair_sqlite_db(connection):
    from kolibri.core.deviceadmin.utils import KWARGS_IO_WRITE
    from kolibri.core.deviceadmin.utils import default_backup_folder

    if settings.DATABASES["default"]["ENGINE"] != "django.db.backends.sqlite3":
        return
    # First let's do a file_backup
    dest_folder = default_backup_folder()
    if hasattr(connection, "name"):
        orm = "sqlalchemy"
        conn_name = connection.name
        original_path = connection.url.database
    else:
        orm = "django"
        conn_name = connection.alias
        original_path = connection.get_connection_params()["database"]

    fname = "{con}_{dtm}.dump".format(
        con=conn_name, dtm=datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    )
    if not os.path.exists(dest_folder):
        os.makedirs(dest_folder)
    backup_path = os.path.join(dest_folder, fname)
    copyfile(original_path, backup_path)

    if orm == "sqlalchemy":
        # Remove current file, it will be automatically regenerated
        common_clean(conn_name, original_path)
        logger.error("Regenerating {}".format(connection.name))
        return

    # now, let's try to repair it, if possible:
    # os.remove(original_path)
    fixed_db_path = "{}.2".format(original_path)
    with io.open(fixed_db_path, **KWARGS_IO_WRITE) as f:
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
