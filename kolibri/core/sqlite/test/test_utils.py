import os
import shutil
import sqlite3
import tempfile

from django.conf import settings
from django.db import ConnectionHandler
from django.db.backends.signals import connection_created
from django.test import TestCase
from mock import patch

from kolibri.core.sqlite.utils import repair_sqlite_db

KOLIBRI_SQLITE_ENGINE = "kolibri.deployment.default.db.backends.sqlite3"

# Django's SQLite backend uses AUTOINCREMENT for AutoField, so a dump of a
# real notifications database carries sqlite_sequence rows too.
POPULATE_SQL = """
CREATE TABLE notes (id integer NOT NULL PRIMARY KEY AUTOINCREMENT, body TEXT);
INSERT INTO notes (body) VALUES ('first'), ('second');
"""

# The same table carrying a constraint its rows do not satisfy: a database that
# dumps cleanly and whose dump will not replay.
IMPOSSIBLE_CHECK_SQL = (
    "CREATE TABLE notes (id integer NOT NULL PRIMARY KEY AUTOINCREMENT, "
    "body TEXT CHECK (body = 'nope'))"
)


class RepairSqliteDbTestCase(TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp_dir, ignore_errors=True)
        self.db_path = os.path.join(self.tmp_dir, "notifications.sqlite3")
        self.backup_folder = os.path.join(self.tmp_dir, "backups")
        # Kolibri's own SQLite backend, whatever engine this test run uses.
        self._patch(
            patch.dict(settings.DATABASES["default"], {"ENGINE": KOLIBRI_SQLITE_ENGINE})
        )
        # default_backup_folder() reads this at call time, so the real one runs.
        self._patch(patch("kolibri.core.deviceadmin.utils.KOLIBRI_HOME", self.tmp_dir))

    def _patch(self, patcher):
        patcher.start()
        self.addCleanup(patcher.stop)

    def _connection(self, name=None, timeout=100):
        # 100 is what settings/base.py configures; the lock test drops it to 0.
        handler = ConnectionHandler(
            {
                "default": {
                    "ENGINE": KOLIBRI_SQLITE_ENGINE,
                    "NAME": self.db_path if name is None else name,
                    "OPTIONS": {"timeout": timeout},
                }
            }
        )
        connection = handler["default"]
        self.addCleanup(connection.close)
        return connection

    def _populate_db(self, journal_mode="WAL"):
        # WAL is the mode START_PRAGMAS leaves every Kolibri database in.
        connection = sqlite3.connect(self.db_path)
        connection.execute("PRAGMA journal_mode={}".format(journal_mode))
        connection.executescript(POPULATE_SQL)
        connection.commit()
        connection.close()

    def _query(self, sql):
        connection = sqlite3.connect(self.db_path)
        try:
            return connection.execute(sql).fetchall()
        finally:
            connection.close()

    def _rows(self):
        return self._query("SELECT body FROM notes ORDER BY id")

    def _backups(self):
        if not os.path.exists(self.backup_folder):
            return []
        return os.listdir(self.backup_folder)

    def _assert_no_temp_files(self):
        self.assertFalse(os.path.exists(self.db_path + ".dump"))
        self.assertFalse(os.path.exists(self.db_path + ".2"))

    def _assert_no_copy_taken(self):
        # A database left as we found it is its own copy.
        self.assertEqual(self._backups(), [])

    def _hold_database_open_with_a_wal(self):
        # The holder's descriptor is what keeps the -wal there past our close().
        self._populate_db()
        holder = sqlite3.connect(self.db_path)
        self.addCleanup(holder.close)
        holder.execute("INSERT INTO notes (body) VALUES ('third')")
        holder.commit()
        self.assertTrue(os.path.exists(self.db_path + "-wal"))

    def _break_the_schema_so_the_dump_will_not_replay(self):
        self._populate_db()
        connection = sqlite3.connect(self.db_path)
        try:
            connection.execute("PRAGMA writable_schema=ON")
            connection.execute(
                "UPDATE sqlite_master SET sql=? WHERE type='table' AND name='notes'",
                (IMPOSSIBLE_CHECK_SQL,),
            )
            connection.execute("PRAGMA writable_schema=OFF")
            connection.commit()
        finally:
            connection.close()

    def _open_a_connection_that_repairs_on_connect(self):
        # What activate_pragmas_per_connection does: repair from
        # connection_created, then go on using the connection.
        connects = []

        def pragmas(sender, connection, **kwargs):
            connects.append(True)
            if len(connects) > 5:
                raise AssertionError("repair re-entered itself")
            repair_sqlite_db(connection)
            connection.cursor().executescript("PRAGMA wal_autocheckpoint=500;")

        connection_created.connect(pragmas)
        self.addCleanup(connection_created.disconnect, pragmas)
        self._connection().cursor()

    def _assert_repair_preserves_rows(self, connection):
        repair_sqlite_db(connection)
        self.assertEqual(self._rows(), [("first",), ("second",)])
        self.assertEqual(self._query("PRAGMA journal_mode"), [("wal",)])
        self.assertEqual(self._query("PRAGMA quick_check"), [("ok",)])
        self.assertEqual(len(self._backups()), 1)
        self._assert_no_temp_files()

    def test_recoverable_database_keeps_rows_when_unopened(self):
        self._populate_db()
        self._assert_repair_preserves_rows(self._connection())

    def test_recoverable_database_keeps_rows_when_already_open(self):
        self._populate_db()
        connection = self._connection()
        connection.cursor()
        self._assert_repair_preserves_rows(connection)

    def test_in_memory_databases_are_not_touched(self):
        # Both spellings the backend knows; the second is the test runner's.
        for name in (
            ":memory:",
            "file:memorydb_notifications?mode=memory&cache=shared",
        ):
            repair_sqlite_db(self._connection(name=name))
            # Even an empty backups/ would mean we got as far as copying.
            self.assertFalse(os.path.exists(self.backup_folder), name)

    def test_unrecoverable_database_is_regenerated(self):
        with open(self.db_path, "wb") as f:
            f.write(b"this is not a database" * 100)
        repair_sqlite_db(self._connection())
        self.assertFalse(os.path.exists(self.db_path))
        self.assertEqual(len(self._backups()), 1)
        self._assert_no_temp_files()

    def test_unrecoverable_database_is_kept_when_it_cannot_be_copied_aside(self):
        # Regenerating deletes the database; a damaged file beats an empty one.
        with open(self.db_path, "wb") as f:
            f.write(b"this is not a database" * 100)
        with patch(
            "kolibri.core.sqlite.utils.copyfile", side_effect=OSError("no space left")
        ):
            repair_sqlite_db(self._connection())
        self.assertTrue(os.path.exists(self.db_path))
        self._assert_no_copy_taken()
        self._assert_no_temp_files()

    def test_empty_database_is_regenerated(self):
        # A 0-byte file is a valid empty database, so the dump succeeds and the
        # tables check is what catches it.
        open(self.db_path, "wb").close()
        repair_sqlite_db(self._connection())
        self.assertFalse(os.path.exists(self.db_path))
        self.assertEqual(len(self._backups()), 1)
        self._assert_no_temp_files()

    def test_failure_to_remove_the_database_is_not_swallowed(self):
        # Windows refuses to delete a file another connection holds open, and a
        # database with no tables fails quick_check for good.
        open(self.db_path, "wb").close()
        real_remove = os.remove

        def fail_on_the_database(path, *args, **kwargs):
            if path == self.db_path:
                raise PermissionError("in use")
            return real_remove(path, *args, **kwargs)

        with patch("os.remove", side_effect=fail_on_the_database):
            with self.assertRaises(PermissionError):
                repair_sqlite_db(self._connection())
        self._assert_no_temp_files()

    def test_locked_database_is_left_alone(self):
        # Rollback-journal mode deliberately: WAL readers are not blocked.
        self._populate_db(journal_mode="DELETE")
        blocker = sqlite3.connect(self.db_path)
        self.addCleanup(blocker.close)
        blocker.execute("BEGIN EXCLUSIVE")
        repair_sqlite_db(self._connection(timeout=0))
        blocker.rollback()
        self.assertEqual(self._rows(), [("first",), ("second",)])
        self._assert_no_copy_taken()
        self._assert_no_temp_files()

    def test_swap_is_declined_when_the_database_cannot_be_copied_aside(self):
        # A full disk or a read-only home. No copy means no swap, and the error
        # must not escape - repair_sqlite_db runs from inside connect().
        self._populate_db()
        inode = os.stat(self.db_path).st_ino
        with patch(
            "kolibri.core.sqlite.utils.copyfile", side_effect=OSError("no space left")
        ):
            repair_sqlite_db(self._connection())
        self.assertEqual(os.stat(self.db_path).st_ino, inode)
        self.assertEqual(self._rows(), [("first",), ("second",)])
        self._assert_no_copy_taken()
        self._assert_no_temp_files()

    def test_replace_failure_leaves_database_alone(self):
        # What Windows raises while another connection holds the file open.
        self._populate_db()
        with patch("os.replace", side_effect=PermissionError("in use")):
            repair_sqlite_db(self._connection())
        self.assertEqual(self._rows(), [("first",), ("second",)])
        # The copy is taken on the way into the swap, so this path keeps one.
        self.assertEqual(len(self._backups()), 1)
        self._assert_no_temp_files()

    def test_swap_is_declined_while_another_connection_is_open(self):
        # Unsafe either way round: dropping the -wal loses the transactions in
        # it, keeping it replays the damaged database over the rebuilt one.
        self._hold_database_open_with_a_wal()

        inode = os.stat(self.db_path).st_ino

        repair_sqlite_db(self._connection())

        # Same file, not a rebuilt one swapped into its place.
        self.assertEqual(os.stat(self.db_path).st_ino, inode)
        self.assertTrue(os.path.exists(self.db_path + "-wal"))
        self.assertEqual(self._rows(), [("first",), ("second",), ("third",)])
        self._assert_no_copy_taken()
        self._assert_no_temp_files()

    def test_swap_is_declined_while_another_connection_holds_a_journal(self):
        # The same check for a database that never made it into WAL mode. A
        # writer holding RESERVED lets our dump through, and the journal it
        # leaves behind would be replayed over the rebuild.
        self._populate_db(journal_mode="DELETE")
        writer = sqlite3.connect(self.db_path)
        self.addCleanup(writer.close)
        writer.execute("BEGIN")
        writer.execute("INSERT INTO notes (body) VALUES ('pending')")
        self.assertTrue(os.path.exists(self.db_path + "-journal"))

        inode = os.stat(self.db_path).st_ino

        repair_sqlite_db(self._connection())

        self.assertEqual(os.stat(self.db_path).st_ino, inode)
        writer.rollback()
        self.assertEqual(self._rows(), [("first",), ("second",)])
        self._assert_no_copy_taken()
        self._assert_no_temp_files()

    def test_nested_repair_while_connecting_bails_out(self):
        # connection_created is how activate_pragmas_per_connection re-enters
        # repair_sqlite_db from inside connect().
        self._populate_db()
        closed = []

        def close_once(sender, connection, **kwargs):
            # A nested repair that gave up leaves the connection closed.
            if not closed:
                closed.append(True)
                connection.close()

        connection_created.connect(close_once)
        self.addCleanup(connection_created.disconnect, close_once)
        repair_sqlite_db(self._connection())
        self.assertEqual(self._rows(), [("first",), ("second",)])
        self._assert_no_copy_taken()
        self._assert_no_temp_files()

    def test_declined_repair_is_not_re_entered_by_its_caller(self):
        # The swap is declined, so the database is left as it was - and the
        # caller's quick_check will keep failing on it.
        self._hold_database_open_with_a_wal()

        self._open_a_connection_that_repairs_on_connect()

        self.assertEqual(self._rows(), [("first",), ("second",), ("third",)])
        self._assert_no_copy_taken()
        self._assert_no_temp_files()

    def test_failed_rebuild_that_cannot_be_copied_aside_is_not_re_entered(self):
        # The other way out with the database left as it was: the rebuild fails
        # and there is no copy to regenerate from, so the damaged file is kept.
        self._break_the_schema_so_the_dump_will_not_replay()

        with patch(
            "kolibri.core.sqlite.utils.copyfile", side_effect=OSError("no space left")
        ):
            self._open_a_connection_that_repairs_on_connect()

        self.assertTrue(os.path.exists(self.db_path))
        self._assert_no_copy_taken()
        self._assert_no_temp_files()

    def test_non_sqlite_default_database_is_not_touched(self):
        self._populate_db()
        with patch.dict(
            settings.DATABASES["default"],
            {"ENGINE": "django.db.backends.postgresql"},
        ):
            repair_sqlite_db(self._connection())
        self._assert_no_copy_taken()
        self.assertEqual(self._rows(), [("first",), ("second",)])
