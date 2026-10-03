import datetime
from unittest.mock import patch
from uuid import uuid4

from django import db
from django.core.management import call_command
from django.test import TransactionTestCase
from django.utils import timezone
from morango.models import SyncSession

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.deviceadmin.tasks import perform_vacuum
from kolibri.core.deviceadmin.tasks import SCH_VACUUM_JOB_ID
from kolibri.core.deviceadmin.tasks import streamed_cache_cleanup
from kolibri.core.deviceadmin.tasks import VACUUM_RETRY_DELAY
from kolibri.core.deviceadmin.tasks import VACUUM_SCHEDULE
from kolibri.core.logger.models import UserSessionLog
from kolibri.core.tasks.main import job_storage

PROBE_TABLE = "vacuum_probe"
PROBE_ROWS = 200


def _cursor(alias):
    return db.connections[alias].cursor()


def _pragma(alias, name):
    cursor = _cursor(alias)
    cursor.execute(f"PRAGMA {name};")
    return cursor.fetchone()[0]


def _free_pages(alias):
    return _pragma(alias, "freelist_count")


def _create_probe(alias):
    cursor = _cursor(alias)
    cursor.execute(
        f"CREATE TABLE {PROBE_TABLE} (id INTEGER PRIMARY KEY, data BLOB, tag INTEGER)"
    )
    cursor.execute(f"CREATE INDEX {PROBE_TABLE}_tag ON {PROBE_TABLE} (tag)")
    cursor.executemany(
        f"INSERT INTO {PROBE_TABLE} (data, tag) VALUES (%s, %s)",
        [(b"\0" * 8192, i % 10) for i in range(PROBE_ROWS)],
    )
    cursor.execute(f"DELETE FROM {PROBE_TABLE} WHERE id > 10")


def _drop_probe(alias):
    _cursor(alias).execute(f"DROP TABLE {PROBE_TABLE}")


def _has_planner_stats(alias):
    cursor = _cursor(alias)
    cursor.execute(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='sqlite_stat1'"
    )
    if not cursor.fetchone()[0]:
        return False
    cursor.execute("SELECT count(*) FROM sqlite_stat1 WHERE tbl = %s", [PROBE_TABLE])
    return cursor.fetchone()[0] > 0


class SqliteTestCase(TransactionTestCase):
    databases = "__all__"

    def setUp(self):
        if db.connections[db.DEFAULT_DB_ALIAS].vendor != "sqlite":
            self.skipTest("SQLite-specific behaviour")

    def create_probe(self, alias):
        _create_probe(alias)
        self.addCleanup(_drop_probe, alias)
        self.assertGreater(_free_pages(alias), 0)


class VacuumTestCase(SqliteTestCase):
    def setUp(self):
        super().setUp()
        self.other_alias = next(
            alias for alias in db.connections if alias != db.DEFAULT_DB_ALIAS
        )

    def fragment_every_database(self):
        for alias in db.connections:
            self.create_probe(alias)

    def assertEveryDatabaseVacuumed(self):
        self.assertEqual(
            {alias: _free_pages(alias) for alias in db.connections},
            dict.fromkeys(db.connections, 0),
        )

    def test_perform_vacuum_reclaims_free_pages_in_every_database(self):
        self.fragment_every_database()
        perform_vacuum()
        self.assertEveryDatabaseVacuumed()

    def test_perform_vacuum_refreshes_planner_statistics(self):
        self.fragment_every_database()
        self.assertFalse(_has_planner_stats(db.DEFAULT_DB_ALIAS))
        perform_vacuum()
        self.assertTrue(_has_planner_stats(db.DEFAULT_DB_ALIAS))

    def test_perform_vacuum_refreshes_planner_statistics_before_sqlite_3_46(self):
        self.fragment_every_database()
        self.assertFalse(_has_planner_stats(db.DEFAULT_DB_ALIAS))
        with patch("sqlite3.sqlite_version_info", (3, 45, 0)):
            perform_vacuum()
        self.assertTrue(_has_planner_stats(db.DEFAULT_DB_ALIAS))

    def test_perform_vacuum_of_a_named_database_leaves_the_others(self):
        self.fragment_every_database()
        perform_vacuum(db.DEFAULT_DB_ALIAS)
        self.assertEqual(_free_pages(db.DEFAULT_DB_ALIAS), 0)
        self.assertGreater(_free_pages(self.other_alias), 0)

    def test_command_vacuums_only_the_default_database_by_default(self):
        self.fragment_every_database()
        call_command("vacuum")
        self.assertEqual(_free_pages(db.DEFAULT_DB_ALIAS), 0)
        self.assertGreater(_free_pages(self.other_alias), 0)

    def test_command_with_database_all_vacuums_every_database(self):
        self.fragment_every_database()
        call_command("vacuum", database="all")
        self.assertEveryDatabaseVacuumed()


