from django.core.cache import caches
from django.core.cache import InvalidCacheBackendError
from django.core.cache.backends.base import BaseCache
from django.utils.functional import SimpleLazyObject
from django.utils.synch import RWLock


def __get_process_cache():
    try:
        return caches["process_cache"]
    except InvalidCacheBackendError:
        return caches["default"]


process_cache = SimpleLazyObject(__get_process_cache)
_namespace_locks = {}


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
        self._lock = _namespace_locks.setdefault(namespace, RWLock())

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
        with self._lock.writer():
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
        with self._lock.reader():
            return self.cache.get(self.make_key(key), *args, **kwargs)

    def set(self, key, *args, **kwargs):
        """
        :type key: str
        """
        with self._lock.writer():
            keys = self._get_keys()
            if key not in keys:
                keys.append(key)
            self.cache.set(self.make_key(key), *args, **kwargs)
            self._set_keys(keys)

    def delete(self, key, *args, **kwargs):
        """
        :type key: str
        """
        with self._lock.writer():
            keys = self._get_keys()
            self.cache.delete(self.make_key(key), *args, **kwargs)
            self._set_keys([cached_key for cached_key in keys if cached_key != key])

    def clear(self):
        """
        Clears only the cached keys in this namespace
        """
        with self._lock.writer():
            for key in self._get_keys():
                self.cache.delete(self.make_key(key))
            self._set_keys([])
