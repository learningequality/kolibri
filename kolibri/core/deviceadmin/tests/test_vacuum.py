import datetime
import os
import sqlite3
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
from kolibri.deployment.default.sqlite_db_names import JOB_STORAGE

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


def _create_probe(alias, kept_rows):
    cursor = _cursor(alias)
    cursor.execute(
        f"CREATE TABLE {PROBE_TABLE} (id INTEGER PRIMARY KEY, data BLOB, tag INTEGER)"
    )
    cursor.execute(f"CREATE INDEX {PROBE_TABLE}_tag ON {PROBE_TABLE} (tag)")
    cursor.executemany(
        f"INSERT INTO {PROBE_TABLE} (data, tag) VALUES (%s, %s)",
        [(b"\0" * 8192, i % 10) for i in range(PROBE_ROWS)],
    )
    cursor.execute(f"DELETE FROM {PROBE_TABLE} WHERE id > %s", [kept_rows])


def _drop_probe(alias):
    _cursor(alias).execute(f"DROP TABLE {PROBE_TABLE}")


def _start_unfinished_statement(alias):
    cursor = _cursor(alias)
    cursor.execute(f"SELECT id FROM {PROBE_TABLE}")
    cursor.fetchone()
    return cursor


def _has_planner_stats(alias):
    cursor = _cursor(alias)
    cursor.execute(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='sqlite_stat1'"
    )
    if not cursor.fetchone()[0]:
        return False
    cursor.execute("SELECT count(*) FROM sqlite_stat1 WHERE tbl = %s", [PROBE_TABLE])
    return cursor.fetchone()[0] > 0


