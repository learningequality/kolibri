"""
Tests for `kolibri` module.
"""
from __future__ import absolute_import, print_function, unicode_literals

import copy
import logging
import os

import pytest
from kolibri.utils import cli

logger = logging.getLogger(__name__)


LOG_LOGGER = []


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

    from kolibri.utils import server

    def start_mock(port, *args, **kwargs):
        assert port == test_port

    monkeypatch.setattr(logging.Logger, '__log', logging.Logger._log, raising=False)
    monkeypatch.setattr(logging.Logger, '_log', log_logger)
    monkeypatch.setattr(server, 'start', start_mock)

    test_port = 1234
    # ENV VARS are always a string
    os.environ['KOLIBRI_LISTEN_PORT'] = str(test_port)

    server.start = start_mock
    cli.start(daemon=False)
    with pytest.raises(SystemExit, code=0):
        cli.stop()

    # Stop the server AGAIN, asserting that we can call the stop command
    # on an already stopped server and will be gracefully informed about
    # it.
    with pytest.raises(SystemExit, code=0):
        cli.stop()
    assert "Already stopped" in LOG_LOGGER[-1][1]

    def status_starting_up():
        raise server.NotRunning(server.STATUS_STARTING_UP)

    # Ensure that if a server is reported to be 'starting up', it doesn't
    # get killed while doing that.
    monkeypatch.setattr(server, 'get_status', status_starting_up)
    with pytest.raises(SystemExit, code=server.STATUS_STARTING_UP):
        cli.stop()
    assert "Not stopped" in LOG_LOGGER[-1][1]


def test_cli_usage():
    # Test the -h
    with pytest.raises(SystemExit, code=0):
        cli.main("-h")
    with pytest.raises(SystemExit, code=0):
        cli.main("--version")


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
