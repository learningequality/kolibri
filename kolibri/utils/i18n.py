# -*- coding: utf-8 -*-
import importlib
import io
import json
import os

import kolibri

EXTERNAL_PLUGINS_PREFIX = "kolibri_"


def is_external_plugin(appname):
    '''
    Returns true when the given app is an external plugin.

    Implementation note: does a simple check on the name to see if it's
    prefixed with "kolibri\_". If so, we think it's a plugin.
    '''

    return appname.startswith(EXTERNAL_PLUGINS_PREFIX)


def get_installed_app_locale_path(appname):
    """
    Load the app given by appname and return its locale folder path, if it exists.

    Note that the module is imported to determine its location.
    """

    m = importlib.import_module(appname)
    module_path = os.path.dirname(m.__file__)
    module_locale_path = os.path.join(module_path, "locale")

    if os.path.isdir(module_locale_path):
        return module_locale_path


def _get_supported_language_info():
    file_path = os.path.join(
        os.path.dirname(kolibri.__file__), "locale", "supported_languages.json"
    )
    with io.open(file_path, encoding="utf-8") as f:
        return json.load(f)


# Kolibri format
KOLIBRI_SUPPORTED_LANGUAGES = _get_supported_language_info()
