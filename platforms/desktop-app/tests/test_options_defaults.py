from unittest import mock

from kolibri.plugins.utils.options import extend_config_spec
from kolibri.utils.options import base_option_spec
from kolibri_app import options_defaults


def test_plugin_declares_embedded_app_defaults():
    plugin = mock.MagicMock(
        options_module=None,
        option_defaults_module=options_defaults,
        module_path="kolibri_app",
    )
    with mock.patch("kolibri.plugins.utils.options.registered_plugins", [plugin]):
        spec = extend_config_spec(base_option_spec)

    assert spec["Deployment"]["HTTP_PORT"]["default"] == 0
    assert spec["Deployment"]["AUTO_LOGOUT_TIME"]["default"] == 0
