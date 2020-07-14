import logging
import os
import time

try:
    from thread import get_ident
except ImportError:
    from threading import get_ident

from django.core.cache import caches
from django.core.cache import InvalidCacheBackendError
from django.core.cache.backends.base import BaseCache
from django.utils.functional import SimpleLazyObject


logger = logging.getLogger(__name__)


def __get_process_cache():
    try:
        return caches["process_cache"]
    except InvalidCacheBackendError:
        return caches["default"]


process_cache = SimpleLazyObject(__get_process_cache)


class DiskCacheRLock(object):
    """
    Vendored from
    https://github.com/grantjenks/python-diskcache/blob/2d1f43ea2be4c82a430d245de6260c3e18059ba1/diskcache/recipes.py
    """

    sleep_time = 0.001

    def __init__(self, key, expire=None):
        self._cache = process_cache
        self._key = key
        self._expire = expire

    def acquire(self):
        "Acquire lock by incrementing count using spin-lock algorithm."
        pid = os.getpid()
        tid = get_ident()
        pid_tid = "{}-{}".format(pid, tid)

        while True:
            value, count = self._cache.get(self._key, (None, 0))
            if pid_tid == value or count == 0:
                self._cache.set(self._key, (pid_tid, count + 1), self._expire)
                return
            time.sleep(self.sleep_time)

    def release(self):
        "Release lock by decrementing count."
        pid = os.getpid()
        tid = get_ident()
        pid_tid = "{}-{}".format(pid, tid)

        value, count = self._cache.get(self._key, default=(None, 0))
        is_owned = pid_tid == value and count > 0
        assert is_owned, "cannot release un-acquired lock"
        self._cache.set(self._key, (value, count - 1), self._expire)

        # RLOCK leaves the db connection open after releasing the lock
        # Let's ensure it's correctly closed
        self._cache.close()

    def __enter__(self):
        self.acquire()

    def __exit__(self, *exc_info):
        self.release()


class NamespacedCacheProxy(BaseCache):
    """
    Namespaces keys and retains a record of inserted keys for easy clearing of
    all namespaced keys in the cache
    """

    def __init__(self, cache, namespace, **params):
        """
        :type cache: BaseCache
        :type namespace: str
        """
        params.update(KEY_PREFIX=namespace)
        super(NamespacedCacheProxy, self).__init__(params)
        self.cache = cache
        self._lock = DiskCacheRLock("namespaced_cache_{}".format(namespace))

    def _get_keys(self):
        """
        :rtype: list
        """
        key = self.make_key("__KEYS__")
        return self.cache.get(key, default=[])

    def _set_keys(self, keys):
        """
        :type keys: list
        """
        key = self.make_key("__KEYS__")
        self.cache.set(key, keys)

    def add(self, key, *args, **kwargs):
        """
        :type key: str
        :rtype: bool
        """
        with self._lock:
            keys = self._get_keys()
            if key not in keys:
                keys.append(key)
            result = self.cache.add(self.make_key(key), *args, **kwargs)
            if result:
                self._set_keys(keys)

        return result

    def get(self, key, *args, **kwargs):
        """
        :type key: str
        :rtype: any
        """
        with self._lock:
            return self.cache.get(self.make_key(key), *args, **kwargs)

    def set(self, key, *args, **kwargs):
        """
        :type key: str
        """
        with self._lock:
            keys = self._get_keys()
            if key not in keys:
                keys.append(key)
            self.cache.set(self.make_key(key), *args, **kwargs)
            self._set_keys(keys)

    def delete(self, key, *args, **kwargs):
        """
        :type key: str
        """
        with self._lock:
            keys = self._get_keys()
            self.cache.delete(self.make_key(key), *args, **kwargs)
            self._set_keys([cached_key for cached_key in keys if cached_key != key])

    def clear(self):
        """
        Clears only the cached keys in this namespace
        """
        with self._lock:
            for key in self._get_keys():
                self.cache.delete(self.make_key(key))
            self._set_keys([])


class RedisSettingsHelper(object):
    def __init__(self, client):
        """
        :type client: redis.Redis
        """
        self.client = client
        self.changed = False

    def get(self, key, default_value=None):
        return self.client.config_get(key).get(key, default_value)

    def set(self, key, value):
        self.changed = True
        logger.info("Configuring Redis: {} {}".format(key, value))
        return self.client.config_set(key, value)

    def get_maxmemory(self):
        return int(self.get("maxmemory", default_value=0))

    def set_maxmemory(self, maxmemory):
        return self.set("maxmemory", maxmemory)

    def get_maxmemory_policy(self):
        return self.get("maxmemory-policy", default_value="noeviction")

    def set_maxmemory_policy(self, policy):
        return self.set("maxmemory-policy", policy)

    def save(self):
        if self.changed:
            logger.info("Overwriting Redis config")
            self.client.config_rewrite()
