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


@pytest.fixture
def _apply_base_settings():
    with patch("kolibri.plugins.utils.settings._apply_base_settings") as apply_mock:
        yield apply_mock


def test_settings_error_if_configured(_apply_base_settings):
    with pytest.raises(RuntimeError):
        apply_settings("")


def test_settings_module_validate_string(_apply_base_settings, django_settings):
    with pytest.raises(ValueError):
        apply_settings("")


def test_settings_module_validate_not_module_or_string(
    _apply_base_settings, django_settings
):
    with pytest.raises(TypeError):
        apply_settings(0)


def test_settings_module_validate_import_string(_apply_base_settings, django_settings):
    with patch("kolibri.plugins.utils.settings.importlib") as import_mock:
        apply_settings("test")
        assert import_mock.import_module.called


def test_settings_raise_if_overwrite_base_setting(
    _apply_base_settings, django_settings
):
    module_mock = ModuleType("module_mock")
    setting = "TEST"
    setattr(module_mock, setting, True)
    plugin_settings_mock = ModuleType("settings_mock")
    setattr(plugin_settings_mock, setting, False)
    plugin_mock = MagicMock(settings_module=plugin_settings_mock)
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        with pytest.raises(ValueError):
            apply_settings(module_mock)


def test_settings_raise_if_tuple_setting_not_tuple(
    _apply_base_settings, django_settings
):
    module_mock = ModuleType("module_mock")
    setting = "INSTALLED_APPS"
    setattr(module_mock, setting, ())
    plugin_settings_mock = ModuleType("settings_mock")
    setattr(plugin_settings_mock, setting, "app")
    plugin_mock = MagicMock(settings_module=plugin_settings_mock)
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        with pytest.raises(ValueError):
            apply_settings(module_mock)


def test_settings_warn_if_two_plugins_set_setting(
    _apply_base_settings, django_settings
):
    module_mock = ModuleType("module_mock")
    setting = "TEST"
    plugin_settings_mock = ModuleType("settings_mock")
    setattr(plugin_settings_mock, setting, True)
    plugin_mock1 = MagicMock(settings_module=plugin_settings_mock, module_path="test1")
    plugin_mock2 = MagicMock(settings_module=plugin_settings_mock, module_path="test2")
    plugins = [plugin_mock1, plugin_mock2]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        with patch("kolibri.plugins.utils.settings.warnings") as warnings_mock:
            apply_settings(module_mock)
            assert warnings_mock.warn.called


def test_settings_set_setting(_apply_base_settings, django_settings):
    module_mock = ModuleType("module_mock")
    setting = "TEST"
    plugin_settings_mock = ModuleType("settings_mock")
    setattr(plugin_settings_mock, setting, False)
    plugin_mock = MagicMock(settings_module=plugin_settings_mock)
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        apply_settings(module_mock)
        assert getattr(module_mock, setting) is False


def test_settings_ignore_setting_if_lower_case(_apply_base_settings, django_settings):
    module_mock = ModuleType("module_mock")
    setting = "test"
    plugin_settings_mock = ModuleType("settings_mock")
    setattr(plugin_settings_mock, setting, False)
    plugin_mock = MagicMock(settings_module=plugin_settings_mock)
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        apply_settings(module_mock)
        assert hasattr(module_mock, setting) is False


def test_settings_append_tuple_setting(_apply_base_settings, django_settings):
    module_mock = ModuleType("module_mock")
    setting = "INSTALLED_APPS"
    setattr(module_mock, setting, ("first",))
    plugin_settings_mock = ModuleType("settings_mock")
    setattr(plugin_settings_mock, setting, ("second",))
    plugin_mock = MagicMock(settings_module=plugin_settings_mock)
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        apply_settings(module_mock)
        assert getattr(module_mock, setting) == ("first", "second")


def test_settings_append_tuple_setting_when_not_exist(
    _apply_base_settings, django_settings
):
    module_mock = ModuleType("module_mock")
    setting = "INSTALLED_APPS"
    plugin_settings_mock = ModuleType("settings_mock")
    setattr(plugin_settings_mock, setting, ("second",))
    plugin_mock = MagicMock(settings_module=plugin_settings_mock)
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        apply_settings(module_mock)
        assert getattr(module_mock, setting) == ("second",)


def test_settings_append_installed_apps(django_settings):
    module_mock = ModuleType("module_mock")
    plugin_mock = MagicMock(settings_module=None, module_path="test")
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins):
        apply_settings(module_mock)
        assert getattr(module_mock, "INSTALLED_APPS")[0].name == "test"


def test_settings_append_locale_path_external(django_settings):
    module_mock = ModuleType("module_mock")
    plugin_mock = MagicMock(settings_module=None, module_path="test")
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins), patch(
        "kolibri.plugins.utils.settings.i18n.get_installed_app_locale_path",
        return_value="test",
    ):
        apply_settings(module_mock)
        assert getattr(module_mock, "LOCALE_PATHS") == ("test",)


def test_settings_not_append_locale_path_internal(django_settings):
    module_mock = ModuleType("module_mock")
    plugin_mock = MagicMock(settings_module=None, module_path="kolibri.test")
    plugins = [plugin_mock]
    with patch("kolibri.plugins.utils.settings.registered_plugins", plugins), patch(
        "kolibri.plugins.utils.settings.i18n.get_installed_app_locale_path",
        return_value="test",
    ), patch("kolibri.plugins.utils.settings.AppConfig"):
        apply_settings(module_mock)
        assert not hasattr(module_mock, "LOCALE_PATHS")
