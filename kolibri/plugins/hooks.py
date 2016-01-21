# -*- coding: utf-8 -*-
"""
Hooks are used for your plugin's ``hooks()`` method, returning a dictionary
with hooks you wish to use. For instance::

    from kolibri.plugins.base import KolibriPluginBase
    from kolibri.plugins.hooks import NAVIGATION_POPULATE

    class MyPlugin(KolibriPluginBase):

        def my_navigation(self, navigation_items):
            navigation_items.append(
                {
                    'menu_name': _("My list"),
                    'menu_url': reverse_lazy("my_plugin:list_of_things")
                }
            )

        def hooks(self):
            return {
                NAVIGATION_POPULATE: self.my_navigation
            }
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

__hook_index = -1
def __enumerate_hook():
    global __hook_index
    __hook_index += 1
    return __hook_index

# : Assign to a callable ``my_func(navigation)``.
NAVIGATION_POPULATE = __enumerate_hook()

REGISTERED_HOOKS = {
    x: [] for x in range(__hook_index + 1)
}

def register_hook(hook, callback):
    """
    Takes a hook identifier and adds it to the registry
    """
    if callback not in REGISTERED_HOOKS[hook]:
        REGISTERED_HOOKS[hook].append(callback)
    else:
        raise RuntimeError("Callback already registered")


def get_callables(hook):
    return REGISTERED_HOOKS[hook]
