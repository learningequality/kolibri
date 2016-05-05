"""
The core app of Kolibri also uses the plugin API <3
"""
from __future__ import absolute_import, print_function, unicode_literals

from kolibri.plugins.base import KolibriFrontEndPluginBase
from kolibri.plugins.hooks import FRONTEND_PLUGINS


class ManagementModule(KolibriFrontEndPluginBase):
    """
    The Management module.
    """
    entry_file = "assets/src/management.js"

    base_url = "management"

    template = "management/management.html"

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

PLUGINS = (
    ManagementModule,
)
