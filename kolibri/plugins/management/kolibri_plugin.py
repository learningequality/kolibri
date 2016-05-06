"""
The core app of Kolibri also uses the plugin API <3
"""
from __future__ import absolute_import, print_function, unicode_literals

from kolibri.plugins.base import KolibriFrontEndPluginBase


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


PLUGINS = (
    ManagementModule,
)
