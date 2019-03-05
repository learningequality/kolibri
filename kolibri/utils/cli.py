from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import importlib
import logging
import os
import signal
import sys
from sqlite3 import DatabaseError as SQLite3DatabaseError

import django
from django.core.exceptions import AppRegistryNotReady
from django.core.management import call_command
from django.db import connections
from django.db.utils import DatabaseError
from docopt import docopt

import kolibri
from .debian_check import check_debian_user
# Check if the current user is the kolibri user when running kolibri from .deb.
# Putting it here because importing server module creates KOLIBRI_HOME directory.
check_debian_user()

from . import server  # noqa
from .conf import OPTIONS  # noqa
from .sanity_checks import check_content_directory_exists_and_writable  # noqa
from .sanity_checks import check_other_kolibri_running  # noqa
from .system import become_daemon  # noqa
from kolibri.core.deviceadmin.utils import IncompatibleDatabase  # noqa
from kolibri.utils import conf  # noqa


USAGE = """
Kolibri

Supported by Foundation for Learning Equality
www.learningequality.org

Usage:
  kolibri start [--foreground] [--port=<port>] [options]
  kolibri stop [options]
  kolibri restart [options]
  kolibri status [options]
  kolibri shell [options]
  kolibri manage COMMAND [DJANGO_OPTIONS ...]
  kolibri manage COMMAND [options] [-- DJANGO_OPTIONS ...]
  kolibri diagnose [options]
  kolibri plugin [options] PLUGIN (enable | disable)
  kolibri language setdefault <langcode>
  kolibri plugin --list
  kolibri -h | --help
  kolibri --version

Options:
  -h --help             Show this screen.
  --version             Show version.
  --debug               Output debug messages (for development)
  COMMAND               The name of any available django manage command. For
                        help, type `kolibri manage help`
  DJANGO_OPTIONS        Command options are passed on to the django manage
                        command. Notice that all django options must appear
                        *last* and should not be mixed with other options.

Examples:
  kolibri start             Start Kolibri
  kolibri stop              Stop Kolibri
  kolibri status            How is Kolibri doing?
  kolibri url               Tell me the address of Kolibri
  kolibri shell             Display a Django shell
  kolibri manage help       Show the Django management usage dialogue
  kolibri manage runserver  Runs Django's development server
  kolibri diagnose          Show system information for debugging


Environment:

  DJANGO_SETTINGS_MODULE
   - The Django settings module to load. Useful if you are deploying Kolibri
     in a specific setup such as your own web server.
   - Default: "kolibri.deployment.default.settings.base"

  KOLIBRI_HOME
   - Where Kolibri will store its data and configuration files.

  KOLIBRI_HTTP_PORT
   - Default: 8080

"""

__doc__ = """
Kolibri Command Line Interface (CLI)
====================================

Auto-generated usage instructions from ``kolibri -h``::

{usage:s}

""".format(usage="\n".join(map(lambda x: "    " + x, USAGE.split("\n"))))

logger = logging.getLogger(__name__)


class PluginDoesNotExist(Exception):
    """
    This exception is local to the CLI environment in case actions are performed
    on a plugin that cannot be loaded.
    """


class PluginBaseLoadsApp(Exception):
    """
    An exception raised in case a kolibri_plugin.py results in loading of the
    Django app stack.
    """
    pass


def version_file():
    """
    During test runtime, this path may differ because KOLIBRI_HOME is
    regenerated
    """
    from .conf import KOLIBRI_HOME
    return os.path.join(KOLIBRI_HOME, '.data_version')


def should_back_up(kolibri_version, version_file_contents):
    change_version = kolibri_version != version_file_contents
    return change_version and 'dev' not in version_file_contents and 'dev' not in kolibri_version


def initialize(debug=False):
    """
    Currently, always called before running commands. This may change in case
    commands that conflict with this behavior show up.

    :param: debug: Tells initialization to setup logging etc.
    """
    if not os.path.isfile(version_file()):
        django.setup()

        setup_logging(debug=debug)

        _first_run()
    else:
        # Do this here so that we can fix any issues with our configuration file before
        # we attempt to set up django.
        from .conf import autoremove_unavailable_plugins, enable_default_plugins
        autoremove_unavailable_plugins()

        version = open(version_file(), "r").read()
        version = version.strip() if version else ""

        if should_back_up(kolibri.__version__, version):
            # dbbackup will load settings.INSTALLED_APPS.
            # we need to ensure plugins are correct in conf.config before
            enable_default_plugins()
            # Version changed, make a backup no matter what.
            from kolibri.core.deviceadmin.utils import dbbackup
            try:
                backup = dbbackup(version)
                logger.info(
                    "Backed up database to: {path}".format(path=backup))
            except IncompatibleDatabase:
                logger.warning(
                    "Skipped automatic database backup, not compatible with "
                    "this DB engine.")

        django.setup()

        setup_logging(debug=debug)

        if kolibri.__version__ != version:
            logger.info(
                "Version was {old}, new version: {new}".format(
                    old=version,
                    new=kolibri.__version__
                )
            )
            update()


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


