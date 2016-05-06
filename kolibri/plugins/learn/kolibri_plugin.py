"""
The core app of Kolibri also uses the plugin API <3
"""
from __future__ import absolute_import, print_function, unicode_literals

from kolibri.plugins.base import KolibriFrontEndPluginBase


class LearnModule(KolibriFrontEndPluginBase):
    """
    The Learn module.
    """
    entry_file = "assets/src/learn.js"

    events = {
        "kolibri_register": "start"
    }

    base_url = "learn"

    template = "learn/learn.html"

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


PLUGINS = (
    LearnModule,
)
