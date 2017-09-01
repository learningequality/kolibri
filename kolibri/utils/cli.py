from __future__ import absolute_import, print_function, unicode_literals

import importlib  # noqa
import logging  # noqa
import os  # noqa
import signal  # noqa
import sys  # noqa

# Do this before importing anything else, we need to add bundled requirements
# from the distributed version in case it exists before importing anything
# else.
# TODO: Do we want to manage the path at an even more fundamental place like
# kolibri.__init__ !? Load order will still matter...

import kolibri  # noqa
from kolibri import dist as kolibri_dist  # noqa
sys.path = sys.path + [
    os.path.realpath(os.path.dirname(kolibri_dist.__file__))
]

# Set default env
os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE", "kolibri.deployment.default.settings.base"
)
os.environ.setdefault(
    "KOLIBRI_HOME", os.path.join(os.path.expanduser("~"), ".kolibri")
)
os.environ.setdefault("KOLIBRI_LISTEN_PORT", "8080")

import django  # noqa
from django.core.management import call_command  # noqa
from docopt import docopt  # noqa

from . import server  # noqa
from .system import become_daemon  # noqa

# This was added in
# https://github.com/learningequality/kolibri/pull/580
# ...we need to (re)move it /benjaoming
# Force python2 to interpret every string as unicode.
if sys.version[0] == '2':
    reload(sys)  # noqa
    sys.setdefaultencoding('utf8')

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
   - Where Kolibri will store its data and configuration files. If you are using
     an external drive

  KOLIBRI_LISTEN_PORT
   - Default: 8080

"""

__doc__ = """
Kolibri Command Line Interface (CLI)
====================================

Auto-generated usage instructions from ``kolibri -h``::

{usage:s}

""".format(usage="\n".join(map(lambda x: "    " + x, USAGE.split("\n"))))

logger = logging.getLogger(__name__)

KOLIBRI_HOME = os.environ['KOLIBRI_HOME']
VERSION_FILE = os.path.join(KOLIBRI_HOME, '.data_version')


class PluginDoesNotExist(Exception):
    """
    This exception is local to the CLI environment in case actions are performed
    on a plugin that cannot be loaded.
    """


def initialize(debug=False):
    """
    Currently, always called before running commands. This may change in case
    commands that conflict with this behavior show up.

    :param: debug: Tells initialization to setup logging etc.
    """

    if not os.path.isfile(VERSION_FILE):
        django.setup()

        setup_logging(debug=debug)

        _first_run()
    else:
        # Do this here so that we can fix any issues with our configuration file before
        # we attempt to setup django.
        from kolibri.utils.conf import autoremove_unavailable_plugins, enable_default_plugins
        autoremove_unavailable_plugins()

        version = open(VERSION_FILE, "r").read()
        change_version = kolibri.__version__ != version.strip()
        if change_version:
            enable_default_plugins()

        django.setup()

        setup_logging(debug=debug)

        if change_version:
            logger.info(
                "Version was {old}, new version: {new}".format(
                    old=version,
                    new=kolibri.__version__
                )
            )
            update()


def _first_run():
    """
    Called once at least. Will not run if the .kolibri/.version file is
    found.
    """
    if os.path.exists(VERSION_FILE):
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
        call_command("migrate", interactive=False, database="default")

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
        call_command("migrate", interactive=False, database="default")

    with open(VERSION_FILE, "w") as f:
        f.write(kolibri.__version__)


update.called = False


def start(port=None, daemon=True):
    """
    Start the server on given port.

    :param: port: Port number (default: 8080)
    :param: daemon: Fork to background process (default: True)
    """

    # This is temporarily put in place because of
    # https://github.com/learningequality/kolibri/issues/1615
    update()

    if port is None:
        try:
            port = int(os.environ['KOLIBRI_LISTEN_PORT'])
        except ValueError:
            logger.error("Invalid KOLIBRI_LISTEN_PORT, must be an integer")
            raise

    if not daemon:
        logger.info("Running 'kolibri start' in foreground...")

    else:
        logger.info("Running 'kolibri start' as daemon (system service)")

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

    # Daemonize at this point, no more user output is needed
    if daemon:

        kwargs = {}
        # Truncate the file
        open(server.DAEMON_LOG, "w").truncate()
        logger.info(
            "Going to daemon mode, logging to {0}".format(server.DAEMON_LOG)
        )
        kwargs['out_log'] = server.DAEMON_LOG
        kwargs['err_log'] = server.DAEMON_LOG
        become_daemon(**kwargs)

    server.start(port=port)


def stop():
    """
    Stops the server unless it isn't running
    """
    try:
        pid, __, __ = server.get_status()
        server.stop(pid=pid)
        stopped = True
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
    server.STATUS_UNKNOWN_INSTANCE: 'Unknown KA Lite running on port',
    server.STATUS_SERVER_CONFIGURATION_ERROR: 'KA Lite server configuration error',
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
    logging.config.dictConfig(LOGGING)
    logger.debug("Debug mode is on!")


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
        isinstance(obj, type) and obj is not KolibriPluginBase and
        issubclass(obj, KolibriPluginBase)
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
        if str(e).startswith("No module named"):
            raise PluginDoesNotExist(
                "Plugin '{}' does not seem to exist. Is it on the PYTHONPATH?".
                format(plugin_name)
            )
        else:
            raise

    if not plugin_classes:
        # There's no clear use case for a plugin without a KolibriPluginBase
        # inheritor, for now just throw a warning
        logger.warning(
            "Plugin '{}' has no KolibriPluginBase defined".format(plugin_name)
        )

    return plugin_classes


def plugin(plugin_name, **args):
    """
    Receives a plugin identifier and tries to load its main class. Calls class
    functions.
    """
    from kolibri.utils import conf

    if args.get('enable', False):
        plugin_classes = get_kolibri_plugin(plugin_name)
        for klass in plugin_classes:
            klass.enable()

    if args.get('disable', False):
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


def main(args=None):
    """
    Kolibri's main function. Parses arguments and calls utility functions.
    Utility functions should be callable for unit testing purposes, but remember
    to use main() for integration tests in order to test the argument API.
    """

    signal.signal(signal.SIGINT, signal.SIG_DFL)

    arguments, django_args = parse_args(args)

    debug = arguments['--debug']

    initialize(debug=debug)

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
        port = arguments['--port']
        port = int(port) if port else None
        start(port, daemon=not arguments['--foreground'])
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
