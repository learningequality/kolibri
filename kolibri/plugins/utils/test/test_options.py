from types import ModuleType

import pytest
from mock import MagicMock
from mock import patch

from kolibri.plugins.utils.options import extend_config_spec


def test_raise_if_overwrite_core_option():
    base_config_spec = {"Server": {"DEPLOY": {"type": "string"}}}
    plugin_options_mock = ModuleType("options_mock")
    setattr(plugin_options_mock, "option_spec", base_config_spec)
    plugin_mock = MagicMock(options_module=plugin_options_mock)
    plugins = [plugin_mock]
    with pytest.raises(ValueError):
        with patch("kolibri.plugins.utils.options.registered_plugins", plugins):
            extend_config_spec(base_config_spec)


def test_not_raise_if_overwrite_core_option_default_only():
    base_config_spec = {"Server": {"DEPLOY": {"type": "string", "default": "hey you!"}}}
    plugin_config_spec = {"Server": {"DEPLOY": {"default": "you got served"}}}
    plugin_options_mock = ModuleType("options_mock")
    setattr(plugin_options_mock, "option_spec", plugin_config_spec)
    plugin_mock = MagicMock(options_module=plugin_options_mock)
    plugins = [plugin_mock]
    try:
        with patch("kolibri.plugins.utils.options.registered_plugins", plugins):
            extend_config_spec(base_config_spec)
    except ValueError:
        pytest.fail(
            "Error raised when only overwriting the default value of a core option"
        )


def test_warn_if_multiple_plugins_add_option():
    base_config_spec = {"Server": {"DEPLOY": {"type": "string"}}}
    plugin_config_spec = {
        "Lever": {"DEPLOY": {"type": "string", "default": "you got served"}}
    }
    plugin_options_mock1 = ModuleType("options_mock")
    setattr(plugin_options_mock1, "option_spec", plugin_config_spec)
    plugin_mock1 = MagicMock(options_module=plugin_options_mock1, module_path="test1")
    plugin_options_mock2 = ModuleType("options_mock")
    setattr(plugin_options_mock2, "option_spec", plugin_config_spec)
    plugin_mock2 = MagicMock(options_module=plugin_options_mock2, module_path="test2")
    plugin_mock1._module_path.return_value = "test1"
    plugin_mock1._module_path.return_value = "test2"
    plugins = [plugin_mock1, plugin_mock2]
    with patch("kolibri.plugins.utils.options.registered_plugins", plugins):
        with patch("kolibri.plugins.utils.options.warnings") as warnings_mock:
            extend_config_spec(base_config_spec)
            assert warnings_mock.warn.called


def test_can_update_default():
    base_config_spec = {
        "Server": {"DEPLOY": {"type": "string", "default": "why thank you!"}}
    }
    plugin_config_spec = {"Server": {"DEPLOY": {"default": "you got served"}}}
    plugin_options_mock = ModuleType("options_mock")
    setattr(plugin_options_mock, "option_spec", plugin_config_spec)
    plugin_mock = MagicMock(options_module=plugin_options_mock)
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.options.registered_plugins", plugins):
        final_spec = extend_config_spec(base_config_spec)
        assert (
            final_spec["Server"]["DEPLOY"]["default"]
            == plugin_config_spec["Server"]["DEPLOY"]["default"]
        )


def test_can_add_to_base_section():
    base_config_spec = {
        "Server": {"DEPLOY": {"type": "string", "default": "why thank you!"}}
    }
    plugin_config_spec = {"Server": {"GOODBOY": {"type": "string"}}}
    plugin_options_mock = ModuleType("options_mock")
    setattr(plugin_options_mock, "option_spec", plugin_config_spec)
    plugin_mock = MagicMock(options_module=plugin_options_mock)
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.options.registered_plugins", plugins):
        final_spec = extend_config_spec(base_config_spec)
        assert final_spec["Server"]["DEPLOY"] == base_config_spec["Server"]["DEPLOY"]
        assert (
            final_spec["Server"]["GOODBOY"] == plugin_config_spec["Server"]["GOODBOY"]
        )


def test_can_add_section():
    base_config_spec = {
        "Server": {"DEPLOY": {"type": "string", "default": "why thank you!"}}
    }
    plugin_config_spec = {"Bursar": {"GOODBOY": {"type": "string"}}}
    plugin_options_mock = ModuleType("options_mock")
    setattr(plugin_options_mock, "option_spec", plugin_config_spec)
    plugin_mock = MagicMock(options_module=plugin_options_mock)
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.options.registered_plugins", plugins):
        final_spec = extend_config_spec(base_config_spec)
        assert final_spec["Server"]["DEPLOY"] == base_config_spec["Server"]["DEPLOY"]
        assert (
            final_spec["Bursar"]["GOODBOY"] == plugin_config_spec["Bursar"]["GOODBOY"]
        )


def test_can_add_to_plugin_section():
    base_config_spec = {}
    plugin_config_spec1 = {"Bursar": {"GOODBOY": {"type": "string"}}}
    plugin_mock1 = MagicMock()
    plugin_options_mock1 = ModuleType("options_mock")
    setattr(plugin_options_mock1, "option_spec", plugin_config_spec1)
    plugin_mock1 = MagicMock(options_module=plugin_options_mock1)
    plugin_config_spec2 = {"Bursar": {"BADBOY": {"type": "string"}}}
    plugin_options_mock2 = ModuleType("options_mock")
    setattr(plugin_options_mock2, "option_spec", plugin_config_spec2)
    plugin_mock2 = MagicMock(options_module=plugin_options_mock2)
    plugins = [plugin_mock1, plugin_mock2]
    with patch("kolibri.plugins.utils.options.registered_plugins", plugins):
        final_spec = extend_config_spec(base_config_spec)
        assert (
            final_spec["Bursar"]["GOODBOY"] == plugin_config_spec1["Bursar"]["GOODBOY"]
        )
        assert final_spec["Bursar"]["BADBOY"] == plugin_config_spec2["Bursar"]["BADBOY"]
