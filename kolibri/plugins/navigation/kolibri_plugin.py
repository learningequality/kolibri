"""
The core app of Kolibri also uses the plugin API <3
"""
from __future__ import absolute_import, print_function, unicode_literals

from kolibri.plugins.base import KolibriFrontEndPluginBase
from kolibri.plugins.hooks import FRONTEND_PLUGINS


class NavigationModule(KolibriFrontEndPluginBase):
    """
    The Navigation module.
    """
    entry_file = "assets/src/navigation.js"

    def hooks(self):
        return {
            FRONTEND_PLUGINS: self._register_front_end_plugins
        }


PLUGINS = (
    NavigationModule,
)
