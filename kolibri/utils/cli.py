"""
Please make note ``kolibri.utils.cli`` has  a sensitive module import order.

This deliberately imports ``kolibri.__init__`` before loading additional
``kolibri.*`` modules.

TODO: Investigate and challenge/explain this load order.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

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
from . import server
from .debian_check import check_debian_user
from .sanity_checks import check_content_directory_exists_and_writable
from .sanity_checks import check_database_is_migrated
from .sanity_checks import check_log_file_location
from .sanity_checks import check_other_kolibri_running
from .sanity_checks import migrate_databases
from .system import become_daemon
from kolibri.core.deviceadmin.utils import IncompatibleDatabase
from kolibri.core.upgrade import matches_version
from kolibri.core.upgrade import run_upgrades
from kolibri.deployment.default.cache import recreate_cache
from kolibri.plugins import config
from kolibri.plugins import DEFAULT_PLUGINS
from kolibri.plugins.utils import autoremove_unavailable_plugins
from kolibri.plugins.utils import check_plugin_config_file_location
from kolibri.plugins.utils import disable_plugin
from kolibri.plugins.utils import enable_new_default_plugins
from kolibri.plugins.utils import enable_plugin
from kolibri.plugins.utils import iterate_plugins
from kolibri.plugins.utils import run_plugin_updates
from kolibri.utils.conf import KOLIBRI_HOME
from kolibri.utils.conf import LOG_ROOT
from kolibri.utils.conf import OPTIONS
from kolibri.utils.logger import get_base_logging_config


logger = logging.getLogger(__name__)


# We use Unicode strings for Python 2.7 throughout the codebase, so choosing
# to silence these warnings.
# Ref:
# https://github.com/learningequality/kolibri/pull/5494#discussion_r318057385
# https://github.com/PythonCharmers/python-future/issues/22
click.disable_unicode_literals_warning = True


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
                "{param} must be a valid python module import path"
            )
    return value


debug_option = click.Option(
    param_decls=["--debug"],
    default=False,
    is_flag=True,
    help="Output debug messages (for development)",
)

settings_option = click.Option(
    param_decls=["--settings"],
    callback=validate_module,
    help="Django settings module path",
)

pythonpath_option = click.Option(
    param_decls=["--pythonpath"],
    type=click.Path(exists=True, file_okay=False),
    help="Add a path to the Python path",
)

skip_update_option = click.Option(
    param_decls=["--skip-update"],
    default=False,
    is_flag=True,
    help="Do not run update logic. (Useful when running multiple Kolibri commands in parallel)",
)

noinput_option = click.Option(
    param_decls=["--no-input"],
    default=False,
    is_flag=True,
    help="Suppress user prompts",
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


class KolibriGroupCommand(click.Group):
    """
    A command class for Kolibri commands that do not require
    the django stack, but have subcommands. By default adds
    a debug param for logging purposes
    also invokes setup_logging before invoking the command.
    """

    allow_extra_args = True

    def __init__(self, *args, **kwargs):
        kwargs["params"] = base_params + (
            kwargs["params"] if "params" in kwargs else []
        )
        super(KolibriGroupCommand, self).__init__(*args, **kwargs)

    def invoke(self, ctx):
        # Check if the current user is the kolibri user when running kolibri from Debian installer.
        check_debian_user(ctx.params.get("no_input"))
        setup_logging(debug=get_debug_param())
        for param in base_params:
            ctx.params.pop(param.name)
        return super(KolibriGroupCommand, self).invoke(ctx)


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
        check_content_directory_exists_and_writable()
        if not ctx.params["skip_update"]:
            check_database_is_migrated()
        for param in initialize_params:
            ctx.params.pop(param.name)
        return super(KolibriDjangoCommand, self).invoke(ctx)


class DefaultDjangoOptions(object):
    __slots__ = ["settings", "pythonpath"]

    def __init__(self, settings, pythonpath):
        self.settings = settings
        self.pythonpath = pythonpath


def _setup_django(debug):
    """
    Do our django setup - separated from initialize to reduce complexity.
    """
    try:
        django.setup()
        if debug:
            from django.conf import settings

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
    autoremove_unavailable_plugins()

    version = get_version()

    if version_updated(kolibri.__version__, version):
        check_plugin_config_file_location(version)
        # Reset the enabled plugins to the defaults
        # This needs to be run before dbbackup because
        # dbbackup relies on settings.INSTALLED_APPS
        enable_new_default_plugins()

    _setup_django(debug)

    if version_updated(kolibri.__version__, version) and not skip_update:
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

        if version:
            logger.info(
                "Version was {old}, new version: {new}".format(
                    old=version, new=kolibri.__version__
                )
            )
        else:
            logger.info("New install, version: {new}".format(new=kolibri.__version__))
        update(version, kolibri.__version__)

    if not skip_update:
        # Run any plugin specific updates here in case they were missed by
        # our Kolibri version based update logic.
        run_plugin_updates()


def update(old_version, new_version):
    """
    Called whenever a version change in kolibri is detected

    TODO: We should look at version numbers of external plugins, too!
    """

    logger.info("Running update routines for new version...")

    try:
        # Check if there are other kolibri instances running
        # If there are, then we need to stop users from starting kolibri again.
        server.get_status()
        logger.error(
            "There is a Kolibri server running."
            "Running updates now could cause a database error."
            "Please use `kolibri stop` and try again."
        )
        sys.exit(1)

    except server.NotRunning:
        pass

    call_command("collectstatic", interactive=False, verbosity=0)

    migrate_databases()

    run_upgrades(old_version, new_version)

    with open(version_file(), "w") as f:
        f.write(kolibri.__version__)

    from django.core.cache import caches

    cache = caches["built_files"]
    cache.clear()


main_help = """Kolibri management commands

