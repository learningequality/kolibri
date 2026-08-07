import os
import shutil
import sqlite3
import tempfile
from contextlib import closing

from django.db import connections
from django.test import TestCase

from kolibri.core.content.contentschema.generate import columns_for_schema
from kolibri.core.content.contentschema.generate import render_schema_ddl
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.content_db import content_db
from kolibri.core.content.utils.content_db import create_schema

MODELS = (ContentNode, LocalFile)

# Autoindexes have a null definition, so they are not the generator's to carry.
INDEX_NAMES_QUERY = (
    "SELECT name FROM sqlite_master"
    " WHERE type='index' AND sql IS NOT NULL AND tbl_name IN ('{}')"
)


class GenerateFromDjangoSchemaTestCase(TestCase):
    def setUp(self):
        super().setUp()
        directory = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, directory)
        self.path = os.path.join(directory, "generated.sqlite3")
        self.table_names = [model._meta.db_table for model in MODELS]

    def test_columns_are_the_model_columns_in_declaration_order(self):
        with content_db(self.path) as alias:
            create_schema(alias)
            table_columns = columns_for_schema(connections[alias], self.table_names)

        self.assertEqual(set(self.table_names), set(table_columns))
        for model in MODELS:
            self.assertEqual(
                tuple(field.column for field in model._meta.concrete_fields),
                table_columns[model._meta.db_table],
            )

    def test_the_rendered_ddl_rebuilds_the_same_tables(self):
        with content_db(self.path) as alias:
            create_schema(alias)
            ddl = render_schema_ddl(connections[alias], self.table_names)
            table_columns = columns_for_schema(connections[alias], self.table_names)

        with closing(sqlite3.connect(":memory:")) as connection:
            connection.executescript(ddl)
            for table, columns in table_columns.items():
                rebuilt = connection.execute(
                    'PRAGMA table_info("{}")'.format(table)
                ).fetchall()
                self.assertEqual(list(columns), [row[1] for row in rebuilt])

    def _index_names(self, cursor):
        cursor.execute(INDEX_NAMES_QUERY.format("', '".join(self.table_names)))
        return {name for (name,) in cursor.fetchall()}

    def test_the_rendered_ddl_carries_the_indexes(self):
        with content_db(self.path) as alias:
            create_schema(alias)
            ddl = render_schema_ddl(connections[alias], self.table_names)
            with connections[alias].cursor() as cursor:
                expected = self._index_names(cursor)

        with closing(sqlite3.connect(":memory:")) as connection:
            connection.executescript(ddl)
            rebuilt = self._index_names(connection.cursor())

        self.assertTrue(expected)
        self.assertEqual(expected, rebuilt)

    def test_the_rendered_ddl_describes_only_the_schema_tables(self):
        with content_db(self.path) as alias:
            create_schema(alias)
            # Through tables get an AUTOINCREMENT id, so take everything the schema
            # editor created — the DDL must not carry SQLite's own sqlite_sequence
            # bookkeeping table across with them.
            table_names = connections[alias].introspection.table_names()
            ddl = render_schema_ddl(connections[alias], table_names)

        with closing(sqlite3.connect(":memory:")) as connection:
            connection.executescript(ddl)
            created = connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()

        self.assertEqual(
            set(table_names),
            {name for (name,) in created if not name.startswith("sqlite_")},
        )
