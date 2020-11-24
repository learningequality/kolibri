# -*- coding: utf-8 -*-
import functools
import io
import json
import logging
import os
import sys

try:
    import kolibri_exercise_perseus_plugin

    PERSEUS_LOCALE_PATH = os.path.join(
        os.path.dirname(kolibri_exercise_perseus_plugin.__file__), "locale"
    )
    PERSEUS_SOURCE_PATH = os.path.join(PERSEUS_LOCALE_PATH, "en", "LC_MESSAGES")
except ModuleNotFoundError:
    # We don't throw an error here as it will be handled later if needed. 
    # Not all projects depend on our Perseus plugin
    PERSEUS_LOCALE_PATH = None
    PERSEUS_SOURCE_PATH = None

# Let's make sure the paths actually exist
if PERSEUS_SOURCE_PATH and not os.path.exists(PERSEUS_SOURCE_PATH):
    os.makedirs(PERSEUS_SOURCE_PATH)
if PERSEUS_LOCALE_PATH and not os.path.exists(PERSEUS_LOCALE_PATH):
    os.makedirs(PERSEUS_LOCALE_PATH)

logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logging.StreamHandler(sys.stdout)


PROJECT_NAME = os.getenv("CROWDIN_PROJECT", "kolibri")

LOCALE_PATH = os.getenv("CROWDIN_LOCALE_ABSOLUTE_PATH")

if not LOCALE_PATH:
    logging.error("\nEnvironment Variable CROWDIN_LOCALE_ABSOLUTE_PATH must be defined\n")
    sys.exit(1)

if not os.path.exists(LOCALE_PATH):
    os.makedirs(LOCALE_PATH)

SOURCE_PATH = os.path.join(LOCALE_PATH, "en", "LC_MESSAGES")

if not os.path.exists(SOURCE_PATH):
    os.makedirs(SOURCE_PATH)


LANGUAGE_INFO_PATH = os.path.join(os.path.dirname(__file__), "language_info.json")

# Keys used in language_info.json
KEY_CROWDIN_CODE = "crowdin_code"
KEY_INTL_CODE = "intl_code"
KEY_LANG_NAME = "language_name"
KEY_ENG_NAME = "english_name"
KEY_DEFAULT_FONT = "default_font"


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
def available_languages(include_in_context=False, include_english=False):
    result = []
    with io.open(LANGUAGE_INFO_PATH, mode="r", encoding="utf-8") as f:
        languages = json.load(f)
    for lang in languages:
        if include_english or lang[KEY_INTL_CODE] != "en":
            result.append(lang)
        # in-context language has been included in language_info.json,
        # remove it if the parameter include_in_context is False
        if lang[KEY_INTL_CODE] == "ach-ug" and not include_in_context:
            result.remove(lang)
    return result


@memoize
def local_locale_path(lang_object):
    local_path = os.path.abspath(
        os.path.join(LOCALE_PATH, to_locale(lang_object[KEY_INTL_CODE]), "LC_MESSAGES")
    )
    if not os.path.exists(local_path):
        os.makedirs(local_path)
    return local_path


# Defines where we find the extracted messages
@memoize
def local_locale_csv_source_path():
    csv_path = os.path.abspath(os.path.join(LOCALE_PATH, "CSV_FILES", "en"))
    if not os.path.exists(csv_path):
        os.makedirs(csv_path)
    return csv_path


# Defines where we'll find the downloaded CSV files from Crowdin (non english files)
@memoize
def local_locale_csv_path():
    csv_path = os.path.abspath(os.path.join(LOCALE_PATH, "CSV_FILES"))
    if not os.path.exists(csv_path):
        os.makedirs(csv_path)
    return csv_path


@memoize
def local_perseus_locale_path(lang_object):
    if PERSEUS_LOCALE_PATH:
        return os.path.join(
            PERSEUS_LOCALE_PATH, to_locale(lang_object[KEY_INTL_CODE]), "LC_MESSAGES"
        )
    return ""


@memoize
def local_perseus_locale_csv_path():
    if PERSEUS_LOCALE_PATH:
        return os.path.join(PERSEUS_LOCALE_PATH, "CSV_FILES")
    return ""


def json_dump_formatted(data, file_path, file_name):
    """
    dump json in a way that plays nicely with source control and our precommit hooks:
    - prevents trailing whitespace
    - sorted keys
    - make sure it's utf-8
    """

    # Ensure that the directory exists for the file to be opened inside of.
    if not os.path.exists(file_path):
        os.makedirs(file_path)

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
            output = unicode(output, "utf-8")  # noqa
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
