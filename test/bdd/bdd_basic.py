"""
BDD tests
"""
from __future__ import absolute_import, print_function, unicode_literals

from test.test_cli import KolibriTestBase

import logging

logger = logging.getLogger(__name__)


class BDDTestCase(KolibriTestBase):

    def test_cli(self):
        logger.debug("Here's a place to put our BDD tests separately")
