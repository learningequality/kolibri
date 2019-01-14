"""
Tests for `kolibri.utils.cli` module.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import copy
import logging
import os
from functools import wraps

import pytest
from mock import patch

import kolibri
from kolibri.utils import cli
from kolibri.utils import options

logger = logging.getLogger(__name__)


LOG_LOGGER = []


def version_file_restore(func):
    """
    Decorator that reads contents of the version file and restores it after
    calling ``func(orig_version='x.y', version_file='/path')``.

    If a version file doesn't exist, it calls ``func(... version_file=None)``

    This decorator is used for testing functions that trigger during upgrades
    without mocking more than necessary.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        version_file = cli.version_file()
        version_file_existed = os.path.isfile(version_file)
        orig_version = kolibri.__version__
        kwargs['orig_version'] = orig_version

        if version_file_existed:
            kwargs['version_file'] = version_file

        func(*args, **kwargs)

        if version_file_existed:
            open(version_file, "w").write(orig_version)

    return wrapper


def log_logger(logger_instance, LEVEL, msg, args, **kwargs):
    """
    Monkeypatching for logging.Logger._log to scoop up log messages if we wanna
    test something specific was logged.
    """
    LOG_LOGGER.append(
        (LEVEL, msg)
    )
    # Call the original function
    logger_instance.__log(LEVEL, msg, args, **kwargs)


def activate_log_logger(monkeypatch):
    """
    Activates logging everything to ``LOG_LOGGER`` with the monkeypatch pattern
    of py.test (test accepts a ``monkeypatch`` argument)
    """
    monkeypatch.setattr(logging.Logger, '__log', logging.Logger._log, raising=False)
    monkeypatch.setattr(logging.Logger, '_log', log_logger)


@pytest.fixture
def conf():
    from kolibri.utils import conf
    old_config = copy.deepcopy(conf.config)
    yield conf
    conf.update(old_config)
    conf.save()


def test_bogus_plugin_autoremove(conf):
    """
    Checks that a plugin is auto-removed when it cannot be imported
    """
    plugin_name = "giraffe.horse"
    conf.config["INSTALLED_APPS"].append(plugin_name)
    conf.save()
    conf.autoremove_unavailable_plugins()
    assert plugin_name not in conf.config["INSTALLED_APPS"]


def test_bogus_plugin_autoremove_no_path(conf):
    """
    Checks that a plugin without a dotted path is also auto-removed
    """
    plugin_name = "giraffehorse"
    conf.config["INSTALLED_APPS"].append(plugin_name)
    conf.save()
    conf.autoremove_unavailable_plugins()
    assert plugin_name not in conf.config["INSTALLED_APPS"]


def test_bogus_plugin_disable(conf):
    installed_apps_before = conf.config["INSTALLED_APPS"][:]
    cli.plugin("i_do_not_exist", disable=True)
    assert installed_apps_before == conf.config["INSTALLED_APPS"]


def test_plugin_cannot_be_imported_disable(conf):
    """
    A plugin may be in conf.config['INSTALLED_APPS'] but broken or uninstalled
    """
    plugin_name = "giraffe.horse"
    conf.config["INSTALLED_APPS"].append(plugin_name)
    conf.save()
    cli.plugin(plugin_name, disable=True)
    assert plugin_name not in conf.config["INSTALLED_APPS"]


def test_real_plugin_disable(conf):
    installed_apps_before = conf.config["INSTALLED_APPS"][:]
    test_plugin = "kolibri.plugins.media_player"
    assert test_plugin in installed_apps_before
    # Because RIP example plugin
    cli.plugin(test_plugin, disable=True)
    assert test_plugin not in conf.config["INSTALLED_APPS"]


def test_real_plugin_disable_twice(conf):
    installed_apps_before = conf.config["INSTALLED_APPS"][:]
    test_plugin = "kolibri.plugins.media_player"
    assert test_plugin in installed_apps_before
    # Because RIP example plugin
    cli.plugin(test_plugin, disable=True)
    assert test_plugin not in conf.config["INSTALLED_APPS"]
    installed_apps_before = conf.config["INSTALLED_APPS"][:]
    cli.plugin(test_plugin, disable=True)
    assert test_plugin not in conf.config["INSTALLED_APPS"]


def test_plugin_with_no_plugin_class(conf):
    """
    Expected behavior is that nothing blows up with exceptions, user just gets
    a warning and nothing is enabled or changed in the configuration.
    """
    # For fun, we pass in a system library
    installed_apps_before = conf.config["INSTALLED_APPS"][:]
    cli.plugin("os.path")
    assert installed_apps_before == conf.config["INSTALLED_APPS"]


