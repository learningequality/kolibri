import logging

from diskcache.recipes import RLock
from django.core.cache import caches
from django.core.cache import InvalidCacheBackendError
from django.core.cache.backends.base import BaseCache
from django.utils.functional import SimpleLazyObject

from kolibri.utils.conf import OPTIONS


logger = logging.getLogger(__name__)


def __get_process_cache():
    try:
        return caches["process_cache"]
    except InvalidCacheBackendError:
        return caches["default"]


process_cache = SimpleLazyObject(__get_process_cache)


class ProcessLock(object):
    def __init__(self, key, expire=None):
        """
        :param key: The lock key
        :param expire: The cache key expiration in seconds (defaults to the CACHE_LOCK_TTL option if not set)
        :type key: str
        :type expire: int
        """
        self.key = key
        self.expire = expire if expire else OPTIONS["Cache"]["CACHE_LOCK_TTL"]

        self._lock_object = None

    @property
    def _lock(self):
        if self._lock_object is None:
            if OPTIONS["Cache"]["CACHE_BACKEND"] == "redis":
                expire = self.expire * 1000
                # if we're using Redis, be sure we use Redis' locking mechanism which uses
                # `SET NX` under the hood. See redis.lock.Lock
                # The Django RedisCache backend provide the lock method to proxy this
                self._lock_object = process_cache.lock(
                    self.key,
                    timeout=expire,  # milliseconds
                    sleep=0.01,  # seconds
                    blocking_timeout=100,  # seconds
                    thread_local=True,
                )
            else:
                # we can't pass in the `process_cache` because it's an instance of DjangoCache
                # and we need a DiskCache Cache instance
                cache = process_cache.cache("locks")
                self._lock_object = RLock(cache, self.key, expire=self.expire)
        return self._lock_object

    def acquire(self):
        self._lock.acquire()

    def release(self):
        try:
            self._lock.release()
        except AssertionError:
            logger.warning(
                "Got an AssertionError when releasing a lock! This is likely from the lock TTL expiring."
            )

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
        self._lock = ProcessLock("namespaced_cache_{}".format(namespace))

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
    """
    Small wrapper for the Redis client to explicitly get/set values from the client
    """

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

    def get_used_memory(self):
        return self.client.info(section="memory").get("used_memory")

    def get_maxmemory(self):
        return int(self.get("maxmemory", default_value=0))

    def set_maxmemory(self, maxmemory):
        return self.set("maxmemory", maxmemory)

    def get_maxmemory_policy(self):
        return self.get("maxmemory-policy", default_value="noeviction")

    def set_maxmemory_policy(self, policy):
        return self.set("maxmemory-policy", policy)

    def save(self):
        """
        Saves the changes to the redis.conf using the CONFIG REWRITE command
        """
        if self.changed:
            logger.info("Overwriting Redis config")
            self.client.config_rewrite()
            self.changed = False
