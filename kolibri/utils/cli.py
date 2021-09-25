from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import signal
import sys
import traceback
from pkgutil import find_loader

import click
from django.core.management import execute_from_command_line

import kolibri

try:
    from kolibri.plugins import config
except RuntimeError as e:
    logging.error("Loading plugin configuration failed with error '{}'".format(e))
    sys.exit(1)
from kolibri.plugins import DEFAULT_PLUGINS
from kolibri.plugins.utils import disable_plugin
from kolibri.plugins.utils import enable_plugin
from kolibri.plugins.utils import iterate_plugins
from kolibri.utils import server
from kolibri.utils.conf import OPTIONS
from kolibri.utils.debian_check import check_debian_user
from kolibri.utils.main import initialize
from kolibri.utils.main import setup_logging


logger = logging.getLogger(__name__)


# We use Unicode strings for Python 2.7 throughout the codebase, so choosing
# to silence these warnings.
# Ref:
# https://github.com/learningequality/kolibri/pull/5494#discussion_r318057385
# https://github.com/PythonCharmers/python-future/issues/22
click.disable_unicode_literals_warning = True


def validate_module(ctx, param, value):
    if value:
        try:
            if not find_loader(value):
                raise ImportError
        except ImportError:
            raise click.BadParameter(
                "{param} must be a valid python module import path"
            )
    return value


debug_option = click.Option(
    param_decls=["--debug"],
    default=False,
    is_flag=True,
    help="Display and log debug messages (for development)",
    envvar="KOLIBRI_DEBUG",
)

debug_database_option = click.Option(
    param_decls=["--debug-database"],
    default=False,
    is_flag=True,
    help="Display and log database queries (for development), very noisy!",
    envvar="KOLIBRI_DEBUG_LOG_DATABASE",
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


base_params = [debug_option, debug_database_option, noinput_option]

initialize_params = base_params + [
    settings_option,
    pythonpath_option,
    skip_update_option,
]

initialize_kwargs = {param.name: param.default for param in initialize_params}


def get_initialize_params():
    try:
        return {
            k: v
            for k, v in click.get_current_context().params.items()
            if k in initialize_kwargs
        }
    except RuntimeError:
        return initialize_kwargs


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
        setup_logging(
            debug=ctx.params.get("debug"),
            debug_database=ctx.params.get("debug_database"),
        )
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
        setup_logging(
            debug=ctx.params.get("debug"),
            debug_database=ctx.params.get("debug_database"),
        )
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
        try:
            initialize(**get_initialize_params())
        except Exception:
            raise click.ClickException(traceback.format_exc())

        # Remove parameters that are not for Django management command
        for param in initialize_params:
            ctx.params.pop(param.name)
        return super(KolibriDjangoCommand, self).invoke(ctx)


main_help = """Kolibri command-line utility

Details for each main command: kolibri COMMAND --help

List of additional management commands: kolibri manage help

For more information, see: https://kolibri.readthedocs.io/
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


@main.command(cls=KolibriDjangoCommand, help="Start the Kolibri process")
@click.option(
    "--port",
    default=None,
    type=int,
    help="Port on which Kolibri is being served",
)
@click.option(
    "--zip-port",
    default=None,
    type=int,
    help="Port on which zip content server is being served",
)
@click.option(
    "--background/--foreground",
    default=True,
    help="Run Kolibri as a background process",
)
def start(port, zip_port, background):
    """
    Start the server on given port.
    """
    port = OPTIONS["Deployment"]["HTTP_PORT"] if port is None else port
    zip_port = (
        OPTIONS["Deployment"]["ZIP_CONTENT_PORT"] if zip_port is None else zip_port
    )
    server.start(
        port=port,
        zip_port=zip_port,
        serve_http=OPTIONS["Server"]["CHERRYPY_START"],
        background=background,
    )


@main.command(cls=KolibriCommand, help="Stop the Kolibri process")
def stop():
    """
    Stops the server unless it isn't running
    """
    try:
        server.get_status()
    except server.NotRunning as e:
        if e.status_code == server.STATUS_STOPPED:
            logging.info(
                "Already stopped: {}".format(
                    server.status_messages[server.STATUS_STOPPED]
                )
            )
            sys.exit(0)
    status = server.stop()
    if status == server.STATUS_STOPPED:
        if OPTIONS["Server"]["CHERRYPY_START"]:
            logger.info("Kolibri server has successfully been stopped.")
        else:
            logger.info("Kolibri background services have successfully been stopped.")
        sys.exit(0)
    sys.exit(status)


@main.command(cls=KolibriCommand, help="Show the status of the Kolibri process")
def status():
    """
    How is Kolibri doing?
    Check the server's status. For possible statuses, see the status dictionary
    server.status_messages

    Status *always* outputs the current status in the first line of stderr.
    The following lines contain optional information such as the addresses where
    the server is listening.

    TODO: We can't guarantee the above behavior because of the django stack
    being loaded regardless

    Exits with status_code, key has description in server.status_messages
    """
    status_code, urls = server.get_urls()

    if status_code == server.STATUS_RUNNING:
        sys.stderr.write("{msg:s} (0)\n".format(msg=server.status_messages[0]))
        if urls:
            sys.stderr.write("Kolibri running on:\n\n")
            for addr in urls:
                sys.stderr.write("\t{}\n".format(addr))
    else:
        verbose_status = server.status_messages[status_code]
        sys.stderr.write(
            "{msg:s} ({code:d})\n".format(code=status_code, msg=verbose_status)
        )
    sys.exit(status_code)


@main.command(cls=KolibriDjangoCommand, help="Start worker processes")
@click.option(
    "--port",
    default=None,
    type=int,
    help="Port on which Kolibri is running to inform services",
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

    port = OPTIONS["Deployment"]["HTTP_PORT"] if port is None else port

    logger.info("Starting Kolibri background services")

    server.start(port=port, zip_port=0, serve_http=False, background=background)


@main.command(cls=KolibriCommand, help="Restart the Kolibri process")
def restart():
    """
    Restarts the server if it is running
    """
    if server.restart():
        logger.info("Kolibri has successfully restarted")
        sys.exit(0)
    logger.info("Kolibri has failed to restart - confirm that the server is running")
    sys.exit(1)


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


@main.command(cls=KolibriGroupCommand, help="Configure Kolibri and enabled plugins")
def configure():
    pass


def _format_env_var(envvar, value):
    if value.get("deprecated", False) or envvar in value.get("deprecated_envvars", ()):
        return click.style(
            "{envvar} - DEPRECATED - {description}\n\n".format(
                envvar=envvar, description=value.get("description", "")
            ),
            fg="yellow",
        )
    return "{envvar} - {description}\n\n".format(
        envvar=envvar, description=value.get("description", "")
    )


def _get_env_vars():
    """
    Generator to iterate over all environment variables
    """
    from kolibri.utils.env import ENVIRONMENT_VARIABLES

    for key, value in ENVIRONMENT_VARIABLES.items():
        yield _format_env_var(key, value)

    from kolibri.utils.options import option_spec

    for value in option_spec.values():
        for v in value.values():
            if "envvars" in v:
                for envvar in v["envvars"]:
                    yield _format_env_var(envvar, v)


@configure.command(help="List all available environment variables to configure Kolibri")
def list_env():
    click.echo_via_pager(_get_env_vars())


@configure.command(cls=KolibriDjangoCommand, help="Setup Kolibri")
def setup():
    """
    Setup Kolibri.
    """
    logger.info("Kolibri has successfully been setup")
