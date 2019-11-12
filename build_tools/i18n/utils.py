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

# Keys used in supported_languages.json
KEY_CROWDIN_CODE = "crowdin_code"
KEY_INTL_CODE = "intl_code"
KEY_LANG_NAME = "language_name"
KEY_ENG_NAME = "english_name"
KEY_DEFAULT_FONT = "default_font"

IN_CTXT_LANG = {
    KEY_CROWDIN_CODE: "ach",
    KEY_INTL_CODE: "ach-ug",
    KEY_LANG_NAME: "In context translation",
    KEY_ENG_NAME: "In context translation",
    KEY_DEFAULT_FONT: "NotoSans",
}


def to_locale(language):
    """
    Turns a language name (en-us) into a locale name (en_US).
    Logic is derived from Django so be careful about changing it.
    """
    p = language.find("-")
    if p >= 0:
        if len(language[p + 1 :]) > 2:
            return "{}_{}".format(
                language[:p].lower(),
                language[p + 1].upper() + language[p + 2 :].lower(),
            )
        return "{}_{}".format(language[:p].lower(), language[p + 1 :].upper())
    else:
        return language.lower()


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
        if include_english or lang[KEY_INTL_CODE] != "en":
            result.append(lang)
    if include_in_context:
        result.append(IN_CTXT_LANG)
    return result


@memoize
def local_locale_path(lang_object):
    return os.path.join(
        LOCALE_PATH, to_locale(lang_object[KEY_INTL_CODE]), "LC_MESSAGES"
    )


@memoize
def local_locale_csv_path():
    return os.path.join(LOCALE_PATH, "CSV_FILES")


@memoize
def local_perseus_locale_path(lang_object):
    return os.path.join(
        PERSEUS_LOCALE_PATH, to_locale(lang_object[KEY_INTL_CODE]), "LC_MESSAGES"
    )


@memoize
def local_perseus_locale_csv_path():
    return os.path.join(PERSEUS_LOCALE_PATH, "CSV_FILES")


def json_dump_formatted(data, file_path, file_name):
    """
    dump json in a way that plays nicely with source control and our precommit hooks:
    - prevents trailing whitespace
    - sorted keys
    - make sure it's utf-8
    """

    # Ensure that the directory exists for the file to be opened inside of.
    try:
        os.makedirs(file_path)
    except:
        # Path already exists
        pass

    # Join the filename to the path which we now know exists for sure.
    file_path_with_file_name = os.path.join(file_path, file_name)

    # Format and write the JSON file
    with io.open(file_path_with_file_name, mode="w+", encoding="utf-8") as file_object:
        # Manage unicode for the JSON dumping
        if sys.version_info[0] < 3:
            output = json.dumps(
                data,
                sort_keys=True,
                indent=2,
                separators=(",", ": "),
                ensure_ascii=False,
            )
            output = unicode(output, "utf-8")
            file_object.write(output)
        else:
            json.dump(
                data,
                file_object,
                sort_keys=True,
                indent=2,
                separators=(",", ": "),
                ensure_ascii=False,
            )
