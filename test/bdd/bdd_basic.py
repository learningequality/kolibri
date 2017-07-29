"""
BDD tests
"""
from __future__ import absolute_import, print_function, unicode_literals

import logging
import unittest

logger = logging.getLogger(__name__)


class BDDTestCase(unittest.TestCase):

    def test_bdd_thing(self):
        logger.debug("Here's a place to put our BDD tests separately")