class VacuumTestCase(TransactionTestCase):
    databases = "__all__"

    def setUp(self):
        if db.connections[db.DEFAULT_DB_ALIAS].vendor != "sqlite":
            self.skipTest("SQLite-specific behaviour")
        self.other_alias = next(
            alias for alias in db.connections if alias != db.DEFAULT_DB_ALIAS
        )

    def create_probe(self, alias, kept_rows=10):
        _create_probe(alias, kept_rows)
        self.addCleanup(_drop_probe, alias)
        self.assertGreater(_free_pages(alias), 0)

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

    def test_perform_vacuum_reanalyzes_a_table_that_grew_fiftyfold(self):
        cursor = _cursor(db.DEFAULT_DB_ALIAS)
        cursor.execute(
            "CREATE TABLE growth_probe (id INTEGER PRIMARY KEY, tag INTEGER)"
        )
        self.addCleanup(_cursor(db.DEFAULT_DB_ALIAS).execute, "DROP TABLE growth_probe")
        cursor.execute("CREATE INDEX growth_probe_tag ON growth_probe (tag)")
        insert = "INSERT INTO growth_probe (tag) VALUES (%s)"
        cursor.executemany(insert, [(i % 10,) for i in range(100)])
        cursor.execute("ANALYZE growth_probe")
        stat_query = "SELECT stat FROM sqlite_stat1 WHERE idx = 'growth_probe_tag'"
        cursor.execute(stat_query)
        analyzed = cursor.fetchone()[0]
        cursor.executemany(insert, [(i % 10,) for i in range(100 * 50)])
        perform_vacuum(db.DEFAULT_DB_ALIAS)
        cursor = _cursor(db.DEFAULT_DB_ALIAS)
        cursor.execute(stat_query)
        self.assertNotEqual(cursor.fetchone()[0], analyzed)

    def test_perform_vacuum_refreshes_planner_statistics_before_sqlite_3_46(self):
        self.fragment_every_database()
        self.assertFalse(_has_planner_stats(db.DEFAULT_DB_ALIAS))
        with patch("sqlite3.sqlite_version_info", (3, 45, 0)):
            perform_vacuum()
        self.assertTrue(_has_planner_stats(db.DEFAULT_DB_ALIAS))

    def test_perform_vacuum_empties_the_wal_while_another_connection_is_open(self):
        path = db.connections[JOB_STORAGE].settings_dict["NAME"]
        self.assertEqual(_pragma(JOB_STORAGE, "journal_mode=WAL"), "wal")
        self.addCleanup(_pragma, JOB_STORAGE, "journal_mode=DELETE")
        other = sqlite3.connect(path)
        self.addCleanup(other.close)
        other.execute("SELECT 1 FROM sqlite_master").fetchall()
        self.create_probe(JOB_STORAGE)
        perform_vacuum(JOB_STORAGE)
        self.assertEqual(os.path.getsize(f"{path}-wal"), 0)

    def test_lightly_fragmented_database_is_not_vacuumed_but_is_analyzed(self):
        self.create_probe(db.DEFAULT_DB_ALIAS, kept_rows=PROBE_ROWS - 2)
        free_pages = _free_pages(db.DEFAULT_DB_ALIAS)
        perform_vacuum(db.DEFAULT_DB_ALIAS)
        self.assertEqual(_free_pages(db.DEFAULT_DB_ALIAS), free_pages)
        self.assertTrue(_has_planner_stats(db.DEFAULT_DB_ALIAS))

    def assertVacuumSkipped(self, free_space):
        self.create_probe(db.DEFAULT_DB_ALIAS)
        free_pages = _free_pages(db.DEFAULT_DB_ALIAS)
        size = _pragma(db.DEFAULT_DB_ALIAS, "page_count") * _pragma(
            db.DEFAULT_DB_ALIAS, "page_size"
        )
        with patch(
            "kolibri.core.deviceadmin.tasks.get_free_space",
            side_effect=lambda path: free_space(path, size),
        ):
            with self.assertLogs("kolibri.core.deviceadmin.tasks", level="WARNING"):
                perform_vacuum(db.DEFAULT_DB_ALIAS)
        self.assertEqual(_free_pages(db.DEFAULT_DB_ALIAS), free_pages)
        self.assertTrue(_has_planner_stats(db.DEFAULT_DB_ALIAS))

    def test_vacuum_is_skipped_with_less_than_twice_the_size_free_on_a_shared_filesystem(
        self,
    ):
        here = os.getcwd()
        with patch.dict(os.environ, {"SQLITE_TMPDIR": here, "TMP": here}):
            self.assertVacuumSkipped(lambda path, size: 2 * size - 1)

    def test_vacuum_is_skipped_when_the_temp_directory_lacks_the_database_size(self):
        temp_dir = "/dev/shm"
        if (
            not os.path.isdir(temp_dir)
            or os.stat(temp_dir).st_dev == os.stat(os.curdir).st_dev
        ):
            self.skipTest("Needs a temporary directory on another filesystem")
        with patch.dict(os.environ, {"SQLITE_TMPDIR": temp_dir}):
            self.assertVacuumSkipped(
                lambda path, size: size - 1 if path == temp_dir else 10 * size
            )

    def test_blocked_wal_checkpoint_logs_a_warning(self):
        path = db.connections[JOB_STORAGE].settings_dict["NAME"]
        self.assertEqual(_pragma(JOB_STORAGE, "journal_mode=WAL"), "wal")
        self.addCleanup(_pragma, JOB_STORAGE, "journal_mode=DELETE")
        self.create_probe(JOB_STORAGE)
        reader = sqlite3.connect(path, isolation_level=None)
        self.addCleanup(reader.close)
        reader.execute("BEGIN")
        reader.execute("SELECT count(*) FROM sqlite_master").fetchall()
        self.addCleanup(reader.execute, "ROLLBACK")
        options = db.connections[JOB_STORAGE].settings_dict["OPTIONS"]
        with patch.dict(options, {"timeout": 0.1}):
            with self.assertLogs(
                "kolibri.core.deviceadmin.tasks", level="WARNING"
            ) as logs:
                perform_vacuum(JOB_STORAGE)
        self.assertTrue(any("checkpoint" in line for line in logs.output))

    def test_failed_vacuum_still_refreshes_planner_statistics_then_raises(self):
        self.create_probe(db.DEFAULT_DB_ALIAS)
        pending = _start_unfinished_statement(db.DEFAULT_DB_ALIAS)
        self.addCleanup(pending.close)
        with self.assertRaises(db.DatabaseError):
            perform_vacuum(db.DEFAULT_DB_ALIAS)
        self.assertGreater(_free_pages(db.DEFAULT_DB_ALIAS), 0)
        self.assertTrue(_has_planner_stats(db.DEFAULT_DB_ALIAS))

    def test_failure_in_one_database_still_vacuums_the_others_then_raises(self):
        self.fragment_every_database()
        pending = _start_unfinished_statement(db.DEFAULT_DB_ALIAS)
        self.addCleanup(pending.close)
        with self.assertRaises(db.DatabaseError):
            perform_vacuum()
        self.assertEqual(_free_pages(self.other_alias), 0)

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


