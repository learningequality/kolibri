from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

from kolibri.utils import webpack

class WebpackConfigTestCase(TestCase):

    def test_get_actual_plugin(self):
        webpack.PLUGIN_CACHE = {"test": {}}
        webpack.__initialized = True
        self.assertEqual(webpack.get_plugin("test"), {})

    def test_get_non_plugin(self):
        webpack.PLUGIN_CACHE = {}
        webpack.__initialized = True
        self.assertRaises(webpack.NoFrontEndPlugin, webpack.get_plugin, "test")