def _first_run():
    """
    Called once at least.
    """
    if os.path.exists(version_file()):
        logger.error(
            "_first_run() called, but Kolibri is already initialized."
        )
        return
    logger.info("Kolibri running for the first time.")
    logger.info(
        "We don't yet use pre-migrated database seeds, so you're going to have "
        "to wait a bit while we create a blank database...\n\n"
    )

    from kolibri.core.settings import SKIP_AUTO_DATABASE_MIGRATION, DEFAULT_PLUGINS

    # We need to migrate the database before enabling plugins, because they
    # might depend on database readiness.
    if not SKIP_AUTO_DATABASE_MIGRATION:
        _migrate_databases()

    for plugin_module in DEFAULT_PLUGINS:
        try:
            plugin(plugin_module, enable=True)
        except PluginDoesNotExist:
            continue

    logger.info("Automatically enabling applications.")

    # Finally collect static assets and run migrations again
    update()


def update():
    """
    Called whenever a version change in kolibri is detected

    TODO: We should look at version numbers of external plugins, too!
    """
    # Can be removed once we stop calling update() from start()
    # See: https://github.com/learningequality/kolibri/issues/1615
    if update.called:
        return
    update.called = True

    logger.info("Running update routines for new version...")

    # Need to do this here, before we run any Django management commands that
    # import settings. Otherwise the updated configuration will not be used
    # during this runtime.

    call_command("collectstatic", interactive=False)

    from kolibri.core.settings import SKIP_AUTO_DATABASE_MIGRATION

    if not SKIP_AUTO_DATABASE_MIGRATION:
        _migrate_databases()

    with open(version_file(), "w") as f:
        f.write(kolibri.__version__)

    from kolibri.core.content.utils.annotation import update_channel_metadata
    update_channel_metadata()

    from django.core.cache import caches
    cache = caches['built_files']
    cache.clear()


update.called = False


def start(port=None, daemon=True):
    """
    Start the server on given port.

    :param: port: Port number (default: 8080)
    :param: daemon: Fork to background process (default: True)
    """
    run_cherrypy = conf.OPTIONS["Server"]["CHERRYPY_START"]

    # This is temporarily put in place because of
    # https://github.com/learningequality/kolibri/issues/1615
    update()

    # In case some tests run start() function only
    if not isinstance(port, int):
        port = _get_port(port)

    if not daemon:
        logger.info("Running 'kolibri start' in foreground...")

    else:
        logger.info("Running 'kolibri start' as daemon (system service)")

    if run_cherrypy:
        __, urls = server.get_urls(listen_port=port)
        if not urls:
            logger.error(
                "Could not detect an IP address that Kolibri binds to, but try "
                "opening up the following addresses:\n")
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

        kwargs = {}
        # Truncate the file
        if os.path.isfile(server.DAEMON_LOG):
            open(server.DAEMON_LOG, "w").truncate()
        logger.info(
            "Going to daemon mode, logging to {0}".format(server.DAEMON_LOG)
        )
        kwargs['out_log'] = server.DAEMON_LOG
        kwargs['err_log'] = server.DAEMON_LOG

        # close all connections before forking, to avoid SQLite corruption:
        # https://www.sqlite.org/howtocorrupt.html#_carrying_an_open_database_connection_across_a_fork_
        connections.close_all()

        become_daemon(**kwargs)

    server.start(port=port, run_cherrypy=run_cherrypy)


def stop():
    """
    Stops the server unless it isn't running
    """
    try:
        pid, __, __ = server.get_status()
        server.stop(pid=pid)
        stopped = True
        if conf.OPTIONS["Server"]["CHERRYPY_START"]:
            logger.info("Kolibri server has successfully been stopped.")
        else:
            logger.info("Kolibri background services have successfully been stopped.")
    except server.NotRunning as e:
        verbose_status = "{msg:s} ({code:d})".format(
            code=e.status_code,
            msg=status.codes[e.status_code]
        )
        if e.status_code == server.STATUS_STOPPED:
            logger.info("Already stopped: {}".format(verbose_status))
            stopped = True
        elif e.status_code == server.STATUS_STARTING_UP:
            logger.error(
                "Not stopped: {}".format(verbose_status)
            )
            sys.exit(e.status_code)
        else:
            logger.error(
                "During graceful shutdown, server says: {}".format(
                    verbose_status
                )
            )
            logger.error(
                "Not responding, killing with force"
            )
            server.stop(force=True)
            stopped = True

    if stopped:
        sys.exit(0)


