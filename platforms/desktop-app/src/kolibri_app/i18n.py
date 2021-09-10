import gettext
import locale
import logging
import subprocess
from importlib.resources import files

from kolibri_app.constants import MAC

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
    languages = ["en_US"]

nelangs = []
for lang in languages:
    for nelang in gettext._expand_lang(lang):
        if nelang not in nelangs:
            nelangs.append(nelang)

mo_file = None

locale_dir = files("kolibri_app") / "locales"

for lang in nelangs:
    mo_file = locale_dir / lang / "LC_MESSAGES" / "wxapp.mo"
    if mo_file.is_file():
        break

if mo_file is not None and mo_file.is_file():
    with mo_file.open("rb") as f:
        t = gettext.GNUTranslations(f)
else:
    t = gettext.NullTranslations()

locale_info = t.info()
# We have not been able to reproduce, but we have seen this happen in user tracebacks, so
# trigger the exception handling fallback if locale_info doesn't have a language key.
if "language" not in locale_info:
    # Fallback to English and if we fail to find any language catalogs.
    locale_info["language"] = "en_US"
_ = t.gettext

logging.debug("Locale info = {}".format(locale_info))
