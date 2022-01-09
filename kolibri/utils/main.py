from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import os
import shutil
import sys
from sqlite3 import DatabaseError as SQLite3DatabaseError

import django
from diskcache.fanout import FanoutCache
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.core.management.base import handle_default_options
from django.db.utils import DatabaseError

import kolibri
from kolibri.core.device.utils import device_provisioned
from kolibri.core.device.utils import provision_from_file
from kolibri.core.deviceadmin.exceptions import IncompatibleDatabase
from kolibri.core.deviceadmin.utils import get_backup_files
from kolibri.core.tasks.main import import_tasks_module_from_django_apps
from kolibri.core.upgrade import matches_version
from kolibri.core.upgrade import run_upgrades
from kolibri.core.utils.cache import process_cache
from kolibri.deployment.default.sqlite_db_names import ADDITIONAL_SQLITE_DATABASES
from kolibri.plugins.utils import autoremove_unavailable_plugins
from kolibri.plugins.utils import check_plugin_config_file_location
from kolibri.plugins.utils import enable_new_default_plugins
from kolibri.plugins.utils import run_plugin_updates
from kolibri.utils.conf import KOLIBRI_HOME
from kolibri.utils.conf import LOG_ROOT
from kolibri.utils.conf import OPTIONS
from kolibri.utils.debian_check import check_debian_user
from kolibri.utils.logger import get_base_logging_config
from kolibri.utils.sanity_checks import check_content_directory_exists_and_writable
from kolibri.utils.sanity_checks import check_database_is_migrated
from kolibri.utils.sanity_checks import check_default_options_exist
from kolibri.utils.sanity_checks import check_django_stack_ready
from kolibri.utils.sanity_checks import check_log_file_location
from kolibri.utils.sanity_checks import DatabaseInaccessible
from kolibri.utils.sanity_checks import DatabaseNotMigrated
from kolibri.utils.server import get_status
from kolibri.utils.server import NotRunning

logger = logging.getLogger(__name__)


def version_file():
    """
    During test runtime, this path may differ because KOLIBRI_HOME is
    regenerated
    """
    return os.path.join(KOLIBRI_HOME, ".data_version")


def version_updated(kolibri_version, version_file_contents):
    return kolibri_version != version_file_contents


def should_back_up(kolibri_version, version_file_contents):
    change_version = kolibri_version != version_file_contents
    return (
        # Only back up if there was a previous version
        version_file_contents
        # That version has changed
        and change_version
        # The previous version was not a dev version
        and "dev" not in version_file_contents
        # And the new version is not a dev version
        and "dev" not in kolibri_version
    )


def conditional_backup(kolibri_version, version_file_contents):
    if should_back_up(kolibri_version, version_file_contents):
        # Non-dev version change, make a backup no matter what.
        from kolibri.core.deviceadmin.utils import dbbackup
        from kolibri.core.deviceadmin.utils import default_backup_folder

        try:
            backup = dbbackup(version_file_contents)
            default_path = default_backup_folder()
            backups = get_backup_files()
            if len(backups) > 2:
                for old_backup in backups[2:]:
                    os.remove(os.path.join(default_path, old_backup))
            logger.info("Backed up database to: {path}".format(path=backup))
        except IncompatibleDatabase:
            logger.warning(
                "Skipped automatic database backup, not compatible with "
                "this DB engine."
            )


def get_version():
    try:
        version = open(version_file(), "r").read()
        return version.strip() if version else ""
    except IOError:
        return ""


def _migrate_databases():
    """
    Try to migrate all active databases. This should not be called unless Django has
    been initialized.
    """
    for database in settings.DATABASES:
        call_command("migrate", interactive=False, database=database)

    # load morango fixtures needed for certificate related operations
    call_command("loaddata", "scopedefinitions")


class DefaultDjangoOptions(object):
    __slots__ = ["settings", "pythonpath"]

    def __init__(self, settings, pythonpath):
        self.settings = settings
        self.pythonpath = pythonpath


def setup_logging(debug=False, debug_database=False):
    """
    Configures logging in cases where a Django environment is not supposed
    to be configured.
    """
    # Sets the global DEBUG flag to be picked up in other contexts
    # (Django settings)
    os.environ["KOLIBRI_DEBUG"] = str(debug)
    os.environ["KOLIBRI_DEBUG_LOG_DATABASE"] = str(debug_database)

    # Would be ideal to use the upgrade logic for this, but that is currently
    # only designed for post-Django initialization tasks. If there are more cases
    # for pre-django initialization upgrade tasks, we can generalize the logic here
    if matches_version(get_version(), "<0.12.4"):
        check_log_file_location()

    LOGGING = get_base_logging_config(
        LOG_ROOT, debug=debug, debug_database=debug_database
    )
    logging.config.dictConfig(LOGGING)


def _setup_django():
    """
    Do our django setup - separated from initialize to reduce complexity.
    """
    try:
        django.setup()

    except (DatabaseError, SQLite3DatabaseError) as e:
        if "malformed" in str(e):
            logger.error(
                "Your database appears to be corrupted. If you encounter this,"
                "please immediately back up all files in the .kolibri folder that"
                "end in .sqlite3, .sqlite3-shm, .sqlite3-wal, or .log and then"
                "contact Learning Equality. Thank you!"
            )
        raise


