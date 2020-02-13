from django.core.cache import caches

from kolibri.utils.conf import OPTIONS


cache_options = OPTIONS["Cache"]

NOTHING = object()


class CrossProcessCache(object):
    def __init__(self, default_timeout=cache_options["CACHE_TIMEOUT"]):
        self.default_timeout = default_timeout

    def __contains__(self, key):
        if key in caches["default"]:
            return True
        if cache_options["CACHE_BACKEND"] != "redis" and key in caches["process_cache"]:
            return True
        return False

    def get(self, key, default=None, version=None):
        if key in caches["default"] or cache_options["CACHE_BACKEND"] == "redis":
            return caches["default"].get(key, default=default, version=version)
        if key in caches["process_cache"]:
            item = caches["process_cache"].get(key, default=None, version=None)
            caches["default"].set(
                key, item, timeout=self.default_timeout, version=version
            )
            return item
        return default

    def set(self, key, value, timeout=NOTHING, version=None):
        if timeout == NOTHING:
            timeout = self.default_timeout
        caches["default"].set(key, value, timeout=timeout, version=version)
        if cache_options["CACHE_BACKEND"] != "redis":
            caches["process_cache"].set(key, value, timeout=timeout, version=version)

    def delete(self, key, version=None):
        caches["default"].delete(key, version=version)
        if cache_options["CACHE_BACKEND"] != "redis":
            caches["process_cache"].delete(key, version=version)
