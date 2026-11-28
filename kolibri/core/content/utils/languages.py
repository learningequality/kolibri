from le_utils.constants.languages import getlang

# Keep in sync with contentLanguageCodes in packages/kolibri/utils/i18n.js.
CONTENT_LANGUAGE_CODES = {
    "ff": ("ful", "fuv"),
    "ny": ("nya",),
    "sw": ("swa",),
    "yo": ("yor",),
}


_BASE_CODES_BY_ALIAS = {
    alias: base_code
    for base_code, aliases in CONTENT_LANGUAGE_CODES.items()
    for alias in aliases
}


def expand_base_language_codes(base_codes):
    return {
        code
        for base_code in base_codes
        for code in (base_code, *CONTENT_LANGUAGE_CODES.get(base_code, ()))
    }


def build_base_language_labels(languages):
    names_by_code = {}
    for _, code, name in sorted(languages, key=lambda language: language[0]):
        base_code = _BASE_CODES_BY_ALIAS.get(code, code)
        if not names_by_code.get(base_code):
            names_by_code[base_code] = name

    labels = []
    for code, fallback_name in sorted(names_by_code.items()):
        language = getlang(code)
        name = language.native_name if language else fallback_name or code
        labels.append({"id": code, "lang_name": name})
    return labels
