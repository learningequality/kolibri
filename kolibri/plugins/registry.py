"""
Plugins are initialized once when the server starts. Here are the initilization steps:

1. Each module listed in INSTALLED_APPS (including those listed in the kolibri conf file) is searched for the special
   ``kolibri_plugin`` module.
2. For each class in the module which inherits from ``KolibriPluginBase``, it's ``hooks`` method is called to inspect
   which hooks it defines.
3. The callback assigned by the plugin class to the hook is registered in a module variable.
4. At the appropriate time (see below) the callbacks for a given hook are all called.

A few notes:

* Kolibri defines some hooks that are used in the core app. These can be found in the kolibri.plugins.registry module.
* Arbitrary new hooks can be defined. At the Python level they're just dictionary keys. *Do not* user integers for
  hook names -- those are reserved for the hooks defined by the Kolibri core. *Do* namespace your hooks!
* *When* hook callbacks are called are entirely up to the hook definer. The core Kolibri app documents what hooks it
  calls and when -- you can call core Kolibri hooks in your plugins too!
* Callbacks *should* be called in the same order every time, but this is not a promise!

"""
from __future__ import absolute_import, print_function, unicode_literals

import importlib
import logging

from django.conf import settings

from . import hooks
from .base import KolibriPluginBase

logger = logging.getLogger(__name__)

registry = {}

__initialized = False


def initialize():
    """
    Called once to register hook callbacks.
    """
    global __initialized

    if not __initialized:
        logger.debug("Loading kolibri plugin registry...")

        for app in settings.INSTALLED_APPS:
            try:
                plugin_module = importlib.import_module(app + ".kolibri_plugin")
                logger.debug("Loaded kolibri plugin: {}".format(app))
                plugin_classes = []
                for obj in plugin_module.__dict__.values():
                    if type(obj) == type and obj is not KolibriPluginBase and issubclass(obj, KolibriPluginBase):
                        plugin_classes.append(obj)
                for plugin_klass in plugin_classes:
                    plugin_obj = plugin_klass()
                    for hook, callback in plugin_obj.hooks().items():
                        hooks.register_hook(hook, callback)
            except ImportError:
                pass

        __initialized = True
