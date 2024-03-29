# -*- coding: utf-8 -*-
import django.conf.locale

from .base import *  # noqa isort:skip @UnusedWildImport

LANGUAGES = [("ach-ug", "In-context translation")]  # noqa

EXTRA_LANG_INFO = {
    "ach-ug": {
        "bidi": False,
        "code": "ach-ug",
        "name": "In-context translation",
        "name_local": "Language Name",
    }
}

LANGUAGE_CODE = "ach-ug"

django.conf.locale.LANG_INFO.update(EXTRA_LANG_INFO)
