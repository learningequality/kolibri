from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import json
import logging
import os
import sys
from abc import ABCMeta
from importlib import import_module

from django.utils.module_loading import module_has_submodule
from six import with_metaclass

from kolibri.utils.build_config.default_plugins import DEFAULT_PLUGINS
from kolibri.utils.conf import KOLIBRI_HOME

logger = logging.getLogger(__name__)


conf_file = os.path.join(KOLIBRI_HOME, "plugins.json")


class ConfigDict(dict):
    # These values are encoded on the config dict as sets
    # so they need to be treated specially for serialization
    # and deserialization to/from JSON
    SET_KEYS = ("INSTALLED_PLUGINS", "DISABLED_PLUGINS", "UPDATED_PLUGINS")

    def __init__(self):
        # If the settings file does not exist or does not contain
        # valid JSON then create it
        self.set_defaults()
        if os.path.isfile(conf_file):
            try:
                # Open up the config file and load settings
                # use default OS encoding
                with open(conf_file, "r") as kolibri_conf_file:
                    self.update(json.load(kolibri_conf_file))
                return
            except ValueError:
                logger.warn(
                    "Attempted to load plugins.json but encountered a file that could not be decoded as valid JSON."
                )
        self.save()
        logger.info("Initialized plugins.json")

    def set_defaults(self):
        self.update(
            {
                #: Everything in this list is added to django.conf.settings.INSTALLED_APPS
                # except disabled ones below
                "INSTALLED_PLUGINS": DEFAULT_PLUGINS,
                #: Everything in this list is removed from the list above
                "DISABLED_PLUGINS": [],
                # Plugins that have been updated since we last initialized Kolibri
                "UPDATED_PLUGINS": [],
                # The current versions of plugins (both internal and external)
                "PLUGIN_VERSIONS": {},
            }
        )

    @property
    def ACTIVE_PLUGINS(self):
        return list(self["INSTALLED_PLUGINS"] - self["DISABLED_PLUGINS"])

    def update(self, new_values):
        """
        Updates current configuration with ``new_values``. Does not save to file.
        """
        values_copy = new_values.copy()
        for key in self.SET_KEYS:
            if key in values_copy:
                values_copy[key] = set(values_copy[key])
        super(ConfigDict, self).update(values_copy)

    def save(self):
        # use default OS encoding
        config_copy = self.copy()
        for key in self.SET_KEYS:
            if key in config_copy:
                config_copy[key] = list(config_copy[key])
        with open(conf_file, "w") as kolibri_conf_file:
            json.dump(config_copy, kolibri_conf_file, indent=2, sort_keys=True)

    def add_plugin(self, module_path):
        if module_path in self.ACTIVE_PLUGINS:
            logger.warning("{} already enabled".format(module_path))
            return
        self["INSTALLED_PLUGINS"].add(module_path)
        self["UPDATED_PLUGINS"].add(module_path)
        try:
            self["DISABLED_PLUGINS"].remove(module_path)
        except KeyError:
            pass
        self.save()

    def remove_plugin(self, module_path):
        if module_path not in self.ACTIVE_PLUGINS:
            logger.warning("{} already disabled".format(module_path))
            return
        self["DISABLED_PLUGINS"].add(module_path)
        try:
            self["INSTALLED_PLUGINS"].remove(module_path)
        except KeyError:
            pass
        try:
            self["UPDATED_PLUGINS"].remove(module_path)
        except KeyError:
            pass
        self.save()

    def clear_plugin(self, module_path):
        # Clean up references to plugins that either don't exist
        # Or don't import properly.
        try:
            self["INSTALLED_PLUGINS"].remove(module_path)
        except KeyError:
            pass
        try:
            self["DISABLED_PLUGINS"].remove(module_path)
        except KeyError:
            pass
        try:
            self["UPDATED_PLUGINS"].remove(module_path)
        except KeyError:
            pass
        self.save()

    def update_plugin_version(self, module_path, new_version):
        self["PLUGIN_VERSIONS"][module_path] = new_version
        try:
            self["UPDATED_PLUGINS"].remove(module_path)
        except KeyError:
            pass
        self.save()


#: Set defaults before updating the dict
config = ConfigDict()


class SingletonMeta(ABCMeta):
    _instances = {}

    # Make all classes using this metaclass singletons
    # Taken from here: https://stackoverflow.com/q/6760685
    # Should be resistant to the __new__ method on the class object
    # being overwritten.
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(SingletonMeta, cls).__call__(*args, **kwargs)
        return cls._instances[cls]


