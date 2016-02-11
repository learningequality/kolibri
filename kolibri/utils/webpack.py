from webpack_loader.utils import get_bundle
from webpack_loader.templatetags.webpack_loader import filter_by_extension

from kolibri.plugins import hooks

PLUGIN_CACHE = {}

__initialized = False


class NoFrontEndPlugin(Exception):
    pass


def get_plugin(plugin):
    global PLUGIN_CACHE
    global __initialized

    if not __initialized:
        for callback in hooks.get_callables(hooks.FRONTEND_PLUGINS):
            PLUGIN_CACHE.update(callback())
        __initialized = True

    if plugin in PLUGIN_CACHE:
        return PLUGIN_CACHE[plugin]
    else:
        raise NoFrontEndPlugin("The specified plugin is not registered as a Front End Plugin")


def get_webpack_bundle(bundle_name, extension, plugin):
    bundle = get_bundle(bundle_name, get_plugin(plugin))
    if extension:
        bundle = filter_by_extension(bundle, extension)
    return bundle
