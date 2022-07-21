# -*- coding: utf-8 -*-
import importlib
import io
import json
import locale
import os

from django.utils.translation.trans_real import to_language

import kolibri


def get_installed_app_locale_path(appname):
    """
    Load the app given by appname and return its locale folder path, if it exists.

    Note that the module is imported to determine its location.
    """
    try:
        m = importlib.import_module(appname)
        module_path = os.path.dirname(m.__file__)
        module_locale_path = os.path.abspath(os.path.join(module_path, "locale"))

        if os.path.isdir(module_locale_path):
            return module_locale_path
    except ImportError:
        pass
    return None


def _get_language_info():
    file_path = os.path.abspath(
        os.path.join(os.path.dirname(kolibri.__file__), "locale", "language_info.json")
    )
    with io.open(file_path, encoding="utf-8") as f:
        languages = json.load(f)
        output = {}
        for language in languages:
            output[language["intl_code"]] = language
        return output


# Kolibri format
KOLIBRI_LANGUAGE_INFO = _get_language_info()

# List of intl codes that Kolibri officially supports
KOLIBRI_SUPPORTED_LANGUAGES = {
    "ar",
    "bg-bg",
    "bn-bd",
    "de",
    "el",
    "en",
    "es-es",
    "es-419",
    "fa",
    "fr-fr",
    "ff-cm",
    "gu-in",
    "ha",
    "hi-in",
    "id",
    "it",
    "ka",
    "km",
    "ko",
    "mr",
    "my",
    "nyn",
    "pt-br",
    "pt-mz",
    "sw-tz",
    "te",
    "uk",
    "ur-pk",
    "vi",
    "yo",
    "zh-hans",
}


def get_system_default_language():
    for loc in (locale.getlocale()[0], locale.getdefaultlocale()[0]):
        if loc:
            lang = to_language(loc)
            for lang_code in (lang, lang.split("-")[0]):
                if lang_code in KOLIBRI_SUPPORTED_LANGUAGES:
                    return lang_code

    # If all else fails we fall back to "en"
    return "en"
