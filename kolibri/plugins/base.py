"""The base of a Kolibri plugin is the inheritence from
:class:`.KolibriPluginBase`.
"""
from __future__ import absolute_import, print_function, unicode_literals

import logging

from kolibri.utils.conf import config

logger = logging.getLogger(__name__)


class MandatoryPluginMethodNotImplemented(NotImplementedError):

    def __init__(self):
        super(MandatoryPluginMethodNotImplemented, self).__init__("Plugin needs to define this method")


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
        return {}

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
