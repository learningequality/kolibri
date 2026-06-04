import datetime
import unittest

from django.db import connection

from kolibri.core.auth.test.migrationtestcase import TestMigrations


# connection.vendor is safe at import time: Django resolves DATABASES settings
# before test modules are collected, so vendor is always correct here.
@unittest.skipUnless(connection.vendor == "postgresql", "PostgreSQL only")
class TimestamptzMigrationTest(TestMigrations):
    migrate_from = "0002_add_retries_fields"
    migrate_to = "0003_convert_datetime_to_timestamptz"
    app = "kolibritasks"
    COLUMNS = ("scheduled_time", "time_created", "time_updated")

    def setUpBeforeMigration(self, apps):
        with connection.cursor() as cursor:
            # Simulate the legacy SQLAlchemy schema where datetime columns are naive.
            alter_clauses = ", ".join(
                "ALTER COLUMN {} TYPE TIMESTAMP WITHOUT TIME ZONE".format(col)
                for col in self.COLUMNS
            )
            cursor.execute("ALTER TABLE jobs " + alter_clauses)
            # Insert a record with a known naive UTC datetime to verify data preservation.
            cursor.execute(
                """
                INSERT INTO jobs (id, state, func, priority, queue, saved_job, interval, scheduled_time)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    "test-migration-job-id",
                    "QUEUED",
                    "kolibri.core.tasks.test_func",
                    0,
                    "default",
                    "{}",
                    0,
                    "2023-01-15 10:30:00",
                ],
            )

    def test_columns_are_timestamptz_after_migration(self):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'jobs'
                  AND table_schema = current_schema()
                  AND column_name = ANY(%s)
                """,
                [list(self.COLUMNS)],
            )
            col_types = {row[0]: row[1] for row in cursor.fetchall()}
        for col in self.COLUMNS:
            self.assertIn(
                col, col_types, "Column {} not found in information_schema".format(col)
            )
            self.assertEqual(
                col_types[col],
                "timestamp with time zone",
                "Column {} should be timestamptz after migration, got {}".format(
                    col, col_types[col]
                ),
            )

    def test_data_preserved_as_utc_after_migration(self):
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT scheduled_time FROM jobs WHERE id = %s",
                ["test-migration-job-id"],
            )
            row = cursor.fetchone()
        self.assertIsNotNone(row, "Test job not found after migration")
        scheduled_time = row[0]
        self.assertIsNotNone(
            scheduled_time.tzinfo,
            "scheduled_time must be timezone-aware after migration",
        )
        expected = datetime.datetime(
            2023, 1, 15, 10, 30, 0, tzinfo=datetime.timezone.utc
        )
        self.assertEqual(
            scheduled_time.astimezone(datetime.timezone.utc),
            expected,
            "Naive datetime should be interpreted as UTC after migration",
        )
