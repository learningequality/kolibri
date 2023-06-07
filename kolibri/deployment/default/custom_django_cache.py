import sqlite3

from diskcache import DjangoCache
from django.core.cache.backends.base import DEFAULT_TIMEOUT


class CustomDjangoCache(DjangoCache):
    """
    Inherits from the DjangoCache to better manage the error handling of
    the diskcache package by try-catching methods that perform database operations
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
            return DjangoCache.add(self, key, value, timeout, version, read, tag, retry)
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
            return DjangoCache.get(
                self, key, default, version, read, expire_time, tag, retry
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
            return DjangoCache.set(self, key, value, timeout, version, read, tag, retry)
        except sqlite3.OperationalError:
            return False

    def touch(self, key, timeout=DEFAULT_TIMEOUT, version=None, retry=True):
        try:
            return DjangoCache.touch(self, key, timeout, version, retry)
        except sqlite3.OperationalError:
            return False

    def pop(
        self, key, default=None, version=None, expire_time=False, tag=False, retry=True
    ):
        try:
            return DjangoCache.pop(self, key, default, version, expire_time, tag, retry)
        except sqlite3.OperationalError:
            return None

    def delete(self, key, version=None, retry=True):
        try:
            DjangoCache.delete(self, key, version, retry)
        except sqlite3.OperationalError:
            pass

    def incr(self, key, delta=1, version=None, default=None, retry=True):
        try:
            return DjangoCache.incr(self, key, delta, version, default, retry)
        except sqlite3.OperationalError:
            return None

    def decr(self, key, delta=1, version=None, default=None, retry=True):
        try:
            return DjangoCache.decr(self, key, delta, version, default, retry)
        except sqlite3.OperationalError:
            return None

    def expire(self, retry=False):
        try:
            return DjangoCache.expire(self, retry)
        except sqlite3.OperationalError:
            return 0

    def stats(self, enable=True, reset=False):
        try:
            return DjangoCache.stats(self, enable, reset)
        except sqlite3.OperationalError:
            return 0, 0

    def create_tag_index(self):
        try:
            DjangoCache.create_tag_index(self)
        except sqlite3.OperationalError:
            pass

    def drop_tag_index(self):
        try:
            DjangoCache.drop_tag_index(self)
        except sqlite3.OperationalError:
            pass

    def evict(self, tag):
        try:
            return DjangoCache.evict(self, tag)
        except sqlite3.OperationalError:
            return 0

    def cull(self):
        try:
            return DjangoCache.cull(self)
        except sqlite3.OperationalError:
            return 0

    def clear(self):
        try:
            return DjangoCache.clear(self)
        except sqlite3.OperationalError:
            return 0

    def close(self, **kwargs):
        try:
            DjangoCache.close(self, **kwargs)
        except sqlite3.OperationalError:
            pass
