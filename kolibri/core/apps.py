from __future__ import unicode_literals

import logging
import os

from django.apps import AppConfig
from django.db.backends.signals import connection_created
from django.db.utils import DatabaseError

from kolibri.core.sqlite.pragmas import CONNECTION_PRAGMAS
from kolibri.core.sqlite.pragmas import START_PRAGMAS
from kolibri.core.sqlite.utils import repair_sqlite_db
from kolibri.core.utils.cache import process_cache
from kolibri.core.utils.cache import RedisSettingsHelper
from kolibri.deployment.default.sqlite_db_names import NOTIFICATIONS
from kolibri.utils.conf import OPTIONS
from kolibri.utils.data import bytes_for_humans

logger = logging.getLogger(__name__)


class KolibriCoreConfig(AppConfig):
    name = "kolibri.core"

    def ready(self):
        """
        Sets up PRAGMAs.
        """
        connection_created.connect(self.activate_pragmas_per_connection)
        self.activate_pragmas_on_start()
        # Log the settings file that we are running Kolibri with.
        # Do this logging here, as this will be after Django has done its processing of
        # Any environment variables or --settings command line arguments.
        logger.info(
            "Running Kolibri with the following settings: {settings}".format(
                settings=os.environ["DJANGO_SETTINGS_MODULE"]
            )
        )
        self.check_redis_settings()

    @staticmethod
    def activate_pragmas_per_connection(sender, connection, **kwargs):
        """
        Activate SQLite3 PRAGMAs that apply on a per-connection basis. A no-op
        right now, but kept around as infrastructure if we ever want to add
        PRAGMAs in the future.
        """

        if connection.vendor == "sqlite":
            if connection.alias == NOTIFICATIONS:
                broken_db = False
                try:
                    cursor = connection.cursor()
                    quick_check = cursor.execute("PRAGMA quick_check").fetchone()[0]
                    broken_db = quick_check != "ok"
                except DatabaseError:
                    broken_db = True
                if broken_db:
                    repair_sqlite_db(connection)
            cursor = connection.cursor()

            # Shorten the default WAL autocheckpoint from 1000 pages to 500
            cursor.executescript(CONNECTION_PRAGMAS)

            # We don't turn on the following pragmas, because they have negligible
            # performance impact. For reference, here's what we've tested:

            # Don't ensure that the OS has fully flushed
            # our data to disk.
            # cursor.execute("PRAGMA synchronous=OFF;")

            # Store cross-database JOINs in memory.
            # cursor.execute("PRAGMA temp_store=MEMORY;")

    @staticmethod
    def activate_pragmas_on_start():
        """
        Activate a set of PRAGMAs that apply to the database itself,
        and not on a per connection basis.
        :return:
        """
        from django.db import connection

        if connection.vendor == "sqlite":
            cursor = connection.cursor()

            # http://www.sqlite.org/wal.html
            # WAL's main advantage allows simultaneous reads
            # and writes (vs. the default exclusive write lock)
            # at the cost of a slight penalty to all reads.
            cursor.execute(START_PRAGMAS)
            connection.close()

    @staticmethod
    def check_redis_settings():
        """
        Check that Redis settings are sensible, and use the lower level Redis client to make updates
        if we are configured to do so, and if we should, otherwise make some logging noise.
        """
        if OPTIONS["Cache"]["CACHE_BACKEND"] != "redis":
            return
        config_maxmemory = OPTIONS["Cache"]["CACHE_REDIS_MAXMEMORY"]
        config_maxmemory_policy = OPTIONS["Cache"]["CACHE_REDIS_MAXMEMORY_POLICY"]

        try:
            # see redis_cache.backends.single.RedisCache
            helper = RedisSettingsHelper(process_cache.get_master_client())

            # set policy first
            # default setting is "noeviction"
            maxmemory_policy = helper.get_maxmemory_policy()
            if (
                config_maxmemory_policy != ""
                and maxmemory_policy != config_maxmemory_policy
            ):
                helper.set_maxmemory_policy(config_maxmemory_policy)
            elif maxmemory_policy == "noeviction":
                logger.warning(
                    "Redis is configured without a maximum memory policy. Using Redis with "
                    "Kolibri, the following is suggested: maxmemory-policy allkeys-lru"
                )

            # default setting is "0", or no limit
            maxmemory = helper.get_maxmemory()
            if config_maxmemory > 0 and maxmemory != config_maxmemory:
                used_memory = helper.get_used_memory()
                if config_maxmemory < used_memory:
                    logger.warning(
                        "Redis was using {used_memory} before setting `maxmemory` configuration of {config_memory}".format(
                            used_memory=bytes_for_humans(used_memory),
                            config_memory=bytes_for_humans(config_maxmemory),
                        )
                    )

                helper.set_maxmemory(config_maxmemory)
            elif maxmemory == 0:
                logger.warning("Redis is configured without a maximum memory size.")

            # add a final message about the redis configuration
            if not helper.changed and (
                maxmemory == 0 or maxmemory_policy == "noeviction"
            ):
                logger.warning(
                    "Problematic Redis settings detected, please see Redis configuration "
                    "documentation for details: https://redis.io/topics/config"
                )
        except Exception as e:
            logger.warning("Unable to check Redis settings")
            logger.warning(e)
