"""
How plugins work
----------------

From a user's perspective, plugins are enabled and disabled through the command
line interface or through a UI. Users can also configure a plugin's behavior
through the main Kolibri interface.


.. note::
    We have not yet written a configuration API, for now just make sure
    configuration-related variables are kept in a central location of your
    plugin.

    It's up to the plugin to provide configuration ``Form`` classes and register
    them.

    We should aim for a configuration style in which data can be pre-seeded,
    dumped and exported easily.

From a developer's perspective, plugins are wrappers around Django applications,
listed in ``ACTIVE_PLUGINS`` on the kolibri config object.
They are initialized before Django's app registry is initialized and then their
relevant Django apps are added to the ``INSTALLED_APPS`` of kolibri.

Loading a plugin
~~~~~~~~~~~~~~~~

In general, a plugin should **never** modify internals of Kolibri or other
plugins without using the hooks API or normal conventional Django scenarios.

.. note::

    Each app in ``ACTIVE_PLUGINS`` in the kolibri conf is searched for the
    special ``kolibri_plugin`` module.

Everything that a plugin does is expected to be defined through
``<myapp>/kolibri_plugin.py``.


"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import importlib
import logging

from django.conf import settings
from django.utils.functional import SimpleLazyObject

from .base import KolibriPluginBase
from kolibri.utils.conf import config

logger = logging.getLogger(__name__)


class Registry(list):
    apps = set()

    def register(self, apps, was_configured):
        for app in apps:
            try:

                if app not in self.apps:

                    plugin_module_string = app + ".kolibri_plugin"
                    plugin_module = importlib.import_module(plugin_module_string)

                    logger.debug("Loaded kolibri plugin: {}".format(app))
                    # Load a list of all class types in module
                    all_classes = [
                        cls
                        for cls in plugin_module.__dict__.values()
                        if isinstance(cls, type)
                    ]
                    # Filter the list to only match the ones that belong to the module
                    # and not the ones that have been imported
                    plugin_package = (
                        plugin_module.__package__
                        if plugin_module.__package__
                        else plugin_module.__name__.rpartition(".")[0]
                    )
                    all_classes = filter(
                        lambda x: plugin_package + ".kolibri_plugin" == x.__module__,
                        all_classes,
                    )
                    plugin_classes = []
                    for class_definition in all_classes:
                        if isinstance(class_definition, type) and issubclass(
                            class_definition, KolibriPluginBase
                        ):
                            plugin_classes.append(class_definition)
                    for PluginClass in plugin_classes:
                        # Initialize the class, nothing more happens for now.
                        logger.debug(
                            "Initializing plugin: {}".format(PluginClass.__name__)
                        )
                        self.append(PluginClass())
                    self.apps.add(app)
                if not was_configured and settings.configured:
                    logger.warn(
                        "Initializing plugin {} caused Django settings to be configured".format(
                            app
                        )
                    )
                    was_configured = True
            except ImportError:
                pass


def __initialize():
    """
    Called once to register hook callbacks.
    """
    registry = Registry()
    logger.debug("Loading kolibri plugin registry...")
    was_configured = settings.configured
    if was_configured:
        logger.warn(
            "Django settings already configured when plugin registry initialized"
        )
    registry.register(config.ACTIVE_PLUGINS, was_configured)
    return registry


registered_plugins = SimpleLazyObject(__initialize)
