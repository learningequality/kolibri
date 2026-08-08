from django.test import TestCase

from kolibri.core.content.constants.schema_versions import CONTENT_DB_SCHEMA_VERSIONS
from kolibri.core.content.constants.schema_versions import V020BETA1
from kolibri.core.content.contentschema.columns import for_version
from kolibri.core.content.test.helpers import FrozenSchemaDBMixin
from kolibri.core.content.test.helpers import load_content_fixture_data
from kolibri.core.content.utils.source_db import SourceDB


class SchemaDDLTestCase(FrozenSchemaDBMixin, TestCase):
    def test_frozen_ddl_declares_the_frozen_column_map(self):
        # The two frozen artifacts are written from one migrated schema, so a
        # database built from the DDL must have exactly the mapped columns.
        for version in CONTENT_DB_SCHEMA_VERSIONS:
            with self.subTest(version=version):
                with SourceDB(self.build(version)) as source:
                    version_columns = for_version(version)
                    self.assertEqual(set(version_columns), source.tables())
                    for table, table_columns in version_columns.items():
                        self.assertEqual(list(table_columns), source.columns(table))


class BuildContentDBFromFrozenSchemaTestCase(FrozenSchemaDBMixin, TestCase):
    def test_inserts_a_ragged_fixture_row(self):
        # The last content_contentnode row of the legacy fixtures carries keys the
        # rest do not, and it still has to be inserted.
        fixture = load_content_fixture_data(V020BETA1)["content_contentnode"]
        with SourceDB(self.build(V020BETA1)) as source:
            self.assertEqual(len(fixture), len(source.rows("content_contentnode")))
