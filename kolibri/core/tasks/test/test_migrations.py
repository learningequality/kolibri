import datetime
import unittest

from django.db import connection
from django.db import connections
from django.db import router

from kolibri.core.auth.test.migrationtestcase import TestMigrations
from kolibri.core.auth.test.migrationtestcase import ZERO
from kolibri.core.tasks.models import Job


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
                f"ALTER COLUMN {col} TYPE TIMESTAMP WITHOUT TIME ZONE"
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
                col, col_types, f"Column {col} not found in information_schema"
            )
            self.assertEqual(
                col_types[col],
                "timestamp with time zone",
                f"Column {col} should be timestamptz after migration, got {col_types[col]}",
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


_SQLALCHEMY_015_SCHEMA = """
CREATE TABLE jobs (
    id VARCHAR NOT NULL,
    state VARCHAR,
    priority VARCHAR,
    queue VARCHAR,
    saved_job VARCHAR,
    time_created TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
    time_updated TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX ix_jobs_priority ON jobs (priority);
CREATE INDEX ix_jobs_queue ON jobs (queue);
CREATE INDEX ix_jobs_state ON jobs (state);
"""

_SQLALCHEMY_015_SCHEDULED_SCHEMA = """
CREATE TABLE scheduledjobs (
    id VARCHAR NOT NULL,
    interval INTEGER,
    repeat INTEGER,
    queue VARCHAR,
    saved_job VARCHAR,
    scheduled_time TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX ix_scheduledjobs_queue ON scheduledjobs (queue);
"""

_SQLALCHEMY_016_SCHEMA = """
CREATE TABLE jobs (
    id VARCHAR PRIMARY KEY,
    state VARCHAR,
    func VARCHAR,
    priority INTEGER,
    queue VARCHAR,
    saved_job VARCHAR,
    time_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_updated TIMESTAMP,
    interval INTEGER,
    retry_interval INTEGER,
    repeat INTEGER,
    scheduled_time TIMESTAMP,
    worker_host VARCHAR,
    worker_process VARCHAR,
    worker_thread VARCHAR,
    worker_extra VARCHAR
);
CREATE INDEX ix_jobs_state ON jobs (state);
CREATE INDEX ix_jobs_func ON jobs (func);
CREATE INDEX ix_jobs_priority ON jobs (priority);
CREATE INDEX ix_jobs_queue ON jobs (queue);
CREATE INDEX queue__scheduled_time ON jobs (queue, scheduled_time);
"""


class _LegacyJobMigrationTest(TestMigrations):
    database = router.db_for_write(Job)
    databases = (database,)
    app = "kolibritasks"
    migrate_from = ZERO
    migrate_to = "0005_add_last_finished_fields"

    def setUpBeforeMigration(self, apps):
        with connections[self.database].cursor() as cursor:
            for statement in self.schema.strip().rstrip(";").split(";"):
                cursor.execute(statement)
            cursor.execute(self.insert_job)


class Legacy015JobMigrationTest(_LegacyJobMigrationTest):
    schema = (
        _SQLALCHEMY_015_SCHEMA
        + _SQLALCHEMY_015_SCHEDULED_SCHEMA
        + "CREATE INDEX queue__scheduled_time ON scheduledjobs (queue, scheduled_time);"
    )
    insert_job = """
        INSERT INTO jobs (id, state, priority, queue, saved_job)
        VALUES ('legacy-job', 'QUEUED', '0', 'default', '{}')
    """

    def test_replaces_legacy_job_schema(self):
        conn = connections[self.database]
        self.assertNotIn("scheduledjobs", conn.introspection.table_names())
        with conn.cursor() as cursor:
            index = conn.introspection.get_constraints(cursor, "jobs")[
                "queue__scheduled_time"
            ]
        self.assertTrue(index["index"])
        self.assertEqual(index["columns"], ["queue", "scheduled_time"])
        job = self.apps.get_model(self.app, "Job")
        self.assertEqual(list(job.objects.using(self.database)), [])


class _Legacy016JobMigrationTest(_LegacyJobMigrationTest):
    schema = _SQLALCHEMY_016_SCHEMA
    insert_job = """
        INSERT INTO jobs (id, state, func, priority, queue, saved_job, interval)
        VALUES ('legacy-job', 'QUEUED', 'kolibri.core.tasks.test_func', 0, 'default', '{}', 0)
    """

    def assert_legacy_job_preserved(self):
        job = (
            self.apps.get_model(self.app, "Job")
            .objects.using(self.database)
            .get(pk="legacy-job")
        )
        self.assertEqual(job.queue, "default")
        self.assertEqual(job.saved_job, "{}")
        self.assertEqual(job.func, "kolibri.core.tasks.test_func")


class Legacy016JobMigrationTest(_Legacy016JobMigrationTest):
    def test_preserves_legacy_job(self):
        self.assert_legacy_job_preserved()


class MixedLegacyJobMigrationTest(_Legacy016JobMigrationTest):
    schema = (
        _SQLALCHEMY_016_SCHEMA
        + _SQLALCHEMY_015_SCHEDULED_SCHEMA
        + """
        CREATE INDEX renamed_schedule ON scheduledjobs (queue, scheduled_time);
        INSERT INTO scheduledjobs (id) VALUES ('scheduled');
        """
    )

    def test_preserves_schedule_and_job(self):
        self.assert_legacy_job_preserved()
        with connections[self.database].cursor() as cursor:
            cursor.execute("SELECT id FROM scheduledjobs")
            self.assertEqual(cursor.fetchall(), [("scheduled",)])

    def tearDown(self):
        with connections[self.database].cursor() as cursor:
            cursor.execute("DROP TABLE scheduledjobs")
        super().tearDown()


class SchedulerWithoutIndexMigrationTest(_LegacyJobMigrationTest):
    schema = _SQLALCHEMY_015_SCHEDULED_SCHEMA
    insert_job = "INSERT INTO scheduledjobs (id) VALUES ('unrelated')"

    def test_preserves_unrelated_table(self):
        with connections[self.database].cursor() as cursor:
            cursor.execute("SELECT id FROM scheduledjobs")
            self.assertEqual(cursor.fetchall(), [("unrelated",)])

    def tearDown(self):
        with connections[self.database].cursor() as cursor:
            cursor.execute("DROP TABLE IF EXISTS scheduledjobs")
        super().tearDown()


class Legacy015WithoutSchedulerMigrationTest(Legacy015JobMigrationTest):
    schema = _SQLALCHEMY_015_SCHEMA


class SchedulerOnlyMigrationTest(Legacy015JobMigrationTest):
    schema = _SQLALCHEMY_015_SCHEDULED_SCHEMA + (
        "CREATE INDEX queue__scheduled_time ON scheduledjobs (queue, scheduled_time);"
    )
    insert_job = "INSERT INTO scheduledjobs (id) VALUES ('scheduled')"
