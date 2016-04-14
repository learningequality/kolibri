# -*- coding: utf-8 -*-
"""
Copy and modify this code for your own plugin.
"""
from __future__ import absolute_import, print_function, unicode_literals

import logging

from django.conf.urls import include
from django.core.urlresolvers import reverse
from django.utils.translation import ugettext as _
from kolibri.plugins.base import KolibriFrontEndPluginBase, KolibriPluginBase
from kolibri.plugins.hooks import (
    FRONTEND_PLUGINS, IMPORT_URLS, NAVIGATION_POPULATE
)

logger = logging.getLogger(__name__)


class NavMenuPlugin(KolibriPluginBase):

    @staticmethod
    def main_navigation():
        """
        A callback registered in the ``hooks`` property of this class. It's defined as a method instead of a
        module-level function in order to allow other plugins to inherit this class and change the behavior.

        :return: A list of nav menu items used in the NAVIGATION_POPULATE hook.
        """
        return [{
            'menu_name': _("Learn"),
            'menu_url': reverse("kolibri:learn"),
        }]

    @staticmethod
    def urls():
        return [{
            'url_base': r'^learn/',
            'urls': include("kolibri.plugins.learn.urls")
        }]

    def hooks(self):
        """
        This method must return a dictionary, where the keys are pre-defined hooks and the values are callback
        functions.

        :return: A dictionary of hook-callback pairs.
        """
        return {
            NAVIGATION_POPULATE: self.main_navigation,
            IMPORT_URLS: self.urls,
        }


class KolibriLearnFrontEnd(KolibriFrontEndPluginBase):
    """
    The base learn code for the learn page.
    """
    entry_file = "assets/src/learn_module.js"

    events = {
        "kolibri_register": "start"
    }

    def hooks(self):
        return {
            FRONTEND_PLUGINS: self._register_front_end_plugins,
        }


PLUGINS = [
    NavMenuPlugin,
    KolibriLearnFrontEnd,
]
