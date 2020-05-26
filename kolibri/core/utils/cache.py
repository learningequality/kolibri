from django.core.cache import caches
from django.utils.functional import SimpleLazyObject


def __get_process_cache():
    try:
        return caches["process_cache"]
    except KeyError:
        return caches["default"]


process_cache = SimpleLazyObject(__get_process_cache)
