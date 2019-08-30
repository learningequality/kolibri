"""
How plugins work
----------------

From a user's perspective, plugins are enabled and disabled through the command
line interface or through a UI. Users can also configure a plugin's behavior
through the main Kolibri interface.

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

import logging

from django.apps import AppConfig
from django.conf import settings
from django.utils.functional import SimpleLazyObject

from kolibri.plugins import config
from kolibri.plugins.utils import get_kolibri_plugin_object
from kolibri.plugins.utils import MultiplePlugins
from kolibri.plugins.utils import PluginDoesNotExist

logger = logging.getLogger(__name__)


class Registry(list):
    apps = set()

    def register(self, apps, was_configured=True):
        for app in apps:
            # In case we are registering from INSTALLED_APPS that could include
            # Django AppConfig objects.
            if isinstance(app, AppConfig):
                app = app.name
            try:

                if app not in self.apps:
                    plugin_object = get_kolibri_plugin_object(app)
                    self.append(plugin_object)
                    self.apps.add(app)
                if not was_configured and settings.configured:
                    raise RuntimeError(
                        "Initializing plugin {} caused Django settings to be configured".format(
                            app
                        )
                    )
            except (MultiplePlugins, ImportError):
                logger.warn("Cannot initialize plugin {}".format(app))
            except PluginDoesNotExist:
                pass


def __initialize():
    """
    Called once to register hook callbacks.
    """
    registry = Registry()
    logger.debug("Loading kolibri plugin registry...")
    was_configured = settings.configured
    if was_configured:
        raise RuntimeError(
            "Django settings already configured when plugin registry initialized"
        )
    registry.register(config.ACTIVE_PLUGINS, was_configured=was_configured)
    return registry


registered_plugins = SimpleLazyObject(__initialize)
