from django.core.cache import caches


def get_process_cache():
    try:
        return caches["process_cache"]
    except KeyError:
        return caches["default"]
