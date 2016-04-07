"""
The core app of Kolibri also uses the plugin API <3
"""
from __future__ import absolute_import, print_function, unicode_literals

from django.core.urlresolvers import reverse
from django.utils.translation import ugettext as _
from kolibri.plugins.base import KolibriFrontEndPluginBase, KolibriPluginBase
from kolibri.plugins.hooks import FRONTEND_PLUGINS, NAVIGATION_POPULATE


def main_navigation():
    """
    Callback for the plugin below
    :return: A list of nav menu items used in the NAVIGATION_POPULATE hook.
    """
    return [{
        'menu_name': _("Start page"),
        'menu_url': reverse('kolibri:index'),
    }]


class KolibriCore(KolibriPluginBase):
    """
    The most minimal plugin possible. Because it's in the core, it doesn't define ``enable`` or ``disable``. Those
    methods should never be called for this plugin.
    """
    def hooks(self):

        return {
            NAVIGATION_POPULATE: main_navigation
        }


class KolibriCoreFrontEnd(KolibriFrontEndPluginBase):
    """
    Plugin to handle
    """
    entry_file = "assets/src/kolibri_core_app.js"
    external = True
    core = True

    def hooks(self):
        return {
            FRONTEND_PLUGINS: self._register_front_end_plugins
        }


class KolibriComponentDemoPlugin(KolibriFrontEndPluginBase):
    """
    The SPA for demo of the component Views.
    """
    entry_file = "assets/src/components_demo.js"

    def hooks(self):
        return {
            FRONTEND_PLUGINS: self._register_front_end_plugins,
        }


PLUGINS = (
    KolibriCore,
    KolibriCoreFrontEnd,
    KolibriComponentDemoPlugin,
)
