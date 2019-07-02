import importlib
import warnings
from types import ModuleType

from kolibri.plugins.registry import registered_plugins


def _validate_settings_module(settings_module):
    if isinstance(settings_module, str):
        try:
            return importlib.import_module(settings_module)
        except ImportError:
            raise ValueError(
                "Invalid settings module path {path}".format(path=settings_module)
            )
    elif not isinstance(settings_module, ModuleType):
        raise TypeError(
            "Invalid argument for apply_settings - requires module or module path"
        )
    return settings_module


_tuple_settings = ("INSTALLED_APPS", "TEMPLATE_DIRS", "LOCALE_PATHS")


def _validate_module_setting(
    setting, existing_settings, setting_value, plugin_settings, module_path
):
    # Raise an error if overwriting an existing setting that cannot be simply appended
    # to.
    if setting in existing_settings and setting not in _tuple_settings:
        raise ValueError(
            "Plugin settings should not be used to override Kolibri default settings, use the Django settings module env var"
        )
    # Raise an error if a tuple setting is not an iterable.
    if setting in _tuple_settings and not isinstance(setting_value, (tuple, list)):
        raise ValueError("{setting} must be a tuple or a list".format(setting=setting))
    # Warn if this setting has already been modified by another plugin
    if setting in plugin_settings:
        warnings.warn(
            "Plugin {plugin_module} is modifying the {setting} setting, but this was already modified by: {plugins}".format(
                plugin_module=module_path,
                setting=setting,
                plugins=", ".join(plugin_settings[setting]),
            )
        )
        plugin_settings[setting].append(module_path)
    else:
        plugin_settings[setting] = [module_path]


def _process_module_settings(
    plugin_settings_module,
    plugin_settings,
    existing_settings,
    module_path,
    settings_module,
):
    # Settings setting inspired by how Django does it internally:
    # https://github.com/django/django/blob/stable/1.11.x/django/conf/__init__.py#L100
    for setting in dir(plugin_settings_module):
        # All Django settings are all caps, so only read these.
        if setting.isupper():
            setting_value = getattr(plugin_settings_module, setting)
            _validate_module_setting(
                setting, existing_settings, setting_value, plugin_settings, module_path
            )
            if setting in _tuple_settings:
                setting_value = tuple(setting_value)
                original_value = tuple(getattr(settings_module, setting, tuple()))
                setattr(settings_module, setting, original_value + setting_value)
            else:
                setattr(settings_module, setting, setting_value)


def apply_settings(settings_module):
    from django.conf import settings

    if settings.configured:
        raise RuntimeError(
            "Attempted to apply settings from plugins after Django settings have been configured"
        )

    settings_module = _validate_settings_module(settings_module)

    # Keep track of which settings already exist to error if a plugin
    # tries to override them.
    # Do this here so that we can then warn but allow if plugin settings collide.
    existing_settings = dir(settings_module)

    # Keep track of which plugins have modified settings
    plugin_settings = {}

    for plugin_instance in registered_plugins:
        plugin_settings_module = plugin_instance.settings_module()
        if plugin_settings_module:
            _process_module_settings(
                plugin_settings_module,
                plugin_settings,
                existing_settings,
                plugin_instance._module_path(),
                settings_module,
            )
