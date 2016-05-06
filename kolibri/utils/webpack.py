"""
This module manages the interface between webpack and Django.
It loads webpack bundle tracker stats files, and catalogues the different files
that need to be served in order to inject that frontend code into a Django template.
Originally, it was a monkeypatch of django-webpack-loader - but as our needs are somewhat
different, much of the code has simply been rewritten, and will continue to be done so to better much our use case.
"""
import json
import logging
import re
import time

from django.conf import settings
from django.contrib.staticfiles.storage import staticfiles_storage
from kolibri.plugins import hooks

logger = logging.getLogger(__name__)

PLUGIN_CACHE = {}

initialized = False

ignores = (re.compile(I) for I in ['.+\.hot-update.js', '.+\.map'])


class NoFrontEndPlugin(Exception):
    pass

class WebpackError(EnvironmentError):
    pass

def load_stats_file(stats_file, bundle_path):
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
    return {
        "files": stats["chunks"][bundle_path]
    }


def initialize_plugin_cache():
    """
    Function to initialize the plugin cache for Frontend Plugin information.
    """
    global PLUGIN_CACHE
    global initialized
    for getter_func in hooks.get_callables(hooks.FRONTEND_PLUGINS):
        bundle_path, stats_file, async_events = getter_func()
        try:
            PLUGIN_CACHE[bundle_path] = load_stats_file(stats_file, bundle_path)
        except IOError:
            raise IOError(
                'Error reading {}. Are you sure webpack has generated the file '
                'and the path is correct?'.format(stats_file))
        else:
            PLUGIN_CACHE[bundle_path]["async_events"] = async_events
    initialized = True

def check_plugin_cache():
    """
    Convenience function to check if the PLUGIN_CACHE has been initialized yet. If it has, it is a no-op.
    :return:
    """
    global initialized

    if (not initialized) or settings.DEBUG:
        initialize_plugin_cache()


def get_async_events(bundle_path):
    """
    Function to return dict of events that trigger plugin load, given the name of the frontend plugin.
    :param bundle_path: Name of the bundle (frontend plugin name).
    :return: Dictionary of dictionaries of event/method pairs, for 'events' and for 'once' - multi-time and one-time
    events, respectively.
    """
    global PLUGIN_CACHE

    check_plugin_cache()

    if bundle_path in PLUGIN_CACHE:
        return PLUGIN_CACHE[bundle_path]["async_events"]
    else:
        raise NoFrontEndPlugin("The specified plugin is not registered as a Front End Plugin")


def get_bundle(bundle_path):
    """
    Function to return all files needed, given the name of the frontend plugin.
    :param bundle_path: Name of the bundle (frontend plugin name).
    :return: Generator of dicts containing information about each file.
    """
    global PLUGIN_CACHE
    global ignores

    check_plugin_cache()

    if bundle_path in PLUGIN_CACHE:
        for file in PLUGIN_CACHE[bundle_path]["files"]:
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
