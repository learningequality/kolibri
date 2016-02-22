import json
import re
import time

from django.conf import settings
from django.contrib.staticfiles.storage import staticfiles_storage
from kolibri.plugins import hooks

PLUGIN_CACHE = {}

__initialized = False

ignores = (re.compile(I) for I in ['.+\.hot-update.js', '.+\.map'])


class NoFrontEndPlugin(Exception):
    pass


def load_stats_file(stats_file):
    with open(stats_file) as f:
        stats = json.load(f)
    if settings.DEBUG:
        timeout = 0
        while stats['status'] == 'compiling':
            time.sleep(settings.get('WEBPACK_POLL_INTERVAL', 0.1))
            timeout += settings.get('WEBPACK_POLL_INTERVAL', 0.1)
            with open(stats_file) as f:
                stats = json.load(f)
            if timeout >= settings.get('WEBPACK_TIMEOUT', 1.0):
                raise Exception('Webpack compilation still in progress')
        if stats['status'] == 'error':
            raise IOError
    return stats


def get_bundle(bundle_name, plugin):
    global PLUGIN_CACHE
    global __initialized
    global ignores

    if not __initialized or settings.DEBUG:
        for callback in hooks.get_callables(hooks.FRONTEND_PLUGINS):
            module_path, stats_file = callback()
            try:
                PLUGIN_CACHE[module_path] = load_stats_file(stats_file)
            except IOError:
                raise IOError(
                    'Error reading {}. Are you sure webpack has generated the file '
                    'and the path is correct?'.format(stats_file))
        __initialized = True

    if plugin in PLUGIN_CACHE:
        for file in PLUGIN_CACHE[plugin]['chunks'][bundle_name]:
            filename = file['name']
            ignore = any(regex.match(filename) for regex in ignores)
            if not ignore:
                relpath = '{0}/{1}'.format(plugin, filename)
                file['url'] = staticfiles_storage.url(relpath)
                yield file
    else:
        raise NoFrontEndPlugin("The specified plugin is not registered as a Front End Plugin")


def get_webpack_bundle(bundle_name, extension, plugin):
    bundle = get_bundle(bundle_name, plugin)
    if extension:
        bundle = (chunk for chunk in bundle if chunk['name'].endswith('.{0}'.format(extension)))
    return bundle
