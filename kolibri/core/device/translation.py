"""
Modified from django.utils.translation.trans_real
"""
from __future__ import unicode_literals

import re

from django.conf import settings
from django.urls import resolve
from django.urls import Resolver404
from django.urls import URLResolver
from django.utils.translation import get_language
from django.utils.translation import LANGUAGE_SESSION_KEY
from django.utils.translation.trans_real import check_for_language
from django.utils.translation.trans_real import get_language_from_path
from django.utils.translation.trans_real import get_languages
from django.utils.translation.trans_real import get_supported_language_variant
from django.utils.translation.trans_real import language_code_re
from django.utils.translation.trans_real import parse_accept_lang_header

from kolibri.core.device.utils import device_provisioned
from kolibri.core.device.utils import get_device_setting


def get_device_language():
    if not device_provisioned():
        return None

    language_id = get_device_setting("language_id")
    try:
        return get_supported_language_variant(language_id)
    except LookupError:
        return None


def get_accept_headers_language(request):
    accept = request.META.get("HTTP_ACCEPT_LANGUAGE", "")
    for accept_lang, unused in parse_accept_lang_header(accept):
        if accept_lang == "*":
            break

        if not language_code_re.search(accept_lang):
            continue

        try:
            return get_supported_language_variant(accept_lang)
        except LookupError:
            continue


def get_settings_language():
    try:
        return get_supported_language_variant(settings.LANGUAGE_CODE)
    except LookupError:
        return settings.LANGUAGE_CODE


def get_language_from_request_and_is_from_path(request):  # noqa complexity-16
    """
    Analyzes the request to find what language the user wants the system to
    show. Only languages listed in settings.LANGUAGES are taken into account.
    If the user requests a sublanguage where we have a main language, we send
    out the main language. It also returns a value to determine if the language code
    was derived from a language code in the URL, or inferred from some other source.
    :returns: tuple of language code, boolean. The former can be None if the url being
    requested does not require translation, otherwise it should be a language code
    from the values in settings.LANGUAGES. The boolean should indicate whether the
    language code was calculated by reading a language code from the requested URL.
    In the case that it was, True should be returned, in the case where the URL language
    code was not used or not present, False is returned.
    """

    try:
        # If this is not a view that needs to be translated, return None, and be done with it!
        if not getattr(resolve(request.path_info).func, "translated", False):
            return None, False
    except Resolver404:
        # If this is an unrecognized URL, it may be redirectable to a language prefixed
        # URL, so let the language code setting carry on from here.
        pass

    supported_lang_codes = get_languages()

    lang_code = get_language_from_path(request.path_info)
    if lang_code in supported_lang_codes and lang_code is not None:
        return lang_code, True

    if hasattr(request, "session"):
        lang_code = request.session.get(LANGUAGE_SESSION_KEY)
        if (
            lang_code in supported_lang_codes
            and lang_code is not None
            and check_for_language(lang_code)
        ):
            return lang_code, False

    device_language = get_device_language()

    if device_language is not None:
        return device_language, False

    headers_language = get_accept_headers_language(request)

    if headers_language is not None:
        return headers_language, False

    return get_settings_language(), False


def i18n_patterns(urls, prefix=None):
    """
    Add the language code prefix to every URL pattern within this function.
    Vendored from https://github.com/django/django/blob/stable/3.2.x/django/conf/urls/i18n.py#L8
    to allow use of this outside of the root URL conf to prefix plugin non-api urls.
    """
    if not settings.USE_I18N:
        return list(urls)

    def recurse_urls_and_set(urls_to_set):
        for url in urls_to_set:
            if hasattr(url, "urlpatterns") and url.urlpatterns:
                recurse_urls_and_set(url.urlpatterns)
            elif hasattr(url, "callback") and url.callback:
                setattr(url.callback, "translated", True)

    recurse_urls_and_set(urls)
    return [
        URLResolver(
            LocalePrefixPattern(prefix=prefix),
            list(urls),
        )
    ]


class LocalePrefixPattern:
    """
    A Locale prefix pattern that uses our device language setting for the active language.
    It also allows passing a prefix to allow nested i18n_patterns to work correctly.
    Vendored from https://github.com/django/django/blob/stable/3.2.x/django/urls/resolvers.py#L298
    As using the Django internal version inside included URL configs is disallowed.
    Rather than monkey patch Django to allow this for our use case, make a copy of this here
    and use this instead.
    """

    def __init__(self, prefix=None, prefix_default_language=True):
        self.prefix_default_language = prefix_default_language
        self.converters = {}
        self._prefix = prefix

    @property
    def regex(self):
        # This is only used by reverse() and cached in _reverse_dict.
        return re.compile(re.escape(self.language_prefix))

    @property
    def language_prefix(self):
        device_language = get_device_language() or get_settings_language()
        language_code = get_language() or device_language
        if language_code == device_language and not self.prefix_default_language:
            return self._prefix or ""
        return ("%s/" % language_code) + (self._prefix or "")

    def match(self, path):
        language_prefix = self.language_prefix
        if path.startswith(language_prefix):
            return path[len(language_prefix) :], (), {}
        return None

    def check(self):
        return []

    def describe(self):
        return "'{}'".format(self)

    def __str__(self):
        return self.language_prefix
