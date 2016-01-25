from __future__ import absolute_import, print_function, unicode_literals


import importlib
import os
import signal
import sys
import kolibri

from docopt import docopt

USAGE = """
Kolibri

Supported by Foundation for Learning Equality
www.learningequality.org

Usage:
  kolibri start [--foreground --watch] [options] [-- DJANGO_OPTIONS ...]
  kolibri stop [options] [-- DJANGO_OPTIONS ...]
  kolibri restart [options] [-- DJANGO_OPTIONS ...]
  kolibri status [options]
  kolibri shell [options] [-- DJANGO_OPTIONS ...]
  kolibri manage [options] COMMAND [-- DJANGO_OPTIONS ...]
  kolibri diagnose [options]
  kolibri plugin PLUGIN (enable | disable)
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
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "kolibri.deployment.default.settings.base")
os.environ.setdefault("KOLIBRI_HOME", os.path.join(os.path.expanduser("~"), ".kalite"))
os.environ.setdefault("KOLIBRI_LISTEN_PORT", "8008")


from kolibri.logger import logger  # NOQA
from kolibri.plugins.base import KolibriPluginBase  # NOQA


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


def plugin(plugin_name, args):
    """
    Receives a plugin identifier and tries to load its main class. Calls class
    functions.
    """
    from kolibri.utils import conf
    plugin_classes = []

    # Try to load kolibri_plugin from given plugin module identifier
    try:
        plugin_module = importlib.import_module(plugin_name + ".kolibri_plugin")
        for obj in plugin_module.__dict__.values():
            if type(obj) == type and obj is not KolibriPluginBase and issubclass(obj, KolibriPluginBase):
                plugin_classes.append(obj)
    except ImportError:
        raise RuntimeError("Plugin does not exist")

    if args['enable']:
        for klass in plugin_classes:
            klass.enable(conf.config)

    if args['disable']:
        for klass in plugin_classes:
            klass.disable(conf.config)

    conf.save()


def main(args=None):
    """
    Kolibri's main function. Parses arguments and calls utility functions.
    Utility functions should be callable for unit testing purposes, but remember
    to use main() for integration tests in order to test the argument API.
    """

    if not args:
        args = sys.argv[1:]

    signal.signal(signal.SIGINT, signal.SIG_DFL)

    # Split out the parts of the argument list that we pass on to Django
    # and don't feed to docopt.
    if '--' in args:
        pivot = args.index('--')
        args, django_args = args[:pivot], args[pivot:]
    else:
        django_args = []

    docopt_kwargs = dict(
        version=str(kolibri.__version__),
        options_first=False,
    )

    if args:
        docopt_kwargs['argv'] = args

    arguments = docopt(USAGE, **docopt_kwargs)

    if arguments['manage']:
        command = arguments['COMMAND']
        manage(command, args=django_args)
        return

    if arguments['plugin']:
        plugin_name = arguments['PLUGIN']
        plugin(plugin_name, arguments)
        return

    logger.info(arguments)
