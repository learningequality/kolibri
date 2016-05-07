"""
How plugins work
----------------

From a user's perspective, plugins are enabled and disabled through the command
line interface or through a UI. Users can also configure a plugin's behavior
through the main Kolibri interface. See: :ref:`user-plugins`.


.. note::
    We have not yet written a configuration API, for now just make sure
    configuration-related variables are kept in a central location of your
    plugin.

    It's up to the plugin to provide configuration ``Form`` classes and register
    them.

    We should aim for a configuration style in which data can be pre-seeded,
    dumped and exported easily.

From a developer's perspective, plugins are Django applications listed
in ``INSTALLED_APPS`` and are initialized once when the server starts, mean at
the load time of the django project, i.e. Kolibri.

Loading a plugin
~~~~~~~~~~~~~~~~

In general, a plugin should **never** modify internals of Kolibri or other
plugins without using the hooks API or normal conventional Django scenarios.

.. note::

    Each app in ``INSTALLED_APPS`` is searched for the special
    ``kolibri_plugin`` module.

Everything that a plugin does is expected to be defined through
``<myapp>/kolibri_plugin.py``.


"""
from __future__ import absolute_import, print_function, unicode_literals

import importlib
import logging

from django.conf import settings

from .base import KolibriPluginBase

logger = logging.getLogger(__name__)

registry = {}

__initialized = False


def initialize():
    """
    Called once at load time to register hook callbacks.
    """
    global __initialized

    if not __initialized:
        logger.debug("Loading kolibri plugin registry...")

        for app in settings.INSTALLED_APPS:
            try:
                plugin_module = importlib.import_module(app + ".kolibri_plugin")
                logger.debug("Loaded kolibri plugin: {}".format(app))
                all_classes = dict([(name, cls) for name, cls in plugin_module.__dict__.items() if isinstance(cls, type)])
                plugin_classes = []
                for obj in all_classes.values():
                    if type(obj) == type and issubclass(obj, KolibriPluginBase):
                        plugin_classes.append(obj)
                for plugin_klass in plugin_classes:
                    # Initialize the class, nothing more happens for now.
                    logger.debug("Initializing plugin: {}".format(plugin_klass.__name__))
                    plugin_klass()
            except ImportError:
                pass

        __initialized = True
