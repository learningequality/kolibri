"""
The core app of Kolibri also uses the plugin API <3
"""
from __future__ import absolute_import, print_function, unicode_literals

from kolibri.plugins.base import KolibriFrontEndPluginBase


class NavigationModule(KolibriFrontEndPluginBase):
    """
    The Navigation module.
    """
    entry_file = "assets/src/navigation.js"


PLUGINS = (
    NavigationModule,
)
