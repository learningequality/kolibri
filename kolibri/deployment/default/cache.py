import copy
import sys

from kolibri.utils.conf import OPTIONS

cache_options = OPTIONS["Cache"]

# Default to LocMemCache, as it has the simplest configuration
default_cache = {
    "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    # Default time out of each cache key
    "TIMEOUT": cache_options["CACHE_TIMEOUT"],
}

built_files_prefix = "built_files"

built_files_cache = {
    "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    # Default time out of each cache key
    "TIMEOUT": cache_options["CACHE_TIMEOUT"],
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
        "OPTIONS": {"PASSWORD": cache_options["CACHE_PASSWORD"]},
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
