from __future__ import absolute_import, print_function, unicode_literals

import importlib  # noqa
import logging  # noqa
# Do this before importing anything else, we need to add bundled requirements
# from the distributed version in case it exists before importing anything
# else.
# TODO: Do we want to manage the path at an even more fundametal place like
# kolibri.__init__ !? Load order will still matter...
import os  # noqa
import signal  # noqa
import sys  # noqa
from logging import config as logging_config  # noqa

import kolibri  # noqa
from kolibri import dist as kolibri_dist  # noqa

# Setup path in case we are running with dependencies bundled into Kolibri
# (NOTE: This *must* come before imports below, of django etc, or whl/pex will fail)
sys.path = [os.path.realpath(os.path.dirname(kolibri_dist.__file__))
            ] + sys.path

import django  # noqa
from django.core.management import call_command  # noqa
from docopt import docopt  # noqa

from . import server  # noqa

# Force python2 to interpret every string as unicode.
if sys.version[0] == '2':
    reload(sys)
    sys.setdefaultencoding('utf8')

USAGE = """
Kolibri

Supported by Foundation for Learning Equality
www.learningequality.org

Usage:
  kolibri start [--foreground --watch] [--port=<port>] [options] [-- DJANGO_OPTIONS ...]
  kolibri stop [options] [-- DJANGO_OPTIONS ...]
  kolibri restart [options] [-- DJANGO_OPTIONS ...]
  kolibri status [options]
  kolibri shell [options] [-- DJANGO_OPTIONS ...]
  kolibri manage [options] COMMAND [-- DJANGO_OPTIONS ...]
  kolibri diagnose [options]
  kolibri plugin [options] PLUGIN (enable | disable)
  kolibri plugin --list
  kolibri -h | --help
  kolibri --version

Options:
  -h --help             Show this screen.
  --version             Show version.
  COMMAND               The name of any available django manage command. For
                        help, type `kolibri manage help`
  --debug               Output debug messages (for development)
  --port=<arg>          Use a non-default port on which to start the HTTP server
                        or to query an existing server (stop/status)
  DJANGO_OPTIONS        All options are passed on to the django manage command.
                        Notice that all django options must appear *last* and
                        should not be mixed with other options. Only long-name
                        options ('--long-name') are supported.

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


"""

__doc__ = """
Kolibri Command Line Interface (CLI)
====================================

Auto-generated usage instructions from ``kolibri -h``::

{usage:s}

""".format(usage="\n".join(map(lambda x: "    " + x, USAGE.split("\n"))))

# Set default env
os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE", "kolibri.deployment.default.settings.base"
)
os.environ.setdefault(
    "KOLIBRI_HOME", os.path.join(os.path.expanduser("~"), ".kolibri")
)
os.environ.setdefault("KOLIBRI_LISTEN_PORT", "8008")

logger = logging.getLogger(__name__)

KOLIBRI_HOME = os.environ['KOLIBRI_HOME']
VERSION_FILE = os.path.join(KOLIBRI_HOME, '.data_version')


class PluginDoesNotExist(Exception):
    """
    This exception is local to the CLI environment in case actions are performed
    on a plugin that cannot be loaded.
    """
    pass


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

    django.setup()

    from kolibri.core.settings import SKIP_AUTO_DATABASE_MIGRATION, DEFAULT_PLUGINS

    if not SKIP_AUTO_DATABASE_MIGRATION:
        call_command("migrate", interactive=False)

    for plugin_module in DEFAULT_PLUGINS:
        try:
            plugin(plugin_module, enable=True)
        except PluginDoesNotExist:
            continue

    logger.info("Automatically enabling applications.")

    with open(VERSION_FILE, "w") as f:
        f.write(kolibri.__version__)


def initialize(debug=False):
    """
    Always called before running commands

    :param: debug: Tells initialization to setup logging etc.
    """

    setup_logging(debug=debug)

    if not os.path.isfile(VERSION_FILE):
        _first_run()


def setup_logging(debug=False):
    """Configures logging in cases where a Django environment is not supposed
    to be configured"""
    try:
        from django.conf.settings import LOGGING
    except ImportError:
        from kolibri.deployment.default.settings.base import LOGGING
    if debug:
        from django.conf import settings
        settings.DEBUG = True
        LOGGING['handlers']['console']['level'] = 'DEBUG'
        LOGGING['loggers']['kolibri']['level'] = 'DEBUG'
    logging_config.dictConfig(LOGGING)
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


def plugin(plugin_name, **args):
    """
    Receives a plugin identifier and tries to load its main class. Calls class
    functions.
    """
    from kolibri.utils import conf
    plugin_classes = []

    # Try to load kolibri_plugin from given plugin module identifier
    try:
        plugin_module = importlib.import_module(
            plugin_name + ".kolibri_plugin"
        )
        for obj in plugin_module.__dict__.values():
            if _is_plugin(obj):
                plugin_classes.append(obj)
    except ImportError as e:
        if e.message.startswith("No module named"):
            raise PluginDoesNotExist(
                "Plugin '{}' does not seem to exist. Is it on the PYTHONPATH?".
                format(plugin_name)
            )
        else:
            raise

    if args.get('enable', False):
        for klass in plugin_classes:
            klass.enable()

    if args.get('disable', False):
        for klass in plugin_classes:
            klass.disable()

    conf.save()


def main(args=None):
    """
    Kolibri's main function. Parses arguments and calls utility functions.
    Utility functions should be callable for unit testing purposes, but remember
    to use main() for integration tests in order to test the argument API.
    """

    # ensure that Django is set up before we do anything else
    django.setup()

    if not args:
        args = sys.argv[1:]

    signal.signal(signal.SIGINT, signal.SIG_DFL)

    # Split out the parts of the argument list that we pass on to Django
    # and don't feed to docopt.
    if '--' in args:
        pivot = args.index('--')
        args, django_args = args[:pivot], args[pivot + 1:]
    else:
        django_args = []

    docopt_kwargs = dict(
        version=str(kolibri.__version__),
        options_first=False,
    )

    if args:
        docopt_kwargs['argv'] = args

    arguments = docopt(USAGE, **docopt_kwargs)

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
        port = int(arguments['--port'] or 8080)
        server.start(port=port)
        return
