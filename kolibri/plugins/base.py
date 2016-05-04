"""The base of a Kolibri plugin is the inheritence from
:class:`.KolibriPluginBase`.
"""
from __future__ import absolute_import, print_function, unicode_literals

import logging
import os

from django.conf.urls import url
from django.template.response import SimpleTemplateResponse
from kolibri.plugins import hooks
from kolibri.utils.conf import config

logger = logging.getLogger(__name__)


class MandatoryPluginMethodNotImplemented(NotImplementedError):
    def __init__(self):
        super(MandatoryPluginMethodNotImplemented, self).__init__("Plugin needs to define this method")


class MandatoryPluginAttributeNotImplemented(NotImplementedError):
    def __init__(self):
        super(MandatoryPluginAttributeNotImplemented, self).__init__("Plugin needs to define this attribute")


class KolibriPluginBase(object):
    """
    This is the base class that all Kolibri plugins need to implement.
    """

    # : Suggested property, not yet in use
    migrate_on_enable = False

    # : Suggested property, not yet in use
    collect_static_on_enable = False

    # : Suggested property, not yet in use
    collect_static_on_enable = False

    @classmethod
    def _module_path(cls):
        """
        Returns the path of the class inheriting this classmethod.
        There is no such thing as Class properties, that's why it's implemented
        as such.

        Used in KolibriPluginBase._installed_apps_add
        """
        return ".".join(cls.__module__.split(".")[:-1])

    def hooks(self):
        """
        Return a list of hooks and callables for each hook. To make your plugin
        extendible, consider only having hooks that call methods of your plugin
        class
        """
        raise MandatoryPluginMethodNotImplemented()

    def get_hooks(self):
        """
        The method actually called to generate hooks -- defined so that a plugin class can
        override this behavior to e.g. add hooks automatically.
        :yield: a (hook, callback) tuple, where hook is a string and callback a function
        """
        for hook, callback in self.hooks().items():
            yield hook, callback

    @classmethod
    def _installed_apps_add(cls):
        """Call this from your enable() method to have the plugin automatically
        added to Kolibri configuration"""
        module_path = cls._module_path()
        if module_path not in config['INSTALLED_APPS']:
            config['INSTALLED_APPS'].append(module_path)
        else:
            logger.warning("{} already enabled".format(module_path))

    @classmethod
    def _installed_apps_remove(cls):
        """Call this from your enable() method to have the plugin automatically
        added to Kolibri configuration"""
        module_path = cls._module_path()
        if module_path in config['INSTALLED_APPS']:
            config['INSTALLED_APPS'].remove(module_path)
        else:
            logger.warning("{} already disabled".format(module_path))

    @classmethod
    def enable(cls):
        """Modify the kolibri config dict to your plugin's needs"""
        cls._installed_apps_add()

    @classmethod
    def disable(cls):
        """Modify the kolibri config dict to your plugin's needs"""
        cls._installed_apps_remove()


class KolibriFrontEndPluginBase(KolibriPluginBase):
    """
    This is the class that all plugins that wish to load any assets into the front end
    must implement, in order for them to be part of the webpack asset loading pipeline.
    Minimally these must implement the following properties and methods:

    The name of the frontend module that this plugin defines.
    name = "example_module"

    The path to the Javascript file that defines the plugin/acts as the entry point.
    entry_file = "assets/js/example_module.js"

    This hook will register the frontend plugin to be available for rendering its built files into Django templates.
    def hooks(self):
        return {
            FRONTEND_PLUGINS: self._register_front_end_plugins
        }
    """

    def get_hooks(self):
        for h in super(KolibriFrontEndPluginBase, self).get_hooks():
            yield h
        if hasattr(self, 'base_url'):
            yield hooks.URLCONF_POPULATE, self.urlconf_populate

    def urlconf_populate(self):
        yield url('^' + self.base_url, self.viewfunc, name=self.base_url)

    def viewfunc(self, request):
        return SimpleTemplateResponse(template=self.template)

    @classmethod
    def webpack_bundle_data(cls):
        """
        Returns information needed by the webpack parsing process.
        :return: dict
        "name" - is the module path that the frontend plugin has.
        "entry_file" - is the Javascript file that defines the plugin.
        "external" - an optional flag currently used only by the core plugin.
        "core" - an optional flag *only* ever used by the core plugin.
        "events" - the hash of event names and method callbacks that the KolibriModule defined here registers to.
        "once" - the hash of event names and method callbacks that the KolibriModule defined here registers to for a
        one time callback.
        """
        try:
            output = cls.async_events()
            output.update({
                "name": cls.plugin_name(),
                "entry_file": cls.entry_file,
                "external": getattr(cls, "external", None),
                "core": getattr(cls, "core", None),
                "stats_file": cls.stats_file(),
                "module_path": cls._module_file_path(),
            })
            return output
        except KeyError:
            raise MandatoryPluginAttributeNotImplemented

    @classmethod
    def build_path(cls):
        return os.path.join(os.path.abspath(os.path.dirname(__name__)), cls._module_file_path(), "build")

    @classmethod
    def stats_file(cls):
        return os.path.join(cls.build_path(), "{plugin}_stats.json".format(plugin=cls.__name__))

    @classmethod
    def async_events(cls):
        return {
            "events": getattr(cls, "events", {}),
            "once": getattr(cls, "once", {}),
        }

    @classmethod
    def _module_file_path(cls):
        """
        Returns the path of the class inheriting this classmethod.
        There is no such thing as Class properties, that's why it's implemented
        as such.

        Used in KolibriFrontEndPluginBase._register_front_end_plugins
        """
        return os.path.join(*cls.__module__.split(".")[:-1])

    @classmethod
    def plugin_name(cls):
        """
        Returns the name of the frontend plugin as referenced in the frontend framework and template tags
        :return: string
        """
        return cls._module_path() + "." + cls.__name__

    @classmethod
    def _register_front_end_plugins(cls):
        """
        Call this to register front end plugins in a Kolibri plugin to allow for
        import into templates.
        """
        return cls.plugin_name(), cls.stats_file(), cls.async_events()
