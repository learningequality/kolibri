from django.core.cache import caches
from django.core.cache import InvalidCacheBackendError
from django.utils.functional import SimpleLazyObject


def __get_process_cache():
    try:
        return caches["process_cache"]
    except InvalidCacheBackendError:
        return caches["default"]


process_cache = SimpleLazyObject(__get_process_cache)
