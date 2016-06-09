"""
Kolibri Core hooks
------------------

WIP! Many applications are supposed to live inside the core namespace to make
it explicit that they are part of the core.

Do we put all their hooks in one module or should each app have its own hooks
module?

Anyways, for now to get hooks started, we have some defined here...
"""

from __future__ import absolute_import, print_function, unicode_literals

import logging

from kolibri.plugins.hooks import KolibriHook

logger = logging.getLogger(__name__)


class NavigationHook(KolibriHook):

    # : A string label for the menu item
    label = "Untitled"

    # : A string or lazy proxy for the url
    url = "/"

    # : A method to return a dictionary with nav items for all registered hooks
    def get_menu(self):
        menu = {}
        for hook in self.registered_hooks:
            menu[hook.url] = str(hook.label)
        return menu

    class Meta:

        abstract = True
