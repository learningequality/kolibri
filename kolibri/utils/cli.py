from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import importlib
import os
import signal
import sys
from sqlite3 import DatabaseError as SQLite3DatabaseError

import click
import django
from django.core.management import call_command
from django.core.management import get_commands
from django.core.management import load_command_class
from django.core.management import ManagementUtility
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.core.management.base import handle_default_options
from django.db.utils import DatabaseError

import kolibri
from .debian_check import check_debian_user

# Check if the current user is the kolibri user when running kolibri from .deb.
# Putting it here because importing server module creates KOLIBRI_HOME directory.
check_debian_user()

from . import server  # noqa
from .sanity_checks import check_content_directory_exists_and_writable  # noqa
from .sanity_checks import check_other_kolibri_running  # noqa
from .sanity_checks import check_log_file_location  # noqa
from .system import become_daemon  # noqa
from kolibri.core.deviceadmin.utils import IncompatibleDatabase  # noqa
from kolibri.core.upgrade import run_upgrades  # noqa
from kolibri.plugins.utils import disable_plugin  # noqa
from kolibri.plugins.utils import enable_plugin  # noqa
from kolibri.utils.conf import config  # noqa
from kolibri.utils.conf import KOLIBRI_HOME  # noqa
from kolibri.utils.conf import OPTIONS  # noqa

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


