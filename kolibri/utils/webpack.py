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
    """
    Function to return all files needed, given the name of the bundle, and the name of the Python plugin.
    :param bundle_name: Name of the bundle (frontend plugin name).
    :param plugin: Name of the Python plugin.
    :return: Generator of dicts containing information about each file.
    """
    global PLUGIN_CACHE
    global initialized
    global ignores

    if (not initialized) or settings.DEBUG:
        for callback in hooks.get_callables(hooks.FRONTEND_PLUGINS):
            module_path, name, stats_file = callback()
            try:
                if module_path not in PLUGIN_CACHE:
                    PLUGIN_CACHE[module_path] = {}
                PLUGIN_CACHE[module_path][name] = load_stats_file(stats_file)
            except IOError:
                raise IOError(
                    'Error reading {}. Are you sure webpack has generated the file '
                    'and the path is correct?'.format(stats_file))
        initialized = True

    if plugin in PLUGIN_CACHE:
        for file in PLUGIN_CACHE[plugin][bundle_name]['chunks'][bundle_name]:
            filename = file['name']
            ignore = any(regex.match(filename) for regex in ignores)
            if not ignore:
                relpath = '{0}/{1}'.format(plugin, filename)
                file['url'] = staticfiles_storage.url(relpath)
                yield file
    else:
        raise NoFrontEndPlugin("The specified plugin is not registered as a Front End Plugin")


def get_webpack_bundle(bundle_name, extension, plugin):
    """
    Function to return generator of file dicts, with the option of filtering by extension.
    :param bundle_name: Name of the bundle (frontend plugin name).
    :param extension: File extension to do an inclusive filter by.
    :param plugin: Name of the Python plugin.
    :return: Generator of dicts containing information about each file.
    """
    bundle = get_bundle(bundle_name, plugin)
    if extension:
        bundle = (chunk for chunk in bundle if chunk['name'].endswith('.{0}'.format(extension)))
    return bundle
