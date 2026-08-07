from django.apps import apps
from django.test import TestCase

from kolibri.core.content import base_models
from kolibri.core.content.constants.schema_versions import CONTENT_SCHEMA_VERSION
from kolibri.core.content.constants.schema_versions import CURRENT_SCHEMA_VERSION
from kolibri.core.content.constants.schema_versions import EXPORT_SCHEMA_VERSIONS
from kolibri.core.content.contentschema.columns import for_version


def _models_by_table():
    return {
        model._meta.db_table: model
        for model in apps.get_app_config("content").get_models(
            include_auto_created=True
        )
    }


def _exported_columns(model):
    """
    The columns a table would have if the contentschema app were migrated today.
    """
    # contentschema makes the abstract base_models concrete, so those declare the
    # export schema. An auto created through table has no base_models counterpart.
    base = getattr(base_models, model.__name__, model)
    columns = {field.column for field in base._meta.concrete_fields}
    if hasattr(base, "_mptt_meta"):
        # mptt adds its bookkeeping fields to the concrete model, not the abstract one.
        columns.update(
            {
                base._mptt_meta.left_attr,
                base._mptt_meta.right_attr,
                base._mptt_meta.tree_id_attr,
                base._mptt_meta.level_attr,
            }
        )
    return columns


class ForVersionTestCase(TestCase):
    def test_the_current_version_map_matches_the_export_models(self):
        # A field added to base_models without running generate_schema fails here.
        by_table = _models_by_table()
        for table, columns in for_version(CONTENT_SCHEMA_VERSION).items():
            with self.subTest(table=table):
                self.assertEqual(_exported_columns(by_table[table]), set(columns))

    def test_a_version_with_no_frozen_map_raises(self):
        # CURRENT_SCHEMA_VERSION is not an exported version, so it has no frozen map.
        for version in (str(int(CONTENT_SCHEMA_VERSION) + 1), CURRENT_SCHEMA_VERSION):
            with self.subTest(version=version):
                with self.assertRaises(ValueError):
                    for_version(version)

    def test_export_columns_resolve_against_the_current_models(self):
        by_table = _models_by_table()
        for version in EXPORT_SCHEMA_VERSIONS:
            for table, columns in for_version(version).items():
                with self.subTest(version=version, table=table):
                    self.assertIn(table, by_table)
                    # An exported column may be either a current field's column or
                    # its attname — LocalFile.file_size is stored as file_size_bigint.
                    names = {
                        name
                        for field in by_table[table]._meta.concrete_fields
                        for name in (field.column, field.attname)
                    }
                    self.assertEqual(set(), set(columns) - names)
