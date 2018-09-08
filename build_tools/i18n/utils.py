import io
import json
import logging
import os
import sys


logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logging.StreamHandler(sys.stdout)


LOCALE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), os.pardir, os.pardir, "kolibri", "locale")
)
SOURCE_PATH = os.path.join(LOCALE_PATH, "en", "LC_MESSAGES")

KEY_CROWDIN_CODE = "crowdin_code"
KEY_LANG_CODE = "language_code"
KEY_TERR_CODE = "territory_code"
KEY_ENG_NAME = "english_name"
KEY_LANG_NAME = "language_name"

IN_CTXT_LANG = {
    "crowdin_code": "ach",
    "language_code": "ach",
    "territory_code": "ug",
    "language_name": "In context translation",
    "english_name": "In context translation",
}


def supported_languages(include_in_context=False):
    file_name = os.path.join(LOCALE_PATH, "supported_languages.json")
    with io.open(file_name, mode="r", encoding="utf-8") as f:
        result = [lang for lang in json.load(f) if lang[KEY_LANG_CODE] != "en"]
    if include_in_context:
        result.append(IN_CTXT_LANG)
    return result


def local_locale_path(lang_object):
    lang_path = lang_object[KEY_LANG_CODE]
    if KEY_TERR_CODE in lang_object.keys():
        lang_path = "{}_{}".format(lang_path, lang_object[KEY_TERR_CODE].upper())
    return os.path.join(LOCALE_PATH, lang_path, "LC_MESSAGES")
