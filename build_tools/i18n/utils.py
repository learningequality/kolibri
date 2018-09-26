# -*- coding: utf-8 -*-
import functools
import io
import json
import logging
import os
import sys

import kolibri_exercise_perseus_plugin


logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logging.StreamHandler(sys.stdout)


LOCALE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), os.pardir, os.pardir, "kolibri", "locale")
)
SOURCE_PATH = os.path.join(LOCALE_PATH, "en", "LC_MESSAGES")
SUPPORTED_LANGS_PATH = os.path.join(LOCALE_PATH, "supported_languages.json")
PERSEUS_LOCALE_PATH = os.path.join(
    os.path.dirname(kolibri_exercise_perseus_plugin.__file__), "locale"
)
PERSEUS_SOURCE_PATH = os.path.join(PERSEUS_LOCALE_PATH, "en", "LC_MESSAGES")

KEY_CROWDIN_CODE = "crowdin_code"
KEY_LANG_CODE = "language_code"
KEY_TERR_CODE = "territory_code"
KEY_ENG_NAME = "english_name"
KEY_LANG_NAME = "language_name"
KEY_DEFAULT_FONT = "default_font"

IN_CTXT_LANG = {
    "crowdin_code": "ach",
    "language_code": "ach",
    "territory_code": "ug",
    "language_name": "In context translation",
    "english_name": "In context translation",
}


def memoize(func):
    cache = func.cache = {}

    @functools.wraps(func)
    def memoized_func(*args, **kwargs):
        key = str(args) + str(kwargs)
        if key not in cache:
            cache[key] = func(*args, **kwargs)
        return cache[key]

    return memoized_func


@memoize
def supported_languages(include_in_context=False, include_english=False):
    result = []
    with io.open(SUPPORTED_LANGS_PATH, mode="r", encoding="utf-8") as f:
        languages = json.load(f)
    for lang in languages:
        if include_english or lang[KEY_LANG_CODE] != "en":
            result.append(lang)
    if include_in_context:
        result.append(IN_CTXT_LANG)
    return result


@memoize
def locale_string(lang_object):
    if KEY_TERR_CODE not in lang_object.keys():
        return lang_object[KEY_LANG_CODE]
    return "{}-{}".format(
        lang_object[KEY_LANG_CODE], lang_object[KEY_TERR_CODE].lower()
    )


@memoize
def _directory(lang_object):
    if KEY_TERR_CODE not in lang_object.keys():
        return lang_object[KEY_LANG_CODE]
    return "{}_{}".format(
        lang_object[KEY_LANG_CODE], lang_object[KEY_TERR_CODE].upper()
    )


@memoize
def local_locale_path(lang_object):
    return os.path.join(LOCALE_PATH, _directory(lang_object), "LC_MESSAGES")


@memoize
def local_perseus_locale_path(lang_object):
    return os.path.join(PERSEUS_LOCALE_PATH, _directory(lang_object), "LC_MESSAGES")
