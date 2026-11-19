"""
Tests for `kolibri.utils.cli` module.
"""

import logging
import os
import sqlite3
import subprocess
import sys
import tempfile
from contextlib import closing
from unittest.mock import patch

import pytest

import kolibri.plugins
from kolibri.plugins.utils import autoremove_unavailable_plugins
from kolibri.utils import cli
from kolibri.utils import conf
from kolibri.utils import options
from kolibri.utils import server

logger = logging.getLogger(__name__)


LOG_LOGGER = []

SEED_LOCAL_HOSTNAME = """\
import sys
from django.core.management import call_command
from django.db import router
from kolibri.utils.main import initialize
initialize(skip_update=True)
from kolibri.core.discovery.models import LocalHostname
call_command("migrate", "discovery", database=router.db_for_write(LocalHostname))
LocalHostname.objects.create(hostname=sys.argv[1])
"""

STATUS_OF_RUNNING_SERVER = """\
import os
from unittest.mock import Mock
from unittest.mock import patch
from kolibri.utils import cli
from kolibri.utils import server
with open(server.PID_FILE, "w") as f:
    f.write(f"{os.getpid()}\\n8765\\n\\n{server.STATUS_RUNNING}\\n")
with patch("requests.get", return_value=Mock(status_code=200)):
    cli.main(["status"], prog_name="kolibri")
"""

STATUS_AS_ANOTHER_DEBIAN_USER = """\
from unittest.mock import mock_open
from unittest.mock import patch
from kolibri.utils import cli
with patch(
    "kolibri.utils.debian_check.open", mock_open(read_data="kolibri\\n"), create=True
), patch("getpass.getuser", return_value="admin"), patch(
    "kolibri.utils.debian_check.input", return_value="n"
):
    cli.main(["status"], prog_name="kolibri")
"""


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


def _run_in_home(home, *args, **extra_env):
    env = {
        key: value
        for key, value in os.environ.items()
        if not key.startswith("KOLIBRI_DATABASE_")
    }
    return subprocess.run(
        [sys.executable, *args],
        env={
            **env,
            "KOLIBRI_HOME": str(home),
            "KOLIBRI_LISTEN_ADDRESS": "127.0.0.1",
            **extra_env,
        },
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
        timeout=300,
    )


def _listed_urls(output):
    return [line.strip() for line in output.splitlines() if line.startswith("\t")]


def test_status_of_running_server_lists_ip_and_local_hostname_urls(tmp_path):
    seed = _run_in_home(tmp_path, "-c", SEED_LOCAL_HOSTNAME, "tonyslaptop.local")
    assert seed.returncode == 0, seed.stdout
    (tmp_path / ".data_version").write_text(kolibri.__version__)

    result = _run_in_home(tmp_path, "-c", STATUS_OF_RUNNING_SERVER)

    assert result.returncode == server.STATUS_RUNNING, result.stdout
    assert "OK, running (0)" in result.stdout
    assert _listed_urls(result.stdout) == [
        "http://127.0.0.1:8765/",
        "http://tonyslaptop.local:8765/",
    ]


def test_status_of_running_server_from_an_older_version(tmp_path):
    (tmp_path / ".data_version").write_text("0.19.5")

    result = _run_in_home(tmp_path, "-c", STATUS_OF_RUNNING_SERVER)

    assert result.returncode == server.STATUS_RUNNING, result.stdout
    assert "OK, running (0)" in result.stdout
    assert _listed_urls(result.stdout) == ["http://127.0.0.1:8765/"]


def test_status_of_stopped_server_after_version_change_updates_nothing(tmp_path):
    version_file = tmp_path / ".data_version"
    version_file.write_text("0.19.5")

    result = _run_in_home(tmp_path, "-m", "kolibri", "status")

    assert result.returncode == server.STATUS_STOPPED, result.stdout
    assert "Stopped (1)" in result.stdout
    assert version_file.read_text() == "0.19.5"
    with closing(sqlite3.connect(str(tmp_path / "db.sqlite3"))) as db:
        tables = db.execute(
            "SELECT name FROM sqlite_master WHERE name = 'django_migrations'"
        ).fetchall()
    assert tables == []


def test_status_on_fresh_home_creates_no_databases(tmp_path):
    result = _run_in_home(tmp_path, "-m", "kolibri", "status")

    assert result.returncode == server.STATUS_STOPPED, result.stdout
    assert "Stopped (1)" in result.stdout
    assert list(tmp_path.rglob("*.sqlite3")) == []


def test_status_on_fresh_home_warns_another_debian_user(tmp_path):
    result = _run_in_home(
        tmp_path,
        "-c",
        STATUS_AS_ANOTHER_DEBIAN_USER,
        KOLIBRI_INSTALLATION_TYPE="apt",
    )

    assert result.returncode == 0, result.stdout
    assert (
        "You are running this command as the user 'admin', but Kolibri was "
        "originally installed to run as the user 'kolibri'" in result.stdout
    )
    assert "Stopped (1)" not in result.stdout
    assert not tmp_path.exists()


def test_status_rejects_skip_update():
    with pytest.raises(SystemExit) as excinfo:
        cli.main(["status", "--skip-update"], prog_name="kolibri")
    assert excinfo.value.code == 2


def test_status_invalid_settings_error_names_the_option(capsys):
    with pytest.raises(SystemExit) as excinfo:
        cli.main(["status", "--settings", "bogus.module"], prog_name="kolibri")
    assert excinfo.value.code == 2
    assert (
        "settings must be a valid python module import path" in capsys.readouterr().err
    )
