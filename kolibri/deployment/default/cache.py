import copy
import os
import sys

from kolibri.utils.conf import KOLIBRI_HOME
from kolibri.utils.conf import OPTIONS
from kolibri.utils.options import CACHE_SHARDS

cache_options = OPTIONS["Cache"]

pickle_protocol = OPTIONS["Python"]["PICKLE_PROTOCOL"]

diskcache_location = os.path.join(KOLIBRI_HOME, "process_cache")

# Default to LocMemCache, as it has the simplest configuration
default_cache = {
    "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    # Default time out of each cache key
    "TIMEOUT": cache_options["CACHE_TIMEOUT"],
    "OPTIONS": {"MAX_ENTRIES": cache_options["CACHE_MAX_ENTRIES"]},
}


# Setup a special cache specifically for items that are likely to be needed
# to be shared across processes - most frequently, things that might be needed
# inside asynchronous tasks.
process_cache = {
    "BACKEND": "diskcache.DjangoCache",
    "LOCATION": diskcache_location,
    "TIMEOUT": cache_options["CACHE_TIMEOUT"],
    "SHARDS": CACHE_SHARDS,
    "OPTIONS": {
        "MAX_ENTRIES": cache_options["CACHE_MAX_ENTRIES"],
        # Pin pickle protocol for Python 2 compatibility
        "disk_pickle_protocol": pickle_protocol,
    },
}


if cache_options["CACHE_BACKEND"] == "redis":
    if sys.version_info.major == 3 and sys.version_info.minor < 5:
        raise RuntimeError(
            "Attempted to use redis cache backend with Python 3.4, please use Python 2.7 or 3.5+"
        )
    base_cache = {
        "BACKEND": "redis_cache.RedisCache",
        "LOCATION": cache_options["CACHE_LOCATION"],
        # Default time out of each cache key
        "TIMEOUT": cache_options["CACHE_TIMEOUT"],
        "OPTIONS": {
            "PASSWORD": cache_options["CACHE_PASSWORD"],
            "MAX_ENTRIES": cache_options["CACHE_MAX_ENTRIES"],
            # Pin pickle protocol for Python 2 compatibility
            "PICKLE_VERSION": pickle_protocol,
            "CONNECTION_POOL_CLASS": "redis.BlockingConnectionPool",
            "CONNECTION_POOL_CLASS_KWARGS": {
                "max_connections": cache_options["CACHE_REDIS_MAX_POOL_SIZE"],
                "timeout": cache_options["CACHE_REDIS_POOL_TIMEOUT"],
            },
        },
    }
    default_cache = copy.deepcopy(base_cache)
    default_cache["OPTIONS"]["DB"] = cache_options["CACHE_REDIS_DB"]

CACHES = {
    # Default cache
    "default": default_cache,
}

if cache_options["CACHE_BACKEND"] != "redis":
    # We only needed to add the file based process cache when we are not using
    # Redis, as it is already cross process.
    CACHES["process_cache"] = process_cache
