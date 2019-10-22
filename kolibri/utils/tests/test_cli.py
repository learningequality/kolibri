"""
Tests for `kolibri.utils.cli` module.
"""
from __future__ import absolute_import
from __future__ import print_function

import logging
import os
import tempfile

import pytest
from mock import patch

import kolibri
from kolibri.plugins.utils import autoremove_unavailable_plugins
from kolibri.utils import cli
from kolibri.utils import options

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
    monkeypatch.setattr(logging.Logger, "__log", logging.Logger._log, raising=False)
    monkeypatch.setattr(logging.Logger, "_log", log_logger)


@pytest.fixture
def plugins():
    from kolibri import plugins

    _, config_file = tempfile.mkstemp(suffix="json")
    old_config_file = plugins.conf_file
    plugins.conf_file = config_file
    plugins.config.set_defaults()
    yield plugins
    plugins.conf_file = old_config_file


def test_bogus_plugin_autoremove(plugins):
    """
    Checks that a plugin is auto-removed when it cannot be imported
    """
    plugin_name = "giraffe.horse"
    plugins.config["INSTALLED_PLUGINS"].add(plugin_name)
    plugins.config.save()
    autoremove_unavailable_plugins()
    assert plugin_name not in plugins.config["INSTALLED_PLUGINS"]


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


@pytest.mark.django_db
def test_kolibri_listen_port_env(monkeypatch):
    """
    Starts and stops the server, mocking the actual server.start()
    Checks that the correct fallback port is used from the environment.
    """

    with patch("django.core.management.call_command"), patch(
        "kolibri.utils.server.start"
    ) as start:
        from kolibri.utils import server

        def start_mock(port, *args, **kwargs):
            assert port == test_port
            try:
                os.remove(server.STARTUP_LOCK)
            except OSError:
                pass

        activate_log_logger(monkeypatch)
        start.side_effect = start_mock

        test_port = 1234

        os.environ["KOLIBRI_HTTP_PORT"] = str(test_port)

        # force a reload of plugins.OPTIONS so the environment variable will be read in
        from kolibri.utils import conf

        conf.OPTIONS.update(options.read_options_file(conf.KOLIBRI_HOME))

        cli.start.callback(test_port, False)
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

        # Ensure that if a server is reported to be 'starting up', it doesn't
        # get killed while doing that.
        monkeypatch.setattr(server, "get_status", status_starting_up)
        with pytest.raises(SystemExit) as excinfo:
            cli.stop.callback()
            assert excinfo.code == server.STATUS_STARTING_UP
        assert "Not stopped" in LOG_LOGGER[-1][1]


@pytest.mark.django_db
@patch("kolibri.utils.cli.get_version", return_value="")
@patch("kolibri.utils.cli.update")
@patch("kolibri.utils.cli.plugin.callback")
@patch("kolibri.core.deviceadmin.utils.dbbackup")
def test_first_run(dbbackup, plugin, update, get_version):
    """
    Tests that the first_run() function performs as expected
    """

    cli.initialize()
    update.assert_called_once()
    dbbackup.assert_not_called()

    # Check that it got called for each default plugin
    from kolibri import plugins

    assert set(plugins.config["INSTALLED_PLUGINS"]) == set(plugins.DEFAULT_PLUGINS)


@pytest.mark.django_db
@patch("kolibri.utils.cli.get_version", return_value="0.0.1")
@patch("kolibri.utils.cli.update")
def test_update(update, get_version):
    """
    Tests that update() function performs as expected
    """
    cli.initialize()
    update.assert_called_once()


@pytest.mark.django_db
@patch("kolibri.utils.cli.get_version", return_value="0.0.1")
def test_update_exits_if_running(get_version):
    """
    Tests that update() function performs as expected
    """
    with patch("kolibri.utils.cli.server.get_status"):
        try:
            cli.initialize()
            pytest.fail("Update did not exit when Kolibri was already running")
        except SystemExit:
            pass


@pytest.mark.django_db
def test_version_updated():
    """
    Tests our db backup logic: version_updated gets any change, backup gets only non-dev changes
    """
    assert cli.version_updated("0.10.0", "0.10.1")
    assert not cli.version_updated("0.10.0", "0.10.0")
    assert not cli.should_back_up("0.10.0-dev0", "")
    assert not cli.should_back_up("0.10.0-dev0", "0.10.0")
    assert not cli.should_back_up("0.10.0", "0.10.0-dev0")
    assert not cli.should_back_up("0.10.0-dev0", "0.10.0-dev0")


@pytest.mark.django_db
@patch("kolibri.utils.cli.get_version", return_value=kolibri.__version__)
@patch("kolibri.utils.cli.update")
@patch("kolibri.core.deviceadmin.utils.dbbackup")
def test_update_no_version_change(dbbackup, update, get_version):
    """
    Tests that when the version doesn't change, we are not doing things we
    shouldn't
    """
    cli.initialize()
    update.assert_not_called()
    dbbackup.assert_not_called()


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
    any(
        map(
            lambda x: test_plugin in x[0] and "ENABLED" in x[0],
            echo_mock.call_args_list,
        )
    )


@patch("kolibri.utils.cli.click.echo")
def test_list_plugins_disabled(echo_mock, plugins):
    cli.list.callback()
    test_plugin = "kolibri.plugins.media_player"
    cli.disable.callback((test_plugin,), False)
    any(
        map(
            lambda x: test_plugin in x[0] and "DISABLED" in x[0],
            echo_mock.call_args_list,
        )
    )