class ScheduledVacuumTestCase(TransactionTestCase):
    databases = "__all__"

    def setUp(self):
        timezone.activate(datetime.timezone.utc)
        self.addCleanup(timezone.deactivate)
        job_storage.clear(force=True)
        self.addCleanup(job_storage.clear, force=True)

    def clock(self, now):
        return patch("django.utils.timezone.now", return_value=now)

    def run_scheduled_vacuum(self):
        VACUUM_SCHEDULE.apply(perform_vacuum)
        job_storage.get_job(SCH_VACUUM_JOB_ID).execute()
        return job_storage.get_orm_job(SCH_VACUUM_JOB_ID).scheduled_time

    def assertDeferred(self, now, next_run):
        self.assertEqual(next_run, now + VACUUM_RETRY_DELAY)

    def test_idle_device_is_realigned_to_the_schedule(self):
        with self.clock(_local(4, 30)):
            streamed_cache_cleanup.enqueue_in(datetime.timedelta(minutes=30))
            next_run = self.run_scheduled_vacuum()
        self.assertEqual(next_run, _local(4, 15, day=2))

    def test_failed_run_is_realigned_to_the_schedule(self):
        if db.connections[db.DEFAULT_DB_ALIAS].vendor != "sqlite":
            self.skipTest("SQLite-specific failure")
        _create_probe(db.DEFAULT_DB_ALIAS, kept_rows=10)
        self.addCleanup(_drop_probe, db.DEFAULT_DB_ALIAS)
        pending = _start_unfinished_statement(db.DEFAULT_DB_ALIAS)
        self.addCleanup(pending.close)
        with self.clock(_local(4, 30)):
            next_run = self.run_scheduled_vacuum()
        self.assertEqual(next_run, _local(4, 15, day=2))

    def test_other_running_job_defers(self):
        now = _local(4, 15)
        with self.clock(now):
            job_storage.mark_job_as_running(streamed_cache_cleanup.enqueue())
            next_run = self.run_scheduled_vacuum()
        self.assertDeferred(now, next_run)

    def test_queued_job_due_now_defers(self):
        now = _local(4, 15)
        with self.clock(now):
            streamed_cache_cleanup.enqueue()
            next_run = self.run_scheduled_vacuum()
        self.assertDeferred(now, next_run)

    def create_user_session_log(self, last_interaction_timestamp):
        facility = Facility.objects.create(name="facility")
        user = FacilityUser.objects.create(username="learner", facility=facility)
        UserSessionLog.objects.create(
            user=user, last_interaction_timestamp=last_interaction_timestamp
        )

    def test_recent_user_interaction_defers(self):
        now = _local(4, 15)
        self.create_user_session_log(now - datetime.timedelta(minutes=5))
        with self.clock(now):
            next_run = self.run_scheduled_vacuum()
        self.assertDeferred(now, next_run)

    def test_future_dated_user_interaction_does_not_defer(self):
        now = _local(4, 15)
        self.create_user_session_log(now + datetime.timedelta(days=30))
        with self.clock(now):
            next_run = self.run_scheduled_vacuum()
        self.assertEqual(next_run, _local(4, 15, day=2))

    def create_active_sync_session(self, last_activity_timestamp):
        SyncSession.objects.create(
            id=uuid4().hex,
            active=True,
            last_activity_timestamp=last_activity_timestamp,
            profile="facilitydata",
        )

    def test_recent_sync_session_defers(self):
        now = _local(4, 15)
        self.create_active_sync_session(now - datetime.timedelta(minutes=5))
        with self.clock(now):
            next_run = self.run_scheduled_vacuum()
        self.assertDeferred(now, next_run)

    def test_future_dated_sync_session_does_not_defer(self):
        now = _local(4, 15)
        self.create_active_sync_session(now + datetime.timedelta(days=30))
        with self.clock(now):
            next_run = self.run_scheduled_vacuum()
        self.assertEqual(next_run, _local(4, 15, day=2))

    def test_busy_device_whose_retry_would_pass_cutoff_skips_until_next_scheduled_run(
        self,
    ):
        with self.clock(_local(5, 45)):
            streamed_cache_cleanup.enqueue()
            with self.assertLogs("kolibri.core.deviceadmin.tasks", level="WARNING"):
                next_run = self.run_scheduled_vacuum()
        self.assertEqual(next_run, _local(4, 15, day=2))

    def test_idle_device_past_cutoff_quietly_skips_until_next_scheduled_run(self):
        with self.clock(_local(10)):
            with self.assertLogs(
                "kolibri.core.deviceadmin.tasks", level="INFO"
            ) as logs:
                next_run = self.run_scheduled_vacuum()
        self.assertEqual([record.levelname for record in logs.records], ["INFO"])
        self.assertEqual(next_run, _local(4, 15, day=2))