def status():
    """
    Check the server's status. For possible statuses, see the status dictionary
    status.codes

    Status *always* outputs the current status in the first line of stderr.
    The following lines contain optional information such as the addresses where
    the server is listening.

    TODO: We can't guarantee the above behavior because of the django stack
    being loaded regardless

    :returns: status_code, key has description in status.codes
    """
    status_code, urls = server.get_urls()

    if status_code == server.STATUS_RUNNING:
        sys.stderr.write("{msg:s} (0)\n".format(msg=status.codes[0]))
        if urls:
            sys.stderr.write("Kolibri running on:\n\n")
            for addr in urls:
                sys.stderr.write("\t{}\n".format(addr))
        return server.STATUS_RUNNING
    else:
        verbose_status = status.codes[status_code]
        sys.stderr.write("{msg:s} ({code:d})\n".format(
            code=status_code, msg=verbose_status))
        return status_code


status.codes = {
    server.STATUS_RUNNING: 'OK, running',
    server.STATUS_STOPPED: 'Stopped',
    server.STATUS_STARTING_UP: 'Starting up',
    server.STATUS_NOT_RESPONDING: 'Not responding',
    server.STATUS_FAILED_TO_START:
        'Failed to start (check log file: {0})'.format(server.DAEMON_LOG),
    server.STATUS_UNCLEAN_SHUTDOWN: 'Unclean shutdown',
    server.STATUS_UNKNOWN_INSTANCE: 'Unknown Kolibri running on port',
    server.STATUS_SERVER_CONFIGURATION_ERROR: 'Kolibri server configuration error',
    server.STATUS_PID_FILE_READ_ERROR: 'Could not read PID file',
    server.STATUS_PID_FILE_INVALID: 'Invalid PID file',
    server.STATUS_UNKNOWN: 'Could not determine status',
}


def setup_logging(debug=False):
    """
    Configures logging in cases where a Django environment is not supposed
    to be configured.

    TODO: This is really confusing, importing django settings is allowed to
    fail when debug=False, but if it's true it can fail?
    """
    try:
        from django.conf.settings import LOGGING
    except ImportError:
        from kolibri.deployment.default.settings.base import LOGGING
    if debug:
        from django.conf import settings
        settings.DEBUG = True
        LOGGING['handlers']['console']['level'] = 'DEBUG'
        LOGGING['loggers']['kolibri']['level'] = 'DEBUG'
        logger.debug("Debug mode is on!")
    logging.config.dictConfig(LOGGING)


def manage(cmd, args=[]):
    """
    Invokes a django command

    :param: cmd: The command to invoke, for instance "runserver"
    :param: args: arguments for the command
    """
    # Set sys.argv to correctly reflect the way we invoke kolibri as a Python
    # module
    sys.argv = ["-m", "kolibri"] + sys.argv[1:]
    from django.core.management import execute_from_command_line
    argv = ['kolibri manage', cmd] + args
    execute_from_command_line(argv=argv)


def _is_plugin(obj):
    from kolibri.plugins.base import KolibriPluginBase  # NOQA

    return (
        isinstance(obj, type) and obj is not KolibriPluginBase
        and issubclass(obj, KolibriPluginBase)
    )


def get_kolibri_plugin(plugin_name):
    """
    Try to load kolibri_plugin from given plugin module identifier

    :returns: A list of classes inheriting from KolibriPluginBase
    """

    plugin_classes = []

    try:
        plugin_module = importlib.import_module(
            plugin_name + ".kolibri_plugin"
        )
        for obj in plugin_module.__dict__.values():
            if _is_plugin(obj):
                plugin_classes.append(obj)
    except ImportError as e:
        # Python 2: message, Python 3: msg
        exc_message = getattr(e, 'message', getattr(e, 'msg', None))
        if exc_message.startswith("No module named"):
            msg = (
                "Plugin '{}' does not seem to exist. Is it on the PYTHONPATH?"
            ).format(plugin_name)
            raise PluginDoesNotExist(msg)
        else:
            raise
    except AppRegistryNotReady:
        msg = (
            "Plugin '{}' loads the Django app registry, which it isn't "
            "allowed to do while enabling or disabling itself."
        ).format(plugin_name)
        raise PluginBaseLoadsApp(msg)

    if not plugin_classes:
        # There's no clear use case for a plugin without a KolibriPluginBase
        # inheritor, for now just throw a warning
        logger.warning(
            "Plugin '{}' has no KolibriPluginBase defined".format(plugin_name)
        )

    return plugin_classes


