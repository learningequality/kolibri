import glob
import json
import os
import sqlite3
import tempfile
import unittest

from mock import patch

from kolibri.utils.database import sqlite_check_foreign_keys


class TestSqliteForeignKeyCheck(unittest.TestCase):
    """Test foreign key constraint handling in sqlite_check_foreign_keys"""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test.sqlite3")

    def tearDown(self):
        import shutil

        shutil.rmtree(self.temp_dir)

    def _create_test_db_with_foreign_key_violations(
        self, include_logger_table=True, include_other_table=True
    ):
        """Create a test database with foreign key constraint violations"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Start with foreign keys disabled to set up the violation scenario
        cursor.execute("PRAGMA foreign_keys = OFF;")

        # Create parent table
        cursor.execute("CREATE TABLE parent (id INTEGER PRIMARY KEY);")
        cursor.execute("INSERT INTO parent (id) VALUES (1);")

        if include_logger_table:
            # Create logger table with foreign key
            cursor.execute(
                """
                CREATE TABLE logger_test (
                    id INTEGER PRIMARY KEY,
                    parent_id INTEGER,
                    FOREIGN KEY (parent_id) REFERENCES parent(id)
                );
            """
            )
            cursor.execute("INSERT INTO logger_test (parent_id) VALUES (1);")

        if include_other_table:
            # Create non-logger table with foreign key
            cursor.execute(
                """
                CREATE TABLE user_data (
                    id INTEGER PRIMARY KEY,
                    parent_id INTEGER,
                    FOREIGN KEY (parent_id) REFERENCES parent(id)
                );
            """
            )
            cursor.execute("INSERT INTO user_data (parent_id) VALUES (1);")

        # Delete the parent record while foreign keys are off
        cursor.execute("DELETE FROM parent WHERE id = 1;")
        conn.commit()

        # Enable foreign keys - now the PRAGMA foreign_key_check will detect violations
        cursor.execute("PRAGMA foreign_keys = ON;")
        conn.commit()
        conn.close()

    def test_foreign_key_check_logger_table_auto_delete(self):
        """Test that foreign key violations in logger tables are automatically deleted"""
        self._create_test_db_with_foreign_key_violations(
            include_logger_table=True, include_other_table=False
        )

        # Create backup directory in temp dir
        backup_dir = os.path.join(self.temp_dir, "backups")
        os.makedirs(backup_dir, exist_ok=True)

        # Test the function directly with our test database as non-default to auto-delete
        with patch(
            "kolibri.core.deviceadmin.utils.default_backup_folder",
            return_value=backup_dir,
        ):
            sqlite_check_foreign_keys([self.db_path])

        # Verify the violating row was deleted
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM logger_test;")
        count = cursor.fetchone()[0]
        conn.close()

        self.assertEqual(
            count, 0, "Logger table violation should have been automatically deleted"
        )

        # Verify JSON backup file was created
        json_files = glob.glob(
            os.path.join(backup_dir, "foreign_key_violations_*.json")
        )
        self.assertEqual(
            len(json_files), 1, "Exactly one JSON backup file should have been created"
        )

        # Verify JSON file contains the deleted data in Django fixture format
        with open(json_files[0], "r", encoding="utf-8") as jsonfile:
            data = json.load(jsonfile)
            self.assertIsInstance(data, list, "JSON should be a list of records")
            self.assertEqual(
                len(data), 1, "JSON should contain exactly 1 deleted record"
            )

            # Check Django fixture format
            record = data[0]
            self.assertIn("model", record, "Record should have 'model' field")
            self.assertIn("fields", record, "Record should have 'fields' field")
            self.assertEqual(
                record["model"], "logger_test", "Model should match table name"
            )

    def test_foreign_key_check_non_logger_table_auto_delete(self):
        """Test that foreign key violations in non-logger tables are automatically deleted and backed up"""
        self._create_test_db_with_foreign_key_violations(
            include_logger_table=False, include_other_table=True
        )

        # Create backup directory in temp dir
        backup_dir = os.path.join(self.temp_dir, "backups")
        os.makedirs(backup_dir, exist_ok=True)

        # Test the function with our test database as the default database (first in list)
        with patch(
            "kolibri.core.deviceadmin.utils.default_backup_folder",
            return_value=backup_dir,
        ):
            sqlite_check_foreign_keys([self.db_path])

        # Verify the violating row was deleted
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM user_data;")
        count = cursor.fetchone()[0]
        conn.close()

        self.assertEqual(
            count,
            0,
            "Non-logger table violation should have been automatically deleted",
        )

        # Verify JSON backup file was created
        json_files = glob.glob(
            os.path.join(backup_dir, "foreign_key_violations_*.json")
        )
        self.assertEqual(
            len(json_files), 1, "Exactly one JSON backup file should have been created"
        )

        # Verify JSON file contains the deleted data
        with open(json_files[0], "r", encoding="utf-8") as jsonfile:
            data = json.load(jsonfile)
            self.assertIsInstance(data, list, "JSON should be a list of records")
            self.assertEqual(
                len(data), 1, "JSON should contain exactly 1 deleted record"
            )
            record = data[0]
            self.assertEqual(
                record["model"], "user_data", "Model should match table name"
            )

    def test_foreign_key_check_non_default_db_auto_delete(self):
        """Test that foreign key violations in non-default databases are automatically deleted"""
        # Create additional database
        additional_db_path = os.path.join(self.temp_dir, "additional.sqlite3")

        # Set up the additional database with violations
        conn = sqlite3.connect(additional_db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = OFF;")
        cursor.execute("CREATE TABLE parent (id INTEGER PRIMARY KEY);")
        cursor.execute("INSERT INTO parent (id) VALUES (1);")
        cursor.execute(
            """
            CREATE TABLE user_data (
                id INTEGER PRIMARY KEY,
                parent_id INTEGER,
                FOREIGN KEY (parent_id) REFERENCES parent(id)
            );
        """
        )
        cursor.execute("INSERT INTO user_data (parent_id) VALUES (1);")
        cursor.execute("DELETE FROM parent WHERE id = 1;")
        conn.commit()
        cursor.execute("PRAGMA foreign_keys = ON;")
        conn.commit()
        conn.close()

        # Create backup directory in temp dir
        backup_dir = os.path.join(self.temp_dir, "backups")
        os.makedirs(backup_dir, exist_ok=True)

        # Test the function with additional database as non-default (second in list)
        with patch(
            "kolibri.core.deviceadmin.utils.default_backup_folder",
            return_value=backup_dir,
        ):
            sqlite_check_foreign_keys([self.db_path, additional_db_path])

        # Verify the violating row was deleted in the additional database
        conn = sqlite3.connect(additional_db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM user_data;")
        count = cursor.fetchone()[0]
        conn.close()

        self.assertEqual(
            count,
            0,
            "Non-logger table violation in additional DB should have been automatically deleted",
        )

        # Verify JSON backup file was created
        json_files = glob.glob(
            os.path.join(backup_dir, "foreign_key_violations_*.json")
        )
        self.assertEqual(
            len(json_files), 1, "Exactly one JSON backup file should have been created"
        )

        # Verify JSON file contains the deleted data
        with open(json_files[0], "r", encoding="utf-8") as jsonfile:
            data = json.load(jsonfile)
            self.assertIsInstance(data, list, "JSON should be a list of records")
            self.assertEqual(
                len(data), 1, "JSON should contain exactly 1 deleted record"
            )
            record = data[0]
            self.assertEqual(
                record["model"], "user_data", "Model should match table name"
            )

    def test_foreign_key_check_mixed_tables(self):
        """Test handling of both logger and non-logger table violations in default database"""
        self._create_test_db_with_foreign_key_violations(
            include_logger_table=True, include_other_table=True
        )

        # Create backup directory in temp dir
        backup_dir = os.path.join(self.temp_dir, "backups")
        os.makedirs(backup_dir, exist_ok=True)

        # Test the function with our test database as the default database (first in list)
        with patch(
            "kolibri.core.deviceadmin.utils.default_backup_folder",
            return_value=backup_dir,
        ):
            sqlite_check_foreign_keys([self.db_path])

        # Verify logger table violation was deleted
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM logger_test;")
        logger_count = cursor.fetchone()[0]

        # Verify non-logger table violation was NOT deleted
        cursor.execute("SELECT COUNT(*) FROM user_data;")
        user_count = cursor.fetchone()[0]
        conn.close()

        self.assertEqual(
            logger_count, 0, "Logger table violation should have been deleted"
        )
        self.assertEqual(
            user_count, 0, "Non-logger table violation should also have been deleted"
        )

        # Verify JSON backup file was created for both table deletions
        json_files = glob.glob(
            os.path.join(backup_dir, "foreign_key_violations_*.json")
        )
        self.assertEqual(
            len(json_files), 1, "Exactly one JSON backup file should have been created"
        )

        # Verify JSON file contains both deleted records
        with open(json_files[0], "r", encoding="utf-8") as jsonfile:
            data = json.load(jsonfile)
            self.assertIsInstance(data, list, "JSON should be a list of records")
            self.assertEqual(
                len(data), 2, "JSON should contain exactly 2 deleted records"
            )

            # Find the logger_test record
            logger_records = [r for r in data if r["model"] == "logger_test"]
            self.assertEqual(
                len(logger_records),
                1,
                "Should have exactly 1 logger_test record in backup",
            )

            # Should also have user_data record since it was also deleted
            user_records = [r for r in data if r["model"] == "user_data"]
            self.assertEqual(
                len(user_records), 1, "Should have exactly 1 user_data record in backup"
            )

    def test_foreign_key_check_no_violations(self):
        """Test that no actions are taken when there are no foreign key violations"""
        # Create a database with no violations
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("CREATE TABLE test_table (id INTEGER PRIMARY KEY);")
        conn.commit()
        conn.close()

        # This should not raise any exceptions
        sqlite_check_foreign_keys([self.db_path])

    def test_foreign_key_check_nonexistent_database(self):
        """Test that nonexistent databases are skipped without error"""
        nonexistent_path = os.path.join(self.temp_dir, "nonexistent.sqlite3")

        # This should not raise any exceptions
        sqlite_check_foreign_keys([nonexistent_path])
