"""
This module is used to provide translation support for Kolibri,
prior to the loading of the Django stack.
Most of these functions are vendored from Django:
https://github.com/django/django/blob/stable/1.11.x/django/utils/translation/trans_real.py

In order to give a completely transparent interface.
"""
import gettext as gettext_module
import os
from threading import local

from django.core.exceptions import AppRegistryNotReady
from django.core.exceptions import ImproperlyConfigured
from django.utils import six
from django.utils import translation as django_translation_module
from django.utils.decorators import ContextDecorator
from django.utils.safestring import mark_safe
from django.utils.safestring import SafeData
from django.utils.translation.trans_real import DjangoTranslation

import kolibri


# Translations are cached in a dictionary for every language.
# The active translations are stored by threadid to make them thread local.
_translations = {}
_active = local()
_default = "en"


class KolibriTranslation(DjangoTranslation):
    domain = "kolibri"


def translation(language):
    """
    Returns a translation object in the default 'kolibri' domain.
    """
    global _translations
    if language not in _translations:
        _translations[language] = KolibriTranslation(
            language,
            localedirs=[os.path.join(os.path.dirname(kolibri.__file__), "locale")],
        )
    return _translations[language]


def prefer_django(fn):
    """
    Decorator that will call the Django translation function first
    but catch any exceptions related to Django not being initialized
    and call the kolibri translation function if needed.
    """

    def wrapped(*args, **kwargs):
        try:
            return getattr(django_translation_module, fn.__name__)(*args, **kwargs)
        except (AppRegistryNotReady, ImproperlyConfigured):
            return fn(*args, **kwargs)

    return wrapped


@prefer_django
def activate(language):
    """
    Fetches the translation object for a given language and installs it as the
    current translation object for the current thread.
    """
    if not language:
        return
    _active.value = translation(language)


@prefer_django
def deactivate():
    """
    Deinstalls the currently active translation object so that further _ calls
    will resolve against the default translation object, again.
    """
    if hasattr(_active, "value"):
        del _active.value


@prefer_django
def deactivate_all():
    """
    Makes the active translation object a NullTranslations() instance. This is
    useful when we want delayed translations to appear as the original string
    for some reason.
    """
    _active.value = gettext_module.NullTranslations()
    _active.value.to_language = lambda *args: None


@prefer_django
def get_language():
    """Returns the currently selected language."""
    t = getattr(_active, "value", None)
    if t is not None:
        try:
            return t.to_language()
        except AttributeError:
            pass
    # If we don't have a real translation object, just return None.
    return None


class override(ContextDecorator):
    def __init__(self, language, deactivate=False):
        self.language = language
        self.deactivate = deactivate

    def __enter__(self):
        self.old_language = get_language()
        if self.language is not None:
            activate(self.language)
        else:
            deactivate_all()

    def __exit__(self, exc_type, exc_value, traceback):
        if self.old_language is None:
            deactivate_all()
        elif self.deactivate:
            deactivate()
        else:
            activate(self.old_language)


def do_translate(message, translation_function):
    """
    Translates 'message' using the given 'translation_function' name -- which
    will be either gettext or ugettext. It uses the current thread to find the
    translation object to use. If no current translation is activated, the
    message will be run through the default translation object.
    """
    global _default

    # str() is allowing a bytestring message to remain bytestring on Python 2
    eol_message = message.replace(str("\r\n"), str("\n")).replace(str("\r"), str("\n"))

    if len(eol_message) == 0:
        # Returns an empty value of the corresponding type if an empty message
        # is given, instead of metadata, which is the default gettext behavior.
        result = type(message)("")
    else:
        translation_object = getattr(_active, "value", _default)

        result = getattr(translation_object, translation_function)(eol_message)

    if isinstance(message, SafeData):
        return mark_safe(result)

    return result


@prefer_django
def gettext(message):
    """
    Returns a string of the translation of the message.
    Returns a string on Python 3 and an UTF-8-encoded bytestring on Python 2.
    """
    return do_translate(message, "gettext")


if six.PY3:
    ugettext = gettext
else:

    @prefer_django
    def ugettext(message):
        return do_translate(message, "ugettext")
