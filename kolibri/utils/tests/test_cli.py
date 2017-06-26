"""
Tests for `kolibri` module.
"""
from __future__ import absolute_import, print_function, unicode_literals

import copy
import logging
import pytest
import os

from kolibri.utils import cli

from .base import KolibriTestBase

logger = logging.getLogger(__name__)


@pytest.fixture
def conf():
    from kolibri.utils import conf
    old_config = copy.deepcopy(conf.config)
    yield conf
    conf.update(old_config)
    conf.save()


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


class TestKolibriCLI(KolibriTestBase):

    def test_cli(self):
        logger.debug("This is a unit test in the main Kolibri app space")
        # Test the -h
        with self.assertRaises(SystemExit):
            cli.main("-h")
        with self.assertRaises(SystemExit):
            cli.main("--version")

    def test_parsing(self):
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

    def test_kolibri_listen_port_env(self):
        """
        Starts and stops the server, mocking the actual server.start()
        Checks that the correct fallback port is used from the environment.
        """
        test_port = 1234
        # ENV VARS are always a string
        os.environ['KOLIBRI_LISTEN_PORT'] = str(test_port)

        def start_mock(port, *args, **kwargs):
            assert port == test_port

        from kolibri.utils import server

        orig_start = server.start

        try:
            server.start = start_mock
            cli.start(daemon=False)
            cli.stop(sys_exit=False)
        finally:
            server.start = orig_start
