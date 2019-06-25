import importlib
import logging

from django.core.exceptions import AppRegistryNotReady
from django.core.urlresolvers import reverse

from kolibri.plugins.base import KolibriPluginBase
from kolibri.utils.conf import config

logger = logging.getLogger(__name__)


class PluginDoesNotExist(Exception):
    """
    This exception is local to the CLI environment in case actions are performed
    on a plugin that cannot be loaded.
    """


class PluginBaseLoadsApp(Exception):
    """
    An exception raised in case a kolibri_plugin.py results in loading of the
    Django app stack.
    """

    pass


def plugin_url(plugin_class, url_name):
    return reverse(
        "kolibri:{namespace}:{url_name}".format(
            namespace=plugin_class().url_namespace(), url_name=url_name
        )
    )


def _is_plugin(obj):
    return (
        # Check that the object is an instance of type
        # i.e. that it is a class definition, not an
        # instantiated class.
        # Failing to do this will result in the call to
        # issubclass below blowing up.
        isinstance(obj, type)
        and obj is not KolibriPluginBase
        and issubclass(obj, KolibriPluginBase)
    )


def get_kolibri_plugin(plugin_name):
    """
    Try to load kolibri_plugin from given plugin module identifier

    :returns: A list of classes inheriting from KolibriPluginBase
    """

    plugin_classes = []

    try:
        # Exceptions are expected to be thrown from here.
        plugin_module = importlib.import_module(plugin_name + ".kolibri_plugin")
        # If no exception is thrown, use this to populate our plugin classes.
        for obj in plugin_module.__dict__.values():
            if _is_plugin(obj):
                plugin_classes.append(obj)
    except ImportError as e:
        # Python 2: message, Python 3: msg
        exc_message = getattr(e, "message", getattr(e, "msg", None))
        if exc_message.startswith("No module named"):
            msg = (
                "Plugin '{}' does not seem to exist. Is it on the PYTHONPATH?"
            ).format(plugin_name)
            raise PluginDoesNotExist(msg)
        else:
            raise
    except AppRegistryNotReady:
        msg = (
            "Plugin '{}' loads the Django app registry, which it isn't "
            "allowed to do while enabling or disabling itself."
        ).format(plugin_name)
        raise PluginBaseLoadsApp(msg)

    if not plugin_classes:
        # There's no clear use case for a plugin without a KolibriPluginBase
        # inheritor, for now just throw a warning
        logger.warning(
            "Plugin '{}' has no KolibriPluginBase defined".format(plugin_name)
        )

    return plugin_classes


def enable_plugin(plugin_name):
    plugin_classes = get_kolibri_plugin(plugin_name)
    for klass in plugin_classes:
        klass.enable()


def disable_plugin(plugin_name):
    try:
        plugin_classes = get_kolibri_plugin(plugin_name)
        for klass in plugin_classes:
            klass.disable()
    except PluginDoesNotExist as e:
        logger.error(str(e))
        logger.warning(
            "Removing '{}' from configuration in a naive way.".format(plugin_name)
        )
        if plugin_name in config["INSTALLED_APPS"]:
            config["INSTALLED_APPS"].remove(plugin_name)
            logger.info("Removed '{}' from INSTALLED_APPS".format(plugin_name))
        else:
            logger.warning(
                (
                    "Could not find any matches for {} in INSTALLED_APPS".format(
                        plugin_name
                    )
                )
            )
