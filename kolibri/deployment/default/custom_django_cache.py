import sqlite3

from diskcache import DjangoCache
from django.core.cache.backends.base import DEFAULT_TIMEOUT


class CustomDjangoCache(DjangoCache):
    """
    Inherits from the DjangoCache to better manage the error handling of the
    diskcache package by try-catching methods that perform database operations
    under the hood by compairing against the version of diskcache used in kolibri:

    https://github.com/grantjenks/python-diskcache/blob/v4.1.0/diskcache/djangocache.py
    """

    ERRORS_TO_HANDLE = (sqlite3.OperationalError, AssertionError)

    def try_execute_return_none_on_error(self, method, *args, **kwargs):
        try:
            return method(*args, **kwargs)
        except self.ERRORS_TO_HANDLE:
            return None

    def try_execute_return_false_on_error(self, method, *args, **kwargs):
        try:
            return method(*args, **kwargs)
        except self.ERRORS_TO_HANDLE:
            return False

    def try_execute_no_return_on_error(self, method, *args, **kwargs):
        try:
            method(*args, **kwargs)
        except self.ERRORS_TO_HANDLE:
            pass

    def try_execute_return_zero_on_error(self, method, *args, **kwargs):
        try:
            return method(*args, **kwargs)
        except self.ERRORS_TO_HANDLE:
            return 0

    def add(
        self,
        key,
        value,
        timeout=DEFAULT_TIMEOUT,
        version=None,
        read=False,
        tag=None,
        retry=True,
    ):
        return self.try_execute_return_false_on_error(
            super(CustomDjangoCache, self).add,
            key,
            value,
            timeout,
            version,
            read,
            tag,
            retry,
        )

    def has_key(self, key, version=None):
        """Returns True if the key is in the cache and has not expired.

        :param key: key for item
        :param int version: key version number (default None, cache parameter)
        :return: True if key is found

        """
        return self.try_execute_return_false_on_error(
            super(CustomDjangoCache, self).has_key, key, version=version
        )

    def get(
        self,
        key,
        default=None,
        version=None,
        read=False,
        expire_time=False,
        tag=False,
        retry=False,
    ):
        return self.try_execute_return_none_on_error(
            super(CustomDjangoCache, self).get,
            key,
            default,
            version,
            read,
            expire_time,
            tag,
            retry,
        )

    def set(
        self,
        key,
        value,
        timeout=DEFAULT_TIMEOUT,
        version=None,
        read=False,
        tag=None,
        retry=True,
    ):
        return self.try_execute_return_false_on_error(
            super(CustomDjangoCache, self).set,
            key,
            value,
            timeout,
            version,
            read,
            tag,
            retry,
        )

    def touch(self, key, timeout=DEFAULT_TIMEOUT, version=None, retry=True):
        return self.try_execute_return_false_on_error(
            super(CustomDjangoCache, self).touch, key, timeout, version, retry
        )

    def pop(
        self, key, default=None, version=None, expire_time=False, tag=False, retry=True
    ):
        return self.try_execute_return_none_on_error(
            super(CustomDjangoCache, self).pop,
            key,
            default,
            version,
            expire_time,
            tag,
            retry,
        )

    def delete(self, key, version=None, retry=True):
        self.try_execute_no_return_on_error(
            super(CustomDjangoCache, self).delete, key, version, retry
        )

    def incr(self, key, delta=1, version=None, default=None, retry=True):
        return self.try_execute_return_none_on_error(
            super(CustomDjangoCache, self).incr, key, delta, version, default, retry
        )

    def decr(self, key, delta=1, version=None, default=None, retry=True):
        return self.try_execute_return_none_on_error(
            super(CustomDjangoCache, self).decr, key, delta, version, default, retry
        )

    def expire(self, retry=False):
        return self.try_execute_return_zero_on_error(super().expire, retry)

    def stats(self, enable=True, reset=False):
        result = self.try_execute_return_none_on_error(super().stats, enable, reset)
        return result if isinstance(result, tuple) else (0, 0)

    def create_tag_index(self):
        self.try_execute_no_return_on_error(
            super(CustomDjangoCache, self).create_tag_index
        )

    def drop_tag_index(self):
        self.try_execute_no_return_on_error(
            super(CustomDjangoCache, self).drop_tag_index
        )

    def evict(self, tag):
        return self.try_execute_return_zero_on_error(super().evict, tag)

    def cull(self):
        return self.try_execute_return_zero_on_error(super().cull)

    def clear(self):
        return self.try_execute_return_zero_on_error(super().clear)

    def close(self, **kwargs):
        self.try_execute_no_return_on_error(
            super(CustomDjangoCache, self).close, **kwargs
        )
