from __future__ import absolute_import, print_function, unicode_literals
import json
import os
import tempfile
from django.test import TestCase, override_settings
from kolibri.plugins import hooks
from kolibri.utils import webpack
from mock import patch


class WebpackConfigTestCase(TestCase):
    files = [{"name": "this.css"}]
    events = {
        "events": {},
        "once": {},
    }

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

    def test_get_actual_plugin_async_events(self):
        webpack.PLUGIN_CACHE = {"test": {"async_events": self.events}}
        webpack.initialized = True
        events = webpack.get_async_events("test")
        self.assertEqual(events, self.events)

    def test_get_non_plugin_async_events(self):
        webpack.PLUGIN_CACHE = {}
        webpack.initialized = True
        with self.assertRaises(webpack.NoFrontEndPlugin):
            webpack.get_async_events("test")

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

    def test_get_stats_file(self):
        temp_stats_path = os.path.join(self.test_dir, 'stats.json')
        bundle_path = "test"
        with open(temp_stats_path, 'w') as f:
            json.dump({"chunks": {bundle_path: []}}, f)
        self.assertIn("files", webpack.load_stats_file(temp_stats_path, bundle_path))

    def test_get_no_stats_file(self):
        temp_stats_path = os.path.join(self.test_dir, 'stats_noooo.json')
        with self.assertRaises(IOError):
            webpack.load_stats_file(temp_stats_path, '')

    def test_get_async_file(self):
        temp_async_path = os.path.join(self.test_dir, 'async.json')
        with open(temp_async_path, 'w') as f:
            json.dump({}, f)
        self.assertEqual({}, webpack.load_async_file(temp_async_path))

    def test_get_no_async_file(self):
        temp_async_path = os.path.join(self.test_dir, 'async_noooo.json')
        with self.assertRaises(IOError):
            webpack.load_async_file(temp_async_path)

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

    @patch('kolibri.utils.webpack.hooks.get_callables', return_value=((lambda: (None, None, None)),))
    @patch('kolibri.utils.webpack.load_stats_file', return_value={"files": []})
    @patch('kolibri.utils.webpack.load_async_file', return_value="test1")
    def test_initialize_plugin_cache(self, mocked_async, mocked_stats, mocked_get_callables):
        webpack.PLUGIN_CACHE = {}
        webpack.initialized = False
        webpack.initialize_plugin_cache()
        self.assertTrue(webpack.initialized)
        mocked_get_callables.assert_called_with(hooks.FRONTEND_PLUGINS)
        mocked_stats.assert_called_with(None, None)
        mocked_async.assert_called_with(None)

    @patch('kolibri.utils.webpack.hooks.get_callables', return_value=((lambda: (None, None, None)),))
    @patch('kolibri.utils.webpack.load_stats_file', side_effect=IOError)
    @patch('kolibri.utils.webpack.load_async_file', return_value="test1")
    def test_initialize_plugin_cache_stats_error(self, mocked_async, mocked_stats, mocked_get_callables):
        webpack.PLUGIN_CACHE = {}
        webpack.initialized = False
        with self.assertRaises(IOError):
            webpack.initialize_plugin_cache()

    @patch('kolibri.utils.webpack.logger.error')
    @patch('kolibri.utils.webpack.hooks.get_callables', return_value=((lambda: (None, None, None)),))
    @patch('kolibri.utils.webpack.load_stats_file', return_value={"files": []})
    @patch('kolibri.utils.webpack.load_async_file', side_effect=IOError)
    def test_initialize_plugin_cache_async_error(self, mocked_async, mocked_stats, mocked_get_callables,
                                                 mocked_error_logger):
        webpack.PLUGIN_CACHE = {}
        webpack.initialized = False
        webpack.initialize_plugin_cache()
        mocked_error_logger.assert_called_with(
            'Error reading {}. Are you sure webpack has generated the file '
            'and the path is correct?'.format(None))

    @patch('kolibri.utils.webpack.initialize_plugin_cache')
    def test_check_plugin_cache(self, mocked_initialize):
        webpack.PLUGIN_CACHE = {}
        webpack.initialized = False
        webpack.check_plugin_cache()
        mocked_initialize.assert_called_with()