def plugin(plugin_name, **kwargs):
    """
    Receives a plugin identifier and tries to load its main class. Calls class
    functions.
    """
    from kolibri.utils import conf

    if kwargs.get('enable', False):
        plugin_classes = get_kolibri_plugin(plugin_name)
        for klass in plugin_classes:
            klass.enable()

    if kwargs.get('disable', False):
        try:
            plugin_classes = get_kolibri_plugin(plugin_name)
            for klass in plugin_classes:
                klass.disable()
        except PluginDoesNotExist as e:
            logger.error(str(e))
            logger.warning(
                "Removing '{}' from configuration in a naive way.".format(
                    plugin_name
                )
            )
            if plugin_name in conf.config['INSTALLED_APPS']:
                conf.config['INSTALLED_APPS'].remove(plugin_name)
                logger.info(
                    "Removed '{}' from INSTALLED_APPS".format(plugin_name)
                )
            else:
                logger.warning(
                    (
                        "Could not find any matches for {} in INSTALLED_APPS"
                        .format(plugin_name)
                    )
                )

    conf.save()


def set_default_language(lang):
    """
    Set the default language for this installation of Kolibri. Any running
    instance of Kolibri needs to be restarted in order for this change to work.
    """

    from kolibri.utils import conf
    from django.conf import settings

    valid_languages = [l[0] for l in settings.LANGUAGES]

    if lang in valid_languages:
        conf.config['LANGUAGE_CODE'] = lang
        conf.save()
    else:
        msg = "Invalid language code {langcode}. Must be one of: {validlangs}".format(
            langcode=lang, validlangs=valid_languages
        )

        logging.warning(msg)


def parse_args(args=None):
    """
    Parses arguments by invoking docopt. Arguments for django management
    commands are split out before returning.

    :returns: (parsed_arguments, raw_django_ars)
    """

    if not args:
        args = sys.argv[1:]

    # Split out the parts of the argument list that we pass on to Django
    # and don't feed to docopt.
    if '--' in args:
        # At the moment, we keep this for backwards-compatibility and in case there
        # is a real case of having to force the parsing of DJANGO_OPTIONS to a
        # specific location. Example:
        # kolibri manage commandname --non-django-arg -- --django-arg
        pivot = args.index('--')
        args, django_args = args[:pivot], args[pivot + 1:]
    elif 'manage' in args:
        # Include "manage COMMAND" for docopt parsing, but split out the rest
        pivot = args.index('manage') + 2
        args, django_args = args[:pivot], args[pivot:]
    else:
        django_args = []

    docopt_kwargs = dict(
        version=str(kolibri.__version__),
        options_first=False,
    )

    if args:
        docopt_kwargs['argv'] = args

    return docopt(USAGE, **docopt_kwargs), django_args


def _get_port(port):
    return int(port) if port else OPTIONS["Deployment"]['HTTP_PORT']


def main(args=None):  # noqa: max-complexity=13
    """
    Kolibri's main function. Parses arguments and calls utility functions.
    Utility functions should be callable for unit testing purposes, but remember
    to use main() for integration tests in order to test the argument API.
    """

    signal.signal(signal.SIGINT, signal.SIG_DFL)

    arguments, django_args = parse_args(args)

    debug = arguments['--debug']

    if arguments['start']:
        port = _get_port(arguments['--port'])
        if OPTIONS["Server"]["CHERRYPY_START"]:
            check_other_kolibri_running(port)

    try:
        initialize(debug=debug)
    except (DatabaseError, SQLite3DatabaseError) as e:
        if "malformed" in str(e):
            logger.error(
                "Your database appears to be corrupted. If you encounter this,"
                "please immediately back up all files in the .kolibri folder that"
                "end in .sqlite3, .sqlite3-shm, .sqlite3-wal, or .log and then"
                "contact Learning Equality. Thank you!"
            )
        raise

    # Alias
    if arguments['shell']:
        arguments['manage'] = True
        arguments['COMMAND'] = 'shell'

    if arguments['manage']:
        command = arguments['COMMAND']
        manage(command, args=django_args)
        return

    if arguments['plugin']:
        plugin_name = arguments['PLUGIN']
        plugin(plugin_name, **arguments)
        return

    if arguments['start']:
        try:
            server._write_pid_file(server.STARTUP_LOCK, port)
        except (IOError, OSError):
            logger.warn('Impossible to create file lock to communicate starting process')
        # Check if the content directory exists when Kolibri runs after the first time.
        check_content_directory_exists_and_writable()

        # Defragment the db
        call_command("vacuumsqlite")

        # Clear old sessions up
        call_command("clearsessions")

        daemon = not arguments['--foreground']
        if sys.platform == 'darwin':
            daemon = False
        start(port, daemon=daemon)
        return

    if arguments['stop']:
        stop()
        return

    if arguments['status']:
        status_code = status()
        sys.exit(status_code)
        return

    if arguments['language'] and arguments['setdefault']:
        set_default_language(arguments['<langcode>'])