def initialize(skipupdate=False):
    """
    Currently, always called before running commands. This may change in case
    commands that conflict with this behavior show up.

    :param: debug: Tells initialization to setup logging etc.
    """
    params = click.get_current_context().find_root().params

    debug = params["debug"]
    skipupdate = skipupdate or params["skipupdate"]
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
            from djang.conf import settings

            settings.DEBUG = True

    except (DatabaseError, SQLite3DatabaseError) as e:
        if "malformed" in str(e):
            logger.error(
                "Your database appears to be corrupted. If you encounter this,"
                "please immediately back up all files in the .kolibri folder that"
                "end in .sqlite3, .sqlite3-shm, .sqlite3-wal, or .log and then"
                "contact Learning Equality. Thank you!"
            )
        raise

    setup_logging(debug=debug)

    if version_updated(kolibri.__version__, version) and not skipupdate:
        if should_back_up(kolibri.__version__, version):
            # Non-dev version change, make a backup no matter what.
            from kolibri.core.deviceadmin.utils import dbbackup

            try:
                backup = dbbackup(version)
                logger.info("Backed up database to: {path}".format(path=backup))
            except IncompatibleDatabase:
                logger.warning(
                    "Skipped automatic database backup, not compatible with "
                    "this DB engine."
                )

        logger.info(
            "Version was {old}, new version: {new}".format(
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

    logger.info("Running update routines for new version...")

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


def validate_module(ctx, param, value):
    if value:
        try:
            importlib.import_module(value)
        except ImportError:
            raise click.BadParameter(
                "{param} must be a valid python module import path"
            )
    return value


class DefaultDjangoOptions(object):
    __slots__ = ["settings", "pythonpath"]

    def __init__(self, settings, pythonpath):
        self.settings = settings
        self.pythonpath = pythonpath


@click.group()
@click.option("--debug", default=False, help="Output debug messages (for development)")
@click.version_option(version=kolibri.__version__)
@click.option(
    "--settings", callback=validate_module, help="Django settings module path"
)
@click.option(
    "--pythonpath",
    type=click.Path(exists=True, file_okay=False),
    help="Add a path to the Python path",
)
@click.option(
    "--skipupdate",
    default=False,
    is_flag=True,
    help="Don't run update logic - useful if running two kolibri commands in parallel.",
)
def main(debug, settings, pythonpath, skipupdate):
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
        logger.warn("Impossible to create file lock to communicate starting process")


@main.command()
@click.option(
    "--port",
    default=OPTIONS["Deployment"]["HTTP_PORT"],
    type=int,
    help="Port on which to run Kolibri",
)
@click.option(
    "--daemon/--foreground", default=True, help="Run Kolibri as a background daemon"
)
def start(port, daemon):
    """
    Start Kolibri
    Start the server on given port.
    \f
    :param: port: Port number (default: 8080)
    :param: daemon: Fork to background process (default: True)
    """

    initialize()

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
        daemon = False

    run_cherrypy = OPTIONS["Server"]["CHERRYPY_START"]

    if not daemon:
        logger.info("Running 'kolibri start' in foreground...")

    else:
        logger.info("Running 'kolibri start' as daemon (system service)")

    if run_cherrypy:
        __, urls = server.get_urls(listen_port=port)
        if not urls:
            logger.error(
                "Could not detect an IP address that Kolibri binds to, but try "
                "opening up the following addresses:\n"
            )
            urls = [
                "http://{}:{}".format(ip, port) for ip in ("localhost", "127.0.0.1")
            ]
        else:
            logger.info("Kolibri running on:\n")
        for addr in urls:
            sys.stderr.write("\t{}\n".format(addr))
        sys.stderr.write("\n")
    else:
        logger.info("Starting Kolibri background services")

    # Daemonize at this point, no more user output is needed
    if daemon:

        from django.conf import settings

        kolibri_log = settings.LOGGING["handlers"]["file"]["filename"]
        logger.info("Going to daemon mode, logging to {0}".format(kolibri_log))

        kwargs = {}
        # Truncate the file
        if os.path.isfile(server.DAEMON_LOG):
            open(server.DAEMON_LOG, "w").truncate()
        kwargs["out_log"] = server.DAEMON_LOG
        kwargs["err_log"] = server.DAEMON_LOG

        become_daemon(**kwargs)

    server.start(port=port, run_cherrypy=run_cherrypy)


@main.command()
def stop():
    """
    Stop Kolibri
    Stops the server unless it isn't running
    """
    debug = click.get_current_context().find_root().params["debug"]
    setup_logging(debug=debug)
    try:
        pid, __, __ = server.get_status()
        server.stop(pid=pid)
        stopped = True
        if OPTIONS["Server"]["CHERRYPY_START"]:
            logger.info("Kolibri server has successfully been stopped.")
        else:
            logger.info("Kolibri background services have successfully been stopped.")
    except server.NotRunning as e:
        verbose_status = "{msg:s} ({code:d})".format(
            code=e.status_code, msg=status.codes[e.status_code]
        )
        if e.status_code == server.STATUS_STOPPED:
            logger.info("Already stopped: {}".format(verbose_status))
            stopped = True
        elif e.status_code == server.STATUS_STARTING_UP:
            logger.error("Not stopped: {}".format(verbose_status))
            sys.exit(e.status_code)
        else:
            logger.error(
                "During graceful shutdown, server says: {}".format(verbose_status)
            )
            logger.error("Not responding, killing with force")
            server.stop(force=True)
            stopped = True

    if stopped:
        sys.exit(0)


@main.command()
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

    :returns: status_code, key has description in status.codes
    """
    debug = click.get_current_context().find_root().params["debug"]
    setup_logging(debug=debug)

    status_code, urls = server.get_urls()

    if status_code == server.STATUS_RUNNING:
        sys.stderr.write("{msg:s} (0)\n".format(msg=status.codes[0]))
        if urls:
            sys.stderr.write("Kolibri running on:\n\n")
            for addr in urls:
                sys.stderr.write("\t{}\n".format(addr))
    else:
        verbose_status = status.codes[status_code]
        sys.stderr.write(
            "{msg:s} ({code:d})\n".format(code=status_code, msg=verbose_status)
        )
    sys.exit(status_code)


status.codes = {
    server.STATUS_RUNNING: "OK, running",
    server.STATUS_STOPPED: "Stopped",
    server.STATUS_STARTING_UP: "Starting up",
    server.STATUS_NOT_RESPONDING: "Not responding",
    server.STATUS_FAILED_TO_START: "Failed to start (check log file: {0})".format(
        server.DAEMON_LOG
    ),
    server.STATUS_UNCLEAN_SHUTDOWN: "Unclean shutdown",
    server.STATUS_UNKNOWN_INSTANCE: "Unknown Kolibri running on port",
    server.STATUS_SERVER_CONFIGURATION_ERROR: "Kolibri server configuration error",
    server.STATUS_PID_FILE_READ_ERROR: "Could not read PID file",
    server.STATUS_PID_FILE_INVALID: "Invalid PID file",
    server.STATUS_UNKNOWN: "Could not determine status",
}


@main.command()
@click.option(
    "--daemon/--foreground",
    default=True,
    help="Run Kolibri services as a background task",
)
def services(daemon):
    """
    Start the kolibri background services.
    \f
    :param: daemon: Fork to background process (default: True)
    """

    initialize()

    create_startup_lock(None)

    logger.info("Starting Kolibri background services")

    # Daemonize at this point, no more user output is needed
    if daemon:

        from django.conf import settings

        kolibri_log = settings.LOGGING["handlers"]["file"]["filename"]
        logger.info("Going to daemon mode, logging to {0}".format(kolibri_log))

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
    try:
        from django.settings import LOGGING
    except ImportError:
        from kolibri.deployment.default.settings.base import LOGGING
    if debug:
        LOGGING["handlers"]["console"]["level"] = "DEBUG"
        LOGGING["loggers"]["kolibri"]["level"] = "DEBUG"
    logging.config.dictConfig(LOGGING)


def make_param(django_param):
    choices = click.Choice(django_param.choices) if django_param.choices else None
    multiple = False
    nargs = 1
    if django_param.nargs:
        if django_param.nargs == "*":
            multiple = True
        if type(django_param.nargs) is int:
            nargs = django_param.nargs
    if django_param.option_strings:
        return click.Option(
            param_decls=django_param.option_strings,
            nargs=nargs,
            multiple=multiple,
            required=django_param.required,
            default=django_param.default,
            type=choices or django_param.type,
            metavar=django_param.metavar,
        )
    else:
        return click.Argument(
            param_decls=[django_param.dest],
            nargs=nargs,
            required=django_param.required,
            default=django_param.default,
            type=choices or django_param.type,
            metavar=django_param.metavar,
        )


def _format_kwarg_for_logging(kwarg):
    return "--{} {}".format(str(kwarg[0]), str(kwarg[1]))


class ManageGroup(click.MultiCommand):

    ignore_unknown_options = True

    def list_commands(self, ctx):
        commands = list(get_commands().keys())
        commands.sort()
        return commands

    def get_command(self, ctx, command_name):
        try:

            def f(*args, **kwargs):
                logger.info(
                    "Invoking command {name} {args} {kwargs}".format(
                        name=command_name,
                        args=" ".join(map(str, args)),
                        kwargs=" ".join(
                            map(_format_kwarg_for_logging, kwargs.iteritems())
                        ),
                    )
                )
                call_command(command_name, *args, **kwargs)

            # Have to initialize Django before we do this,
            # to ensure we get a full list of valid management
            # commands
            initialize(skipupdate=True)
            # Load the command object by name.
            try:
                app_name = get_commands()[command_name]
            except KeyError:
                raise CommandError("Unknown command: %r" % command_name)

            if isinstance(app_name, BaseCommand):
                # If the command is already loaded, use it directly.
                command = app_name
            else:
                command = load_command_class(app_name, command_name)

            parser = command.create_parser("", command_name)
            params = list(map(make_param, parser._actions))
        except (AttributeError, ImportError):
            command_name = "help"

            def f(*args, **kwargs):
                util = ManagementUtility()
                util.main_help_text()

            params = []
        command = click.Command(name=command_name, params=params, callback=f)
        return command


@main.command(cls=ManageGroup)
def manage():
    """
    Invokes a django management command
    \f
    :param: cmd: The command to invoke, for instance "runserver"
    :param: args: arguments for the command
    """
    initialize()


ENABLE = "enable"
DISABLE = "disable"


@main.command()
@click.argument("plugin_name", nargs=1)
@click.argument("command", type=click.Choice([ENABLE, DISABLE]))
def plugin(plugin_name, command):
    """
    Allows a Kolibri plugin to be either enabled or disabled.
    """
    debug = click.get_current_context().find_root().params["debug"]
    setup_logging(debug=debug)

    if command == ENABLE:
        logger.info("Enabling Kolibri plugin {}.".format(plugin_name))
        enable_plugin(plugin_name)

    if command == DISABLE:
        logger.info("Disabling Kolibri plugin {}.".format(plugin_name))
        disable_plugin(plugin_name)

    config.save()
