import functools
import json
import logging
import os
import sys


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


logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logging.StreamHandler(sys.stdout)


# Path to the kolibri locale data folder - fixed for Kolibri development environment
LOCALE_DATA_FOLDER = os.path.join(os.path.dirname(__file__), "../../kolibri/locale")

# Path to the kolibri locale language_info file
LANGUAGE_INFO_PATH = os.path.join(LOCALE_DATA_FOLDER, "language_info.json")

# Keys used in language_info.json
KEY_INTL_CODE = "intl_code"
KEY_LANG_NAME = "language_name"
KEY_ENG_NAME = "english_name"
KEY_DEFAULT_FONT = "default_font"


@functools.cache
def available_languages():
    """
    Returns all available languages including English and in-context language.
    Callers should filter as needed.
    """
    with open(LANGUAGE_INFO_PATH, mode="r", encoding="utf-8") as f:
        return json.load(f)


def local_locale_path(lang_object):
    """
    Get the locale path for a given language object.
    Uses the hardcoded LOCALE_DATA_FOLDER constant.
    """
    intl_code = lang_object[KEY_INTL_CODE]
    return _local_locale_path_by_code(intl_code)


@functools.cache
def _local_locale_path_by_code(intl_code):
    """
    Internal cached implementation that takes a hashable intl_code string.
    """
    return os.path.abspath(
        os.path.join(LOCALE_DATA_FOLDER, to_locale(intl_code), "LC_MESSAGES")
    )


def json_dump_formatted(data, file_path):
    """
    dump json in a way that plays nicely with source control and our precommit hooks:
    - prevents trailing whitespace
    - sorted keys
    - make sure it's utf-8
    """
    dir_name = os.path.dirname(file_path)
    # Ensure that the directory exists for the file to be opened inside of.
    if not os.path.exists(dir_name):
        os.makedirs(dir_name)

    # Format and write the JSON file
    with open(file_path, mode="w+", encoding="utf-8") as file_object:
        # Manage unicode for the JSON dumping
        json.dump(
            data,
            file_object,
            sort_keys=True,
            indent=2,
            separators=(",", ": "),
            ensure_ascii=False,
        )
