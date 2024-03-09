# -*- coding: utf-8 -*-
import configparser
import functools
import io
import json
import logging
import os
import subprocess
import sys

logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logging.StreamHandler(sys.stdout)


# Path to the kolibri locale language_info file, which we use if we are running
# from inside the Kolibri repository.
_KOLIBRI_LANGUAGE_INFO_PATH = os.path.join(
    os.path.dirname(__file__), "../../../../kolibri/locale/language_info.json"
)

# If we are in the built version of kolibri-tools, we only have access to the local
# copy if we are in the repo, we use the repo copy.
LANGUAGE_INFO_PATH = (
    _KOLIBRI_LANGUAGE_INFO_PATH
    if os.path.exists(_KOLIBRI_LANGUAGE_INFO_PATH)
    else os.path.join(os.path.dirname(__file__), "language_info.json")
)

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
def local_locale_path(lang_object, locale_data_folder):
    local_path = os.path.abspath(
        os.path.join(
            locale_data_folder, to_locale(lang_object[KEY_INTL_CODE]), "LC_MESSAGES"
        )
    )
    if not os.path.exists(local_path):
        os.makedirs(local_path)
    return local_path


# Defines where we find the extracted messages
@memoize
def local_locale_source_path(locale_data_folder):
    return local_locale_path({KEY_INTL_CODE: "en"}, locale_data_folder)


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
    with io.open(file_path, mode="w+", encoding="utf-8") as file_object:
        # Manage unicode for the JSON dumping
        json.dump(
            data,
            file_object,
            sort_keys=True,
            indent=2,
            separators=(",", ": "),
            ensure_ascii=False,
        )


def read_config_file():
    output = {}
    config_file = os.path.join(os.getcwd(), "pyproject.toml")
    section_name = "tool.kolibri.i18n"

    if not os.path.exists(config_file):
        config_file = os.path.join(os.getcwd(), "setup.cfg")
        section_name = "kolibri:i18n"

    if os.path.exists(config_file):
        config = configparser.ConfigParser()
        config.read(config_file)
        if section_name in config:
            for key in config[section_name]:
                output[key] = config[section_name][key]
    return output


def install_requirement(requirement_name):
    subprocess.run([sys.executable, "-m", "pip", "install", requirement_name])
