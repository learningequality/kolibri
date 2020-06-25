import mock
from django.core.cache.backends.base import BaseCache
from django.test import TestCase

from kolibri.core.utils.cache import NamespacedCacheProxy


class NamespacedCacheProxyTestCase(TestCase):
    def setUp(self):
        self.cache = mock.Mock(spec=BaseCache)
        self.proxy = NamespacedCacheProxy(self.cache, "test")

    def test_get_keys(self):
        self.cache.get.return_value = ["abc"]
        self.assertEqual(["abc"], self.proxy._get_keys())
        self.cache.get.assert_called_with("test:1:__KEYS__", default=[])

    def test_set_keys(self):
        self.proxy._set_keys(["abc"])
        self.cache.set.assert_called_with("test:1:__KEYS__", ["abc"])

    def test_add(self):
        self.cache.add.return_value = True
        self.cache.get.return_value = []

        result = self.proxy.add("abc", 123, "normal arg", timeout=456)
        self.assertTrue(result)

        self.cache.add.assert_called_with("test:1:abc", 123, "normal arg", timeout=456)
        self.cache.set.assert_called_with("test:1:__KEYS__", ["abc"])

    def test_add__failed(self):
        self.cache.add.return_value = False
        self.cache.get.return_value = []

        result = self.proxy.add("abc", 123)
        self.assertFalse(result)

        self.cache.add.assert_called_with("test:1:abc", 123)
        self.cache.set.assert_not_called()

    def test_set(self):
        self.cache.get.return_value = []

        self.proxy.set("abc", 123, "normal arg", timeout=456)

        self.cache.set.assert_any_call("test:1:__KEYS__", ["abc"])
        self.cache.set.assert_any_call("test:1:abc", 123, "normal arg", timeout=456)

    def test_delete(self):
        self.cache.get.return_value = ["abc"]

        self.proxy.delete("abc", 123, "normal arg", extra=456)

        self.cache.set.assert_called_with("test:1:__KEYS__", [])
        self.cache.delete.assert_called_with("test:1:abc", 123, "normal arg", extra=456)

    def test_clear(self):
        self.cache.get.return_value = ["abc", "def", "ghi"]

        self.proxy.clear()

        self.cache.set.assert_called_with("test:1:__KEYS__", [])
        self.cache.delete.assert_any_call("test:1:abc")
        self.cache.delete.assert_any_call("test:1:def")
        self.cache.delete.assert_any_call("test:1:ghi")
