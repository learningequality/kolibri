"""The base of a Kolibri plugin is the inheritence from
:class:`.KolibriPluginBase`.
"""
from __future__ import absolute_import, print_function, unicode_literals


class MandatoryPluginMethodNotImplemented(Exception):

    def __init__(self):
        NotImplemented.__init__(self, "Plugin needs to define this method")


class KolibriPluginBase(object):
    """
    This is the base class that all Kolibri plugins need to implement.
    """

    #: Suggested property, not yet in use
    migrate_on_enable = False

    #: Suggested property, not yet in use
    collect_static_on_enable = False

    #: Suggested property, not yet in use
    collect_static_on_enable = False

    def hooks(self):
        """
        Return a list of hooks and callables for each hook. To make your plugin
        extendible, consider only having hooks that call methods of your plugin
        class
        """
        return {}

    @classmethod
    def enable(cls, kolibri_config):
        """Modify the kolibri config dict to your plugin's needs"""
        raise MandatoryPluginMethodNotImplemented()

    @classmethod
    def disable(cls, kolibri_config):
        """Modify the kolibri config dict to your plugin's needs"""
        raise MandatoryPluginMethodNotImplemented()
