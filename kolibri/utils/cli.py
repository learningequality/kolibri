"""
We do not import unicode_literals here as it causes Click to
give some very aggressive warning errors about subtle bugs.
So, to avoid these errors and these subtle bugs, we use
explicit unicode literals in the following.
"""
from __future__ import absolute_import
from __future__ import print_function

import importlib
import logging
import os
import signal
import sys
from sqlite3 import DatabaseError as SQLite3DatabaseError

import click
import django
from django.core.management import call_command
from django.core.management import execute_from_command_line
from django.core.management.base import handle_default_options
from django.db.utils import DatabaseError

import kolibri
from . import server  # noqa
from .debian_check import check_debian_user
from .sanity_checks import check_content_directory_exists_and_writable  # noqa
from .sanity_checks import check_log_file_location  # noqa
from .sanity_checks import check_other_kolibri_running  # noqa
from .system import become_daemon  # noqa
from kolibri.core.deviceadmin.utils import IncompatibleDatabase  # noqa
from kolibri.core.upgrade import matches_version  # noqa
from kolibri.core.upgrade import run_upgrades  # noqa
from kolibri.plugins.utils import disable_plugin  # noqa
from kolibri.plugins.utils import enable_plugin  # noqa
from kolibri.utils.conf import config  # noqa
from kolibri.utils.conf import KOLIBRI_HOME  # noqa
from kolibri.utils.conf import LOG_ROOT  # noqa
from kolibri.utils.conf import OPTIONS  # noqa
from kolibri.utils.logger import get_base_logging_config  # noqa

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


def get_version():
    try:
        version = open(version_file(), "r").read()
        return version.strip() if version else ""
    except IOError:
        return ""


def validate_module(ctx, param, value):
    if value:
        try:
            importlib.import_module(value)
        except ImportError:
            raise click.BadParameter(
                u"{param} must be a valid python module import path"
            )
    return value


debug_option = click.Option(
    param_decls=["--debug"],
    default=False,
    is_flag=True,
    help=u"Output debug messages (for development)",
)

settings_option = click.Option(
    param_decls=["--settings"],
    callback=validate_module,
    help=u"Django settings module path",
)

pythonpath_option = click.Option(
    param_decls=["--pythonpath"],
    type=click.Path(exists=True, file_okay=False),
    help=u"Add a path to the Python path",
)

skip_update_option = click.Option(
    param_decls=["--skip-update"],
    default=False,
    is_flag=True,
    help=u"Do not run update logic. (Useful when running multiple Kolibri commands in parallel)",
)

noinput_option = click.Option(
    param_decls=["--no-input"],
    default=False,
    is_flag=True,
    help=u"Suppress user prompts",
)


def get_debug_param():
    try:
        return click.get_current_context().params["debug"]
    except (KeyError, RuntimeError):
        return debug_option.default


base_params = [debug_option, noinput_option]

initialize_params = base_params + [
    settings_option,
    pythonpath_option,
    skip_update_option,
]


def get_initialize_params():
    try:
        return click.get_current_context().params
    except RuntimeError:
        return {param.name: param.default for param in initialize_params}


class KolibriCommand(click.Command):
    """
    A command class for basic Kolibri commands that do not require
    the django stack. By default adds a debug param for logging purposes
    also invokes setup_logging before invoking the command.
    """

    allow_extra_args = True

    def __init__(self, *args, **kwargs):
        kwargs["params"] = base_params + (
            kwargs["params"] if "params" in kwargs else []
        )
        super(KolibriCommand, self).__init__(*args, **kwargs)

    def invoke(self, ctx):
        # Check if the current user is the kolibri user when running kolibri from Debian installer.
        check_debian_user(ctx.params.get("no_input"))
        setup_logging(debug=get_debug_param())
        for param in base_params:
            ctx.params.pop(param.name)
        return super(KolibriCommand, self).invoke(ctx)


