import os

from kolibri.utils.conf import KOLIBRI_HOME
from kolibri.utils.conf import OPTIONS

# Default to LocMemCache, as it has the simplest configuration
default_cache = {
    'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
}

built_files_prefix = 'built_files'

built_files_cache = {
    'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
}


cache_options = OPTIONS['Cache']

if cache_options['CACHE_BACKEND'] == 'disk':
    # Only overwrite default cache, as built_files cache is only
    # to reduce disk access
    default_cache = {
        'BACKEND': 'diskcache.DjangoCache',
        'LOCATION': os.path.join(KOLIBRI_HOME, os.path.expanduser(cache_options['CACHE_LOCATION'])),
        # Default time out of each cache key
        'TIMEOUT': cache_options['CACHE_TIMEOUT'],
        # To handle simultaneous writes, make a shared for each synchronous thread
        'SHARDS': 8,
        # Timeout quickly when trying to do write operations.
        'DATABASE_TIMEOUT': 0.010,
        # ^-- Timeout for each DjangoCache database transaction.
        'OPTIONS': {
            # Limit the on disk size of the cache
            'size_limit': cache_options['CACHE_SIZE_LIMIT'],
            # Don't retry if there is a timeout due to database
            # concurrency on write operations to the cache.
            'retry': False,
            'cull_limit': cache_options['CACHE_CULL_LIMIT'],
            'eviction_policy': 'least-frequently-used',
            'statistics': OPTIONS['Debug']['COLLECT_CACHE_STATS'],
        },
    }

if cache_options['CACHE_BACKEND'] == 'memcached':
    base_cache = {
        'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
        'LOCATION': cache_options['CACHE_LOCATION'],
        # Default time out of each cache key
        'TIMEOUT': cache_options['CACHE_TIMEOUT'],
    }
    default_cache = dict(base_cache)
    built_files_cache = dict(base_cache)

built_files_cache['KEY_PREFIX'] = built_files_prefix

CACHES = {
    # Default cache
    'default': default_cache,
    # Cache for builtfiles - frontend assets that only change on upgrade.
    'built_files': built_files_cache,
}
