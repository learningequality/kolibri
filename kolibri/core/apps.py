from __future__ import unicode_literals

from django.apps import AppConfig


class KolibriCoreConfig(AppConfig):
    name = 'kolibri.core'

    def ready(self):
        from django.db import connection

        # Only run the PRAGMAs if we're using SQLite
        if connection.vendor == "sqlite":
            cursor = connection.cursor()
            cursor.execute("PRAGMA synchronous=OFF;")
            cursor.execute("PRAGMA temp_store=MEMORY;")