class KolibriDjangoCommand(click.Command):
    """
    A command class for Kolibri commands that do require
    the django stack. By default adds all params needed for
    the initialize function, calls the initialize function and
    also invokes setup_logging before invoking the command.
    """

    allow_extra_args = True

    def __init__(self, *args, **kwargs):
        kwargs["params"] = initialize_params + (
            kwargs["params"] if "params" in kwargs else []
        )
        super(KolibriDjangoCommand, self).__init__(*args, **kwargs)

    def invoke(self, ctx):
        # Check if the current user is the kolibri user when running kolibri from Debian installer.
        check_debian_user(ctx.params.get("no_input"))
        setup_logging(debug=get_debug_param())
        initialize()
        for param in initialize_params:
            ctx.params.pop(param.name)
        return super(KolibriDjangoCommand, self).invoke(ctx)


class DefaultDjangoOptions(object):
    __slots__ = ["settings", "pythonpath"]

    def __init__(self, settings, pythonpath):
        self.settings = settings
        self.pythonpath = pythonpath


def initialize(skip_update=False):
    """
    Currently, always called before running commands. This may change in case
    commands that conflict with this behavior show up.
    """
    params = get_initialize_params()

    debug = params["debug"]
    skip_update = skip_update or params["skip_update"]
    settings = params["settings"]
    pythonpath = params["pythonpath"]

    default_options = DefaultDjangoOptions(settings, pythonpath)

    handle_default_options(default_options)

    # Do this here so that we can fix any issues with our configuration file before
    # we attempt to set up django.
    config.autoremove_unavailable_plugins()

    version = get_version()

    if version_updated(kolibri.__version__, version):
        # Reset the enabled plugins to the defaults
        # This needs to be run before dbbackup because
        # dbbackup relies on settings.INSTALLED_APPS
        config.enable_default_plugins()

    try:
        django.setup()
        if debug:
            from django.conf import settings

            settings.DEBUG = True

    except (DatabaseError, SQLite3DatabaseError) as e:
        if "malformed" in str(e):
            logger.error(
                u"Your database appears to be corrupted. If you encounter this,"
                u"please immediately back up all files in the .kolibri folder that"
                u"end in .sqlite3, .sqlite3-shm, .sqlite3-wal, or .log and then"
                u"contact Learning Equality. Thank you!"
            )
        raise

    if version_updated(kolibri.__version__, version) and not skip_update:
        if should_back_up(kolibri.__version__, version):
            # Non-dev version change, make a backup no matter what.
            from kolibri.core.deviceadmin.utils import dbbackup

            try:
                backup = dbbackup(version)
                logger.info(u"Backed up database to: {path}".format(path=backup))
            except IncompatibleDatabase:
                logger.warning(
                    u"Skipped automatic database backup, not compatible with "
                    u"this DB engine."
                )

        logger.info(
            u"Version was {old}, new version: {new}".format(
                old=version, new=kolibri.__version__
            )
        )
        update(version, kolibri.__version__)


def _migrate_databases():
    """
    Try to migrate all active databases. This should not be called unless Django has
    been initialized.
    """
    from django.conf import settings

    for database in settings.DATABASES:
        call_command("migrate", interactive=False, database=database)

    # load morango fixtures needed for certificate related operations
    call_command("loaddata", "scopedefinitions")


def update(old_version, new_version):
    """
    Called whenever a version change in kolibri is detected

    TODO: We should look at version numbers of external plugins, too!
    """

    logger.info(u"Running update routines for new version...")

    # Need to do this here, before we run any Django management commands that
    # import settings. Otherwise the updated configuration will not be used
    # during this runtime.

    call_command("collectstatic", interactive=False, verbosity=0)

    from kolibri.core.settings import SKIP_AUTO_DATABASE_MIGRATION

    if not SKIP_AUTO_DATABASE_MIGRATION:
        _migrate_databases()

    run_upgrades(old_version, new_version)

    with open(version_file(), "w") as f:
        f.write(kolibri.__version__)

    from django.core.cache import caches

    cache = caches["built_files"]
    cache.clear()


main_help = u"""Kolibri management commands

For more information, see:
https://kolibri.readthedocs.io/en/latest/advanced.html

You can also run: kolibri COMMAND --help
"""


@click.group(help=main_help)
@click.version_option(version=kolibri.__version__)
def main():
    """
    Kolibri's main function.

    Utility functions should be callable for unit testing purposes, but remember
    to use main() for integration tests in order to test the argument API.
    """
    signal.signal(signal.SIGINT, signal.SIG_DFL)


