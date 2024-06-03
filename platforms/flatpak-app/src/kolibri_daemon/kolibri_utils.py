from __future__ import annotations

import importlib.util
import logging
import os

from .content_extensions_manager import ContentExtensionsManager

logger = logging.getLogger(__name__)

# These Kolibri plugins must be enabled for the application to function:
REQUIRED_PLUGINS = [
    "kolibri.plugins.app",
]

# These Kolibri plugins will be automatically enabled if they are available:
OPTIONAL_PLUGINS = [
    "kolibri_app_desktop_xdg_plugin",
    "kolibri_desktop_auth_plugin",
    "kolibri_dynamic_collections_plugin",
    "kolibri_zim_plugin",
]

# TODO: Automatically enable plugins from flatpak plugin extensions.


def init_kolibri(**kwargs):
    _init_kolibri_env()

    from kolibri.utils.main import initialize

    for plugin_name in REQUIRED_PLUGINS:
        _enable_kolibri_plugin(plugin_name)

    for plugin_name in OPTIONAL_PLUGINS:
        _enable_kolibri_plugin(plugin_name, optional=True)

    initialize(**kwargs)


def _init_kolibri_env():
    os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_app.kolibri_settings"
    os.environ["KOLIBRI_PROJECT"] = "kolibri-gnome"

    # Kolibri defaults to a very large thread pool. Because we expect this
    # application to be used in a single user environment with a limited
    # workload, we can use a smaller number of threads.
    os.environ.setdefault("KOLIBRI_CHERRYPY_THREAD_POOL", "10")

    # TODO: It would be nice to tell Kolibri to please use a more limited set of
    #       facility and device settings defaults:
    #       <https://github.com/learningequality/kolibri-installer-gnome/issues/106>

    content_extensions_manager = ContentExtensionsManager()
    content_extensions_manager.apply(os.environ)


def _enable_kolibri_plugin(plugin_name: str, optional=False) -> bool:
    from kolibri.plugins import config as plugins_config
    from kolibri.plugins.utils import enable_plugin

    if optional and not importlib.util.find_spec(plugin_name):
        return False

    if plugin_name not in plugins_config.ACTIVE_PLUGINS:
        logger.info(f"Enabling plugin {plugin_name}")
        enable_plugin(plugin_name)

    return True
