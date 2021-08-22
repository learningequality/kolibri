import gettext
import locale
import logging
import subprocess

from pkg_resources import resource_filename

from kolibri_app.constants import MAC

try:
    languages = [loc for loc in (locale.getlocale()[0], locale.getdefaultlocale()[0]) if loc]
except ValueError:
    languages = []

if not languages and MAC:
    langs_str = subprocess.check_output('defaults read .GlobalPreferences AppleLanguages | tr -d [:space:]', shell=True).strip()
    languages = langs_str[1:-1].decode('utf-8').replace('"', '').replace('-', '_').split(',')

if not languages:
    languages = ['en_US']

t = gettext.translation('wxapp', resource_filename("kolibri_app", "locales"), languages=languages, fallback=True)
locale_info = t.info()
# We have not been able to reproduce, but we have seen this happen in user tracebacks, so
# trigger the exception handling fallback if locale_info doesn't have a language key.
if not 'language' in locale_info:
    # Fallback to English and if we fail to find any language catalogs.
    locale_info['language'] = 'en_US'
_ = t.gettext

logging.debug("Locale info = {}".format(locale_info))
