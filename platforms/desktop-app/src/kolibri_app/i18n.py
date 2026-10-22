import gettext
import locale
import logging
import subprocess
from importlib.resources import files

from django.utils.translation import to_language
from django.utils.translation import to_locale

from kolibri_app.constants import MAC
from kolibri_app.constants import WINDOWS

logger = logging.getLogger(__name__)


def language_candidates(installer_language):
    try:
        languages = [
            loc for loc in (locale.getlocale()[0], locale.getdefaultlocale()[0]) if loc
        ]
    except ValueError:
        languages = []

    if not languages and MAC:
        langs_str = subprocess.check_output(
            "defaults read .GlobalPreferences AppleLanguages | tr -d [:space:]",
            shell=True,
        ).strip()
        languages = (
            langs_str[1:-1]
            .decode("utf-8")
            .replace('"', "")
            .replace("-", "_")
            .split(",")
        )

    if not languages:
        languages = ["en"]

    if installer_language:
        languages.insert(0, to_locale(installer_language))

    nelangs = []
    for lang in languages:
        for nelang in gettext._expand_lang(lang):
            if nelang not in nelangs:
                nelangs.append(nelang)
    return nelangs


def catalogue_language(candidates, catalogues):
    return next((lang for lang in candidates if lang in catalogues), None)


installer_language = None
if WINDOWS:
    from kolibri_app.windows_registry import get_installer_language

    installer_language = get_installer_language()

nelangs = language_candidates(installer_language)

locale_dir = files("kolibri_app") / "locales"

catalogues = (
    {d.name for d in locale_dir.iterdir() if (d / "LC_MESSAGES" / "wxapp.mo").is_file()}
    if locale_dir.is_dir()
    else set()
)
catalogue = catalogue_language(nelangs, catalogues)

if catalogue:
    with (locale_dir / catalogue / "LC_MESSAGES" / "wxapp.mo").open("rb") as f:
        t = gettext.GNUTranslations(f)
else:
    t = gettext.NullTranslations()

language = to_language(catalogue or "en")
_ = t.gettext

logger.debug("Language = %s", language)
