"""
This module manages the interface between webpack and Django.
It loads webpack bundle tracker stats files, and catalogues the different files
that need to be served in order to inject that frontend code into a Django template.
Originally, it was a monkeypatch of django-webpack-loader - but as our needs are somewhat
different, much of the code has simply been rewritten, and will continue to be done so to better much our use case.
"""
import json
import re
import time

from django.conf import settings
from django.contrib.staticfiles.storage import staticfiles_storage
from kolibri.plugins import hooks

PLUGIN_CACHE = {}

initialized = False

ignores = (re.compile(I) for I in ['.+\.hot-update.js', '.+\.map'])


class NoFrontEndPlugin(Exception):
    pass

class WebpackError(EnvironmentError):
    pass

def load_stats_file(stats_file):
    """
    Function to open a webpack bundle tracker stats file to get information about the file chunks needed.
    :param stats_file: The path to the stats file.
    :return: A dict containing the stats for the frontend files.
    """
    with open(stats_file) as f:
        stats = json.load(f)
    if settings.DEBUG:
        timeout = 0
        while stats['status'] == 'compiling':
            time.sleep(getattr(settings, 'WEBPACK_POLL_INTERVAL', 0.1))
            timeout += getattr(settings, 'WEBPACK_POLL_INTERVAL', 0.1)
            with open(stats_file) as f:
                stats = json.load(f)
            if timeout >= getattr(settings, 'WEBPACK_POLL_INTERVAL', 1.0):
                raise WebpackError('Webpack compilation still in progress')
        if stats['status'] == 'error':
            raise WebpackError('Webpack compilation has errored')
    return stats


def initialize_plugin_cache():
    """
    Function to initialize the plugin cache.
    """
    global PLUGIN_CACHE
    global initialized
    for callback in hooks.get_callables(hooks.FRONTEND_PLUGINS):
        bundle_path, stats_file = callback()
        try:
            PLUGIN_CACHE[bundle_path] = load_stats_file(stats_file)["chunks"][bundle_path]
        except IOError:
            raise IOError(
                'Error reading {}. Are you sure webpack has generated the file '
                'and the path is correct?'.format(stats_file))
    initialized = True


def get_bundle(bundle_path):
    """
    Function to return all files needed, given the name of the bundle, and the name of the Python plugin.
    :param bundle_path: Name of the bundle (frontend plugin name).
    :return: Generator of dicts containing information about each file.
    """
    global PLUGIN_CACHE
    global initialized
    global ignores

    if (not initialized) or settings.DEBUG:
        initialize_plugin_cache()

    if bundle_path in PLUGIN_CACHE:
        for file in PLUGIN_CACHE[bundle_path]:
            filename = file['name']
            ignore = any(regex.match(filename) for regex in ignores)
            if not ignore:
                relpath = '{0}/{1}'.format(bundle_path, filename)
                file['url'] = staticfiles_storage.url(relpath)
                yield file
    else:
        raise NoFrontEndPlugin("The specified plugin is not registered as a Front End Plugin")


def get_webpack_bundle(bundle_path, extension):
    """
    Function to return generator of file dicts, with the option of filtering by extension.
    :param bundle_path: Name of the bundle (frontend plugin name).
    :param extension: File extension to do an inclusive filter by.
    :return: Generator of dicts containing information about each file.
    """
    bundle = get_bundle(bundle_path)
    if extension:
        bundle = (chunk for chunk in bundle if chunk['name'].endswith('.{0}'.format(extension)))
    return bundle