class KolibriPluginBase(with_metaclass(SingletonMeta)):
    """
    This is the base class that all Kolibri plugins need to implement.
    """

    #: Comment
    # Name of a local module that contains url_patterns that define
    # URLs for views that do not contain any
    # translated content, and hence will not be prefixed
    # with a language prefix
    untranslated_view_urls = None

    #: Comment
    # Name of a local module that contains url_patterns that define
    # URLs for views that contain
    # translated content, and hence will be prefixed
    # with a language prefixs
    translated_view_urls = None

    #: Comment
    # Name of a local module that contains url_patterns that define
    # URLs for views that should be attached to the domain root.
    # Use with caution! The lack of namespacing is dangerous.
    root_view_urls = None

    #: Comment
    # Name of a local module that contains additional settings to augment
    # Django settings.
    # For settings that take a tuple or list, these will be appended to the value from
    # the base settings module set through conventional Django means.
    django_settings = None

    #: Comment
    # Name of a local module, containing a config spec as the 'option_spec' value.
    # These options should not override the core config spec. To override default values
    # of other options see the attribute below
    kolibri_options = None

    #: Comment
    # Name of a local module, containing a set of options defaults as the 'option_defaults' value.
    # Should be of the form:
    # option_defaults = {
    #     "<Section Name>": {
    #         "<Option Name>": "<New Default Value>",
    #     }
    # }
    kolibri_option_defaults = None

    # : Suggested property, not yet in use
    migrate_on_enable = False

    # : Suggested property, not yet in use
    collect_static_on_enable = False

    # : Suggested property, not yet in use
    collect_static_on_enable = False

    def __init__(self):
        self.INSTALLED_APPS = []

    @classmethod
    def class_module_path(self):
        return ".".join(self.__module__.split(".")[:-1])

    @property
    def module_path(self):
        return self.class_module_path()

    def _installed_apps_add(self):
        """Call this from your enable() method to have the plugin automatically
        added to Kolibri configuration"""
        config.add_plugin(self.module_path)

    def _installed_apps_remove(self):
        """Call this from your enable() method to have the plugin automatically
        added to Kolibri configuration"""
        config.remove_plugin(self.module_path)

    def enable(self):
        """Modify the kolibri config dict to your plugin's needs"""
        self._installed_apps_add()

    def disable(self):
        """Modify the kolibri config dict to your plugin's needs"""
        self._installed_apps_remove()

    def _return_module(self, module_name):
        if module_has_submodule(sys.modules[self.module_path], module_name):
            models_module_name = "%s.%s" % (self.module_path, module_name)
            try:
                return import_module(models_module_name)
            except Exception as e:
                logging.warn(
                    "Tried to import module {module_name} from {plugin} but an error was raised".format(
                        plugin=self.module_path, module_name=module_name
                    )
                )
                logging.exception(e)

        return None

    @property
    def url_module(self):
        """
        Return a url module, containing ``urlpatterns = [...]``, a conventional
        Django application url module.

        URLs are by default accessed through Django's reverse lookups like
        this::

            reverse('kolibri:mypluginclass:url_name')

        To customize "mypluginclass" (which is automatically derived from the
        plugin's class name), override ``url_namespace``.

        By default this will be discovered based on the translated_view_urls
        property.
        """
        if self.translated_view_urls:
            module = self._return_module(self.translated_view_urls)
            if module is None:
                logging.warn(
                    "{plugin} defined {urls} translated view urls but the module was not found".format(
                        plugin=self.module_path, urls=self.translated_view_urls
                    )
                )
            return module

    @property
    def api_url_module(self):
        """
        Return a url module, containing ``urlpatterns = [...]``, a conventional
        Django application url module.

        Do this separately for API endpoints so that they do not need
        to be prefixed by the language code.

        URLs are by default accessed through Django's reverse lookups like
        this::

            reverse('kolibri:mypluginclass:url_name')

        To customize "mypluginclass" (which is automatically derived from the
        plugin's class name), override ``url_namespace``.

        By default this will be discovered based on the untranslated_view_urls
        property.
        """
        if self.untranslated_view_urls:
            module = self._return_module(self.untranslated_view_urls)
            if module is None:
                logging.warn(
                    "{plugin} defined {urls} untranslated view urls but the module was not found".format(
                        plugin=self.module_path, urls=self.untranslated_view_urls
                    )
                )
            return module

    @property
    def root_url_module(self):
        """
        Return a url module, containing ``urlpatterns = [...]``, a conventional
        Django application url module.

        Do this separately for endpoints that need to be attached at the root.

        URLs are by default accessed through Django's reverse lookups like
        this::

            reverse('kolibri:url_name')

        By default this will be discovered based on the root_view_urls
        property.
        """
        if self.root_view_urls:
            module = self._return_module(self.root_view_urls)
            if module is None:
                logging.warn(
                    "{plugin} defined {urls} root view urls but the module was not found".format(
                        plugin=self.module_path, urls=self.root_view_urls
                    )
                )
            return module

    @property
    def settings_module(self):
        """
        Return a settings module, containing Django settings that this
        module wants to apply.

        For settings that take a tuple or list, these will be appended to the value from
        the base settings module set through conventional Django means.

        By default this will be discovered based on the django_settings
        property.
        """
        if self.django_settings:
            module = self._return_module(self.django_settings)
            if module is None:
                logging.warn(
                    "{plugin} defined {module} django settings but the module was not found".format(
                        plugin=self.module_path, module=self.django_settings
                    )
                )
            return module

    @property
    def options_module(self):
        """
        Return an options module, containing a config spec as the 'option_spec' value.

        These options should not override the core config spec.

        By default this will be discovered based on the kolibri_options
        property.
        """
        if self.kolibri_options:
            module = self._return_module(self.kolibri_options)
            if module is None:
                logging.warn(
                    "{plugin} defined {module} kolibri options but the module was not found".format(
                        plugin=self.module_path, module=self.kolibri_options
                    )
                )
            return module

    @property
    def option_defaults_module(self):
        """
        Return an option defaults module, containing default overrides as the 'options_default' value.

        By default this will be discovered based on the kolibri_options
        property.
        """
        if self.kolibri_option_defaults:
            module = self._return_module(self.kolibri_option_defaults)
            if module is None:
                logging.warn(
                    "{plugin} defined {module} kolibri option defaults but the module was not found".format(
                        plugin=self.module_path, module=self.kolibri_option_defaults
                    )
                )
            return module

    @property
    def url_slug(self):
        """
        Where should urls be included? By default, this is a lower-case version
        of the class name.

        Example::

            return r"my-plugin/"

        .. warning:: Avoid the empty string, as you might get conflicts.
        """
        return self.module_path.split(".")[-1].lower() + "/"