@pytest.mark.django_db
def test_kolibri_listen_port_env(monkeypatch):
    """
    Starts and stops the server, mocking the actual server.start()
    Checks that the correct fallback port is used from the environment.
    """

    with patch('kolibri.core.content.utils.annotation.update_channel_metadata'):
        from kolibri.utils import server

        def start_mock(port, *args, **kwargs):
            assert port == test_port

        activate_log_logger(monkeypatch)
        monkeypatch.setattr(server, 'start', start_mock)

        test_port = 1234

        os.environ['KOLIBRI_HTTP_PORT'] = str(test_port)

        # force a reload of conf.OPTIONS so the environment variable will be read in
        from kolibri.utils import conf
        conf.OPTIONS.update(options.read_options_file(conf.KOLIBRI_HOME))

        server.start = start_mock
        cli.start(daemon=False)
        with pytest.raises(SystemExit) as excinfo:
            cli.stop()
            assert excinfo.code == 0

        # Stop the server AGAIN, asserting that we can call the stop command
        # on an already stopped server and will be gracefully informed about
        # it.
        with pytest.raises(SystemExit) as excinfo:
            cli.stop()
            assert excinfo.code == 0
        assert "Already stopped" in LOG_LOGGER[-1][1]

        def status_starting_up():
            raise server.NotRunning(server.STATUS_STARTING_UP)

        # Ensure that if a server is reported to be 'starting up', it doesn't
        # get killed while doing that.
        monkeypatch.setattr(server, 'get_status', status_starting_up)
        with pytest.raises(SystemExit) as excinfo:
            cli.stop()
            assert excinfo.code == server.STATUS_STARTING_UP
        assert "Not stopped" in LOG_LOGGER[-1][1]


@pytest.mark.django_db
@version_file_restore
@patch('kolibri.utils.cli.update')
@patch('kolibri.utils.cli.plugin')
@patch('kolibri.core.deviceadmin.utils.dbbackup')
def test_first_run(
        dbbackup, plugin, update, version_file=None, orig_version=None):
    """
    Tests that the first_run() function performs as expected
    """

    if version_file:
        os.unlink(version_file)

    cli.initialize()
    update.assert_called_once()
    dbbackup.assert_not_called()

    # Check that it got called for each default plugin
    from kolibri.core.settings import DEFAULT_PLUGINS
    assert plugin.call_count == len(DEFAULT_PLUGINS)


@pytest.mark.django_db
@version_file_restore
@patch('kolibri.utils.cli.update')
def test_update(update, version_file=None, orig_version=None):
    """
    Tests that update() function performs as expected
    """
    version_file = cli.version_file()
    open(version_file, "w").write(orig_version + "_test")
    cli.initialize()
    update.assert_called_once()


@pytest.mark.django_db
def test_should_back_up():
    """
    Tests our db backup logic: skip for dev versions, and backup on change
    """
    assert cli.should_back_up('0.10.0', '0.10.1')
    assert not cli.should_back_up('0.10.0', '0.10.0')
    assert not cli.should_back_up('0.10.0-dev0', '0.10.0')
    assert not cli.should_back_up('0.10.0', '0.10.0-dev0')
    assert not cli.should_back_up('0.10.0-dev0', '0.10.0-dev0')


@pytest.mark.django_db
@patch('kolibri.utils.cli.update')
@patch('kolibri.core.deviceadmin.utils.dbbackup')
def test_update_no_version_change(dbbackup, update, orig_version=None):
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


def test_cli_parsing():
    test_patterns = (
        (['start'], {'start': True}, []),
        (['stop'], {'stop': True}, []),
        (['shell'], {'shell': True}, []),
        (['manage', 'shell'], {'manage': True, 'COMMAND': 'shell'}, []),
        (['manage', 'help'], {'manage': True, 'COMMAND': 'help'}, []),
        (['manage', 'blah'], {'manage': True, 'COMMAND': 'blah'}, []),
        (
            ['manage', 'blah', '--debug', '--', '--django-arg'],
            {'manage': True, 'COMMAND': 'blah', '--debug': True},
            ['--django-arg']
        ),
        (
            ['manage', 'blah', '--django-arg'],
            {'manage': True, 'COMMAND': 'blah'},
            ['--django-arg']
        ),
    )

    for p, docopt_expected, django_expected in test_patterns:
        docopt, django = cli.parse_args(p)

        for k, v in docopt_expected.items():
            assert docopt[k] == v

        assert django == django_expected
