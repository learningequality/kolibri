"""
How plugins work
----------------

From a user's perspective, plugins are enabled and disabled through the command
line interface or through a UI. Users can also configure a plugin's behavior
through the main Kolibri interface.


.. note::
    We have not yet written a configuration API, for now just make sure
    configuration-related variables are kept in a central location of your
    plugin.

    It's up to the plugin to provide configuration ``Form`` classes and register
    them.

    We should aim for a configuration style in which data can be pre-seeded,
    dumped and exported easily.

From a developer's perspective, plugins are Django applications listed
in ``INSTALLED_APPS`` and are initialized once when the server starts, mean at
the load time of the django project, i.e. Kolibri.

Loading a plugin
~~~~~~~~~~~~~~~~

In general, a plugin should **never** modify internals of Kolibri or other
plugins without using the hooks API or normal conventional Django scenarios.

.. note::

    Each app in ``INSTALLED_APPS`` is searched for the special
    ``kolibri_plugin`` module.

Everything that a plugin does is expected to be defined through
``<myapp>/kolibri_plugin.py``.


"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import copy
import importlib
import logging
import warnings
from types import ModuleType

from django.utils.functional import SimpleLazyObject

from .base import KolibriPluginBase
from kolibri.core.device.translation import i18n_patterns
from kolibri.utils.conf import config

logger = logging.getLogger(__name__)


def __register(apps, registry):
    for app in apps:
        try:

            # Handle AppConfig INSTALLED_APPS string
            if ".apps." in app:
                # remove .apps.Config line in string
                import_string = app.split(".apps.")[0]
            else:
                import_string = app

            if import_string not in registry["apps"]:

                plugin_module_string = import_string + ".kolibri_plugin"
                plugin_module = importlib.import_module(plugin_module_string)

                logger.debug("Loaded kolibri plugin: {}".format(app))
                # Load a list of all class types in module
                all_classes = [
                    cls
                    for cls in plugin_module.__dict__.values()
                    if isinstance(cls, type)
                ]
                # Filter the list to only match the ones that belong to the module
                # and not the ones that have been imported
                plugin_package = (
                    plugin_module.__package__
                    if plugin_module.__package__
                    else plugin_module.__name__.rpartition(".")[0]
                )
                all_classes = filter(
                    lambda x: plugin_package + ".kolibri_plugin" == x.__module__,
                    all_classes,
                )
                plugin_classes = []
                for Klass in all_classes:
                    if type(Klass) == type and issubclass(Klass, KolibriPluginBase):
                        plugin_classes.append(Klass)
                for PluginClass in plugin_classes:
                    # Initialize the class, nothing more happens for now.
                    logger.debug("Initializing plugin: {}".format(PluginClass.__name__))
                    registry["plugins"].append(PluginClass())
                registry["apps"].add(import_string)
        except ImportError:
            pass


def __initialize():
    """
    Called once to register hook callbacks.
    """
    registry = {"apps": set(), "plugins": []}
    logger.debug("Loading kolibri plugin registry...")

    __register(config.ACTIVE_PLUGINS, registry)
    return registry


__registry = SimpleLazyObject(__initialize)


def register(apps):
    __register(apps, __registry)


def get_urls():
    from django.conf.urls import include
    from django.conf.urls import url

    urlpatterns = []
    for plugin_instance in __registry["plugins"]:
        url_module = plugin_instance.url_module()
        api_url_module = plugin_instance.api_url_module()
        instance_patterns = []
        # Normalize slug
        slug = plugin_instance.url_slug().lstrip("^").rstrip("/") + "/"
        if url_module:
            instance_patterns += i18n_patterns(url_module.urlpatterns, prefix=slug)
        if api_url_module:
            instance_patterns.append(url(slug + "api/", include(api_url_module)))
        if instance_patterns:
            urlpatterns.append(
                url(
                    "",
                    include(
                        instance_patterns, namespace=plugin_instance.url_namespace()
                    ),
                )
            )

    return urlpatterns


def _validate_settings_module(settings_module):
    if type(settings_module) is str:
        try:
            return importlib.import_module(settings_module)
        except ImportError:
            raise ValueError(
                "Invalid settings module path {path}".format(path=settings_module)
            )
    elif type(settings_module) is not ModuleType:
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

    for plugin_instance in __registry["plugins"]:
        plugin_settings_module = plugin_instance.settings_module()
        if plugin_settings_module:
            _process_module_settings(
                plugin_settings_module,
                plugin_settings,
                existing_settings,
                plugin_instance._module_path(),
                settings_module,
            )


def __validate_config_option(
    section, name, attrs, base_config_spec, plugin_specs, module_path
):
    # Raise an error if someone tries to overwrite a base option
    # except for the default value.
    if section in base_config_spec:
        if name in base_config_spec[section] and (
            len(attrs) != 1 or "default" not in attrs
        ):
            raise ValueError(
                "Cannot overwrite a core Kolibri options spec option, except for the default value"
            )

    # Warn if a plugin tries to add an option that another plugin has already added
    if section in plugin_specs:
        if name in plugin_specs[section]:
            warnings.warn(
                "{plugin} set an option {options} in section {section} but {plugins} had already set it".format(
                    plugin=module_path,
                    plugins=", ".join(plugin_specs[section][name]),
                    option=name,
                    section=section,
                )
            )
            plugin_specs[section][name].append(module_path)
        else:
            # If not create the list for this option name
            # to track this and future modifications
            plugin_specs[section][name] = [module_path]
    else:
        # If not create the dict for the section
        # and the list for this option name
        plugin_specs[section] = {name: [module_path]}


def __process_config_spec(
    option_spec, base_config_spec, plugin_specs, module_path, final_spec
):
    for section, opts in option_spec.items():
        for name, attrs in opts.items():
            __validate_config_option(
                section, name, attrs, base_config_spec, plugin_specs, module_path
            )
            if section not in final_spec:
                final_spec[section] = {}
            if section in base_config_spec and name in base_config_spec[section]:
                # This will have thrown an error above if this
                # is doing anything other than overriding the default
                # value. Instead of setting all the information here
                # just copy the default value from the plugin options
                # to the final spec.
                final_spec[section][name]["default"] = attrs["default"]
            else:
                # Otherwise just set it completely from the options
                final_spec[section][name] = attrs


def extend_config_spec(base_config_spec):
    plugin_specs = {}
    final_spec = copy.deepcopy(base_config_spec)
    for plugin_instance in __registry["plugins"]:
        plugin_options = plugin_instance.options_module()
        if plugin_options and hasattr(plugin_options, "option_spec"):
            module_path = plugin_instance._module_path()
            option_spec = plugin_options.option_spec
            __process_config_spec(
                option_spec, base_config_spec, plugin_specs, module_path, final_spec
            )
    return final_spec
