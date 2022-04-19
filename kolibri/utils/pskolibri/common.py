from __future__ import absolute_import
from __future__ import division

import functools
import io
import os
import sys
from collections import namedtuple

from kolibri.utils.android import on_android


PY3 = sys.version_info[0] == 3
POSIX = os.name == "posix"
WINDOWS = os.name == "nt"
LINUX = sys.platform.startswith("linux") and not on_android()
MACOS = sys.platform.startswith("darwin")

if PY3:

    def b(s):
        return s.encode("latin-1")


else:

    def b(s):
        return s


ENCODING = sys.getfilesystemencoding()
if not PY3:
    ENCODING_ERRS = "replace"
else:
    try:
        ENCODING_ERRS = sys.getfilesystemencodeerrors()  # py 3.6
    except AttributeError:
        ENCODING_ERRS = "surrogateescape" if POSIX else "replace"

pcputimes = namedtuple(
    "pcputimes", ["user", "system", "children_user", "children_system"]
)


class NoSuchProcess(Exception):
    """Exception raised when a process with a certain PID doesn't
    or no longer exists.
    """

    pass


class AccessDenied(Exception):
    """Exception raised when permission to perform an action is denied."""

    pass


def memoize(fun):
    """A simple memoize decorator for functions supporting (hashable)
    positional arguments.
    It also provides a cache_clear() function for clearing the cache:

    >>> @memoize
    ... def foo()
    ...     return 1
        ...
    >>> foo()
    1
    >>> foo.cache_clear()
    >>>
    """

    @functools.wraps(fun)
    def wrapper(*args, **kwargs):
        key = (args, frozenset(sorted(kwargs.items())))
        try:
            return cache[key]
        except KeyError:
            ret = cache[key] = fun(*args, **kwargs)
            return ret

    def cache_clear():
        """Clear cache."""
        cache.clear()

    cache = {}
    wrapper.cache_clear = cache_clear
    return wrapper


def memoize_when_activated(fun):
    """A memoize decorator which is disabled by default. It can be
    activated and deactivated on request.
    For efficiency reasons it can be used only against class methods
    accepting no arguments.

    >>> class Foo:
    ...     @memoize
    ...     def foo()
    ...         print(1)
    ...
    >>> f = Foo()
    >>> # deactivated (default)
    >>> foo()
    1
    >>> foo()
    1
    >>>
    >>> # activated
    >>> foo.cache_activate()
    >>> foo()
    1
    >>> foo()
    >>> foo()
    >>>
    """

    @functools.wraps(fun)
    def wrapper(self):
        if not wrapper.cache_activated:
            return fun(self)
        try:
            ret = cache[fun]
        except KeyError:
            ret = cache[fun] = fun(self)
        return ret

    def cache_activate():
        """Activate cache."""
        wrapper.cache_activated = True

    def cache_deactivate():
        """Deactivate and clear cache."""
        wrapper.cache_activated = False
        cache.clear()

    cache = {}
    wrapper.cache_activated = False
    wrapper.cache_activate = cache_activate
    wrapper.cache_deactivate = cache_deactivate
    return wrapper


def open_binary(fname, **kwargs):
    return io.open(fname, "rb", **kwargs)


def open_text(fname, **kwargs):
    """On Python 3 opens a file in text mode by using fs encoding and
    a proper en/decoding errors handler.
    On Python 2 this is just an alias for open(name, 'rt').
    """
    if PY3:
        kwargs.setdefault("encoding", ENCODING)
        kwargs.setdefault("errors", ENCODING_ERRS)
    return io.open(fname, "rt", **kwargs)
