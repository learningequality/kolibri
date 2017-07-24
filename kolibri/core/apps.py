from __future__ import unicode_literals

from django.apps import AppConfig
from django.db.backends.signals import connection_created


class KolibriCoreConfig(AppConfig):
    name = 'kolibri.core'

    def ready(self):
        connection_created.connect(self.activate_connection_pragmas)

    @staticmethod
    def activate_connection_pragmas(sender, connection, **kwargs):
        # Only run the PRAGMAs if we're using SQLite
        if connection.vendor == "sqlite":
            cursor = connection.cursor()

            # Don't ensure that the OS has fully flushed
            # our data to disk.
            cursor.execute("PRAGMA synchronous=OFF;")

            # http://www.sqlite.org/wal.html
            # WAL's main advantage allows simultaneous reads
            # and writes (vs. the default exclusive write lock)
            # at the cost of a slight penalty to all reads.
            cursor.execute("PRAGMA journal_mode=WAL;")

            # Store cross-database JOINs in memory.
            cursor.execute("PRAGMA temp_store=MEMORY;")
