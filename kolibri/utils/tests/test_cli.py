"""
Tests for `kolibri.utils.cli` module.
"""

import errno
import logging
import os
import tempfile
from types import SimpleNamespace
from unittest.mock import patch

import pytest

import kolibri.plugins
from kolibri.plugins.utils import autoremove_unavailable_plugins
from kolibri.utils import cli
from kolibri.utils import conf
from kolibri.utils import options
from kolibri.utils import server
from kolibri.utils.main import version_file
from kolibri.utils.tests.helpers import fake_port_binds
from kolibri.utils.tests.helpers import pinned_http_port
from kolibri.utils.tests.helpers import running_pid_file

logger = logging.getLogger(__name__)


LOG_LOGGER = []


def log_logger(logger_instance, LEVEL, msg, args, **kwargs):
    """
    Monkeypatching for logging.Logger._log to scoop up log messages if we wanna
    test something specific was logged.
    """
    LOG_LOGGER.append((LEVEL, msg))
    # Call the original function
    logger_instance.__log(LEVEL, msg, args, **kwargs)


def activate_log_logger(monkeypatch):
    """
    Activates logging everything to ``LOG_LOGGER`` with the monkeypatch pattern
    of py.test (test accepts a ``monkeypatch`` argument)
    """
    # Capture every record regardless of configured level - the test suite
    # raises the log level for speed (see settings/test.py), which would
    # otherwise filter messages out before they reach _log.
    monkeypatch.setattr(logging.Logger, "isEnabledFor", lambda self, level: True)
    monkeypatch.setattr(logging.Logger, "__log", logging.Logger._log, raising=False)
    monkeypatch.setattr(logging.Logger, "_log", log_logger)


@pytest.fixture
def plugins():
    _, config_file = tempfile.mkstemp(suffix="json")
    old_config_file = kolibri.plugins.conf_file
    kolibri.plugins.conf_file = config_file
    kolibri.plugins.config.set_defaults()
    yield kolibri.plugins
    kolibri.plugins.conf_file = old_config_file


@patch("kolibri.plugins.registry.is_initialized", return_value=False)
def test_bogus_plugin_autoremove(plugins):
    """
    Checks that a plugin is auto-removed when it cannot be imported
    """
    plugin_name = "giraffe.horse"
    plugins.config["INSTALLED_PLUGINS"].add(plugin_name)
    plugins.config.save()
    autoremove_unavailable_plugins()
    assert plugin_name not in plugins.config["INSTALLED_PLUGINS"]


@patch("kolibri.plugins.registry.is_initialized", return_value=False)
def test_bogus_plugin_autoremove_no_path(plugins):
    """
    Checks that a plugin without a dotted path is also auto-removed
    """
    plugin_name = "giraffehorse"
    plugins.config["INSTALLED_PLUGINS"].add(plugin_name)
    plugins.config.save()
    autoremove_unavailable_plugins()
    assert plugin_name not in plugins.config["INSTALLED_PLUGINS"]


def test_bogus_plugin_disable(plugins):
    installed_apps_before = plugins.config["INSTALLED_PLUGINS"].copy()
    disabled_apps_before = plugins.config["DISABLED_PLUGINS"].copy()
    try:
        cli.disable.callback(("i_do_not_exist",), False)
    except Exception:
        pass
    assert installed_apps_before == plugins.config["INSTALLED_PLUGINS"]
    assert disabled_apps_before == plugins.config["DISABLED_PLUGINS"]


def test_plugin_cannot_be_imported_disable(plugins):
    """
    A plugin may be in plugins.config['INSTALLED_PLUGINS'] but broken or uninstalled
    """
    plugin_name = "giraffe.horse"
    plugins.config["INSTALLED_PLUGINS"].add(plugin_name)
    plugins.config.save()
    try:
        cli.disable.callback((plugin_name,), False)
    except Exception:
        pass
    assert plugin_name not in plugins.config["INSTALLED_PLUGINS"]
    # We also don't want to endlessly add cruft to the disabled apps
    assert plugin_name not in plugins.config["DISABLED_PLUGINS"]


def test_real_plugin_disable(plugins):
    installed_apps_before = plugins.config["INSTALLED_PLUGINS"].copy()
    test_plugin = "kolibri.plugins.media_player"
    assert test_plugin in installed_apps_before
    # Because RIP example plugin
    cli.disable.callback((test_plugin,), False)
    assert test_plugin not in plugins.config["INSTALLED_PLUGINS"]
    assert test_plugin in plugins.config["DISABLED_PLUGINS"]


