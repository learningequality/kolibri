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

    def try_execute(self, method_name, error_return_value, *args, **kwargs):
        """
        Safely executes a method with error handling.
            :param method_name --> (str): name of method to execute
            :param error_return_value --> (any): value to return if error occur
            :param *args: positional arguments for method
            :param *kwargs: keyword arguments for method
            :return: The return value of the executed method if successful,
                     otherwise returns error_return_value
        """
        try:
            method = getattr(super(CustomDjangoCache, self), method_name)
            if method is None:
                raise ValueError(
                    "{method_name} is not a valid method".format(
                        method_name=method_name
                    )
                )
            return method(*args, **kwargs)
        except self.ERRORS_TO_HANDLE:
            return error_return_value

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
        return self.try_execute(
            "add",
            False,
            key=key,
            value=value,
            timeout=timeout,
            version=version,
            read=read,
            tag=tag,
            retry=retry,
        )

    def has_key(self, key, version=None):
        """Returns True if the key is in the cache and has not expired.

        :param key: key for item
        :param int version: key version number (default None, cache parameter)
        :return: True if key is found

        """
        return self.try_execute("has_key", False, key=key, version=version)

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
        return self.try_execute(
            "get",
            None,
            key=key,
            default=default,
            version=version,
            read=read,
            expire_time=expire_time,
            tag=tag,
            retry=retry,
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
        return self.try_execute(
            "set",
            False,
            key=key,
            value=value,
            timeout=timeout,
            version=version,
            read=read,
            tag=tag,
            retry=retry,
        )

    def touch(self, key, timeout=DEFAULT_TIMEOUT, version=None, retry=True):
        return self.try_execute(
            "touch",
            False,
            key=key,
            timeout=timeout,
            version=version,
            retry=retry,
        )

    def pop(
        self, key, default=None, version=None, expire_time=False, tag=False, retry=True
    ):
        return self.try_execute(
            "pop",
            None,
            key=key,
            default=default,
            version=version,
            expire_time=expire_time,
            tag=tag,
            retry=retry,
        )

    def delete(self, key, version=None, retry=True):
        self.try_execute(
            "delete",
            None,
            key=key,
            version=version,
            retry=retry,
        )

    def incr(self, key, delta=1, version=None, default=None, retry=True):
        return self.try_execute(
            "incr",
            None,
            key=key,
            delta=delta,
            version=version,
            default=default,
            retry=retry,
        )

    def decr(self, key, delta=1, version=None, default=None, retry=True):
        return self.try_execute(
            "decr",
            None,
            key=key,
            delta=delta,
            version=version,
            default=default,
            retry=retry,
        )

    def expire(self, retry=False):
        return self.try_execute("expire", 0, retry=retry)

    def stats(self, enable=True, reset=False):
        return self.try_execute("stats", (0, 0), enable=enable, reset=reset)

    def create_tag_index(self):
        return self.try_execute("create_tag_index", None)

    def drop_tag_index(self):
        return self.try_execute("drop_tag_index", None)

    def evict(self, tag):
        return self.try_execute("evict", 0, tag=tag)

    def cull(self):
        return self.try_execute("cull", 0)

    def clear(self):
        return self.try_execute("clear", 0)

    def close(self, **kwargs):
        return self.try_execute("close", None, **kwargs)