def create_startup_lock(port):
    try:
        server._write_pid_file(server.STARTUP_LOCK, port)
    except (IOError, OSError):
        logger.warn(u"Impossible to create file lock to communicate starting process")


@main.command(cls=KolibriDjangoCommand, help=u"Start the Kolibri process")
@click.option(
    "--port",
    default=OPTIONS["Deployment"]["HTTP_PORT"],
    type=int,
    help=u"Port on which to run Kolibri",
)
@click.option(
    "--background/--foreground",
    default=True,
    help=u"Run Kolibri as a background process",
)
def start(port, background):
    """
    Start the server on given port.
    """

    create_startup_lock(port)

    # Check if the content directory exists when Kolibri runs after the first time.
    check_content_directory_exists_and_writable()

    # Defragment the db
    call_command("vacuumsqlite")

    # Clear old sessions up
    call_command("clearsessions")

    # On Mac, Python crashes when forking the process, so prevent daemonization until we can figure out
    # a better fix. See https://github.com/learningequality/kolibri/issues/4821
    if sys.platform == "darwin":
        background = False

    run_cherrypy = OPTIONS["Server"]["CHERRYPY_START"]

    if not background:
        logger.info(u"Running Kolibri")

    else:
        logger.info(u"Running Kolibri as background process")

    if run_cherrypy:
        # Check if the port is occupied
        check_other_kolibri_running(port)

        __, urls = server.get_urls(listen_port=port)
        if not urls:
            logger.error(
                u"Could not detect an IP address that Kolibri binds to, but try "
                u"opening up the following addresses:\n"
            )
            urls = [
                "http://{}:{}".format(ip, port) for ip in ("localhost", "127.0.0.1")
            ]
        else:
            logger.info(u"Kolibri running on:\n")
        for addr in urls:
            sys.stderr.write("\t{}\n".format(addr))
        sys.stderr.write("\n")
    else:
        logger.info(u"Starting Kolibri background workers")

    # Daemonize at this point, no more user output is needed
    if background:

        from django.conf import settings

        kolibri_log = settings.LOGGING["handlers"]["file"]["filename"]
        logger.info(u"Going to background mode, logging to {0}".format(kolibri_log))

        kwargs = {}
        # Truncate the file
        if os.path.isfile(server.DAEMON_LOG):
            open(server.DAEMON_LOG, "w").truncate()
        kwargs["out_log"] = server.DAEMON_LOG
        kwargs["err_log"] = server.DAEMON_LOG

        become_daemon(**kwargs)

    server.start(port=port, run_cherrypy=run_cherrypy)


@main.command(cls=KolibriCommand, help=u"Stop the Kolibri process")
def stop():
    """
    Stops the server unless it isn't running
    """
    try:
        pid, __, __ = server.get_status()
        server.stop(pid=pid)
        stopped = True
        if OPTIONS["Server"]["CHERRYPY_START"]:
            logger.info(u"Kolibri server has successfully been stopped.")
        else:
            logger.info(u"Kolibri background services have successfully been stopped.")
    except server.NotRunning as e:
        verbose_status = "{msg:s} ({code:d})".format(
            code=e.status_code, msg=status.codes[e.status_code]
        )
        if e.status_code == server.STATUS_STOPPED:
            logger.info(u"Already stopped: {}".format(verbose_status))
            stopped = True
        elif e.status_code == server.STATUS_STARTING_UP:
            logger.error(u"Not stopped: {}".format(verbose_status))
            sys.exit(e.status_code)
        else:
            logger.error(
                u"During graceful shutdown, server says: {}".format(verbose_status)
            )
            logger.error(u"Not responding, killing with force")
            server.stop(force=True)
            stopped = True

    if stopped:
        sys.exit(0)


@main.command(cls=KolibriCommand, help=u"Show the status of the Kolibri process")
def status():
    """
    How is Kolibri doing?
    Check the server's status. For possible statuses, see the status dictionary
    status.codes

    Status *always* outputs the current status in the first line of stderr.
    The following lines contain optional information such as the addresses where
    the server is listening.

    TODO: We can't guarantee the above behavior because of the django stack
    being loaded regardless

    Exits with status_code, key has description in status.codes
    """
    status_code, urls = server.get_urls()

    if status_code == server.STATUS_RUNNING:
        sys.stderr.write(u"{msg:s} (0)\n".format(msg=status.codes[0]))
        if urls:
            sys.stderr.write(u"Kolibri running on:\n\n")
            for addr in urls:
                sys.stderr.write("\t{}\n".format(addr))
    else:
        verbose_status = status.codes[status_code]
        sys.stderr.write(
            "{msg:s} ({code:d})\n".format(code=status_code, msg=verbose_status)
        )
    sys.exit(status_code)