def test_real_plugin_disable_twice(plugins):
    installed_apps_before = plugins.config["INSTALLED_PLUGINS"].copy()
    test_plugin = "kolibri.plugins.media_player"
    assert test_plugin in installed_apps_before
    cli.disable.callback((test_plugin,), False)
    assert test_plugin not in plugins.config.ACTIVE_PLUGINS
    assert test_plugin not in plugins.config["INSTALLED_PLUGINS"]
    assert test_plugin in plugins.config["DISABLED_PLUGINS"]
    installed_apps_before = plugins.config["INSTALLED_PLUGINS"].copy()
    cli.disable.callback((test_plugin,), False)
    assert test_plugin not in plugins.config.ACTIVE_PLUGINS
    assert test_plugin not in plugins.config["INSTALLED_PLUGINS"]
    assert test_plugin in plugins.config["DISABLED_PLUGINS"]


def test_plugin_with_no_plugin_class(plugins):
    """
    Expected behavior is that nothing blows up with exceptions, user just gets
    a warning and nothing is enabled or changed in the configuration.
    """
    # For fun, we pass in a system library
    installed_apps_before = plugins.config["INSTALLED_PLUGINS"].copy()
    try:
        cli.enable.callback(("os.path",), False)
    except Exception:
        pass
    assert installed_apps_before == plugins.config["INSTALLED_PLUGINS"]


@pytest.mark.django_db(transaction=True)
def test_kolibri_listen_port_env(monkeypatch):
    """
    Starts and stops the server, mocking the actual server.start()
    Checks that the correct fallback port is used from the environment.
    """

    with patch("django.core.management.call_command"), patch(
        "kolibri.utils.server.start"
    ) as start:

        def start_mock(port, *args, **kwargs):
            assert port == test_port
            try:
                os.remove(server.PID_FILE)
            except OSError:
                pass

        activate_log_logger(monkeypatch)
        start.side_effect = start_mock

        test_port = 1234

        test_zip_port = 1432

        os.environ["KOLIBRI_HTTP_PORT"] = str(test_port)

        # force a reload of plugins.OPTIONS so the environment variable will be read in
        conf.OPTIONS.update(options.read_options_file())

        cli.start.callback(test_port, test_zip_port, False)
        with pytest.raises(SystemExit) as excinfo:
            cli.stop.callback()
            assert excinfo.code == 0

        # Stop the server AGAIN, asserting that we can call the stop command
        # on an already stopped server and will be gracefully informed about
        # it.
        with pytest.raises(SystemExit) as excinfo:
            cli.stop.callback()
            assert excinfo.code == 0
        assert "Already stopped" in LOG_LOGGER[-1][1]

        def status_starting_up():
            raise server.NotRunning(server.STATUS_STARTING_UP)

        # Ensure that if a server is reported to be 'starting up', it still
        # successfully shuts down.
        monkeypatch.setattr(server, "get_status", status_starting_up)
        with pytest.raises(SystemExit) as excinfo:
            cli.stop.callback()
            assert excinfo.code == server.STATUS_STARTING_UP
        assert "successfully been stopped" in LOG_LOGGER[-1][1]


def test_cli_usage():
    # Test the -h
    with pytest.raises(SystemExit) as excinfo:
        cli.main("-h")
        assert excinfo.code == 0
    with pytest.raises(SystemExit) as excinfo:
        cli.main("--version")
        assert excinfo.code == 0


@patch("kolibri.utils.cli.click.echo")
def test_list_plugins(echo_mock, plugins):
    cli.list.callback()
    test_plugin = "kolibri.plugins.media_player"
    any(test_plugin in x[0] and "ENABLED" in x[0] for x in echo_mock.call_args_list)


@patch("kolibri.utils.cli.click.echo")
def test_list_plugins_disabled(echo_mock, plugins):
    cli.list.callback()
    test_plugin = "kolibri.plugins.media_player"
    cli.disable.callback((test_plugin,), False)
    any(test_plugin in x[0] and "DISABLED" in x[0] for x in echo_mock.call_args_list)


# ---------------------------------------------------------------------------
# kolibri plugin create — scaffolder subcommand
# ---------------------------------------------------------------------------


def test_plugin_create_full_cli_run(tmp_path):
    # A full CLI invocation with every option supplied runs non-interactively
    # (no prompt fires) and scaffolds a real, importable plugin.
    with pytest.raises(SystemExit) as excinfo:
        cli.main(
            [
                "plugin",
                "create",
                "--name",
                "My Thing",
                "--target-dir",
                str(tmp_path),
                "--surface",
                "backend-only",
                "--description",
                "d",
                "--author",
                "a",
                "--email",
                "e@x",
                "--mode",
                "package",
            ],
            prog_name="kolibri",
        )
    assert excinfo.value.code == 0
    assert (tmp_path / "kolibri-my-thing-plugin" / "kolibri_my_thing_plugin").is_dir()


