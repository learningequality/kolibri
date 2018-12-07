"""
Kolibri Core hooks
------------------

WIP! Many applications are supposed to live inside the core namespace to make
it explicit that they are part of the core.

Do we put all their hooks in one module or should each app have its own hooks
module?

Anyways, for now to get hooks started, we have some defined here...
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging

from kolibri.plugins.hooks import KolibriHook
from kolibri.plugins.utils import plugin_url

logger = logging.getLogger(__name__)


class NavigationHook(KolibriHook):

    # : A string label for the menu item
    label = "Untitled"

    # : A string or lazy proxy for the url
    url = "/"

    # Set this to True so that any time this is mixed in with a
    # frontend asset hook, the resulting frontend code will be rendered inline.
    inline = True

    def get_menu(self):
        menu = {}
        for hook in self.registered_hooks:
            menu[hook.label] = self.url
        return menu

    class Meta:

        abstract = True


class RoleBasedRedirectHook(KolibriHook):
    # User role to redirect for
    role = None

    # URL to redirect to
    url = None

    # Special flag to only redirect on first login
    # Default to False
    first_login = False

    def plugin_url(self, plugin_class, url_name):
        return plugin_url(plugin_class, url_name)

    class Meta:

        abstract = True
