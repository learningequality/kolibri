"""
Tests for `kolibri` module.
"""
from __future__ import absolute_import, print_function, unicode_literals

import logging

from kolibri.utils import cli

from .base import KolibriTestBase

logger = logging.getLogger(__name__)


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
