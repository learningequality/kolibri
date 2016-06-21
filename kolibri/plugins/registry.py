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
from django.conf.urls import include, url

from .base import KolibriPluginBase

logger = logging.getLogger(__name__)

# : Main registry is private for now, as we figure out if there is any external
# : module that has a legitimate business
__registry = []

__initialized = False


def initialize():
    """
    Called once at load time to register hook callbacks.
    """
    global __initialized, __registry

    if not __initialized:
        logger.debug("Loading kolibri plugin registry...")

        for app in settings.INSTALLED_APPS:
            try:
                plugin_module = importlib.import_module(app + ".kolibri_plugin")
                logger.debug("Loaded kolibri plugin: {}".format(app))
                # Load a list of all class types in module
                all_classes = [cls for cls in plugin_module.__dict__.values() if isinstance(cls, type)]
                # Filter the list to only match the ones that belong to the module
                # and not the ones that have been imported
                plugin_package = plugin_module.__package__ if plugin_module.__package__ else \
                    plugin_module.__name__.rpartition('.')[0]
                all_classes = filter(lambda x: plugin_package + ".kolibri_plugin" == x.__module__, all_classes)
                plugin_classes = []
                for Klass in all_classes:
                    if type(Klass) == type and issubclass(Klass, KolibriPluginBase):
                        plugin_classes.append(Klass)
                for PluginClass in plugin_classes:
                    # Initialize the class, nothing more happens for now.
                    logger.debug("Initializing plugin: {}".format(PluginClass.__name__))
                    __registry.append(PluginClass())
            except ImportError:
                pass

        __initialized = True


def get_urls():

    global __initialized, __registry
    assert __initialized, "Registry not initialized"

    urlpatterns = []
    for plugin_instance in __registry:
        url_module = plugin_instance.url_module()
        if url_module:
            urlpatterns.append(
                url(
                    plugin_instance.url_slug(),
                    include(
                        url_module,
                        namespace=plugin_instance.url_namespace()
                    )
                )
            )

    return urlpatterns
