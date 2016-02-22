from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

from kolibri.plugins.base import KolibriFrontEndPluginBase

class KolibriFrontEndPluginBaseTestCase(TestCase):
    def setUp(self):
        class KolibriTestFrontEnd(KolibriFrontEndPluginBase):
            name = "test"
            entry_file = "test.js"
        self.plugin_base = KolibriTestFrontEnd()

    def test_module_file_path(self):
        self.assertEqual(self.plugin_base._module_file_path(), "kolibri/plugins/test")

    def test_register_front_end_plugins(self):
        module_path, stats_file = self.plugin_base._register_front_end_plugins()
        self.assertEqual(module_path, "kolibri.plugins.test")
        self.assertIn("test_stats.json", stats_file)
