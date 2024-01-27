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
            method_name="add",
            error_return_value=False,
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
        return self.try_execute(
            method_name="has_key", error_return_value=False, key=key, version=version
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
        return self.try_execute(
            method_name="get",
            error_return_value=None,
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
            method_name="set",
            error_return_value=False,
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
            method_name="touch",
            error_return_value=False,
            key=key,
            timeout=timeout,
            version=version,
            retry=retry,
        )

    def pop(
        self, key, default=None, version=None, expire_time=False, tag=False, retry=True
    ):
        return self.try_execute(
            method_name="pop",
            error_return_value=None,
            key=key,
            default=default,
            version=version,
            expire_time=expire_time,
            tag=tag,
            retry=retry,
        )

    def delete(self, key, version=None, retry=True):
        self.try_execute(
            method_name="delete",
            error_return_value=None,
            key=key,
            version=version,
            retry=retry,
        )

    def incr(self, key, delta=1, version=None, default=None, retry=True):
        return self.try_execute(
            method_name="incr",
            error_return_value=None,
            key=key,
            delta=delta,
            version=version,
            default=default,
            retry=retry,
        )

    def decr(self, key, delta=1, version=None, default=None, retry=True):
        return self.try_execute(
            method_name="decr",
            key=key,
            error_return_value=None,
            delta=delta,
            version=version,
            default=default,
            retry=retry,
        )

    def expire(self, retry=False):
        return self.try_execute(method_name="expire", error_return_value=0, retry=retry)

    def stats(self, enable=True, reset=False):
        return self.try_execute(
            method_name="stats", error_return_value=(0, 0), enable=enable, reset=reset
        )

    def create_tag_index(self):
        return self.try_execute(method_name="create_tag_index", error_return_value=None)

    def drop_tag_index(self):
        return self.try_execute(method_name="drop_tag_index", error_return_value=None)

    def evict(self, tag):
        return self.try_execute(method_name="evict", error_return_value=0, tag=tag)

    def cull(self):
        return self.try_execute(method_name="cull", error_return_value=0)

    def clear(self):
        return self.try_execute(method_name="clear", error_return_value=0)

    def close(self, **kwargs):
        return self.try_execute(method_name="close", error_return_value=None, **kwargs)
