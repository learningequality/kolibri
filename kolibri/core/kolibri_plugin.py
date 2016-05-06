"""
The core app of Kolibri also uses the plugin API <3
"""
from __future__ import absolute_import, print_function, unicode_literals

from kolibri.plugins.base import KolibriFrontEndPluginBase


class KolibriCoreFrontEnd(KolibriFrontEndPluginBase):
    """
    Plugin to handle
    """
    entry_file = "assets/src/kolibri_core_app.js"
    external = True
    core = True


PLUGINS = (
    KolibriCoreFrontEnd,
)
