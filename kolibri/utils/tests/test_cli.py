"""
Tests for `kolibri.utils.cli` module.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import os
import tempfile

import pytest
from mock import patch

import kolibri
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
def conf():
    from kolibri.utils import conf

    _, config_file = tempfile.mkstemp(suffix="json")
    old_config_file = conf.conf_file
    conf.conf_file = config_file
    conf.config.set_defaults()
    yield conf
    conf.conf_file = old_config_file
    conf.set_defaults()
    conf.save()


def test_bogus_plugin_autoremove(conf):
    """
    Checks that a plugin is auto-removed when it cannot be imported
    """
    plugin_name = "giraffe.horse"
    conf.config["INSTALLED_APPS"].add(plugin_name)
    conf.config.save()
    conf.config.autoremove_unavailable_plugins()
    assert plugin_name not in conf.config["INSTALLED_APPS"]


def test_bogus_plugin_autoremove_no_path(conf):
    """
    Checks that a plugin without a dotted path is also auto-removed
    """
    plugin_name = "giraffehorse"
    conf.config["INSTALLED_APPS"].add(plugin_name)
    conf.config.save()
    conf.config.autoremove_unavailable_plugins()
    assert plugin_name not in conf.config["INSTALLED_APPS"]


def test_bogus_plugin_disable(conf):
    installed_apps_before = conf.config["INSTALLED_APPS"].copy()
    disabled_apps_before = conf.config["DISABLED_APPS"].copy()
    cli.plugin.callback("i_do_not_exist", cli.DISABLE)
    assert installed_apps_before == conf.config["INSTALLED_APPS"]
    assert disabled_apps_before == conf.config["DISABLED_APPS"]


def test_plugin_cannot_be_imported_disable(conf):
    """
    A plugin may be in conf.config['INSTALLED_APPS'] but broken or uninstalled
    """
    plugin_name = "giraffe.horse"
    conf.config["INSTALLED_APPS"].add(plugin_name)
    conf.config.save()
    cli.plugin.callback(plugin_name, cli.DISABLE)
    assert plugin_name not in conf.config["INSTALLED_APPS"]
    # We also don't want to endlessly add cruft to the disabled apps
    assert plugin_name not in conf.config["DISABLED_APPS"]


def test_real_plugin_disable(conf):
    installed_apps_before = conf.config["INSTALLED_APPS"].copy()
    test_plugin = "kolibri.plugins.media_player"
    assert test_plugin in installed_apps_before
    # Because RIP example plugin
    cli.plugin.callback(test_plugin, cli.DISABLE)
    assert test_plugin not in conf.config["INSTALLED_APPS"]
    assert test_plugin in conf.config["DISABLED_APPS"]


def test_real_plugin_disable_twice(conf):
    installed_apps_before = conf.config["INSTALLED_APPS"].copy()
    test_plugin = "kolibri.plugins.media_player"
    assert test_plugin in installed_apps_before
    cli.plugin.callback(test_plugin, cli.DISABLE)
    assert test_plugin not in conf.config.ACTIVE_PLUGINS
    assert test_plugin not in conf.config["INSTALLED_APPS"]
    assert test_plugin in conf.config["DISABLED_APPS"]
    installed_apps_before = conf.config["INSTALLED_APPS"].copy()
    cli.plugin.callback(test_plugin, cli.DISABLE)
    assert test_plugin not in conf.config.ACTIVE_PLUGINS
    assert test_plugin not in conf.config["INSTALLED_APPS"]
    assert test_plugin in conf.config["DISABLED_APPS"]


def test_plugin_with_no_plugin_class(conf):
    """
    Expected behavior is that nothing blows up with exceptions, user just gets
    a warning and nothing is enabled or changed in the configuration.
    """
    # For fun, we pass in a system library
    installed_apps_before = conf.config["INSTALLED_APPS"].copy()
    cli.plugin.callback("os.path", cli.ENABLE)
    assert installed_apps_before == conf.config["INSTALLED_APPS"]


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

        # force a reload of conf.OPTIONS so the environment variable will be read in
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
    from kolibri.utils import conf

    assert set(conf.config["INSTALLED_APPS"]) == set(conf.DEFAULT_PLUGINS)


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


THIS_VERSION = "TEST"


@pytest.mark.django_db
@patch("kolibri.utils.cli.kolibri.__version__", THIS_VERSION)
@patch("kolibri.utils.cli.get_version", return_value=THIS_VERSION)
@patch("kolibri.utils.cli.update")
@patch("kolibri.core.deviceadmin.utils.dbbackup")
def test_update_no_version_change(dbbackup, update, old_version, new_version):
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
