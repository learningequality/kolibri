"""
The core app of Kolibri also uses the plugin API <3
"""
from __future__ import absolute_import, print_function, unicode_literals

from kolibri.plugins.base import KolibriFrontEndPluginBase
from kolibri.plugins.hooks import FRONTEND_PLUGINS


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


class ManagementModule(KolibriFrontEndPluginBase):
    """
    The Management module.
    """
    entry_file = "assets/src/management.js"

    base_url = "management"

    template = "kolibri/management.html"

    def nav_items(self):
        return (
            {
                "url": "foo/bar",
                "text": "Management Foo!"
            },
        )

    def user_nav_items(self):
        return (
            {
                "url": "learners",
                "text": "Learner Management"
            },
        )

    def hooks(self):
        return {
            FRONTEND_PLUGINS: self._register_front_end_plugins,
        }


class LearnModule(KolibriFrontEndPluginBase):
    """
    The Learn module.
    """
    entry_file = "assets/src/learn.js"

    events = {
        "kolibri_register": "start"
    }

    base_url = "learn"

    template = "kolibri/learn.html"

    def nav_items(self):
        return (
            {
                "url": "",
                "text": "Learn!"
            },
            {
                "url": "foo",
                "text": "Learn foo!"
            }
        )

    def hooks(self):
        return {
            FRONTEND_PLUGINS: self._register_front_end_plugins,
        }


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
    KolibriCoreFrontEnd,
    ManagementModule,
    LearnModule,
    NavigationModule,
)
