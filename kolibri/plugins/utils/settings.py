import importlib
import warnings
from types import ModuleType

from django.apps import AppConfig

from kolibri.plugins.registry import registered_plugins
from kolibri.plugins.utils import is_external_plugin
from kolibri.utils import i18n


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


_tuple_settings = (
    "INSTALLED_APPS",
    "TEMPLATE_DIRS",
    "LOCALE_PATHS",
    "AUTHENTICATION_BACKENDS",
)


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


def _set_setting_value(setting, setting_value, settings_module):
    if setting in _tuple_settings:
        setting_value = tuple(setting_value)
        original_value = tuple(getattr(settings_module, setting, ()))
        setattr(settings_module, setting, original_value + setting_value)
    else:
        setattr(settings_module, setting, setting_value)


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
            _set_setting_value(setting, setting_value, settings_module)


def _apply_base_settings(plugin_instance, settings_module):
    # Instead of just adding the module path to the settings
    # we instantiate an app config object for the plugin
    # and explicitly set its label to its module path.
    # This way, there is no way for a plugin to collide in its
    # label in the Django App Registry with kolibri core apps
    # or Kolibri core plugins.
    app_config = AppConfig.create(plugin_instance.module_path)
    app_config.label = plugin_instance.module_path
    # Register the plugin as an installed app
    _set_setting_value("INSTALLED_APPS", (app_config,), settings_module)
    plugin_instance.INSTALLED_APPS.append(app_config)
    # Add in the external plugins' locale paths. Our frontend messages depends
    # specifically on the value of LOCALE_PATHS to find its catalog files.
    if is_external_plugin(
        plugin_instance.module_path
    ) and i18n.get_installed_app_locale_path(plugin_instance.module_path):
        _set_setting_value(
            "LOCALE_PATHS",
            (i18n.get_installed_app_locale_path(plugin_instance.module_path),),
            settings_module,
        )


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
        _apply_base_settings(plugin_instance, settings_module)
        plugin_settings_module = plugin_instance.settings_module
        if plugin_settings_module:
            _process_module_settings(
                plugin_settings_module,
                plugin_settings,
                existing_settings,
                plugin_instance.module_path,
                settings_module,
            )
            if hasattr(plugin_settings_module, "INSTALLED_APPS"):
                plugin_instance.INSTALLED_APPS.extend(
                    plugin_settings_module.INSTALLED_APPS
                )
