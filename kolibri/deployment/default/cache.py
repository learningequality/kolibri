import copy
import os
import shutil
import sys
from sqlite3 import DatabaseError

from diskcache import Cache

from kolibri.utils.conf import KOLIBRI_HOME
from kolibri.utils.conf import OPTIONS

cache_options = OPTIONS["Cache"]

pickle_protocol = OPTIONS["Python"]["PICKLE_PROTOCOL"]

diskcache_location = os.path.join(KOLIBRI_HOME, "process_cache")


def recreate_cache():
    shutil.rmtree(diskcache_location, ignore_errors=True)
    os.mkdir(diskcache_location)
    diskcache_cache = Cache(diskcache_location, disk_pickle_protocol=pickle_protocol)
    diskcache_cache.close()


try:
    diskcache_cache = Cache(diskcache_location, disk_pickle_protocol=pickle_protocol)
    diskcache_cache.close()
except DatabaseError:
    recreate_cache()

# Default to LocMemCache, as it has the simplest configuration
default_cache = {
    "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    # Default time out of each cache key
    "TIMEOUT": cache_options["CACHE_TIMEOUT"],
    "OPTIONS": {"MAX_ENTRIES": cache_options["CACHE_MAX_ENTRIES"]},
}

built_files_prefix = "built_files"

built_files_cache = {
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
        },
    }
    default_cache = copy.deepcopy(base_cache)
    default_cache["OPTIONS"]["DB"] = cache_options["CACHE_REDIS_MIN_DB"]
    built_files_cache = copy.deepcopy(base_cache)
    built_files_cache["OPTIONS"]["DB"] = cache_options["CACHE_REDIS_MIN_DB"] + 1

built_files_cache["KEY_PREFIX"] = built_files_prefix

CACHES = {
    # Default cache
    "default": default_cache,
    # Cache for builtfiles - frontend assets that only change on upgrade.
    "built_files": built_files_cache,
}

if cache_options["CACHE_BACKEND"] != "redis":
    # We only needed to add the file based process cache when we are not using
    # Redis, as it is already cross process.
    CACHES["process_cache"] = process_cache