def _copy_preseeded_db(db_name, target=None):
    target = target or "{}.sqlite3".format(db_name)
    target = os.path.join(KOLIBRI_HOME, target)
    if not os.path.exists(target):
        try:
            import kolibri.dist

            db_path = os.path.join(
                os.path.dirname(kolibri.dist.__file__),
                "home/{}.sqlite3".format(db_name),
            )
            shutil.copy(db_path, target)
            logger.info(
                "Copied preseeded database from {} to {}".format(db_path, target)
            )
        except (ImportError, IOError, OSError):
            logger.warning(
                "Unable to copy pre-migrated database from {} to {}".format(
                    db_path, target
                )
            )


def _upgrades_before_django_setup(updated, version):
    if version and updated:
        check_plugin_config_file_location(version)

    # Do this here so that we can fix any issues with our configuration file before
    # we attempt to set up django.
    autoremove_unavailable_plugins()

    if updated:
        # Reset the enabled plugins to the defaults
        # This needs to be run before dbbackup because
        # dbbackup relies on settings.INSTALLED_APPS
        enable_new_default_plugins()

    # Ensure that we have done all manipulations of our plugins registry before
    # we do the check for options.ini as that will invoke our plugin registry.
    # Check if there is an options.ini file exist inside the KOLIBRI_HOME folder
    check_default_options_exist()

    if OPTIONS["Database"]["DATABASE_ENGINE"] == "sqlite":
        # If we are using sqlite,
        # we can shortcut migrations by using the preseeded databases
        # that we bundle in the Kolibri whl file.
        if not version:
            logger.info("Attempting to setup using pre-migrated databases")

        _copy_preseeded_db("db", target=OPTIONS["Database"]["DATABASE_NAME"])

        for db_name in ADDITIONAL_SQLITE_DATABASES:
            _copy_preseeded_db(db_name)


def _post_django_initialization():
    if OPTIONS["Cache"]["CACHE_BACKEND"] != "redis":
        try:
            process_cache.cull()
        except SQLite3DatabaseError:
            shutil.rmtree(process_cache.directory, ignore_errors=True)
            os.mkdir(process_cache.directory)
            process_cache._cache = FanoutCache(
                process_cache.directory,
                settings.CACHES["process_cache"]["SHARDS"],
                settings.CACHES["process_cache"]["TIMEOUT"],
                **settings.CACHES["process_cache"]["OPTIONS"]
            )


def _upgrades_after_django_setup(updated, version):
    # If device is not provisioned, attempt automatic provisioning
    if not device_provisioned() and OPTIONS["Paths"]["AUTOMATIC_PROVISION_FILE"]:
        try:
            provision_from_file(OPTIONS["Paths"]["AUTOMATIC_PROVISION_FILE"])
        except ValidationError as e:
            logging.error(
                "Tried to automatically provision the device but received an error"
            )
            logging.error(e)


def initialize(
    skip_update=False,
    settings=None,
    debug=False,
    debug_database=False,
    no_input=False,
    pythonpath=None,
):  # noqa: max-complexity=12
    """
    This should be called before starting the Kolibri app, it initializes Kolibri plugins
    and sets up Django.
    """
    check_debian_user(no_input)

    setup_logging(debug=debug, debug_database=debug_database)

    default_options = DefaultDjangoOptions(settings, pythonpath)

    handle_default_options(default_options)

    version = get_version()

    updated = version_updated(kolibri.__version__, version)

    _upgrades_before_django_setup(updated, version)

    _setup_django()

    _post_django_initialization()

    if updated and not skip_update:
        conditional_backup(kolibri.__version__, version)

        if version:
            logger.info(
                "Version was {old}, new version: {new}".format(
                    old=version, new=kolibri.__version__
                )
            )
        else:
            logger.info("New install, version: {new}".format(new=kolibri.__version__))
        update(version, kolibri.__version__)

    check_content_directory_exists_and_writable()

    if not skip_update:
        # Run any plugin specific updates here in case they were missed by
        # our Kolibri version based update logic.
        run_plugin_updates()

        check_django_stack_ready()

        try:
            check_database_is_migrated()
        except DatabaseNotMigrated:
            try:
                _migrate_databases()
            except Exception as e:
                logging.error(
                    "The database was not fully migrated. Tried to "
                    "migrate the database and an error occurred: "
                    "{}".format(e)
                )
                raise
        except DatabaseInaccessible as e:
            logging.error(
                "Tried to check that the database was accessible "
                "and an error occurred: {}".format(e)
            )
            raise

        _upgrades_after_django_setup(updated, version)

    import_tasks_module_from_django_apps()


def update(old_version, new_version):
    """
    Called whenever a version change in kolibri is detected
    """

    logger.info("Running update routines for new version...")

    try:
        # Check if there are other kolibri instances running
        # If there are, then we need to stop users from starting kolibri again.
        get_status()
        logger.error(
            "There is a Kolibri server running. "
            "Running updates now could cause a database error. "
            "Please use `kolibri stop` and try again. "
        )
        sys.exit(1)

    except NotRunning:
        pass

    _migrate_databases()

    run_upgrades(old_version, new_version)

    with open(version_file(), "w") as f:
        f.write(kolibri.__version__)
