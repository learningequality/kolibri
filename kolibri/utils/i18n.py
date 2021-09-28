# -*- coding: utf-8 -*-
import json

from importlib_resources import files


def get_installed_app_locale_path(appname):
    """
    Load the app given by appname and return its locale folder path, if it exists.

    Note that the module is imported to determine its location.
    """
    try:
        m = files(appname)
        module_locale_path = m / "locale"

        if module_locale_path.is_dir():
            return module_locale_path
    except ImportError:
        pass
    return None


def _get_language_info():
    ref = files("kolibri") / "locale" / "language_info.json"
    languages = json.loads(ref.read_text())
    output = {}
    for language in languages:
        output[language["intl_code"]] = language
    return output


# Kolibri format
KOLIBRI_LANGUAGE_INFO = _get_language_info()

# List of intl codes that Kolibri officially supports
KOLIBRI_SUPPORTED_LANGUAGES = [
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
    "ur-pk",
    "vi",
    "yo",
    "zh-hans",
]
