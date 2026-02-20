# -*- coding: utf-8 -*-
"""
Custom SQLite3 database backend for Kolibri.

This is a restricted backport of Django 5.2's ability to specify the kind of
transaction to use. This allows us to use BEGIN IMMEDIATE transactions to improve
concurrency behavior in SQLite databases, by acquiring write locks at transaction
start rather than at the first write operation.
Once Kolibri upgrades to Django 5.2 or later, this custom backend can be removed
and the settings can revert to using "django.db.backends.sqlite3" directly.

Django 5.2 added support for a transaction_mode option for SQLite, which allows
specifying the transaction behavior (DEFERRED, IMMEDIATE, or EXCLUSIVE) without
needing to override the database backend. We should switch to that option once we
upgrade to Django 5.2+.

See: https://docs.djangoproject.com/en/5.2/ref/databases/#sqlite-transaction-behavior
"""
from django.db.backends.sqlite3.base import (
    DatabaseWrapper as DjangoSQLiteDatabaseWrapper,
)


class DatabaseWrapper(DjangoSQLiteDatabaseWrapper):
    """
    Custom SQLite3 database wrapper that uses BEGIN IMMEDIATE for transactions.
    """

    def _start_transaction_under_autocommit(self):
        """
        Start a transaction explicitly in autocommit mode.

        Staying in autocommit mode works around a bug of sqlite3 that breaks
        savepoints when autocommit is disabled.

        Uses BEGIN IMMEDIATE instead of BEGIN to acquire write locks immediately,
        improving concurrency behavior under high load.
        """
        self.cursor().execute("BEGIN IMMEDIATE")
