"""
This module manages the interface between webpack and Django.
It loads webpack bundle tracker stats files, and catalogues the different files
that need to be served in order to inject that frontend code into a Django template.
Originally, it was a monkeypatch of django-webpack-loader - but as our needs are somewhat
different, much of the code has simply been rewritten, and will continue to be done so to better much our use case.
"""
from __future__ import absolute_import, print_function, unicode_literals

import json
import logging
import re
import time

from django.conf import settings
from django.contrib.staticfiles.storage import staticfiles_storage

from . import hooks


logger = logging.getLogger(__name__)

PLUGIN_CACHE = {}

__initialized = False

ignores = (re.compile(I) for I in [r'.+\.hot-update.js', r'.+\.map'])


class BundleNotFound(Exception):
    pass

class WebpackError(EnvironmentError):
    pass

def load_stats_file(hook):
    """
    Function to open a webpack bundle tracker stats file to get information about the file chunks needed.
    :param stats_file: The path to the stats file.
    :return: A dict containing the stats for the frontend files.
    """
    with open(hook.stats_file) as f:
        stats = json.load(f)
    if settings.DEBUG:
        timeout = 0
        while stats['status'] == 'compiling':
            time.sleep(getattr(settings, 'WEBPACK_POLL_INTERVAL', 0.1))
            timeout += getattr(settings, 'WEBPACK_POLL_INTERVAL', 0.1)
            with open(hook.stats_file) as f:
                stats = json.load(f)
            if timeout >= getattr(settings, 'WEBPACK_POLL_INTERVAL', 1.0):
                raise WebpackError('Webpack compilation still in progress')
        if stats['status'] == 'error':
            raise WebpackError('Webpack compilation has errored')
    return {
        "files": stats["chunks"][hook.unique_slug]
    }


def initialize_plugin_cache():
    """
    Function to initialize the plugin cache for Frontend Plugin information.
    """
    global PLUGIN_CACHE
    global __initialized
    for hook in hooks.WebpackBundleHook().registered_hooks:
        try:
            PLUGIN_CACHE[hook.unique_slug] = load_stats_file(hook)
        except IOError:
            raise IOError(
                'Error reading {}. Are you sure webpack has generated the file '
                'and the path is correct?'.format(hook.stats_file)
            )
        else:
            PLUGIN_CACHE[hook.unique_slug]["async_events"] = hook.async_events
    logger.debug("Initialized web packs for: {}".format(", ".join(PLUGIN_CACHE.keys())))
    __initialized = True


def check_plugin_cache():
    """
    Convenience function to check if the PLUGIN_CACHE has been initialized yet. If it has, it is a no-op.
    :return:
    """
    global __initialized

    if (not __initialized) or settings.DEBUG:
        initialize_plugin_cache()


def get_async_events(unique_slug):
    """
    Function to return dict of events that trigger plugin load, given the name of the frontend plugin.
    :param unique_slug: Name of the bundle (frontend plugin name).
    :return: Dictionary of dictionaries of event/method pairs, for 'events' and for 'once' - multi-time and one-time
    events, respectively.
    """
    global PLUGIN_CACHE

    check_plugin_cache()

    if unique_slug in PLUGIN_CACHE:
        return PLUGIN_CACHE[unique_slug]["async_events"]
    else:
        raise BundleNotFound("The specified plugin is not registered as a Front End Plugin")


def get_bundle(unique_slug):
    """
    Function to return all files needed, given the name of the frontend plugin.
    :param bundle_path: Name of the bundle (frontend plugin name).
    :return: Generator of dicts containing information about each file.
    """
    global PLUGIN_CACHE
    global ignores

    check_plugin_cache()

    if unique_slug in PLUGIN_CACHE:
        for f in PLUGIN_CACHE[unique_slug]["files"]:
            filename = f['name']
            ignore = any(regex.match(filename) for regex in ignores)
            if not ignore:
                relpath = '{0}/{1}'.format(unique_slug, filename)
                f['url'] = staticfiles_storage.url(relpath)
                yield f
    else:
        raise BundleNotFound("No bundle with that name is loaded: {}".format(unique_slug))


def get_webpack_bundle(unique_slug, extension):
    """
    Function to return generator of file dicts, with the option of filtering by extension.
    :param bundle_path: Name of the bundle (frontend plugin name).
    :param extension: File extension to do an inclusive filter by.
    :return: Generator of dicts containing information about each file.
    """
    bundle = get_bundle(unique_slug)
    if extension:
        bundle = (chunk for chunk in bundle if chunk['name'].endswith('.{0}'.format(extension)))
    return bundle
