from types import ModuleType

import pytest
from mock import MagicMock
from mock import patch

from kolibri.plugins.utils.settings import apply_settings


@pytest.fixture
def django_settings():
    with patch("django.conf.settings") as settings_mock:
        settings_mock.configured = False
        yield settings_mock


def test_settings_error_if_configured():
    with pytest.raises(RuntimeError):
        apply_settings("")


def test_settings_module_validate_string(django_settings):
    with pytest.raises(ValueError):
        apply_settings("")


def test_settings_module_validate_not_module_or_string(django_settings):
    with pytest.raises(TypeError):
        apply_settings(0)


def test_settings_module_validate_import_string(django_settings):
    with patch("kolibri.plugins.utils.settings.importlib") as import_mock:
        apply_settings("test")
        assert import_mock.import_module.called


def test_settings_raise_if_overwrite_base_setting(django_settings):
    module_mock = ModuleType("module_mock")
    setting = "TEST"
    setattr(module_mock, setting, True)
    plugin_mock = MagicMock()
    plugin_settings_mock = ModuleType("settings_mock")
    setattr(plugin_settings_mock, setting, False)
    plugin_mock.settings_module.return_value = plugin_settings_mock
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        with pytest.raises(ValueError):
            apply_settings(module_mock)


def test_settings_raise_if_tuple_setting_not_tuple(django_settings):
    module_mock = ModuleType("module_mock")
    setting = "INSTALLED_APPS"
    setattr(module_mock, setting, tuple())
    plugin_mock = MagicMock()
    plugin_settings_mock = ModuleType("settings_mock")
    setattr(plugin_settings_mock, setting, "app")
    plugin_mock.settings_module.return_value = plugin_settings_mock
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        with pytest.raises(ValueError):
            apply_settings(module_mock)


def test_settings_warn_if_two_plugins_set_setting(django_settings):
    module_mock = ModuleType("module_mock")
    setting = "TEST"
    plugin_mock1 = MagicMock()
    plugin_mock2 = MagicMock()
    plugin_settings_mock = ModuleType("settings_mock")
    setattr(plugin_settings_mock, setting, True)
    plugin_mock1.settings_module.return_value = plugin_settings_mock
    plugin_mock2.settings_module.return_value = plugin_settings_mock
    plugin_mock1._module_path.return_value = "test1"
    plugin_mock1._module_path.return_value = "test2"
    plugins = [plugin_mock1, plugin_mock2]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        with patch("kolibri.plugins.utils.settings.warnings") as warnings_mock:
            apply_settings(module_mock)
            assert warnings_mock.warn.called


def test_settings_set_setting(django_settings):
    module_mock = ModuleType("module_mock")
    setting = "TEST"
    plugin_mock = MagicMock()
    plugin_settings_mock = ModuleType("settings_mock")
    setattr(plugin_settings_mock, setting, False)
    plugin_mock.settings_module.return_value = plugin_settings_mock
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        apply_settings(module_mock)
        assert getattr(module_mock, setting) is False


def test_settings_ignore_setting_if_lower_case(django_settings):
    module_mock = ModuleType("module_mock")
    setting = "test"
    plugin_mock = MagicMock()
    plugin_settings_mock = ModuleType("settings_mock")
    setattr(plugin_settings_mock, setting, False)
    plugin_mock.settings_module.return_value = plugin_settings_mock
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        apply_settings(module_mock)
        assert hasattr(module_mock, setting) is False


def test_settings_append_tuple_setting(django_settings):
    module_mock = ModuleType("module_mock")
    setting = "INSTALLED_APPS"
    setattr(module_mock, setting, ("first",))
    plugin_mock = MagicMock()
    plugin_settings_mock = ModuleType("settings_mock")
    setattr(plugin_settings_mock, setting, ("second",))
    plugin_mock.settings_module.return_value = plugin_settings_mock
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        apply_settings(module_mock)
        assert getattr(module_mock, setting) == ("first", "second")


def test_settings_append_tuple_setting_when_not_exist(django_settings):
    module_mock = ModuleType("module_mock")
    setting = "INSTALLED_APPS"
    plugin_mock = MagicMock()
    plugin_settings_mock = ModuleType("settings_mock")
    setattr(plugin_settings_mock, setting, ("second",))
    plugin_mock.settings_module.return_value = plugin_settings_mock
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        apply_settings(module_mock)
        assert getattr(module_mock, setting) == ("second",)
