"""
Modified from django.utils.translation.trans_real
"""
from __future__ import unicode_literals

from django.conf import settings
from django.utils.translation import LANGUAGE_SESSION_KEY
from django.utils.translation.trans_real import check_for_language
from django.utils.translation.trans_real import get_languages
from django.utils.translation.trans_real import get_supported_language_variant
from django.utils.translation.trans_real import language_code_re
from django.utils.translation.trans_real import parse_accept_lang_header

from .models import DeviceSettings

DEVICE_LANGUAGE = None

def get_language_from_request(request):  # noqa complexity-16
    """
    Analyzes the request to find what language the user wants the system to
    show. Only languages listed in settings.LANGUAGES are taken into account.
    If the user requests a sublanguage where we have a main language, we send
    out the main language.
    If check_path is True, the URL path prefix will be checked for a language
    code, otherwise this is skipped for backwards compatibility.
    """
    global DEVICE_LANGUAGE

    supported_lang_codes = get_languages()

    if hasattr(request, 'session'):
        lang_code = request.session.get(LANGUAGE_SESSION_KEY)
        if lang_code in supported_lang_codes and lang_code is not None and check_for_language(lang_code):
            return lang_code

    lang_code = request.COOKIES.get(settings.LANGUAGE_COOKIE_NAME)

    try:
        return get_supported_language_variant(lang_code)
    except LookupError:
        pass

    accept = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
    for accept_lang, unused in parse_accept_lang_header(accept):
        if accept_lang == '*':
            break

        if not language_code_re.search(accept_lang):
            continue

        try:
            return get_supported_language_variant(accept_lang)
        except LookupError:
            continue

    try:
        if DEVICE_LANGUAGE is None:
            DEVICE_LANGUAGE = DeviceSettings.objects.get().language_id
        return get_supported_language_variant(DEVICE_LANGUAGE)
    except (DeviceSettings.DoesNotExist, LookupError):
        pass

    try:
        return get_supported_language_variant(settings.LANGUAGE_CODE)
    except LookupError:
        return settings.LANGUAGE_CODE
