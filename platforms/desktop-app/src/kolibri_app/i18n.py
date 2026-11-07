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

if WINDOWS:
    from kolibri_app.windows_registry import get_installer_language

    installer_language = get_installer_language()
    if installer_language:
        languages.insert(0, to_locale(installer_language))

nelangs = []
for lang in languages:
    for nelang in gettext._expand_lang(lang):
        if nelang not in nelangs:
            nelangs.append(nelang)

locale_dir = files("kolibri_app") / "locales"

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
