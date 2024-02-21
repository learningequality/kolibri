import logging

from django.core.cache import caches
from django.core.cache import InvalidCacheBackendError
from django.utils.functional import SimpleLazyObject


logger = logging.getLogger(__name__)


def __get_process_cache():
    try:
        return caches["process_cache"]
    except InvalidCacheBackendError:
        return caches["default"]


process_cache = SimpleLazyObject(__get_process_cache)


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


try:
    from redis_cache import RedisCache as BaseRedisCache

    class RedisCache(BaseRedisCache):
        def set(self, *args, **kwargs):
            """
            Overwrite the set method to not return a value, in line with the Django cache interface
            This causes particular issues for Django's caching middleware, which expects the set method to return None
            as it invokes it directly in a lambda in the response.add_post_render_callback method
            We use a similar pattern in our own caching decorator in kolibri/core/content/api.py and saw errors
            due to the fact if the lambda returns a value, it is interpreted as a replacement for the response object.
            """
            super(RedisCache, self).set(*args, **kwargs)


except (ImportError, InvalidCacheBackendError):
    pass
