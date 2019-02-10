"""
Modified from django.utils.translation.trans_real
"""
from __future__ import unicode_literals

import re

from django.conf import settings
from django.urls.resolvers import RegexURLResolver
from django.utils.translation import get_language
from django.utils.translation import LANGUAGE_SESSION_KEY
from django.utils.translation.trans_real import check_for_language
from django.utils.translation.trans_real import get_language_from_path
from django.utils.translation.trans_real import get_languages
from django.utils.translation.trans_real import get_supported_language_variant
from django.utils.translation.trans_real import language_code_re
from django.utils.translation.trans_real import parse_accept_lang_header

DEVICE_LANGUAGE = None


def get_device_language():
    from .models import DeviceSettings
    global DEVICE_LANGUAGE
    try:
        if DEVICE_LANGUAGE is None:
            DEVICE_LANGUAGE = DeviceSettings.objects.get().language_id
    except DeviceSettings.DoesNotExist:
        DEVICE_LANGUAGE = settings.LANGUAGE_CODE
    try:
        return get_supported_language_variant(DEVICE_LANGUAGE)
    except LookupError:
        return DEVICE_LANGUAGE


def get_language_from_request(request):  # noqa complexity-16
    """
    Analyzes the request to find what language the user wants the system to
    show. Only languages listed in settings.LANGUAGES are taken into account.
    If the user requests a sublanguage where we have a main language, we send
    out the main language.
    If check_path is True, the URL path prefix will be checked for a language
    code, otherwise this is skipped for backwards compatibility.
    """

    supported_lang_codes = get_languages()

    lang_code = get_language_from_path(request.path_info)
    if lang_code in supported_lang_codes and lang_code is not None:
        return lang_code, True

    if hasattr(request, 'session'):
        lang_code = request.session.get(LANGUAGE_SESSION_KEY)
        if lang_code in supported_lang_codes and lang_code is not None and check_for_language(lang_code):
            return lang_code, False

    lang_code = request.COOKIES.get(settings.LANGUAGE_COOKIE_NAME)

    try:
        return get_supported_language_variant(lang_code), False
    except LookupError:
        pass

    accept = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
    for accept_lang, unused in parse_accept_lang_header(accept):
        if accept_lang == '*':
            break

        if not language_code_re.search(accept_lang):
            continue

        try:
            return get_supported_language_variant(accept_lang), False
        except LookupError:
            continue

    return get_device_language(), False


def i18n_patterns(urls, prefix=None):
    """
    Add the language code prefix to every URL pattern within this function.
    Vendored from https://github.com/django/django/blob/stable/1.11.x/django/conf/urls/i18n.py
    to allow use of this outside of the root URL conf to prefix plugin non-api urls.
    """
    if not settings.USE_I18N:
        return list(urls)
    return [LocaleRegexURLResolver(list(urls), prefix=prefix)]


class LocaleRegexURLResolver(RegexURLResolver):
    """
    A URL resolver that always matches the active language code as URL prefix.
    Rather than taking a regex argument, we just override the ``regex``
    function to always return the active language-code as regex.
    Vendored from https://github.com/django/django/blob/stable/1.11.x/django/urls/resolvers.py
    As using the Django internal version inside included URL configs is disallowed.
    Rather than monkey patch Django to allow this for our use case, make a copy of this here
    and use this instead.
    """
    def __init__(
        self, urlconf_name, default_kwargs=None, app_name=None, namespace=None,
        prefix_default_language=True, prefix=None
    ):
        super(LocaleRegexURLResolver, self).__init__(
            None, urlconf_name, default_kwargs, app_name, namespace,
        )
        self.prefix_default_language = prefix_default_language
        self._prefix = prefix

    @property
    def regex(self):
        device_language = get_device_language()
        language_code = get_language() or device_language
        if language_code not in self._regex_dict:
            if language_code == device_language and not self.prefix_default_language:
                regex_string = self._prefix or ''
            else:
                regex_string = ('^%s/' % language_code) + (self._prefix or '')
            self._regex_dict[language_code] = re.compile(regex_string, re.UNICODE)
        return self._regex_dict[language_code]
