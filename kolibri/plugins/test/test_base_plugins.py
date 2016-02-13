from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

from kolibri.plugins.base import KolibriFrontEndPluginBase

class KolibriFrontEndPluginBaseTestCase(TestCase):
    def setUp(self):
        self.plugin_base = KolibriFrontEndPluginBase()

    def test_module_file_path(self):
        self.assertEqual(self.plugin_base._module_file_path(), "kolibri/plugins")

    def test_register_front_end_plugins(self):
        plugin_config = self.plugin_base._register_front_end_plugins()["kolibri.plugins"]
        self.assertIn("POLL_INTERVAL", plugin_config, "No POLL_INTERVAL key in config")
        self.assertIn("BUNDLE_DIR_NAME", plugin_config, "No BUNDLE_DIR_NAME key in config")
        self.assertIn("STATS_FILE", plugin_config, "No STATS_FILE key in config")
        self.assertIn("ignores", plugin_config, "No ignores key in config")
