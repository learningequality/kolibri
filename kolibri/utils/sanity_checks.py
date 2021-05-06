import logging
import os
import shutil
import sys

from django.apps import apps
from django.db.utils import OperationalError
from django.db.utils import ProgrammingError

from .conf import KOLIBRI_HOME
from .conf import OPTIONS
from .options import generate_empty_options_file

logger = logging.getLogger(__name__)


class SanityException(RuntimeError):
    pass


class DatabaseNotMigrated(SanityException):
    def __init__(self, *args, **kwargs):
        self.db_exception = kwargs.get("db_exception")
        super(DatabaseNotMigrated, self).__init__(
            "An exception occurred for which it is assumed that the "
            "database is not fully migrated.\n\n"
            "Exception: {}".format(str(self.db_exception))
        )


class DatabaseInaccessible(SanityException):
    def __init__(self, *args, **kwargs):
        self.db_exception = kwargs.get("db_exception")
        super(DatabaseInaccessible, self).__init__(
            "Not able to access the database while checking it.\n\n"
            "Exception: {}".format(str(self.db_exception))
        )


def check_content_directory_exists_and_writable():
    """
    Make sure the content directory of Kolibri exists and is writable.
    """
    content_directory = OPTIONS["Paths"]["CONTENT_DIR"]

    # Check if the content directory exists
    if not os.path.exists(content_directory):
        try:
            os.makedirs(content_directory)
        except OSError:
            logger.error(
                "The content directory {} does not exist and cannot be created.".format(
                    content_directory
                )
            )
            sys.exit(1)

    # Check if the directory is writable
    if not os.access(content_directory, os.W_OK):
        logger.error(
            "The content directory {} is not writable.".format(content_directory)
        )
        sys.exit(1)


def check_log_file_location():
    """
    Starting from Kolibri v0.12.4, log files are going to be renamed and moved
    from KOLIBRI_HOME directory to KOLIBRI_HOME/logs directory.
    """
    home = os.environ["KOLIBRI_HOME"]
    log_location_update = {}

    # Old log file names
    old_daemon_log = "server.log"
    old_kolibri_log = "kolibri.log"
    old_debug_log = "debug.log"

    # New log file names
    log_location_update[old_daemon_log] = "daemon.txt"
    log_location_update[old_kolibri_log] = "kolibri.txt"
    log_location_update[old_debug_log] = "debug.txt"

    for log in log_location_update:
        old_log_path = os.path.join(home, log)
        if os.path.exists(old_log_path):
            new_log_path = os.path.join(home, "logs", log_location_update[log])
            shutil.move(old_log_path, new_log_path)


def check_django_stack_ready():
    """Checks that all Django apps are loaded"""
    apps.check_apps_ready()


def check_database_is_migrated():
    """
    This function checks that the database instance id model is
    initialized. It must only be run after Django initialization.

    It does not actually verify whether all migrations are run, as this is
    assumed to be a part of Kolibri version number checking. When a
    Kolibri version change is detected, we run migrations. Checking that
    migrations are run for every startup would be costly.
    """
    from django.db import connection
    from morango.models import InstanceIDModel

    try:
        InstanceIDModel.get_or_create_current_instance()[0]
        connection.close()
        return
    except (OperationalError, ProgrammingError) as e:
        raise DatabaseNotMigrated(db_exception=e)
    except Exception as e:
        raise DatabaseInaccessible(db_exception=e)


def check_default_options_exist():
    options_path = os.path.join(KOLIBRI_HOME, "options.ini")
    if not os.path.exists(options_path):
        try:
            generate_empty_options_file()
        except IOError:
            logger.warning(
                "Failed to create an options.ini file at this path: {}".format(
                    options_path
                )
            )
