# -*- coding: utf-8 -*-
"""
Kolibri example plugin
======================

Copy and modify this code for your own plugin.

"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals


from django.utils.translation import ugettext as _

from kolibri.plugins.base import KolibriPluginBase
from kolibri.plugins.hooks import NAVIGATION_POPULATE


class NavMenuPlugin(KolibriPluginBase):
    """
    An example plugin that demonstrates how the Kolibri plugin system works. Adds items to the nav menu by registering
    a callback to the NAVIGATION_POPULATE hook.
    """

    @classmethod
    def enable(cls, config):
        """
        A plugin must implement this abstract method. It's called by the command ``kolibri plugin <NAME> enable`` to
        modify the kolibri settings file.

        :param config: A dictionary of settings, like the one at ``django.conf.settings``.
        :return: Nothing, though it may modify the mutable config parameter
        """
        print("Activating example plugin")
        # Make this automatic and use __name__ ?
        config["INSTALLED_APPS"].append("kolibri.plugins.example_plugin")

    @classmethod
    def disable(cls, config):
        """
        A plugin must implement this abstract method. It's called by the command ``kolibri plugin <NAME> disable`` to
        modify the kolibri settings file.

        :param config: A dictionary of settings, like the one at ``django.conf.settings``.
        :return: Nothing, though it may modify the mutable config parameter
        """
        print("Deactivating example plugin")
        # Make this automatic and use __name__ ?
        config["INSTALLED_APPS"].remove("kolibri.plugins.example_plugin")

    @staticmethod
    def main_navigation():
        """
        A callback registered in the ``hooks`` property of this class. It's defined as a method instead of a
        module-level function in order to allow other plugins to inherit this class and change the behavior.
        """
        return [{
            'menu_name': _("Google"),
            'menu_url': 'http://google.com',
        }]

    @property
    def hooks(self):
        """
        Normally ``hooks`` should be an attribute -- here we use the ``property`` decorator to simulate that.
        This allows the callback to be changed by subclasses without changing the ``hooks`` attribute.
        """
        return {
            NAVIGATION_POPULATE: self.main_navigation
        }


class ExtendedPlugin(NavMenuPlugin):
    """
    Demonstrates plugin inheritance. Notice that the ``hooks`` attribute need not be changed -- only the callback.
    """
    @classmethod
    def enable(cls, config):
        pass

    @classmethod
    def disable(cls, config):
        pass

    def main_navigation(self):
        return [
            {
                'menu_name': _('Disney'),
                'menu_url': 'http://disney.com',
            },
            {
                'menu_name': _('Yahoo'),
                'menu_url': 'http://yahoo.com',
            }
        ]
