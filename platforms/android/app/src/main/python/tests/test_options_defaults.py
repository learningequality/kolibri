from unittest import mock

from kolibri.plugins.utils import initialize_kolibri_plugin
from kolibri.plugins.utils.options import extend_config_spec
from kolibri.utils.options import base_option_spec


def test_plugin_sets_embedded_app_defaults():
    plugin = initialize_kolibri_plugin(
        "android_app_plugin", initialize_hooks=False
    )
    with mock.patch(
        "kolibri.plugins.utils.options.registered_plugins", [plugin]
    ):
        spec = extend_config_spec(base_option_spec)

    assert spec["Deployment"]["HTTP_PORT"]["default"] == 0
    assert spec["Deployment"]["AUTO_LOGOUT_TIME"]["default"] == 0
