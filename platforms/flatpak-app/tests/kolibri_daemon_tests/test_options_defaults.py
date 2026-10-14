import unittest
from unittest import mock

from kolibri.plugins.utils import initialize_kolibri_plugin
from kolibri.plugins.utils.options import extend_config_spec
from kolibri.utils.options import base_option_spec


class TestPluginOptionDefaults(unittest.TestCase):
    def test_plugin_sets_embedded_app_defaults(self):
        plugin = initialize_kolibri_plugin("kolibri_app", initialize_hooks=False)
        with mock.patch("kolibri.plugins.utils.options.registered_plugins", [plugin]):
            spec = extend_config_spec(base_option_spec)

        self.assertEqual(spec["Deployment"]["HTTP_PORT"]["default"], 0)
        self.assertEqual(spec["Deployment"]["AUTO_LOGOUT_TIME"]["default"], 0)