@patch("kolibri.utils.cli.scaffold_plugin")
def test_plugin_create_no_input_missing_name_errors(scaffold_mock):
    # Under --no-input the prompts are disabled, so a missing required option is
    # a clear click error rather than a hung prompt — and scaffolding never runs.
    with pytest.raises(SystemExit) as excinfo:
        cli.main(["plugin", "create", "--no-input"], prog_name="kolibri")
    assert excinfo.value.code != 0
    assert not scaffold_mock.called


@patch("kolibri.utils.cli.scaffold_plugin")
def test_plugin_create_no_input_missing_target_errors(scaffold_mock):
    with pytest.raises(SystemExit) as excinfo:
        cli.main(
            ["plugin", "create", "--no-input", "--name", "My Thing"],
            prog_name="kolibri",
        )
    assert excinfo.value.code != 0
    assert not scaffold_mock.called


@patch("kolibri.utils.cli.scaffold_plugin")
def test_plugin_create_invalid_mode_errors(scaffold_mock, tmp_path):
    # --mode is a click.Choice, so an unknown value is rejected during parsing
    # and scaffolding never runs.
    with pytest.raises(SystemExit) as excinfo:
        cli.main(
            [
                "plugin",
                "create",
                "--name",
                "X",
                "--target-dir",
                str(tmp_path),
                "--surface",
                "backend-only",
                "--description",
                "d",
                "--author",
                "a",
                "--email",
                "e",
                "--mode",
                "bogus",
            ],
            prog_name="kolibri",
        )
    assert excinfo.value.code != 0
    assert not scaffold_mock.called


@pytest.fixture
def options_ini(monkeypatch):
    monkeypatch.delenv("KOLIBRI_HTTP_PORT", raising=False)
    monkeypatch.delenv("KOLIBRI_LISTEN_PORT", raising=False)
    binds = fake_port_binds(monkeypatch)
    path = os.path.join(conf.KOLIBRI_HOME, "options.ini")
    original = None
    if os.path.exists(path):
        with open(path) as f:
            original = f.read()
    with open(path, "w") as f:
        f.write("\n")
    yield SimpleNamespace(path=path, binds=binds)
    if original is None:
        os.remove(path)
    else:
        with open(path, "w") as f:
            f.write(original)


def _run_setup(*args):
    with pytest.raises(SystemExit) as excinfo:
        cli.main(["configure", "setup", "--skip-update", *args], prog_name="kolibri")
    return excinfo.value.code


@pytest.fixture
def data_version():
    path = version_file()
    original = None
    if os.path.exists(path):
        with open(path) as f:
            original = f.read()
        os.remove(path)

    def write(version):
        with open(path, "w") as f:
            f.write(version)

    yield write
    if original is None:
        if os.path.exists(path):
            os.remove(path)
    else:
        write(original)


def test_configure_setup_fresh_pins_port_80(options_ini, data_version, monkeypatch):
    initialize = cli.initialize

    def initialize_and_record_version(**kwargs):
        initialize(**kwargs)
        data_version(kolibri.__version__)

    monkeypatch.setattr(cli, "initialize", initialize_and_record_version)
    assert _run_setup() == 0
    assert pinned_http_port(options_ini.path) == "80"


def test_configure_setup_upgrade_does_not_elect(options_ini, data_version):
    data_version(kolibri.__version__)
    assert _run_setup() == 0
    assert options_ini.binds.bound == []
    assert pinned_http_port(options_ini.path) is None


def test_configure_setup_upgrade_preferred_port_pins_it(options_ini, data_version):
    data_version(kolibri.__version__)
    assert _run_setup("--preferred-port", "8000") == 0
    assert pinned_http_port(options_ini.path) == "8000"


def test_configure_setup_preferred_port_overwrites_pinned_port(
    options_ini, data_version
):
    data_version(kolibri.__version__)
    with open(options_ini.path, "w") as f:
        f.write("[Deployment]\nHTTP_PORT = 8080\n")
    assert _run_setup("--preferred-port", "80") == 0
    assert pinned_http_port(options_ini.path) == "80"


def test_configure_setup_preferred_port_keeps_port_kolibri_serves_on(
    options_ini, data_version
):
    data_version(kolibri.__version__)
    with open(options_ini.path, "w") as f:
        f.write("[Deployment]\nHTTP_PORT = 8080\n")
    options_ini.binds.errors[80] = errno.EADDRINUSE
    with running_pid_file(80):
        assert _run_setup("--preferred-port", "80") == 0
    assert pinned_http_port(options_ini.path) == "80"


def test_configure_setup_fresh_keeps_pinned_port(options_ini, data_version):
    with open(options_ini.path, "w") as f:
        f.write("[Deployment]\nHTTP_PORT = 9000\n")
    assert _run_setup() == 0
    assert options_ini.binds.bound == []
    assert pinned_http_port(options_ini.path) == "9000"
