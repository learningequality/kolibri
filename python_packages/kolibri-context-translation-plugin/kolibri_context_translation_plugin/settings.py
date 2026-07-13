from django.conf import locale

ACH_LANG_INFO = {
    "ach-ug": {
        "bidi": False,
        "code": "ach-ug",
        "name": "In-context translation",
        "name_local": "Language Name",
    }
}

locale.LANG_INFO.update(ACH_LANG_INFO)
