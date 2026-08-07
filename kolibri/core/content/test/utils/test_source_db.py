import os
import sqlite3

from django.test import TestCase

from kolibri.core.content.constants.schema_versions import CONTENT_DB_SCHEMA_VERSIONS
from kolibri.core.content.constants.schema_versions import V020BETA1
from kolibri.core.content.constants.schema_versions import VERSION_6
from kolibri.core.content.contentschema.columns import for_version
from kolibri.core.content.errors import SchemaNotFoundError
from kolibri.core.content.test.helpers import FrozenSchemaDBMixin
from kolibri.core.content.utils.source_db import SourceDB


class SourceDBTestCase(FrozenSchemaDBMixin, TestCase):
    def test_tables_reports_the_tables_of_the_file(self):
        with SourceDB(self.build(VERSION_6)) as source:
            self.assertEqual(set(for_version(VERSION_6)), source.tables())

    def test_columns_are_in_declaration_order(self):
        with SourceDB(self.build(VERSION_6)) as source:
            self.assertEqual(
                ["id", "extension", "available", "file_size_bigint"],
                source.columns("content_localfile"),
            )

    def test_rows_are_dicts_keyed_by_column(self):
        with SourceDB(self.build(VERSION_6)) as source:
            rows = source.rows("content_channelmetadata")
            self.assertTrue(rows)
            for row in rows:
                self.assertEqual(
                    source.columns("content_channelmetadata"), list(row.keys())
                )

    def test_columns_of_an_absent_table_is_empty(self):
        with SourceDB(self.build(V020BETA1)) as source:
            self.assertEqual([], source.columns("content_localfile"))

    def test_schema_version_is_inferred_for_every_frozen_schema(self):
        for version in CONTENT_DB_SCHEMA_VERSIONS:
            with self.subTest(version=version):
                with SourceDB(self.build(version)) as source:
                    self.assertEqual(version, source.schema_version)

    def test_a_shape_satisfying_two_schemas_infers_the_more_specific(self):
        # Schema 6 renamed LocalFile.file_size to file_size_bigint, so a file carrying
        # both satisfies 5 and 6. The more specific match is 6 — inferring 5 would
        # drop File.included_presets on import.
        db_path = self.build(VERSION_6)
        with sqlite3.connect(db_path) as connection:
            connection.execute("ALTER TABLE content_localfile ADD COLUMN file_size")
        connection.close()
        with SourceDB(db_path) as source:
            self.assertEqual(VERSION_6, source.schema_version)

    def test_sqlite_bookkeeping_tables_are_not_reported(self):
        # A Django generated schema gives a through table an AUTOINCREMENT id, and
        # writing to one leaves a sqlite_sequence table in the file.
        db_path = self.build(VERSION_6)
        with sqlite3.connect(db_path) as connection:
            connection.execute(
                "CREATE TABLE counted (id INTEGER PRIMARY KEY AUTOINCREMENT)"
            )
            connection.execute("INSERT INTO counted DEFAULT VALUES")
        connection.close()
        with SourceDB(db_path) as source:
            self.assertNotIn("sqlite_sequence", source.tables())

    def test_a_file_with_no_tables_raises(self):
        db_path = os.path.join(self.directory, "empty.sqlite3")
        sqlite3.connect(db_path).close()
        with self.assertRaises(SchemaNotFoundError):
            with SourceDB(db_path) as source:
                source.schema_version

    def test_the_connection_is_read_only(self):
        with SourceDB(self.build(VERSION_6)) as source:
            with self.assertRaises(sqlite3.OperationalError):
                source._connection.execute(
                    "INSERT INTO content_contenttag (id, tag_name) VALUES ('a', 'b')"
                )

    def test_an_absent_file_raises_from_the_constructor(self):
        with self.assertRaises(sqlite3.OperationalError):
            SourceDB(os.path.join(self.directory, "does-not-exist.sqlite3"))
