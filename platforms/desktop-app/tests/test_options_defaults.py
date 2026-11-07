import importlib
from unittest import mock

import pytest

from kolibri.plugins.utils import initialize_kolibri_plugin
from kolibri.plugins.utils.options import extend_config_spec
from kolibri.utils.options import base_option_spec
from kolibri_app import constants
from kolibri_app import options_defaults


def test_plugin_sets_embedded_app_defaults():
    plugin = initialize_kolibri_plugin("kolibri_app", initialize_hooks=False)
    with mock.patch("kolibri.plugins.utils.options.registered_plugins", [plugin]):
        spec = extend_config_spec(base_option_spec)

    assert spec["Deployment"]["HTTP_PORT"]["default"] == 0
    assert spec["Deployment"]["AUTO_LOGOUT_TIME"]["default"] == 0


@pytest.fixture
def recorded_language(winreg):
    yield winreg.QueryValueEx
    importlib.reload(options_defaults)


def spec_default_language():
    with mock.patch.object(constants, "WINDOWS", True):
        importlib.reload(options_defaults)
    plugin = initialize_kolibri_plugin("kolibri_app", initialize_hooks=False)
    with mock.patch("kolibri.plugins.utils.options.registered_plugins", [plugin]):
        spec = extend_config_spec(base_option_spec)
    return spec["Deployment"]["DEFAULT_LANGUAGE"]["default"]


def test_recorded_language_is_the_default_language(recorded_language):
    recorded_language.return_value = ("es-419", 1)
    assert spec_default_language() == "es-419"


def test_no_recorded_language_keeps_the_os_language(recorded_language):
    recorded_language.side_effect = FileNotFoundError
    assert spec_default_language() == ""


@pytest.mark.parametrize("recorded", ["ES-419", "xx-yy"])
def test_unknown_recorded_language_keeps_the_os_language(recorded_language, recorded):
    recorded_language.return_value = (recorded, 1)
    assert spec_default_language() == ""
