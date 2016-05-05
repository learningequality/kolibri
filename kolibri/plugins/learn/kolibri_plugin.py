"""
The core app of Kolibri also uses the plugin API <3
"""
from __future__ import absolute_import, print_function, unicode_literals

from kolibri.plugins.base import KolibriFrontEndPluginBase
from kolibri.plugins.hooks import FRONTEND_PLUGINS


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

    def hooks(self):
        return {
            FRONTEND_PLUGINS: self._register_front_end_plugins,
        }

PLUGINS = (
    LearnModule,
)
