from __future__ import unicode_literals

import functools


def _generate_key(*args, **kwargs):
    return (args, frozenset(sorted(kwargs.items())))


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
        key = _generate_key(*args, **kwargs)
        try:
            return cache[key]
        except KeyError:
            ret = cache[key] = fun(*args, **kwargs)
            return ret

    def cache_clear():
        """Clear cache."""
        cache.clear()

    def delete_key(*args, **kwargs):
        key = _generate_key(*args, **kwargs)
        del cache[key]

    cache = {}
    wrapper.cache_clear = cache_clear
    wrapper.delete_key = delete_key
    return wrapper
