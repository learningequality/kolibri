from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

from kolibri.utils import webpack

from mock import patch

class WebpackConfigTestCase(TestCase):

    files = [{"name": "this.css"}]

    def test_get_actual_plugin(self):
        webpack.PLUGIN_CACHE = {"test": {"chunks": {"test": []}}}
        webpack.initialized = True
        self.assertEqual(list(webpack.get_bundle("test", "test")), [])

    def test_get_non_plugin(self):
        webpack.PLUGIN_CACHE = {}
        webpack.initialized = True
        with self.assertRaises(webpack.NoFrontEndPlugin):
            list(webpack.get_bundle("test", "test"))

    @patch('kolibri.utils.webpack.get_bundle', return_value=files)
    def test_get_webpack_bundle(self, mocked_get_bundle):
        webpack.PLUGIN_CACHE = {}
        webpack.initialized = True
        output = webpack.get_webpack_bundle("test", None, "test")
        self.assertEqual(output[0]["name"], "this.css")

    @patch('kolibri.utils.webpack.get_bundle', return_value=files)
    def test_get_webpack_bundle_filter(self, mocked_get_bundle):
        webpack.PLUGIN_CACHE = {}
        webpack.initialized = True
        output = webpack.get_webpack_bundle("test", "js", "test")
        self.assertEqual(len(list(output)), 0)
