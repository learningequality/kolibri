"""The base of a Kolibri plugin is the inheritence from
:class:`.KolibriPluginBase`.
"""
from __future__ import absolute_import, print_function, unicode_literals

import logging
import os
import re

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
    """

    @classmethod
    def webpack_bundle_data(cls):
        """
        Returns information needed by the webpack parsing process.
        :return: dict with keys "name", "entry_file", and, "external".
        "name" - is the name that the frontend plugin has.
        "entry_file" - is the Javascript file that defines the plugin.
        "external" - an optional flag used only by the kolibri_core plugin.
        """
        try:
            return {
                "name": cls.name,
                "entry_file": cls.entry_file,
                "external": getattr(cls, "external", None),
                "stats_file": cls.stats_file(),
                "module_name": cls._module_path(),
                "module_path": cls._module_file_path(),
            }
        except KeyError:
            raise MandatoryPluginAttributeNotImplemented

    @classmethod
    def stats_file(cls):
        return os.path.join(os.path.abspath(os.path.dirname(__name__)),
                            cls._module_file_path(), "{plugin}_stats.json".format(plugin=cls.name))

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
    def _register_front_end_plugins(cls):
        """
        Call this to register front end plugins in a Kolibri plugin to allow for
        import into templates.
        """
        module_path = cls._module_path()
        return {
            module_path: {
                'POLL_INTERVAL': 0.1,
                'ignores': (re.compile(I) for I in ['.+\.hot-update.js', '.+\.map']),
                "BUNDLE_DIR_NAME": module_path + "/",
                "STATS_FILE": cls.stats_file(),
            }
        }
