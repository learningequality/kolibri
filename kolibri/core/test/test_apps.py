import functools
import os
import sqlite3
import time
import unittest
from unittest import mock

from django.core.signals import request_finished
from django.db import close_old_connections
from django.db import connection
from django.db import connections
from django.db import transaction
from django.test.testcases import TestCase
from django.test.testcases import TransactionTestCase
from redis import Redis

from kolibri.core.apps import KolibriCoreConfig
from kolibri.core.apps import RedisSettingsHelper
from kolibri.core.sqlite.pragmas import JOURNAL_SIZE_LIMIT
from kolibri.deployment.default.sqlite_db_names import JOB_STORAGE

DEFAULT_CACHE_OPTS = {
    "CACHE_BACKEND": "redis",
    "CACHE_REDIS_MAXMEMORY": 123,
    "CACHE_REDIS_MAXMEMORY_POLICY": "allkeys-lru",
}


def do_setup(**cache_opts):
    defaults = DEFAULT_CACHE_OPTS.copy()
    defaults.update(cache_opts)
    all_opts = {"Cache": defaults}

    def outer_decorator(func):
        @functools.wraps(func)
        def wrapped(self, mock_cache, mock_options, mock_helper_cls, mock_logger):
            mock_cache.get_master_client.return_value = self.client
            mock_options.__getitem__.side_effect = all_opts.__getitem__
            mock_helper_cls.return_value = self.helper
            result = func(self, mock_logger)
            if not result:
                mock_cache.get_master_client.assert_called_once()
                mock_helper_cls.assert_called_once_with(self.client)

        return wrapped

    return outer_decorator


@mock.patch("kolibri.core.apps.logger")
@mock.patch("kolibri.core.apps.RedisSettingsHelper")
@mock.patch("kolibri.core.apps.OPTIONS")
@mock.patch("kolibri.core.apps.process_cache")
class KolibriCoreConfigTestCase(TestCase):
    def setUp(self):
        super().setUp()
        self.client = mock.MagicMock(spec=Redis)
        self.helper = mock.MagicMock(spec=RedisSettingsHelper)

    def setUp_okay(self):
        self.helper.get_maxmemory.return_value = 123
        self.helper.get_maxmemory_policy.return_value = "allkeys-lru"

    def assertOkay(self, logger):
        KolibriCoreConfig.check_redis_settings()

        self.helper.get_maxmemory.assert_called_once()
        self.helper.set_maxmemory.assert_not_called()

        self.helper.get_maxmemory_policy.assert_called_once()
        self.helper.set_maxmemory_policy.assert_not_called()

        logger.assert_not_called()

    @do_setup(CACHE_BACKEND="magic")
    def test_check_redis_settings__not_redis(self, logger):
        KolibriCoreConfig.check_redis_settings()
        self.helper.get_maxmemory.assert_not_called()
        self.helper.set_maxmemory.assert_not_called()

        self.helper.get_maxmemory_policy.assert_not_called()
        self.helper.set_maxmemory_policy.assert_not_called()

        self.helper.save.assert_not_called()
        logger.assert_not_called()
        return True

    @do_setup()
    def test_check_redis_settings(self, logger):
        self.setUp_okay()
        self.assertOkay(logger)
        self.helper.save.assert_not_called()

    @do_setup(CACHE_REDIS_MAXMEMORY=0)
    def test_check_redis_settings__not_okay__maxmemory(self, logger):
        self.helper.get_maxmemory.return_value = 0
        self.helper.get_maxmemory_policy.return_value = "allkeys-lru"
        KolibriCoreConfig.check_redis_settings()

        self.helper.get_maxmemory.assert_called_once()
        self.helper.set_maxmemory.assert_not_called()

        self.helper.get_maxmemory_policy.assert_called_once()
        self.helper.set_maxmemory_policy.assert_not_called()

        self.helper.save.assert_not_called()
        logger.warning.assert_called()

    @do_setup(CACHE_REDIS_MAXMEMORY_POLICY="")
    def test_check_redis_settings__not_okay__maxmemory_policy(self, logger):
        self.helper.get_maxmemory.return_value = 123
        self.helper.get_maxmemory_policy.return_value = "noeviction"
        KolibriCoreConfig.check_redis_settings()

        self.helper.get_maxmemory.assert_called_once()
        self.helper.set_maxmemory.assert_not_called()

        self.helper.get_maxmemory_policy.assert_called_once()
        self.helper.set_maxmemory_policy.assert_not_called()

        self.helper.save.assert_not_called()
        logger.warning.assert_called()

    @do_setup(CACHE_REDIS_MAXMEMORY=456)
    def test_check_redis_settings__update__maxmemory(self, logger):
        self.helper.get_maxmemory.return_value = 0
        self.helper.get_maxmemory_policy.return_value = "allkeys-lru"
        self.helper.get_used_memory.return_value = 0
        self.helper.changed = True
        KolibriCoreConfig.check_redis_settings()

        self.helper.get_maxmemory.assert_called_once()
        self.helper.set_maxmemory.assert_called_once_with(456)

        self.helper.get_maxmemory_policy.assert_called_once()
        self.helper.set_maxmemory_policy.assert_not_called()

        self.helper.save.assert_not_called()
        logger.warning.assert_not_called()

    @do_setup(CACHE_REDIS_MAXMEMORY=456)
    def test_check_redis_settings__update__maxmemory__warning(self, logger):
        self.helper.get_maxmemory.return_value = 0
        self.helper.get_maxmemory_policy.return_value = "allkeys-lru"
        self.helper.get_used_memory.return_value = 512
        self.helper.changed = True
        KolibriCoreConfig.check_redis_settings()

        self.helper.get_maxmemory.assert_called_once()
        self.helper.set_maxmemory.assert_called_once_with(456)

        self.helper.get_maxmemory_policy.assert_called_once()
        self.helper.set_maxmemory_policy.assert_not_called()

        self.helper.save.assert_not_called()
        logger.warning.assert_called()

    @do_setup(CACHE_REDIS_MAXMEMORY_POLICY="volatile-lru")
    def test_check_redis_settings__update__maxmemory_policy(self, logger):
        self.helper.get_maxmemory.return_value = 123
        self.helper.get_maxmemory_policy.return_value = "noeviction"
        self.helper.changed = True
        KolibriCoreConfig.check_redis_settings()

        self.helper.get_maxmemory.assert_called_once()
        self.helper.set_maxmemory.assert_not_called()

        self.helper.get_maxmemory_policy.assert_called_once()
        self.helper.set_maxmemory_policy.assert_called_once_with("volatile-lru")

        self.helper.save.assert_not_called()
        logger.warning.assert_not_called()