def _local(hour, minute=0, day=1):
    return datetime.datetime(2026, 7, day, hour, minute, tzinfo=datetime.timezone.utc)


class ScheduledVacuumTestCase(SqliteTestCase):
    def setUp(self):
        super().setUp()
        timezone.activate(datetime.timezone.utc)
        self.addCleanup(timezone.deactivate)
        job_storage.clear(force=True)
        self.addCleanup(job_storage.clear, force=True)
        self.create_probe(db.DEFAULT_DB_ALIAS)

    def clock(self, now):
        return patch("django.utils.timezone.now", return_value=now)

    def run_scheduled_vacuum(self):
        VACUUM_SCHEDULE.apply(perform_vacuum)
        job_storage.get_job(SCH_VACUUM_JOB_ID).execute()
        return job_storage.get_orm_job(SCH_VACUUM_JOB_ID).scheduled_time

    def assertDeferred(self, now, next_run):
        self.assertEqual(next_run, now + VACUUM_RETRY_DELAY)
        self.assertGreater(_free_pages(db.DEFAULT_DB_ALIAS), 0)

    def test_idle_device_is_vacuumed_and_realigned_to_the_schedule(self):
        with self.clock(_local(4, 30)):
            next_run = self.run_scheduled_vacuum()
        self.assertEqual(_free_pages(db.DEFAULT_DB_ALIAS), 0)
        self.assertEqual(next_run, _local(4, day=2))

    def test_other_running_job_defers(self):
        now = _local(4)
        with self.clock(now):
            job_storage.mark_job_as_running(streamed_cache_cleanup.enqueue())
            next_run = self.run_scheduled_vacuum()
        self.assertDeferred(now, next_run)

    def test_queued_job_due_now_defers(self):
        now = _local(4)
        with self.clock(now):
            streamed_cache_cleanup.enqueue()
            next_run = self.run_scheduled_vacuum()
        self.assertDeferred(now, next_run)

    def test_recent_user_interaction_defers(self):
        now = _local(4)
        facility = Facility.objects.create(name="facility")
        user = FacilityUser.objects.create(username="learner", facility=facility)
        UserSessionLog.objects.create(
            user=user, last_interaction_timestamp=now - datetime.timedelta(minutes=5)
        )
        with self.clock(now):
            next_run = self.run_scheduled_vacuum()
        self.assertDeferred(now, next_run)

    def test_recent_sync_session_defers(self):
        now = _local(4)
        SyncSession.objects.create(
            id=uuid4().hex,
            active=True,
            last_activity_timestamp=now - datetime.timedelta(minutes=5),
            profile="facilitydata",
        )
        with self.clock(now):
            next_run = self.run_scheduled_vacuum()
        self.assertDeferred(now, next_run)

    def test_busy_device_past_cutoff_skips_until_next_scheduled_run(self):
        with self.clock(_local(6)):
            streamed_cache_cleanup.enqueue()
            with self.assertLogs("kolibri.core.deviceadmin.tasks", level="WARNING"):
                next_run = self.run_scheduled_vacuum()
        self.assertGreater(_free_pages(db.DEFAULT_DB_ALIAS), 0)
        self.assertEqual(next_run, _local(4, day=2))