status.codes = {
    server.STATUS_RUNNING: u"OK, running",
    server.STATUS_STOPPED: u"Stopped",
    server.STATUS_STARTING_UP: u"Starting up",
    server.STATUS_NOT_RESPONDING: u"Not responding",
    server.STATUS_FAILED_TO_START: u"Failed to start (check log file: {0})".format(
        server.DAEMON_LOG
    ),
    server.STATUS_UNCLEAN_SHUTDOWN: u"Unclean shutdown",
    server.STATUS_UNKNOWN_INSTANCE: u"Unknown Kolibri running on port",
    server.STATUS_SERVER_CONFIGURATION_ERROR: u"Kolibri server configuration error",
    server.STATUS_PID_FILE_READ_ERROR: u"Could not read PID file",
    server.STATUS_PID_FILE_INVALID: u"Invalid PID file",
    server.STATUS_UNKNOWN: u"Could not determine status",
}


@main.command(cls=KolibriDjangoCommand, help=u"Start worker processes")
@click.option(
    "--background/--foreground",
    default=True,
    help=u"Run Kolibri services as a background task",
)
def services(background):
    """
    Start the kolibri background services.
    """

    create_startup_lock(None)

    logger.info(u"Starting Kolibri background services")

    # Daemonize at this point, no more user output is needed
    if background:

        from django.conf import settings

        kolibri_log = settings.LOGGING["handlers"]["file"]["filename"]
        logger.info(u"Going to background mode, logging to {0}".format(kolibri_log))

        kwargs = {}
        # Truncate the file
        if os.path.isfile(server.DAEMON_LOG):
            open(server.DAEMON_LOG, "w").truncate()
        kwargs["out_log"] = server.DAEMON_LOG
        kwargs["err_log"] = server.DAEMON_LOG

        become_daemon(**kwargs)

    server.services()


def setup_logging(debug=False):
    """
    Configures logging in cases where a Django environment is not supposed
    to be configured.
    """
    # Would be ideal to use the upgrade logic for this, but that is currently
    # only designed for post-Django initialization tasks. If there are more cases
    # for pre-django initialization upgrade tasks, we can generalize the logic here
    if matches_version(get_version(), "<0.12.4"):
        check_log_file_location()
    LOGGING = get_base_logging_config(LOG_ROOT)
    if debug:
        LOGGING["handlers"]["console"]["level"] = "DEBUG"
        LOGGING["loggers"]["kolibri"]["level"] = "DEBUG"
    logging.config.dictConfig(LOGGING)


@main.command(
    cls=KolibriDjangoCommand,
    context_settings=dict(ignore_unknown_options=True, allow_extra_args=True),
    help=u"Invoke a Django management command",
)
@click.pass_context
def manage(ctx):
    if ctx.args:
        logger.info(u"Invoking command {}".format(" ".join(ctx.args)))
    execute_from_command_line(["kolibri manage"] + ctx.args)


@main.command(cls=KolibriDjangoCommand, help=u"Launch a Django shell")
@click.pass_context
def shell(ctx):
    execute_from_command_line(["kolibri manage", "shell"] + ctx.args)


ENABLE = "enable"
DISABLE = "disable"


@main.command(cls=KolibriCommand, help=u"Manage Kolibri plugins")
@click.argument("plugin_name", nargs=1)
@click.argument("command", type=click.Choice([ENABLE, DISABLE]))
def plugin(plugin_name, command):
    """
    Allows a Kolibri plugin to be either enabled or disabled.
    """
    if command == ENABLE:
        logger.info(u"Enabling plugin '{}'".format(plugin_name))
        enable_plugin(plugin_name)

    if command == DISABLE:
        logger.info(u"Disabling plugin '{}'".format(plugin_name))
        disable_plugin(plugin_name)

    config.save()
