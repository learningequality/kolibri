import ctypes
import gettext
import locale
import logging
import subprocess
from importlib.resources import files

from django.conf.locale import LANG_INFO
from django.utils.translation import to_language
from django.utils.translation import to_locale

from kolibri_app.constants import MAC
from kolibri_app.constants import WINDOWS

logger = logging.getLogger(__name__)

_MUI_LANGUAGE_NAME = 0x8

# CLDR likely subtags: the script of a catalogue whose name has none.
_DEFAULT_SCRIPTS = {"ff": "latn", "ha": "latn", "pa": "guru"}

# CLDR parentLocales: the region a regional catalogue inherits its orthography from.
_PARENT_REGIONS = {"pt_mz": "pt"}


def _windows_ui_languages():
    get_languages = ctypes.windll.kernel32.GetUserPreferredUILanguages
    count = ctypes.c_ulong()
    size = ctypes.c_ulong()
    if not get_languages(
        _MUI_LANGUAGE_NAME, ctypes.byref(count), None, ctypes.byref(size)
    ):
        return []
    buffer = ctypes.create_unicode_buffer(size.value)
    if not get_languages(
        _MUI_LANGUAGE_NAME, ctypes.byref(count), buffer, ctypes.byref(size)
    ):
        return []
    return [lang for lang in buffer[: size.value].split("\0") if lang]


def _script(subtags):
    return next((subtag for subtag in subtags[1:] if len(subtag) == 4), None)


def _region(subtags):
    return next((subtag for subtag in subtags[1:] if len(subtag) in (2, 3)), None)


def _catalogue_for(display_language, catalogues, installer_locale):
    subtags = display_language.lower().split("-")
    fallback = LANG_INFO.get(display_language.lower(), {}).get("fallback", [""])[0]
    script = _script(subtags) or _script(fallback.split("-"))
    matches = []
    for catalogue in sorted(catalogues):
        catalogue_subtags = catalogue.lower().split("_")
        if catalogue_subtags[0] != subtags[0]:
            continue
        catalogue_script = _script(catalogue_subtags) or _DEFAULT_SCRIPTS.get(
            catalogue_subtags[0]
        )
        if script and script != catalogue_script:
            continue
        matches.append(catalogue)
    region = _region(subtags)
    matches.sort(
        key=lambda catalogue: (
            _region(catalogue.lower().split("_")) != region,
            catalogue.lower() != installer_locale.lower(),
            _PARENT_REGIONS.get(catalogue.lower()) != region,
        )
    )
    return next(iter(matches), None)


try:
    languages = [
        loc for loc in (locale.getlocale()[0], locale.getdefaultlocale()[0]) if loc
    ]
except ValueError:
    languages = []

if not languages and MAC:
    langs_str = subprocess.check_output(
        "defaults read .GlobalPreferences AppleLanguages | tr -d [:space:]", shell=True
    ).strip()
    languages = (
        langs_str[1:-1].decode("utf-8").replace('"', "").replace("-", "_").split(",")
    )

if not languages:
    languages = ["en"]

locale_dir = files("kolibri_app") / "locales"

if WINDOWS:
    from kolibri_app.windows_registry import get_installer_language

    catalogues = (
        [catalogue.name for catalogue in locale_dir.iterdir()]
        if locale_dir.is_dir()
        else []
    )
    installer_language = get_installer_language()
    installer_locale = to_locale(installer_language) if installer_language else ""
    ui_languages = [
        _catalogue_for(display_language, catalogues, installer_locale)
        for display_language in _windows_ui_languages()
    ]
    languages = [
        lang
        for lang in [*ui_languages[:1], installer_locale, *ui_languages[1:], *languages]
        if lang
    ]

nelangs = []
for lang in languages:
    for nelang in gettext._expand_lang(lang):
        if nelang not in nelangs:
            nelangs.append(nelang)

mo_files = (locale_dir / lang / "LC_MESSAGES" / "wxapp.mo" for lang in nelangs)
mo_file = next((mo for mo in mo_files if mo.is_file()), None)

if mo_file:
    with mo_file.open("rb") as f:
        t = gettext.GNUTranslations(f)
    language = to_language(mo_file.parent.parent.name)
else:
    t = gettext.NullTranslations()
    language = "en"

_ = t.gettext

logger.debug("Language = %s", language)
