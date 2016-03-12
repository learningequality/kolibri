from __future__ import absolute_import, print_function, unicode_literals

import json
import os
import tempfile

from django.test import TestCase, override_settings

from kolibri.utils import webpack

from mock import patch

class WebpackConfigTestCase(TestCase):

    files = [{"name": "this.css"}]

    def setUp(self):
        webpack.initialized = False
        # Create a temporary directory
        self.test_dir = tempfile.mkdtemp()

    def test_get_actual_plugin(self):
        webpack.PLUGIN_CACHE = {"test": {"files": self.files}}
        webpack.initialized = True
        files = list(webpack.get_bundle("test"))
        self.assertEqual(files[0]["name"], self.files[0]["name"])

    def test_get_non_plugin(self):
        webpack.PLUGIN_CACHE = {}
        webpack.initialized = True
        with self.assertRaises(webpack.NoFrontEndPlugin):
            list(webpack.get_bundle("test"))

    @override_settings(DEBUG=True)
    def test_get_error_stats_file(self):
        temp_stats_path = os.path.join(self.test_dir, 'stats.json')
        with open(temp_stats_path, 'w') as f:
            json.dump({"status": "error"}, f)
        with self.assertRaises(webpack.WebpackError):
            webpack.load_stats_file(temp_stats_path, '')

    @override_settings(DEBUG=True)
    def test_get_compiling_stats_file(self):
        temp_stats_path = os.path.join(self.test_dir, 'stats.json')
        with open(temp_stats_path, 'w') as f:
            json.dump({"status": "compiling"}, f)
        with self.assertRaises(webpack.WebpackError):
            webpack.load_stats_file(temp_stats_path, '')

    def test_get_no_stats_file(self):
        temp_stats_path = os.path.join(self.test_dir, 'stats_noooo.json')
        with self.assertRaises(IOError):
            webpack.load_stats_file(temp_stats_path, '')

    @patch('kolibri.utils.webpack.get_bundle', return_value=files)
    def test_get_webpack_bundle(self, mocked_get_bundle):
        webpack.PLUGIN_CACHE = {}
        webpack.initialized = True
        output = webpack.get_webpack_bundle("test", None)
        self.assertEqual(output[0]["name"], "this.css")

    @patch('kolibri.utils.webpack.get_bundle', return_value=files)
    def test_get_webpack_bundle_filter(self, mocked_get_bundle):
        webpack.PLUGIN_CACHE = {}
        webpack.initialized = True
        output = webpack.get_webpack_bundle("test", "js")
        self.assertEqual(len(list(output)), 0)
