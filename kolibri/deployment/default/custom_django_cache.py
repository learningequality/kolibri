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
        try:
            return super(CustomDjangoCache, self).add(
                key, value, timeout, version, read, tag, retry
            )
        except sqlite3.OperationalError:
            return False

    def has_key(self, key, version=None):
        """Returns True if the key is in the cache and has not expired.

        :param key: key for item
        :param int version: key version number (default None, cache parameter)
        :return: True if key is found

        """
        try:
            return super(CustomDjangoCache, self).has_key(  # noqa: W601
                key, version=version
            )
        except sqlite3.OperationalError:
            return False

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
        try:
            return super(CustomDjangoCache, self).get(
                key, default, version, read, expire_time, tag, retry
            )
        except sqlite3.OperationalError:
            return None

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
        try:
            return super(CustomDjangoCache, self).set(
                key, value, timeout, version, read, tag, retry
            )
        except sqlite3.OperationalError:
            return False

    def touch(self, key, timeout=DEFAULT_TIMEOUT, version=None, retry=True):
        try:
            return super(CustomDjangoCache, self).touch(key, timeout, version, retry)
        except sqlite3.OperationalError:
            return False

    def pop(
        self, key, default=None, version=None, expire_time=False, tag=False, retry=True
    ):
        try:
            return super(CustomDjangoCache, self).pop(
                key, default, version, expire_time, tag, retry
            )
        except sqlite3.OperationalError:
            return None

    def delete(self, key, version=None, retry=True):
        try:
            super(CustomDjangoCache, self).delete(key, version, retry)
        except sqlite3.OperationalError:
            pass

    def incr(self, key, delta=1, version=None, default=None, retry=True):
        try:
            return super(CustomDjangoCache, self).incr(
                key, delta, version, default, retry
            )
        except sqlite3.OperationalError:
            return None

    def decr(self, key, delta=1, version=None, default=None, retry=True):
        try:
            return super(CustomDjangoCache, self).decr(
                key, delta, version, default, retry
            )
        except sqlite3.OperationalError:
            return None

    def expire(self, retry=False):
        try:
            return super(CustomDjangoCache, self).expire(retry)
        except sqlite3.OperationalError:
            return 0

    def stats(self, enable=True, reset=False):
        try:
            return super(CustomDjangoCache, self).stats(enable, reset)
        except sqlite3.OperationalError:
            return 0, 0

    def create_tag_index(self):
        try:
            super(CustomDjangoCache, self).create_tag_index()
        except sqlite3.OperationalError:
            pass

    def drop_tag_index(self):
        try:
            super(CustomDjangoCache, self).drop_tag_index()
        except sqlite3.OperationalError:
            pass

    def evict(self, tag):
        try:
            return super(CustomDjangoCache, self).evict(tag)
        except sqlite3.OperationalError:
            return 0

    def cull(self):
        try:
            return super(CustomDjangoCache, self).cull()
        except sqlite3.OperationalError:
            return 0

    def clear(self):
        try:
            return super(CustomDjangoCache, self).clear()
        except sqlite3.OperationalError:
            return 0

    def close(self, **kwargs):
        try:
            super(CustomDjangoCache, self).close(**kwargs)
        except sqlite3.OperationalError:
            pass