For more information, see:
https://kolibri.readthedocs.io/en/latest/advanced.html

You can also run: kolibri COMMAND --help
"""


@click.group(invoke_without_command=True, help=main_help)
@click.pass_context
@click.version_option(version=kolibri.__version__)
def main(ctx):
    """
    Kolibri's main function.

    Utility functions should be callable for unit testing purposes, but remember
    to use main() for integration tests in order to test the argument API.
    """
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())
        ctx.exit(1)
    try:
        signal.signal(signal.SIGINT, signal.SIG_DFL)
    except ValueError:
        pass


def create_startup_lock(port):
    try:
        server._write_pid_file(server.STARTUP_LOCK, port)
    except (IOError, OSError):
        logger.warn("Impossible to create file lock to communicate starting process")


@main.command(cls=KolibriDjangoCommand, help="Start the Kolibri process")
@click.option(
    "--port",
    default=OPTIONS["Deployment"]["HTTP_PORT"],
    type=int,
    help="Port on which Kolibri is being served",
)
@click.option(
    "--background/--foreground",
    default=True,
    help="Run Kolibri as a background process",
)
def start(port, background):
    """
    Start the server on given port.
    """

    serve_http = OPTIONS["Server"]["CHERRYPY_START"]

    if serve_http:
        # Check if the port is occupied
        check_other_kolibri_running(port)

    create_startup_lock(port)

    # Clear old sessions up
    call_command("clearsessions")
    recreate_cache()

    # On Mac, Python crashes when forking the process, so prevent daemonization until we can figure out
    # a better fix. See https://github.com/learningequality/kolibri/issues/4821
    if sys.platform == "darwin":
        background = False

    if not background:
        logger.info("Running Kolibri")

    else:
        logger.info("Running Kolibri as background process")

    if serve_http:

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
        logger.info("Starting Kolibri background workers")

    # Daemonize at this point, no more user output is needed
    if background:

        from django.conf import settings

        kolibri_log = settings.LOGGING["handlers"]["file"]["filename"]
        logger.info("Going to background mode, logging to {0}".format(kolibri_log))

        kwargs = {}
        # Truncate the file
        if os.path.isfile(server.DAEMON_LOG):
            open(server.DAEMON_LOG, "w").truncate()
        kwargs["out_log"] = server.DAEMON_LOG
        kwargs["err_log"] = server.DAEMON_LOG

        become_daemon(**kwargs)

    server.start(port=port, serve_http=serve_http)


@main.command(cls=KolibriCommand, help="Stop the Kolibri process")
def stop():
    """
    Stops the server unless it isn't running
    """
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


@main.command(cls=KolibriCommand, help="Show the status of the Kolibri process")
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


@main.command(cls=KolibriDjangoCommand, help="Start worker processes")
@click.option(
    "--port",
    default=OPTIONS["Deployment"]["HTTP_PORT"],
    type=int,
    help="Port on which to run Kolibri services",
)
@click.option(
    "--background/--foreground",
    default=True,
    help="Run Kolibri services as a background task",
)
def services(port, background):
    """
    Start the kolibri background services.
    """

    create_startup_lock(None)
    recreate_cache()

    logger.info("Starting Kolibri background services")

    # Daemonize at this point, no more user output is needed
    if background:

        from django.conf import settings

        kolibri_log = settings.LOGGING["handlers"]["file"]["filename"]
        logger.info("Going to background mode, logging to {0}".format(kolibri_log))

        kwargs = {}
        # Truncate the file
        if os.path.isfile(server.DAEMON_LOG):
            open(server.DAEMON_LOG, "w").truncate()
        kwargs["out_log"] = server.DAEMON_LOG
        kwargs["err_log"] = server.DAEMON_LOG

        become_daemon(**kwargs)

    server.start(port=port, serve_http=False)


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
    help="Django management commands. See also 'kolibri manage help'",
)
@click.pass_context
def manage(ctx):
    if ctx.args:
        logger.info("Invoking command {}".format(" ".join(ctx.args)))
    execute_from_command_line(["kolibri manage"] + ctx.args)


@main.command(cls=KolibriDjangoCommand, help="Launch a Django shell")
@click.pass_context
def shell(ctx):
    execute_from_command_line(["kolibri manage", "shell"] + ctx.args)


ENABLE = "enable"
DISABLE = "disable"


@main.command(cls=KolibriGroupCommand, help="Manage Kolibri plugins")
def plugin():
    pass


@plugin.command(help="Enable Kolibri plugins")
@click.argument("plugin_names", nargs=-1)
@click.option("-d", "--default-plugins", default=False, is_flag=True)
def enable(plugin_names, default_plugins):
    error = False
    if not plugin_names and default_plugins:
        plugin_names = DEFAULT_PLUGINS
    for name in plugin_names:
        try:
            logger.info("Enabling plugin '{}'".format(name))
            error = error or not enable_plugin(name)
        except Exception as e:
            error = True
            logger.error("Error enabling plugin '{}', error was: {}".format(name, e))
    if error:
        exception = click.ClickException("One or more plugins could not be enabled")
        exception.exit_code = 2
        raise exception


@plugin.command(help="Disable Kolibri plugins")
@click.argument("plugin_names", nargs=-1)
@click.option("-a", "--all-plugins", default=False, is_flag=True)
def disable(plugin_names, all_plugins):
    error = False
    if not plugin_names and all_plugins:
        plugin_names = config.ACTIVE_PLUGINS
    for name in plugin_names:
        try:
            logger.info("Disabling plugin '{}'".format(name))
            error = error or not disable_plugin(name)
        except Exception as e:
            error = True
            logger.error("Error Disabling plugin '{}', error was: {}".format(name, e))
    if error:
        exception = click.ClickException("One or more plugins could not be disabled")
        exception.exit_code = 2
        raise exception


@plugin.command(help="Set Kolibri plugins to be enabled and disable all others")
@click.argument("plugin_names", nargs=-1)
@click.pass_context
def apply(ctx, plugin_names):
    to_be_disabled = set(config.ACTIVE_PLUGINS) - set(plugin_names)
    error = False
    try:
        ctx.invoke(disable, plugin_names=to_be_disabled, all_plugins=False)
    except click.ClickException:
        error = True
    try:
        ctx.invoke(enable, plugin_names=plugin_names, default_plugins=False)
    except click.ClickException:
        error = True
    if error:
        exception = click.ClickException(
            "An error occurred applying the plugin configuration"
        )
        exception.exit_code = 2
        raise exception


@plugin.command(help="List all available Kolibri plugins")
def list():
    plugins = [plugin for plugin in iterate_plugins()]
    max_len = max((len(plugin) for plugin in plugins))
    available_plugins = "Available plugins"
    status = "Status"
    click.echo(
        available_plugins + " " * (max_len - len(available_plugins) + 4) + status
    )
    for plugin in sorted(plugins):
        click.echo(
            plugin
            + " " * (max_len - len(plugin) + 4)
            + ("ENABLED" if plugin in config.ACTIVE_PLUGINS else "DISABLED")
        )
