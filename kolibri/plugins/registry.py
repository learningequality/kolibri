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
from importlib import import_module

from django.apps import AppConfig
from django.conf import settings
from django.utils.functional import SimpleLazyObject

from kolibri.plugins import config
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import HookSingleInstanceError
from kolibri.plugins.utils import initialize_kolibri_plugin
from kolibri.plugins.utils import is_plugin_updated
from kolibri.plugins.utils import MultiplePlugins
from kolibri.plugins.utils import PluginDoesNotExist
from kolibri.plugins.utils import PluginLoadsApp

logger = logging.getLogger(__name__)


__initialized = False


class PluginExistsInApp(Exception):
    """
    This exception is raise when a plugin is initialized inside a Django app and
    it is found to actually have defined a plugin. NO!
    """


def parse_installed_app_entry(app):
    # In case we are registering non-plugins from INSTALLED_APPS (the usual use case)
    # that could include Django AppConfig objects, or module paths to Django AppConfig objects.
    if isinstance(app, AppConfig):
        return app.name
    # Check if this is a module path or an import path to an AppConfig object.
    # Logic here modified from:
    # https://github.com/django/django/blob/c669cf279ae7b3e02a61db4fb077030a4db80e4f/django/apps/config.py#L86
    try:
        # If import_module succeeds, entry is a path to an app module,
        # so we carry on.
        # Otherwise, entry is a path to an app config class or an error.
        import_module(app)
    except ImportError:
        mod_path, _, cls_name = app.rpartition(".")
        try:
            module = import_module(mod_path)
            cls = getattr(module, cls_name)
            return cls.name
        except (ImportError, AttributeError):
            # If none of this works out, something has been misconfigured
            # Django will be picking this up soon and give more detailed debugging
            # so we just let this pass silently for now.
            pass
    # If we get to here, just return the original.
    return app


class Registry(object):
    __slots__ = ("_apps",)

    def __init__(self):
        self._apps = {}

    def __iter__(self):
        return iter(app for app in self._apps.values() if app is not None)

    def __contains__(self, app):
        if issubclass(app, KolibriPluginBase):
            app = app.__module__.replace(".kolibri_plugin", "")
        return app in self._apps

    def get(self, app):
        return self._apps.get(app, None)

    def register_plugins(self, apps):
        """
        Register plugins - i.e. modules that have a KolibriPluginBase derived
        class in their kolibri_plugin.py module - these can be enabled and disabled
        by the Kolibri plugin machinery.
        """
        for app in apps:
            try:
                if app not in self._apps:
                    plugin_object = initialize_kolibri_plugin(app)
                    self._apps[app] = plugin_object
                    if is_plugin_updated(app):
                        config["UPDATED_PLUGINS"].add(app)
                        config.save()
            except (
                PluginDoesNotExist,
                MultiplePlugins,
                ImportError,
                HookSingleInstanceError,
                PluginLoadsApp,
            ) as e:
                logger.error("Cannot initialize plugin {}".format(app))
                logger.error(str(e))
                logger.error("Disabling plugin {}".format(app))
                config.clear_plugin(app)
                if isinstance(e, PluginLoadsApp):
                    logger.error(
                        "Please restart Kolibri now that this plugin is disabled"
                    )
                    raise

    def register_non_plugins(self, apps):
        """
        Register non-plugins - i.e. modules that do not have a KolibriPluginBase derived
        class in their kolibri_plugin.py module - these cannot be enabled and disabled
        by the Kolibri plugin machinery, but may wish to still register Kolibri Hooks
        """
        for app in apps:
            app = parse_installed_app_entry(app)
            if app not in self._apps:
                try:

                    initialize_kolibri_plugin(app)
                    # Raise an error here because non-plugins should raise a PluginDoesNotExist exception
                    # if they are properly configured.
                    raise PluginExistsInApp(
                        "Django app {} contains a plugin definition".format(app)
                    )
                except MultiplePlugins:
                    raise PluginExistsInApp(
                        "Django app {} contains multiple plugin definitions".format(app)
                    )
                except (PluginDoesNotExist, ImportError):
                    # Register so that we don't do this twice.
                    self._apps[app] = None


def __initialize():
    """
    Called once to register hook callbacks.
    """
    global __initialized
    registry = Registry()
    logger.debug("Loading kolibri plugin registry...")
    was_configured = settings.configured
    if was_configured:
        raise RuntimeError(
            "Django settings already configured when plugin registry initialized"
        )
    registry.register_plugins(config.ACTIVE_PLUGINS)
    __initialized = True
    return registry


registered_plugins = SimpleLazyObject(__initialize)


def is_initialized():
    return __initialized
