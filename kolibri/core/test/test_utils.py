import unittest

import mock
from django.conf import settings
from django.db import connection
from django.test import SimpleTestCase
from django.test import TestCase
from redis import Redis

from kolibri.core.device.models import SQLiteLock
from kolibri.core.utils.cache import RedisSettingsHelper
from kolibri.core.utils.lock import db_lock


class DBBasedProcessLockTestCase(SimpleTestCase):

    allow_database_queries = True

    @unittest.skipIf(
        True,
        """
        This test passes by itself, and in combination with a great many other tests. However, when it runs in combination with all of
        the tests in kolibri/core it fails, and any atomic transaction created in that context also fails to create an atomic block.
        """,
    )
    def test_atomic_transaction(self):
        with db_lock():
            self.assertTrue(connection.in_atomic_block)

    @unittest.skipIf(
        getattr(settings, "DATABASES")["default"]["ENGINE"]
        != "django.db.backends.postgresql",
        "Postgresql only test",
    )
    def test_postgres_locking(self):
        try:
            with db_lock():
                raise Exception("An error")
        except Exception:
            pass
        query = "SELECT pg_try_advisory_lock({key}) AS lock;".format(key=1)
        with connection.cursor() as c:
            c.execute(query)
            results = c.fetchone()
            self.assertTrue(results[0])

    @unittest.skipIf(
        getattr(settings, "DATABASES")["default"]["ENGINE"]
        != "django.db.backends.sqlite3",
        "SQLite only test",
    )
    def test_sqlite_locking(self):
        try:
            with db_lock():
                self.assertTrue(SQLiteLock.objects.all().exists())
                raise Exception("An error")
        except Exception:
            pass
        self.assertFalse(SQLiteLock.objects.all().exists())


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
