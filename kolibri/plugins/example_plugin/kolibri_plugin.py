# -*- coding: utf-8 -*-
"""
Copy and modify this code for your own plugin.
"""
from __future__ import absolute_import, print_function, unicode_literals

import logging

from django.utils.translation import ugettext as _
from kolibri.plugins.base import KolibriFrontEndPluginBase, KolibriPluginBase
from kolibri.plugins.hooks import (
    BASE_FRONTEND_ASYNC, FRONTEND_PLUGINS, NAVIGATION_POPULATE
)

logger = logging.getLogger(__name__)


class NavMenuPlugin(KolibriPluginBase):
    """
    An example plugin that demonstrates how the Kolibri plugin system works. Adds items to the nav menu by registering
    a callback to the NAVIGATION_POPULATE hook.
    """

    @classmethod
    def enable(cls):
        """
        A plugin must implement this abstract method. It's called by the command ``kolibri plugin <NAME> enable`` to
        modify the kolibri settings file.

        :return: Nothing, though it may modify the mutable config parameter
        """
        super(NavMenuPlugin, cls).enable()
        logger.info("Enabled example plugin")

    @classmethod
    def disable(cls):
        """
        A plugin must implement this abstract method. It's called by the command ``kolibri plugin <NAME> disable`` to
        modify the kolibri settings file.

        :return: Nothing, though it may modify the mutable config parameter
        """
        super(NavMenuPlugin, cls).disable()
        logger.info("Disable example plugin")

    @staticmethod
    def main_navigation():
        """
        A callback registered in the ``hooks`` property of this class. It's defined as a method instead of a
        module-level function in order to allow other plugins to inherit this class and change the behavior.

        :return: A list of nav menu items used in the NAVIGATION_POPULATE hook.
        """
        return [{
            'menu_name': _("Google"),
            'menu_url': 'http://google.com',
        }]

    def hooks(self):
        """
        This method must return a dictionary, where the keys are pre-defined hooks and the values are callback
        functions.

        :return: A dictionary of hook-callback pairs.
        """
        return {
            NAVIGATION_POPULATE: self.main_navigation
        }


class ExtendedPlugin(NavMenuPlugin):
    """
    Demonstrates plugin inheritance. Notice that the ``hooks`` attribute need not be changed -- only the callback.
    """

    @classmethod
    def enable(cls):
        # Do nothing because the parent will initialize the plugin as we want
        pass

    @classmethod
    def disable(cls):
        # Do nothing because the parent will initialize the plugin as we want
        pass

    def main_navigation(self):
        """
        This method is overrided to return additional menu items using the core NAVIGATION_POPULATE hook.

        :return: A list of nav menu items used in the NAVIGATION_POPULATE hook.
        """
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


class KolibriExampleFrontEnd(KolibriFrontEndPluginBase):
    """
    Plugin to define a frontend plugin that can be loaded independently from other code.
    """
    entry_file = "assets/example/example_module.js"
    events = {
        'something_happened': 'hello_world'
    }
    once = {
        'nothing_happened': 'hello_world'
    }

    def hooks(self):
        return {
            FRONTEND_PLUGINS: self._register_front_end_plugins,
            BASE_FRONTEND_ASYNC: self.plugin_name,
        }


PLUGINS = [
    NavMenuPlugin,
    ExtendedPlugin,
    KolibriExampleFrontEnd,
]
