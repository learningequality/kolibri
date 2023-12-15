"""
Compatibility layer for Python 2+3
"""
import sys
from importlib.util import find_spec


def module_exists(module_path):
    """
    Determines if a module exists without loading it
    """

    try:
        return find_spec(module_path) is not None
    except ImportError:
        return False


def monkey_patch_collections():
    """
    Monkey-patching for the collections module is required for Python 3.10
    and above.
    Prior to 3.10, the collections module still contained all the entities defined in
    collections.abc from Python 3.3 onwards. Here we patch those back into main
    collections module.
    This can be removed when we upgrade to a version of Django that is Python 3.10 compatible.
    """
    if sys.version_info < (3, 10):
        return
    import collections
    from collections import abc

    for name in dir(abc):
        if not hasattr(collections, name):
            setattr(collections, name, getattr(abc, name))


def monkey_patch_translation():
    """
    Monkey-patching for the gettext module is required for Python 3.11
    and above.
    Prior to 3.11, the gettext module classes still had the deprecated set_output_charset
    This can be removed when we upgrade to a version of Django that no longer relies
    on this deprecated Python 2.7 only call.
    """
    if sys.version_info < (3, 11):
        return

    import gettext

    def set_output_charset(*args, **kwargs):
        pass

    gettext.NullTranslations.set_output_charset = set_output_charset

    original_translation = gettext.translation

    def translation(
        domain,
        localedir=None,
        languages=None,
        class_=None,
        fallback=False,
        codeset=None,
    ):
        return original_translation(
            domain,
            localedir=localedir,
            languages=languages,
            class_=class_,
            fallback=fallback,
        )

    gettext.translation = translation

    original_install = gettext.install

    def install(domain, localedir=None, codeset=None, names=None):
        return original_install(domain, localedir=localedir, names=names)

    gettext.install = install