@unittest.skipUnless(connection.vendor == "sqlite", "SQLite-specific behaviour")
class ConnectionPragmasTestCase(TransactionTestCase):
    databases = "__all__"

    def setUp(self):
        self.connection = connections[JOB_STORAGE]

    def execute(self, sql, params=None):
        with self.connection.cursor() as cursor:
            cursor.execute(sql, params)

    def test_wal_shrinks_after_a_large_write_while_another_connection_is_open(self):
        path = self.connection.settings_dict["NAME"]
        self.execute("PRAGMA journal_mode=WAL")
        self.addCleanup(self.execute, "PRAGMA journal_mode=DELETE")
        other = sqlite3.connect(path)
        self.addCleanup(other.close)
        other.execute("SELECT 1 FROM sqlite_master").fetchall()
        self.execute("CREATE TABLE wal_probe (data BLOB)")
        self.addCleanup(self.execute, "DROP TABLE wal_probe")
        with transaction.atomic(using=JOB_STORAGE):
            for _ in range(1000):
                self.execute("INSERT INTO wal_probe (data) VALUES (%s)", [b"\0" * 8192])
        self.execute("INSERT INTO wal_probe (data) VALUES (%s)", [b"\0"])
        self.assertLessEqual(os.path.getsize(f"{path}-wal"), JOURNAL_SIZE_LIMIT)

    def close_old_connections_at(self, seconds_from_now):
        later = time.monotonic() + seconds_from_now
        with mock.patch("time.monotonic", return_value=later):
            close_old_connections()

    def test_connection_is_recycled_once_a_day_old(self):
        self.connection.close()
        self.connection.ensure_connection()
        self.close_old_connections_at(60 * 60)
        self.assertIsNotNone(self.connection.connection)
        self.close_old_connections_at(24 * 60 * 60 + 1)
        self.assertIsNone(self.connection.connection)

    def test_finished_request_releases_connection_memory_and_keeps_it_open(self):
        self.connection.ensure_connection()
        raw_connection = self.connection.connection
        statements = []
        raw_connection.set_trace_callback(
            lambda statement: statements.append(statement)
        )
        self.addCleanup(raw_connection.set_trace_callback, None)
        request_finished.send(sender=self.__class__)
        self.assertIn("PRAGMA shrink_memory;", statements)
        self.assertIs(self.connection.connection, raw_connection)
