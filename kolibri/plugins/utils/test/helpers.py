from contextlib import contextmanager

try:
    from importlib import reload
except ImportError:
    # This will happen on Python 2.7
    # use built in reload.
    reload = reload

import sys

from django.conf import settings
from django.urls import clear_url_caches

from kolibri.plugins import config
from kolibri.plugins.registry import registered_plugins


def _reload_module(module):
    if module in sys.modules:
        reload(sys.modules[module])


def _reset_plugin_dependent_modules():
    clear_url_caches()
    for module in [
        "kolibri.utils.options",
        "kolibri.options.conf",
        "kolibri.core.urls",
        settings.ROOT_URLCONF,
    ]:
        _reload_module(module)


@contextmanager
def plugin_enabled(*plugin_names):
    registered_plugins.register_plugins(plugin_names)
    _reset_plugin_dependent_modules()

    try:
        yield
    finally:
        for plugin_name in plugin_names:
            try:
                del registered_plugins._apps[plugin_name]
                if plugin_name in config["UPDATED_PLUGINS"]:
                    config["UPDATED_PLUGINS"].remove(plugin_name)
            except KeyError:
                pass
        config.save()
        _reset_plugin_dependent_modules()


@contextmanager
def plugin_disabled(*plugin_names):
    for plugin_name in plugin_names:
        try:
            del registered_plugins._apps[plugin_name]
        except KeyError:
            pass

    _reset_plugin_dependent_modules()

    try:
        yield
    finally:
        registered_plugins.register_plugins(plugin_names)
        _reset_plugin_dependent_modules()
