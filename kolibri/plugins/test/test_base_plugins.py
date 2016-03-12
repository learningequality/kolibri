from __future__ import absolute_import, print_function, unicode_literals

import os

from django.test import TestCase

from kolibri.plugins.base import KolibriFrontEndPluginBase


class KolibriFrontEndPluginBaseTestCase(TestCase):
    def setUp(self):
        class KolibriTestFrontEnd(KolibriFrontEndPluginBase):
            entry_file = "test.js"
        self.plugin_base = KolibriTestFrontEnd()

    def test_module_file_path(self):
        self.assertEqual(self.plugin_base._module_file_path(), os.path.join("kolibri", "plugins", "test"))

    def test_register_front_end_plugins(self):
        bundle_path, stats_file, async_file = self.plugin_base._register_front_end_plugins()
        self.assertEqual(bundle_path, "kolibri.plugins.test" + "." + type(self.plugin_base).__name__)
        self.assertIn(type(self.plugin_base).__name__ + "_stats.json", stats_file)
        self.assertIn(type(self.plugin_base).__name__ + "_async.json", async_file)
