from __future__ import absolute_import, print_function, unicode_literals

import os
import shutil
import tempfile
import unittest


class KolibriTestBase(unittest.TestCase):
    """
    Sets up an isolated,temporary environment for testing Kolibri
    """

    @classmethod
    def setup_class(cls):
        os.environ["KOLIBRI_HOME"] = tempfile.mkdtemp()

    @classmethod
    def teardown_class(cls):
        shutil.rmtree(os.environ["KOLIBRI_HOME"])
