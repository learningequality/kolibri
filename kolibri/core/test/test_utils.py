import mock
from diskcache.recipes import RLock
from django.core.cache.backends.base import BaseCache
from django.test import TestCase
from redis import Redis

from kolibri.core.utils.cache import NamespacedCacheProxy
from kolibri.core.utils.cache import ProcessLock
from kolibri.core.utils.cache import RedisSettingsHelper


@mock.patch("kolibri.core.utils.cache.process_cache")
@mock.patch("kolibri.core.utils.cache.OPTIONS")
class GetProcessLockTestCase(TestCase):
    def setup_opts(self, options, redis=False):
        backend = "redis" if redis else "other"
        opts = dict(Cache=dict(CACHE_BACKEND=backend))
        options.__getitem__.side_effect = opts.__getitem__

    def test_redis(self, options, process_cache):
        self.setup_opts(options, redis=True)
        lock = mock.Mock()
        process_cache.lock.return_value = lock
        self.assertEqual(lock, ProcessLock("test_key", expire=2)._lock)
        process_cache.lock.assert_called_once_with(
            "test_key",
            timeout=2000,
            sleep=0.01,
            blocking_timeout=100,
            thread_local=True,
        )

    def test_not_redis(self, options, process_cache):
        self.setup_opts(options, redis=False)
        sub_cache = mock.Mock()
        process_cache.cache.return_value = sub_cache
        lock = ProcessLock("test_key", expire=2)
        self.assertIsInstance(lock._lock, RLock)
        process_cache.cache.assert_called_once_with("locks")
        self.assertEqual(sub_cache, lock._lock._cache)
        self.assertEqual("test_key", lock._lock._key)
        self.assertEqual(2, lock._lock._expire)


@mock.patch("kolibri.core.utils.cache.ProcessLock")
class NamespacedCacheProxyTestCase(TestCase):
    def setUp(self):
        self.lock = mock.MagicMock(spec=RLock)
        self.cache = mock.Mock(spec=BaseCache)
        self.proxy = NamespacedCacheProxy(self.cache, "test")
        self.proxy._lock = self.lock

    def test_get_keys(self, mock_lock):
        self.cache.get.return_value = ["abc"]
        self.assertEqual(["abc"], self.proxy._get_keys())
        self.cache.get.assert_called_with("test:1:__KEYS__", default=[])

    def test_set_keys(self, mock_lock):
        self.proxy._set_keys(["abc"])
        self.cache.set.assert_called_with("test:1:__KEYS__", ["abc"])

    def test_add(self, mock_lock):
        self.cache.add.return_value = True
        self.cache.get.return_value = []

        result = self.proxy.add("abc", 123, "normal arg", timeout=456)
        self.assertTrue(result)

        self.cache.add.assert_called_with("test:1:abc", 123, "normal arg", timeout=456)
        self.cache.set.assert_called_with("test:1:__KEYS__", ["abc"])

    def test_add__failed(self, mock_lock):
        self.cache.add.return_value = False
        self.cache.get.return_value = []

        result = self.proxy.add("abc", 123)
        self.assertFalse(result)

        self.cache.add.assert_called_with("test:1:abc", 123)
        self.cache.set.assert_not_called()

    def test_set(self, mock_lock):
        self.cache.get.return_value = []

        self.proxy.set("abc", 123, "normal arg", timeout=456)

        self.cache.set.assert_any_call("test:1:__KEYS__", ["abc"])
        self.cache.set.assert_any_call("test:1:abc", 123, "normal arg", timeout=456)

    def test_delete(self, mock_lock):
        self.cache.get.return_value = ["abc"]

        self.proxy.delete("abc", 123, "normal arg", extra=456)

        self.cache.set.assert_called_with("test:1:__KEYS__", [])
        self.cache.delete.assert_called_with("test:1:abc", 123, "normal arg", extra=456)

    def test_clear(self, mock_lock):
        self.cache.get.return_value = ["abc", "def", "ghi"]

        self.proxy.clear()

        self.cache.set.assert_called_with("test:1:__KEYS__", [])
        self.cache.delete.assert_any_call("test:1:abc")
        self.cache.delete.assert_any_call("test:1:def")
        self.cache.delete.assert_any_call("test:1:ghi")


class RedisSettingsHelperTestCase(TestCase):
    def setUp(self):
        self.client = mock.MagicMock(spec=Redis)
        self.helper = RedisSettingsHelper(self.client)

    def test_getters(self):
        self.client.config_get.side_effect = [
            {"maxmemory": 123},
            {"maxmemory-policy": "allkeys-lru"},
        ]
        self.assertEqual(123, self.helper.get_maxmemory())
        self.client.config_get.assert_called_with("maxmemory")
        self.assertEqual("allkeys-lru", self.helper.get_maxmemory_policy())
        self.client.config_get.assert_called_with("maxmemory-policy")

    @mock.patch("kolibri.core.utils.cache.logger")
    def test_setters(self, mock_logger):
        self.client.config_get.side_effect = [
            {"maxmemory": 123},
            {"maxmemory-policy": "allkeys-lru"},
        ]
        self.helper.set_maxmemory(123)
        self.client.config_set.assert_called_with("maxmemory", 123)
        self.assertTrue(self.helper.changed)

        self.helper.set_maxmemory_policy("allkeys-lru")
        self.client.config_set.assert_called_with("maxmemory-policy", "allkeys-lru")
        self.assertTrue(self.helper.changed)

    @mock.patch("kolibri.core.utils.cache.logger")
    def test_save(self, mock_logger):
        self.helper.save()
        self.client.config_rewrite.assert_not_called()

        self.helper.changed = True
        self.helper.save()
        self.client.config_rewrite.assert_called()
        self.assertFalse(self.helper.changed)

    @mock.patch("kolibri.core.utils.cache.logger")
    def test_get_used_memory(self, mock_logger):
        self.client.info.return_value = {"used_memory": 123}
        self.assertEqual(123, self.helper.get_used_memory())
        self.client.info.assert_called_once_with(section="memory")
