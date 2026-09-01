import logging
import os
import sqlite3
import tempfile
import unittest
import uuid
from contextlib import closing
from contextlib import contextmanager
from contextlib import ExitStack

import pytest
from django.conf import settings
from django.core.management import call_command
from django.db import connections
from django.db import DatabaseError
from django.db import IntegrityError
from django.db import OperationalError
from django.db.models import AutoField
from django.db.utils import ConnectionDoesNotExist
from django.test import TestCase
from django.test import TransactionTestCase
from mock import call
from mock import MagicMock
from mock import Mock
from mock import patch

from kolibri.core.content import models as content
from kolibri.core.content.constants.kind_to_learningactivity import kind_activity_map
from kolibri.core.content.constants.schema_versions import CONTENT_SCHEMA_VERSION
from kolibri.core.content.constants.schema_versions import NO_VERSION
from kolibri.core.content.constants.schema_versions import V020BETA1
from kolibri.core.content.constants.schema_versions import V040BETA3
from kolibri.core.content.constants.schema_versions import VERSION_1
from kolibri.core.content.constants.schema_versions import VERSION_2
from kolibri.core.content.constants.schema_versions import VERSION_3
from kolibri.core.content.constants.schema_versions import VERSION_4
from kolibri.core.content.constants.schema_versions import VERSION_5
from kolibri.core.content.constants.schema_versions import VERSION_6
from kolibri.core.content.contentschema.columns import for_version
from kolibri.core.content.models import AssessmentMetaData
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import ContentTag
from kolibri.core.content.models import File
from kolibri.core.content.models import Language
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.annotation import recurse_annotation_up_tree
from kolibri.core.content.utils.annotation import (
    set_leaf_node_availability_from_local_file_availability,
)
from kolibri.core.content.utils.annotation import update_content_metadata
from kolibri.core.content.utils.channel_import import BATCH_SIZE
from kolibri.core.content.utils.channel_import import ChannelImport
from kolibri.core.content.utils.channel_import import FutureSchemaError
from kolibri.core.content.utils.channel_import import import_channel_from_data
from kolibri.core.content.utils.channel_import import import_channel_from_local_db
from kolibri.core.content.utils.channel_import import initialize_import_manager
from kolibri.core.content.utils.channel_import import InvalidSchemaVersionError
from kolibri.core.content.utils.channel_import import topological_sort
from kolibri.core.content.utils.channels import read_channel_metadata_from_db_file
from kolibri.core.content.utils.content_db import content_db
from kolibri.core.content.utils.content_types_tools import renderable_preset_bits
from kolibri.core.content.utils.source_db import SourceDB

from .helpers import build_content_db_from_frozen_schema
from .helpers import FrozenSchemaDBMixin
from .helpers import load_content_fixture_data
from .test_content_app import ContentNodeTestBase

logger = logging.getLogger(__name__)


def dict_source():
    """
    The smallest dict source a ChannelImport constructor accepts. A fresh dict per
    call, so that a test mutating one cannot reach another.
    """
    return {"schema_version": CONTENT_SCHEMA_VERSION}


class UtilityTestCase(TestCase):
    def test_topological_sort(self):
        sorted_models = topological_sort([File, LocalFile, ContentNode])
        self.assertGreater(sorted_models.index(File), sorted_models.index(ContentNode))
        self.assertGreater(sorted_models.index(File), sorted_models.index(LocalFile))


@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
@patch("kolibri.core.content.utils.channel_import.apps")
class BaseChannelImportClassConstructorTestCase(TestCase):
    """
    Testcase for the base channel import class constructor
    """

    def test_channel_id(self, apps_mock, tree_id_mock):
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)

    @patch("kolibri.core.content.utils.channel_import.get_content_database_file_path")
    def test_get_config(self, db_path_mock, apps_mock, tree_id_mock):
        idValue = uuid.uuid4().hex
        ChannelImport(idValue, dict_source())
        apps_mock.assert_has_calls(
            [
                call.get_app_config("content"),
                call.get_app_config().get_models(include_auto_created=True),
            ]
        )

    def test_tree_id(self, apps_mock, tree_id_mock):
        idValue = uuid.uuid4().hex
        ChannelImport(idValue, dict_source())
        tree_id_mock.assert_called_once_with()


@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
class BaseChannelImportClassFileSourceTestCase(FrozenSchemaDBMixin, TestCase):
    """
    The source half of the constructor, against a real channel database file.
    """

    def build_with_an_undeclared_column(self):
        """
        A VERSION_6 file carrying a column VERSION_6 does not declare, as a Studio
        export does. Superset matching still resolves it to VERSION_6.
        """
        db_path = self.build(VERSION_6)
        with sqlite3.connect(db_path) as connection:
            connection.execute(
                "ALTER TABLE content_contentnode ADD COLUMN studio_only_column"
            )
        connection.close()
        return db_path

    def test_a_file_source_is_read_through_source_db(self, tree_id_mock):
        db_path = self.build(VERSION_6)
        with ChannelImport(uuid.uuid4().hex, db_path) as channel_import:
            self.assertIsInstance(channel_import.source, SourceDB)
            self.assertEqual(db_path, channel_import.source.path)

    def test_the_source_shape_comes_from_the_version_not_the_file(self, tree_id_mock):
        # Reading the file's own columns instead would import studio_only_column's
        # namesakes wherever a later schema added one, silently overriding the
        # model default for a channel published at an older version.
        with ChannelImport(
            uuid.uuid4().hex, self.build_with_an_undeclared_column()
        ) as channel_import:
            self.assertEqual(for_version(VERSION_6), channel_import._source_shape)
            self.assertNotIn(
                "studio_only_column",
                channel_import._source_shape["content_contentnode"],
            )


@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
class DestinationColumnsTestCase(TestCase):
    """
    The destination columns and their widths, derived from the Django model fields.
    """

    def test_each_model_writes_the_export_schema_columns_in_order(self, tree_id_mock):
        channel_import = ChannelImport(uuid.uuid4().hex, dict_source())
        for model in channel_import.content_models:
            pk = model._meta.pk
            # The auto integer primary keys of the many to many through tables are
            # left to the database, so that imported rows cannot collide.
            expected = [
                column
                for column in for_version(CONTENT_SCHEMA_VERSION)[model._meta.db_table]
                if not (isinstance(pk, AutoField) and column == pk.column)
            ]
            self.assertEqual(
                expected,
                [column for column, _ in channel_import._destination_columns(model)],
            )

    def test_annotated_fields_are_not_written(self, tree_id_mock):
        channel_import = ChannelImport(uuid.uuid4().hex, dict_source())
        columns = [
            column for column, _ in channel_import._destination_columns(ContentNode)
        ]
        # An empty column list would satisfy the exclusions vacuously.
        self.assertIn("title", columns)
        for annotated in (
            "ancestors",
            "on_device_resources",
            "num_coach_contents",
            "admin_imported",
            "modality",
        ):
            self.assertNotIn(annotated, columns)

    def test_a_foreign_key_column_is_as_wide_as_the_key_it_points_at(
        self, tree_id_mock
    ):
        # A ForeignKey's own max_length is None. Taking it would stop the PostgreSQL
        # path truncating these columns, and let the database raise instead.
        channel_import = ChannelImport(uuid.uuid4().hex, dict_source())
        widths = {
            column: channel_import._column_max_length(field)
            for column, field in channel_import._destination_columns(ContentNode)
        }
        self.assertEqual(
            {"parent_id": 32, "lang_id": 14, "id": None},
            {column: widths.get(column) for column in ("parent_id", "lang_id", "id")},
        )


@patch(
    "kolibri.core.content.utils.channel_import.ChannelImport.get_all_destination_tree_ids"
)
@patch("kolibri.core.content.utils.channel_import.apps")
class BaseChannelImportClassMethodUniqueTreeIdTestCase(TestCase):
    """
    Testcase for the base channel import class unique tree id generator
    """

    def test_empty(self, apps_mock, tree_ids_mock):
        tree_ids_mock.return_value = []
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        self.assertEqual(channel_import.find_unique_tree_id(), 1)

    def test_one_one(self, apps_mock, tree_ids_mock):
        tree_ids_mock.return_value = [1]
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        self.assertEqual(channel_import.find_unique_tree_id(), 2)

    def test_one_two(self, apps_mock, tree_ids_mock):
        tree_ids_mock.return_value = [2]
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        self.assertEqual(channel_import.find_unique_tree_id(), 1)

    def test_two_one_two(self, apps_mock, tree_ids_mock):
        tree_ids_mock.return_value = [1, 2]
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        self.assertEqual(channel_import.find_unique_tree_id(), 3)

    def test_two_one_three(self, apps_mock, tree_ids_mock):
        tree_ids_mock.return_value = [1, 3]
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        self.assertEqual(channel_import.find_unique_tree_id(), 2)

    def test_three_one_two_three(self, apps_mock, tree_ids_mock):
        tree_ids_mock.return_value = [1, 2, 3]
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        self.assertEqual(channel_import.find_unique_tree_id(), 4)

    def test_three_one_two_four(self, apps_mock, tree_ids_mock):
        tree_ids_mock.return_value = [1, 2, 4]
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        self.assertEqual(channel_import.find_unique_tree_id(), 3)

    def test_three_one_three_four(self, apps_mock, tree_ids_mock):
        tree_ids_mock.return_value = [1, 3, 4]
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        self.assertEqual(channel_import.find_unique_tree_id(), 2)

    def test_three_one_three_five(self, apps_mock, tree_ids_mock):
        tree_ids_mock.return_value = [1, 3, 5]
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        self.assertEqual(channel_import.find_unique_tree_id(), 2)


@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
@patch("kolibri.core.content.utils.channel_import.apps")
class BaseChannelImportClassGenRowMapperTestCase(TestCase):
    """
    Testcase for the base channel import class row mapper generator
    """

    def test_base_mapper(self, apps_mock, tree_id_mock):
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        mapper = channel_import.generate_row_mapper()
        record = MagicMock()
        record.test_attr = "test_val"
        self.assertEqual(mapper(record, "test_attr"), "test_val")

    def test_column_name_mapping(self, apps_mock, tree_id_mock):
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        mappings = {"test_attr": "test_attr_mapped"}
        mapper = channel_import.generate_row_mapper(mappings=mappings)
        record = MagicMock()
        record.test_attr_mapped = "test_val"
        self.assertEqual(mapper(record, "test_attr"), "test_val")

    def test_method_mapping(self, apps_mock, tree_id_mock):
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        mappings = {"test_attr": "test_map_method"}
        mapper = channel_import.generate_row_mapper(mappings=mappings)
        record = {}
        test_map_method = Mock()
        test_map_method.return_value = "test_val"
        channel_import.test_map_method = test_map_method
        self.assertEqual(mapper(record, "test_attr"), "test_val")

    def test_no_column_mapping(self, apps_mock, tree_id_mock):
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        mappings = {"test_attr": "test_attr_mapped"}
        mapper = channel_import.generate_row_mapper(mappings=mappings)
        record = Mock(spec=["test_attr"])
        with self.assertRaises(AttributeError):
            mapper(record, "test_attr")


@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
@patch("kolibri.core.content.utils.channel_import.apps")
class BaseChannelImportClassGenTableMapperTestCase(TestCase):
    """
    Testcase for the base channel import class table mapper generator
    """

    def test_base_mapper(self, apps_mock, tree_id_mock):
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        mapper = channel_import.generate_table_mapper()
        self.assertEqual(mapper, channel_import.base_table_mapper)

    def test_method_mapping(self, apps_mock, tree_id_mock):
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        table_map = "test_map_method"
        test_map_method = Mock()
        channel_import.test_map_method = test_map_method
        mapper = channel_import.generate_table_mapper(table_map=table_map)
        self.assertEqual(mapper, test_map_method)

    def test_no_column_mapping(self, apps_mock, tree_id_mock):
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        table_map = "test_map_method"
        with self.assertRaises(AttributeError):
            channel_import.generate_table_mapper(table_map=table_map)


@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
@patch("kolibri.core.content.utils.channel_import.apps")
class BaseChannelImportClassAttachMethodTestCase(FrozenSchemaDBMixin, TestCase):
    """
    Testcase for the guard that decides whether a table can be transferred by
    attaching the source database and issuing a single INSERT ... SELECT.
    """

    def setUp(self):
        super().setUp()
        # The guard short-circuits on a dict source, so this has to be a file — and a
        # real one at a real schema version, because the constructor resolves the
        # source's version. Its contents are irrelevant: every case replaces the shape.
        self.source_path = self.build(VERSION_6)

    def make_import(self, schema_map, source_columns):
        channel_import = ChannelImport(uuid.uuid4().hex, self.source_path)
        self.addCleanup(channel_import.end)
        channel_import._sqlite_db_attached = True
        channel_import.schema_mapping = {LocalFile: schema_map}
        channel_import._source_shape = {LocalFile._meta.db_table: tuple(source_columns)}
        return channel_import

    def can_attach(self, schema_map, source_columns):
        channel_import = self.make_import(schema_map, source_columns)
        return channel_import.can_use_sqlite_attach_method(
            LocalFile, channel_import.base_table_mapper
        )

    def test_rename_mapping_can_attach(self, apps_mock, tree_id_mock):
        # The schema 5 content_localfile shape.
        self.assertTrue(
            self.can_attach(
                {"per_row": {"file_size_bigint": "file_size"}},
                ["id", "extension", "available", "file_size"],
            )
        )

    def test_constant_mapping_can_attach(self, apps_mock, tree_id_mock):
        self.assertTrue(
            self.can_attach(
                {"per_row": {"available": "default_to_not_available"}},
                ["id", "available"],
            )
        )

    def test_callable_mapping_cannot_attach(self, apps_mock, tree_id_mock):
        self.assertFalse(
            self.can_attach({"per_row": {"available": "get_none"}}, ["id", "available"])
        )

    def test_unknown_mapping_cannot_attach(self, apps_mock, tree_id_mock):
        self.assertFalse(
            self.can_attach(
                {"per_row": {"available": "no_such_mapping"}}, ["id", "available"]
            )
        )

    def test_per_table_mapping_cannot_attach(self, apps_mock, tree_id_mock):
        self.assertFalse(
            self.can_attach(
                {
                    "per_table": "generate_local_file_from_file",
                    "per_row": {"id": "checksum"},
                },
                ["id", "checksum"],
            )
        )

    def test_source_column_wins_over_callable_attribute(self, apps_mock, tree_id_mock):
        # Contrived: a source column named after a callable method is the only
        # way to observe, through the public guard, that the source wins.
        self.assertTrue(
            self.can_attach(
                {"per_row": {"available": "get_none"}},
                ["id", "available", "get_none"],
            )
        )

    def test_missing_source_table_cannot_attach(self, apps_mock, tree_id_mock):
        channel_import = self.make_import(
            {"per_row": {"file_size_bigint": "file_size"}},
            ["id", "extension", "available", "file_size"],
        )
        # A source whose schema version does not declare content_localfile at all.
        channel_import._source_shape = {}
        self.assertFalse(
            channel_import.can_use_sqlite_attach_method(
                LocalFile, channel_import.base_table_mapper
            )
        )

    def test_raw_attached_import_raises_for_unknown_mapping(
        self, apps_mock, tree_id_mock
    ):
        channel_import = self.make_import(
            {"per_row": {"available": "no_such_mapping"}}, ["id", "available"]
        )
        # Match on the message, so that an incidental failure further down the
        # method cannot pass for the mapping check raising.
        with self.assertRaisesRegex(Exception, "no_such_mapping"):
            channel_import.raw_attached_sqlite_table_import(
                LocalFile, channel_import.base_table_mapper
            )


@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
class AliasReleaseTestCase(FrozenSchemaDBMixin, TestCase):
    """
    An import that fails partway must release both the source it opened and the
    destination alias it registered.
    """

    def setUp(self):
        super().setUp()
        self.destination = os.path.join(self.directory, "destination.sqlite3")

    def write_a_destination_that_is_not_a_database(self):
        # It opens as a database, so the constructor only fails once it queries,
        # which is after the alias is registered and the source is open.
        with open(self.destination, "w") as f:
            f.write("not a database")

    def test_a_failing_import_releases_its_alias(self, tree_id_mock):
        with self.assertRaises(RuntimeError):
            with ChannelImport(
                uuid.uuid4().hex, dict_source(), destination=self.destination
            ) as channel_import:
                alias = channel_import.destination
                raise RuntimeError("import failed partway")

        with self.assertRaises(ConnectionDoesNotExist):
            connections[alias]

    def test_a_failing_constructor_releases_its_alias(self, tree_id_mock):
        self.write_a_destination_that_is_not_a_database()

        # There is no instance to read the alias off, and iterating connections
        # only yields the aliases in settings, so record what the constructor was
        # handed on the way past.
        opened = []

        @contextmanager
        def record(path=None):
            with content_db(path) as alias:
                opened.append(alias)
                yield alias

        with patch("kolibri.core.content.utils.channel_import.content_db", record):
            with self.assertRaises(DatabaseError):
                ChannelImport(
                    uuid.uuid4().hex, dict_source(), destination=self.destination
                )

        with self.assertRaises(ConnectionDoesNotExist):
            connections[opened[0]]

    def test_a_failing_constructor_closes_the_source(self, tree_id_mock):
        self.write_a_destination_that_is_not_a_database()
        # Held here: a constructor that raises hands back no instance to read it off.
        source = SourceDB(self.build(VERSION_6))

        with patch(
            "kolibri.core.content.utils.channel_import.SourceDB", return_value=source
        ):
            with self.assertRaises(DatabaseError):
                ChannelImport(
                    uuid.uuid4().hex, source.path, destination=self.destination
                )

        with self.assertRaises(sqlite3.ProgrammingError):
            source.rows("content_channelmetadata")


@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
class AttachedSourceDatabaseTestCase(FrozenSchemaDBMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.destination = os.path.join(self.directory, "destination.sqlite3")

    @unittest.skipIf(
        "sqlite3" not in settings.DATABASES["default"]["ENGINE"],
        "SQLite only test",
    )
    def test_a_failing_detach_does_not_propagate(self, tree_id_mock):
        # The detach unwinds after the import has committed, so a raise here would
        # skip the annotation that follows and leave the channel unannotated.
        @contextmanager
        def attach_but_fail_to_detach(alias, path, name):
            yield
            raise OperationalError("database sourcedb is locked")

        with ChannelImport(
            uuid.uuid4().hex, self.build(VERSION_6), destination=self.destination
        ) as channel_import:
            with patch(
                "kolibri.core.content.utils.channel_import.attached_database",
                attach_but_fail_to_detach,
            ):
                with ExitStack() as stack:
                    channel_import.try_attaching_sqlite_database(stack)
                    self.assertTrue(channel_import._sqlite_db_attached)

            self.assertFalse(channel_import._sqlite_db_attached)


@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
class ImportInsideATransactionTestCase(TestCase):
    @unittest.skipIf(
        "sqlite3" not in settings.DATABASES["default"]["ENGINE"],
        "SQLite only test",
    )
    def test_a_sqlite_import_inside_a_transaction_is_refused(self, tree_id_mock):
        # A TestCase runs inside an atomic block, which is exactly where SQLite
        # ignores the foreign key suppression the import depends on.
        with ChannelImport(uuid.uuid4().hex, dict_source()) as channel_import:
            with self.assertRaises(RuntimeError):
                channel_import.import_channel_data()


@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
@patch("kolibri.core.content.utils.channel_import.apps")
class BaseChannelImportClassOtherMethodsTestCase(TransactionTestCase):
    """
    Testcase for the base channel import class remaining methods.

    Not a TestCase: import_channel_data refuses to run inside a transaction.
    """

    def test_import_channel_methods_called(self, apps_mock, tree_id_mock):
        idValue = uuid.uuid4().hex
        channel_import = ChannelImport(idValue, dict_source())
        self.assertEqual(channel_import.channel_id, idValue)
        channel_import.content_models = [ContentTag]
        mapping_mock = Mock()
        channel_import.schema_mapping = {ContentTag: mapping_mock}
        with patch.object(channel_import, "generate_row_mapper"), patch.object(
            channel_import, "generate_table_mapper"
        ), patch.object(channel_import, "table_import"), patch.object(
            channel_import, "check_and_delete_existing_channel"
        ), patch.object(channel_import, "execute_post_operations"):
            channel_import.import_channel_data()
            channel_import.generate_row_mapper.assert_called_once_with(
                mapping_mock.get("per_row")
            )
            channel_import.generate_table_mapper.assert_called_once_with(
                mapping_mock.get("per_table")
            )
            channel_import.table_import.assert_called_once()
            channel_import.check_and_delete_existing_channel.assert_called_once()
            channel_import.execute_post_operations.assert_called_once()

    def test_destination_tree_ids(self, apps_mock, tree_id_mock):
        # bulk_create rather than create, which would have MPTT assign the tree_ids.
        ContentNode.objects.bulk_create(
            ContentNode(
                id=uuid.uuid4().hex,
                title="node",
                content_id=uuid.uuid4().hex,
                channel_id=uuid.uuid4().hex,
                tree_id=tree_id,
                lft=1,
                rght=2,
                level=0,
            )
            for tree_id in (3, 1, 3)
        )
        channel_import = ChannelImport(uuid.uuid4().hex, dict_source())
        self.assertEqual([1, 3], channel_import.get_all_destination_tree_ids())


class MaliciousDatabaseTestCase(TestCase):
    @patch("kolibri.core.content.utils.channel_import.set_channel_ancestors")
    def test_non_existent_root_node(self, ancestor_mock):
        channel_id = "6199dde695db4ee4ab392222d5af1e5c"
        import_manager = ChannelImport(channel_id, dict_source())

        ChannelMetadata.objects.create(
            id=channel_id, name="test", min_schema_version="1", root_id=channel_id
        )

        import_manager.import_channel_data = lambda: True
        import_manager.run_and_annotate()
        try:
            channel = ChannelMetadata.objects.get(id=channel_id)
            assert channel.root
        except ContentNode.DoesNotExist:
            self.fail("Channel imported without a valid root node")


class ContentImportTestBase(TransactionTestCase):
    """Run as a TransactionTestCase: the importer can only suppress SQLite's
    foreign key checking outside an atomic block, and these fixtures are not
    parent-first."""

    @property
    def schema_name(self):
        return self.legacy_schema or self.name

    @property
    def data_name(self):
        return self.legacy_schema or self.name

    def setUp(self):
        try:
            self.set_content_fixture()
        except (IOError, EOFError):
            logger.error(
                "No content schema and/or data for {name}".format(name=self.schema_name)
            )

        super().setUp()

    def load_fixture_data(self):
        return load_content_fixture_data(self.data_name)

    def amend_content_db(self, db_path):
        pass

    @patch("kolibri.core.content.utils.channel_import.get_content_database_file_path")
    def set_content_fixture(self, db_path_mock):
        _, self.content_db_path = tempfile.mkstemp(suffix=".sqlite3")
        db_path_mock.return_value = self.content_db_path

        build_content_db_from_frozen_schema(
            self.content_db_path, self.schema_name, self.load_fixture_data()
        )
        self.amend_content_db(self.content_db_path)

        import_channel_from_local_db("6199dde695db4ee4ab392222d5af1e5c")
        update_content_metadata("6199dde695db4ee4ab392222d5af1e5c")


@pytest.fixture(scope="class")
def alternate_existing_channel(request):
    content_root = ContentNode.objects.create(
        id="579ddae52c2349d32ca6e655840dc2c0",
        channel_id="6436067f6f8f7c2eb15a296c887c788d",
        parent_id=None,
        content_id="ae5b5a53580aace508b6545486662d93",
        title="root2",
        description="ordinary root",
        kind="topic",
        author="",
        license_name="WTFPL",
        license_description=None,
        license_owner="",
        lang_id=None,
        available=False,
        tree_id=2,
        level=0,
        lft=1,
        rght=2,
        sort_order=None,
    )
    channel = ChannelMetadata.objects.create(
        id=content_root.channel_id,
        name="testing 2",
        description="more test data",
        author="buster",
        last_updated=None,
        min_schema_version="1",
        thumbnail="",
        root_id=content_root.id,
        version=0,
    )
    video_content = ContentNode.objects.create(
        id="f0dcb2c7e365a9c480042e2af93b0411",
        channel_id=channel.id,
        parent_id=content_root.id,
        content_id="c3e0d6073a31fd8b8d138b926d7b8567",
        title="alt video",
        description="ordinary video",
        kind="video",
        author="",
        license_name="WTFPL",
        license_description=None,
        license_owner="",
        lang_id=None,
        available=False,
        tree_id=2,
        level=1,
        lft=2,
        rght=1,
        sort_order=None,
    )
    local_video = LocalFile.objects.create(
        id="c3e0d6073a31fd8b8d138b926d7b8567",
        file_size=None,
        available=False,
        extension="mp4",
    )
    File.objects.create(
        id="c3e0d6073a31fd8b8d138b926d7b8567",
        local_file_id=local_video.id,
        preset="high_res_video",
        thumbnail=False,
        priority=None,
        contentnode_id=video_content.id,
        supplementary=False,
        lang_id=None,
    )

    request.cls.alternate_existing_channel = channel


class ContentImportDataTestBase(ContentImportTestBase):
    def set_content_fixture(self):
        data = self.load_fixture_data()

        data["schema_version"] = self.name

        import_channel_from_data(data)
        update_content_metadata("6199dde695db4ee4ab392222d5af1e5c")


class ContentImportPartialChannelDataTestBase(ContentImportTestBase):
    def set_content_fixture(self):
        data = self.load_fixture_data()

        partial_data = {key: [] for key in data}

        target_node = data["content_contentnode"][-1]

        node = target_node
        while node:
            partial_data["content_contentnode"].append(node)
            partial_data["content_file"].extend(
                [f for f in data["content_file"] if f["contentnode_id"] == node["id"]]
            )
            partial_data["content_contentnode_tags"].extend(
                [
                    ct
                    for ct in data["content_contentnode_tags"]
                    if ct["contentnode_id"] == node["id"]
                ]
            )
            partial_data["content_assessmentmetadata"].extend(
                [
                    am
                    for am in data["content_assessmentmetadata"]
                    if am["contentnode_id"] == node["id"]
                ]
            )
            filtered_nodes = [
                n for n in data["content_contentnode"] if n["id"] == node["parent_id"]
            ]
            if filtered_nodes:
                node = filtered_nodes[0]
            else:
                break

        contenttag_ids = {
            ct["contenttag_id"] for ct in partial_data["content_contentnode_tags"]
        }
        contentnode_ids = {n["id"] for n in partial_data["content_contentnode"]}
        localfile_ids = {f["localfile_id"] for f in partial_data["content_file"]}
        lang_ids = {
            n["lang_id"] for n in partial_data["content_contentnode"] if n["lang_id"]
        } | {f["lang_id"] for f in partial_data["content_file"] if f["lang_id"]}

        partial_data["content_localfile"] = [
            lf for lf in data["content_localfile"] if lf["id"] in localfile_ids
        ]
        partial_data["content_contenttag"] = [
            t for t in data["content_contenttag"] if t["id"] in contenttag_ids
        ]
        partial_data["content_language"] = [
            lang for lang in data["content_language"] if lang["id"] in lang_ids
        ]
        partial_data["content_contentnode_has_prerequisite"] = [
            preq
            for preq in data["content_contentnode_has_prerequisite"]
            if preq["from_contentnode_id"] in contentnode_ids
            and preq["to_contentnode_id"] in contentnode_ids
        ]
        partial_data["content_contentnode_related"] = [
            preq
            for preq in data["content_contentnode_related"]
            if preq["from_contentnode_id"] in contentnode_ids
            and preq["to_contentnode_id"] in contentnode_ids
        ]
        partial_data["content_channelmetadata"] = data["content_channelmetadata"]
        partial_data["schema_version"] = self.name

        remainder_data = {}
        for key in data:
            remainder_data[key] = [v for v in data[key] if v not in partial_data[key]]
        remainder_data["content_channelmetadata"] = data["content_channelmetadata"]
        remainder_data["schema_version"] = self.name

        import_channel_from_data(partial_data, partial=True)
        update_content_metadata("6199dde695db4ee4ab392222d5af1e5c")
        import_channel_from_data(remainder_data, partial=True)
        update_content_metadata("6199dde695db4ee4ab392222d5af1e5c")


class NaiveImportTestBase(ContentNodeTestBase):
    """
    Integration test for naive import
    """

    # When incrementing content schema versions, this should be incremented to the new version
    # A new TestCase for importing for this old version should then be subclassed from this TestCase
    # See 'NoVersionImportTestCase' below for an example

    name = CONTENT_SCHEMA_VERSION

    legacy_schema = None

    def test_no_update_old_version(self):
        channel = ChannelMetadata.objects.first()
        channel.version += 1
        channel_version = channel.version
        channel.save()
        self.set_content_fixture()
        channel.refresh_from_db()
        self.assertEqual(channel.version, channel_version)

    def test_update_current_partial(self):
        channel = ChannelMetadata.objects.first()
        channel.partial = True
        channel.save()
        self.set_content_fixture()
        channel.refresh_from_db()
        self.assertFalse(channel.partial)

    def test_localfile_available_remain_after_import(self):
        local_file = LocalFile.objects.get(pk="9f9438fe6b0d42dd8e913d7d04cfb2b2")
        local_file.available = True
        local_file.save()
        self.set_content_fixture()
        local_file.refresh_from_db()
        self.assertTrue(local_file.available)

    def residual_object_deleted(self, Model):
        # Checks that objects previously associated with a channel are deleted on channel upgrade
        obj = Model.objects.first()
        # older databases may not import data for all models so if this is None, ignore
        if obj is not None:
            # Set id to a new UUID so that it does an insert at save
            obj.id = uuid.uuid4().hex
            obj.save()
            obj_id = obj.id
            channel = ChannelMetadata.objects.first()
            # Decrement current channel version to ensure reimport
            channel.version -= 1
            channel.save()
            self.set_content_fixture()
            with self.assertRaises(Model.DoesNotExist):
                assert Model.objects.get(pk=obj_id)

    def test_residual_file_deleted_after_reimport(self):
        self.residual_object_deleted(File)

    def test_residual_assessmentmetadata_deleted_after_reimport(self):
        self.residual_object_deleted(AssessmentMetaData)

    def test_residual_contentnode_deleted_after_reimport(self):
        root_node = ChannelMetadata.objects.first().root
        obj = ContentNode.objects.create(
            title="test",
            id=uuid.uuid4().hex,
            parent=root_node,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
        )
        obj_id = obj.id
        channel = ChannelMetadata.objects.first()
        # Decrement current channel version to ensure reimport
        channel.version -= 1
        channel.save()
        self.set_content_fixture()
        with self.assertRaises(ContentNode.DoesNotExist):
            assert ContentNode.objects.get(pk=obj_id)

    def test_residual_included_languages_deleted_after_reimport(self):
        lang = Language.objects.create(id="en")
        channel = ChannelMetadata.objects.first()
        # Decrement current channel version to ensure reimport
        channel.version -= 1
        channel.included_languages.add(lang)
        channel.save()
        self.set_content_fixture()
        channel = ChannelMetadata.objects.first()
        self.assertEqual(channel.included_languages.count(), 0)

    def test_prerequisites_not_duplicated(self):
        prereqs = ContentNode.has_prerequisite.through.objects.all().count()
        channel = ChannelMetadata.objects.first()
        # Decrement current channel version to ensure reimport
        channel.version -= 1
        channel.save()
        self.set_content_fixture()
        new_prereqs = ContentNode.has_prerequisite.through.objects.all().count()
        self.assertEqual(prereqs, new_prereqs)

    @pytest.mark.usefixtures("alternate_existing_channel")
    def test_learning_activity_set(self):
        # Do this to avoid doing this test on more up to date versions
        try:
            int_version = int(self.name)
            if int_version >= 5:
                return
        except ValueError:
            pass
        for kind, learning_activity in kind_activity_map.items():
            # For each defined mapping, make sure none have not been mapped
            self.assertEqual(
                ContentNode.objects.filter(
                    kind=kind, channel_id="6199dde695db4ee4ab392222d5af1e5c"
                )
                .exclude(learning_activities=learning_activity)
                .count(),
                0,
            )

        # verify existing channel was not modified
        self.assertEqual(
            ContentNode.objects.filter(
                kind="video", channel_id=self.alternate_existing_channel.id
            )
            .filter(learning_activities__isnull=True)
            .count(),
            1,
        )

    def test_included_presets_set(self):
        # Skip on schema versions that already publish included_presets.
        try:
            if int(self.name) >= 6:
                return
        except ValueError:
            pass

        # A pre-V6 source lacks the column, so the backfill must set each
        # renderable file's own-preset bit and leave every other file NULL.
        self.assertTrue(File.objects.exists())
        for f in File.objects.all():
            expected = renderable_preset_bits.get(f.preset)
            self.assertEqual(f.included_presets, expected)

    def test_existing_localfiles_are_not_overwritten(self):
        channel_id = "6199dde695db4ee4ab392222d5af1e5c"

        channel = ChannelMetadata.objects.get(id=channel_id)

        # mark LocalFile objects as available
        for f in channel.root.children.first().files.all():
            f.local_file.available = True
            f.local_file.save()

        # channel's not yet available, as we haven't done the annotation
        assert not channel.root.available

        # propagate availability up the tree
        set_leaf_node_availability_from_local_file_availability(channel_id)
        recurse_annotation_up_tree(channel_id=channel_id)

        # after reloading, channel should now be available
        channel.root.refresh_from_db()
        assert channel.root.available

        # set the channel version to a low number to ensure we trigger a re-import of metadata
        ChannelMetadata.objects.filter(id=channel_id).update(version=-1)

        # reimport the metadata
        self.set_content_fixture()

        # after reloading, the files and their ancestor ContentNodes should all still be available
        channel.root.refresh_from_db()
        assert channel.root.available
        assert channel.root.children.first().files.all()[0].local_file.available

    def test_local_file_file_size_imported(self):
        lf = LocalFile.objects.get(pk="9f9438fe6b0d42dd8e913d7d04cfb2b2")
        self.assertEqual(lf.file_size, 1234)


class NaiveImportTestCase(NaiveImportTestBase, ContentImportTestBase):
    pass


class NaiveImportDataTestCase(NaiveImportTestBase, ContentImportDataTestBase):
    pass


class NaiveImportPartialChannelDataTestCase(
    ContentNodeTestBase, ContentImportPartialChannelDataTestBase
):
    name = CONTENT_SCHEMA_VERSION

    legacy_schema = None


class ImportLongDescriptionsTestCase(ContentImportTestBase, TransactionTestCase):
    """
    When using Postgres, char limits on fields are enforced strictly. This was causing errors importing as described in:
    https://github.com/learningequality/kolibri/issues/3600
    """

    name = CONTENT_SCHEMA_VERSION
    legacy_schema = None
    data_name = "longdescriptions"

    longdescription = "soverylong" * 45
    long_tag_id = "0c20e2eb254b4070a713da63380ff0a3"
    utf_tag_id = "9e4760e53568402bb287dcdb8466758a"
    utf_tag_name = "transformación de energía"

    def test_long_descriptions(self):
        self.assertEqual(
            ContentNode.objects.get(
                id="32a941fb77c2576e8f6b294cde4c3b0c"
            ).license_description,
            self.longdescription,
        )
        self.assertEqual(
            ContentNode.objects.get(id="2e8bac07947855369fe2d77642dfc870").description,
            self.longdescription,
        )

    @unittest.skipIf(
        getattr(settings, "DATABASES")["default"]["ENGINE"]
        != "django.db.backends.postgresql",
        "Postgresql only test",
    )
    def test_import_too_long_content_tags(self):
        """
        Test that importing content tags with overly long tag_name fields will truncate correctly.
        """
        max_length = ContentTag._meta.get_field("tag_name").max_length
        long_imported_tag = ContentTag.objects.get(id=self.long_tag_id)
        assert len(long_imported_tag.tag_name) == max_length

    @unittest.skipIf(
        getattr(settings, "DATABASES")["default"]["ENGINE"]
        != "django.db.backends.postgresql",
        "Postgresql only test",
    )
    def test_utf_test_keeps_its_length(self):
        """
        Test inserting non-English chars keeps length
        of the strings as are not decoded into bytes.
        """
        imported_tag = ContentTag.objects.get(id=self.utf_tag_id)
        assert len(imported_tag.tag_name) == len(self.utf_tag_name)


class Version4ImportTestCase(NaiveImportTestCase):
    """
    Integration test for import from no version import
    """

    name = VERSION_4

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()

    @classmethod
    def setUpClass(cls):
        super().setUpClass()


class Version3ImportTestCase(NaiveImportTestCase):
    """
    Integration test for import from no version import
    """

    name = VERSION_3

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()

    @classmethod
    def setUpClass(cls):
        super().setUpClass()


class Version2ImportTestCase(NaiveImportTestCase):
    """
    Integration test for import from no version import
    """

    name = VERSION_2

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()

    @classmethod
    def setUpClass(cls):
        super().setUpClass()


class Version1ImportTestCase(NaiveImportTestCase):
    """
    Integration test for import from no version import
    """

    name = VERSION_1

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()

    @classmethod
    def setUpClass(cls):
        super().setUpClass()


class NoVersionImportTestCase(NaiveImportTestCase):
    """
    Integration test for import from no version import
    """

    name = NO_VERSION

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()

    @classmethod
    def setUpClass(cls):
        super().setUpClass()


class NoVersionv020ImportTestCase(NoVersionImportTestCase):
    """
    Integration test for import from no version import
    for legacy schema 0.2.0beta1
    """

    legacy_schema = V020BETA1

    def test_lang_str(self):
        # test for Language __str__
        p = content.Language.objects.get(lang_code="en")
        self.assertEqual(str(p), "")

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()

    @classmethod
    def setUpClass(cls):
        super().setUpClass()


class NoVersionv040ImportTestCase(NoVersionv020ImportTestCase):
    """
    Integration test for import from no version import
    for legacy schema 0.4.0beta3
    """

    legacy_schema = V040BETA3

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()

    @classmethod
    def setUpClass(cls):
        super().setUpClass()


@patch("kolibri.core.content.utils.channel_import.logger")
class ChannelImportTestCase(ContentImportTestBase, TransactionTestCase):
    name = CONTENT_SCHEMA_VERSION
    legacy_schema = None

    def setUp(self):
        super().setUp()
        self.channel_id = "6199dde695db4ee4ab392222d5af1e5c"
        self.channel_version = 2
        self.current_channel = None

    def tearDown(self):
        return super().tearDown()

    def test_channel_already_exists(self, logger_mock):
        self.current_channel = ChannelMetadata.objects.get(id=self.channel_id)
        self.current_channel.version = self.channel_version
        self.current_channel.save()
        self.channel_import = ChannelImport(self.channel_id, dict_source())
        self.channel_import.channel_version = self.channel_version
        result = self.channel_import.check_and_delete_existing_channel()
        self.assertFalse(result)

    def test_partial_import_no_deletion(self, logger_mock):
        self.current_channel = ChannelMetadata.objects.get(id=self.channel_id)
        self.current_channel.version = self.channel_version
        self.current_channel.save()
        self.channel_import = ChannelImport(self.channel_id, dict_source())
        self.channel_import.channel_version = self.channel_version
        self.channel_import.partial = True

        result = self.channel_import.check_and_delete_existing_channel()
        self.assertTrue(result)

    def test_partial_import_with_deletion(self, logger_mock):
        # Simulate partial import with the same version
        self.current_channel = ChannelMetadata.objects.get(id=self.channel_id)
        self.current_channel.version = self.channel_version
        self.current_channel.save()
        self.channel_import = ChannelImport(self.channel_id, dict_source())
        self.channel_import.channel_version = self.channel_version - 1
        self.channel_import.partial = True
        result = self.channel_import.check_and_delete_existing_channel()
        self.assertFalse(result)

    def test_full_import_with_newer_version(self, logger_mock):
        # Simulate full import with a newer version
        self.current_channel = ChannelMetadata.objects.get(id=self.channel_id)
        self.current_channel.version = self.channel_version
        self.current_channel.save()
        self.channel_import = ChannelImport(self.channel_id, dict_source())
        self.channel_import.channel_version = self.channel_version + 1
        result = self.channel_import.check_and_delete_existing_channel()
        self.assertTrue(result)

    def test_channel_not_exists(self, logger_mock):
        # Simulate channel not existing in the database
        self.channel_import = ChannelImport(self.channel_id, dict_source())
        self.channel_import.channel_version = self.channel_version
        result = self.channel_import.check_and_delete_existing_channel()
        self.assertTrue(result)

    def test_downgrade_blocked_without_version_requested(self, logger_mock):
        # Regression: the existing downgrade block must be preserved when
        # version_requested is False (the default).
        self.current_channel = ChannelMetadata.objects.get(id=self.channel_id)
        self.current_channel.version = self.channel_version
        self.current_channel.save()
        self.channel_import = ChannelImport(self.channel_id, dict_source())
        self.channel_import.channel_version = self.channel_version - 1
        result = self.channel_import.check_and_delete_existing_channel()
        self.assertFalse(result)

    def test_downgrade_allowed_with_version_requested(self, logger_mock):
        # Downgrade is allowed when version_requested=True.
        self.current_channel = ChannelMetadata.objects.get(id=self.channel_id)
        self.current_channel.version = self.channel_version
        self.current_channel.save()
        self.channel_import = ChannelImport(
            self.channel_id, dict_source(), version_requested=True
        )
        self.channel_import.channel_version = self.channel_version - 1
        result = self.channel_import.check_and_delete_existing_channel()
        self.assertTrue(result)

    def test_upgrade_allowed_with_version_requested(self, logger_mock):
        # Upgrade still works when version_requested=True.
        self.current_channel = ChannelMetadata.objects.get(id=self.channel_id)
        self.current_channel.version = self.channel_version
        self.current_channel.save()
        self.channel_import = ChannelImport(
            self.channel_id, dict_source(), version_requested=True
        )
        self.channel_import.channel_version = self.channel_version + 1
        result = self.channel_import.check_and_delete_existing_channel()
        self.assertTrue(result)

    def test_same_version_blocked_even_with_version_requested(self, logger_mock):
        # Same version is still blocked even when version_requested=True.
        self.current_channel = ChannelMetadata.objects.get(id=self.channel_id)
        self.current_channel.version = self.channel_version
        self.current_channel.save()
        self.channel_import = ChannelImport(
            self.channel_id, dict_source(), version_requested=True
        )
        self.channel_import.channel_version = self.channel_version
        result = self.channel_import.check_and_delete_existing_channel()
        self.assertFalse(result)

    def test_downgrade_with_version_requested_cleans_up_tree(self, logger_mock):
        # When downgrading with version_requested=True, old tree data is cleaned up.
        self.current_channel = ChannelMetadata.objects.get(id=self.channel_id)
        self.current_channel.version = self.channel_version
        self.current_channel.save()
        self.channel_import = ChannelImport(
            self.channel_id, dict_source(), version_requested=True
        )
        self.channel_import.channel_version = self.channel_version - 1

        root_tree_id = ContentNode.objects.get(id=self.current_channel.root_id).tree_id

        with patch.object(
            self.channel_import, "delete_old_channel_many_to_many_fields"
        ) as delete_m2m_mock, patch.object(
            self.channel_import, "delete_old_channel_tree_data"
        ) as delete_tree_mock:
            result = self.channel_import.check_and_delete_existing_channel()

        self.assertTrue(result)
        delete_m2m_mock.assert_called_once_with(self.channel_id)
        delete_tree_mock.assert_called_once_with(root_tree_id)


class UnversionedChecksumsBatchingTestCase(ContentImportTestBase):
    """
    An unversioned channel with more unique checksums than fit in one batch.
    """

    name = NO_VERSION
    legacy_schema = None

    def load_fixture_data(self):
        data = super().load_fixture_data()
        # generate_local_file_from_file yields one LocalFile per distinct checksum,
        # and it is a generator, so this is the production path that batches an
        # iterator rather than a list.
        template = data["content_file"][0]
        contentnode_id = data["content_contentnode"][0]["id"]
        existing = len({row["checksum"] for row in data["content_file"]})
        for i in range(BATCH_SIZE + 1 - existing):
            data["content_file"].append(
                dict(
                    template,
                    id="{:032x}".format(i + 1),
                    checksum="{:032x}".format(i + 1),
                    contentnode_id=contentnode_id,
                )
            )
        return data

    def test_every_unique_checksum_is_imported(self):
        self.assertEqual(BATCH_SIZE + 1, LocalFile.objects.count())


class BatchedRowImportTestCase(ContentImportTestBase):
    """
    A channel larger than one batch, imported through the Python row path.
    """

    name = CONTENT_SCHEMA_VERSION
    legacy_schema = None

    def load_fixture_data(self):
        data = super().load_fixture_data()
        # Enough content_contenttag rows to need more than two batches. ContentTag
        # has no foreign keys, so the extra rows need no matching parent.
        template = data["content_contenttag"][0]
        for i in range(2 * BATCH_SIZE + 1 - len(data["content_contenttag"])):
            data["content_contenttag"].append(
                dict(template, id="{:032x}".format(i + 1), tag_name="tag{}".format(i))
            )
        return data

    def set_content_fixture(self):
        # A no-op attach leaves _sqlite_db_attached False, so every model falls
        # back to the row mapper, which is the path that batches.
        with patch.object(
            ChannelImport, "try_attaching_sqlite_database", lambda self, stack: None
        ):
            super().set_content_fixture()

    def test_every_row_past_the_first_batch_is_imported(self):
        # Consuming the row iterator by advancing an offset into it skips a whole
        # batch for every batch it takes: rows BATCH_SIZE..2*BATCH_SIZE are lost.
        self.assertEqual(2 * BATCH_SIZE + 1, ContentTag.objects.count())


class ReferentiallyBrokenChannelTestCase(TransactionTestCase):
    """
    A channel carrying a dangling reference must fail rather than commit.
    """

    def setUp(self):
        _, self.content_db_path = tempfile.mkstemp(suffix=".sqlite3")
        self.addCleanup(os.remove, self.content_db_path)
        data = load_content_fixture_data(CONTENT_SCHEMA_VERSION)
        data["content_file"].append(
            dict(
                data["content_file"][0],
                id="{:032x}".format(1),
                contentnode_id="{:032x}".format(2),
            )
        )
        build_content_db_from_frozen_schema(
            self.content_db_path, CONTENT_SCHEMA_VERSION, data
        )
        super().setUp()

    def tearDown(self):
        call_command("flush", interactive=False)
        super().tearDown()

    @patch("kolibri.core.content.utils.channel_import.get_content_database_file_path")
    def test_dangling_reference_is_not_committed(self, db_path_mock):
        channel_id = "6199dde695db4ee4ab392222d5af1e5c"
        db_path_mock.return_value = self.content_db_path
        with self.assertRaises(IntegrityError):
            import_channel_from_local_db(channel_id)
        self.assertFalse(ContentNode.objects.filter(channel_id=channel_id).exists())


class DestinationFileImportTestCase(FrozenSchemaDBMixin, TestCase):
    """
    An import into a destination file, which is how diff_stats builds the database
    it compares the default one against.
    """

    def test_rows_land_in_the_destination_file_not_the_default_database(self):
        source = self.build(CONTENT_SCHEMA_VERSION)
        destination = os.path.join(self.directory, "destination.sqlite3")
        expected = len(
            load_content_fixture_data(CONTENT_SCHEMA_VERSION)["content_contentnode"]
        )

        with initialize_import_manager(
            read_channel_metadata_from_db_file(source),
            source,
            cancel_check=False,
            destination=destination,
            version_requested=True,
        ) as import_manager:
            self.assertTrue(import_manager.import_channel_data())

        with content_db(destination) as alias:
            self.assertEqual(expected, ContentNode.objects.using(alias).count())
        self.assertFalse(ContentNode.objects.exists())


class Version5ImportTestCase(NaiveImportTestCase):
    """
    Import a VERSION_5 (pre-rename) database declaring min_schema_version=VERSION_5,
    so it routes through NoIncludedPresetsChannelImport and its file_size mapping.
    """

    name = VERSION_5

    def load_fixture_data(self):
        data = super().load_fixture_data()
        data["content_channelmetadata"][0]["min_schema_version"] = VERSION_5
        return data

    def _localfile_file_sizes(self):
        return dict(LocalFile.objects.values_list("id", "file_size"))

    def _reimport_from_scratch(self):
        # The flush is load-bearing: check_and_delete_existing_channel cancels a
        # re-import at the same channel version, so without it set_content_fixture
        # imports nothing and the caller's assertions pass vacuously.
        call_command("flush", interactive=False)
        self.set_content_fixture()

    @unittest.skipIf(
        "sqlite3" not in settings.DATABASES["default"]["ENGINE"],
        "SQLite only test",
    )
    def test_localfile_imported_via_attach(self):
        # content_localfile's only mappings are a constant and the file_size
        # rename, both expressible in SQL, so it must transfer in one statement.
        attached_models = []
        unpatched = ChannelImport.raw_attached_sqlite_table_import

        def record(channel_import, model, table_mapper):
            attached_models.append(model)
            return unpatched(channel_import, model, table_mapper)

        with patch.object(ChannelImport, "raw_attached_sqlite_table_import", record):
            self._reimport_from_scratch()

        self.assertIn(LocalFile, attached_models)

    @unittest.skipIf(
        "sqlite3" not in settings.DATABASES["default"]["ENGINE"],
        "SQLite only test",
    )
    def test_file_size_matches_row_path(self):
        attached = self._localfile_file_sizes()
        # The fixture carries both a set size and NULLs, so the comparison
        # below is not vacuous.
        self.assertIn(1234, attached.values())
        self.assertIn(None, attached.values())

        # A no-op leaves _sqlite_db_attached False, so every model falls back
        # to the Python row mapper.
        with patch.object(
            ChannelImport, "try_attaching_sqlite_database", lambda self, stack: None
        ):
            self._reimport_from_scratch()

        self.assertEqual(attached, self._localfile_file_sizes())


class SupersetSchemaImportTestCase(NaiveImportTestCase):
    """
    A database shaped the way Studio publishes one: the current schema's columns,
    the legacy file_size column its declared floor promises, and a
    min_schema_version far below either.
    """

    name = CONTENT_SCHEMA_VERSION

    # Two activities at once, which no kind maps to, so a backfill from kind shows up.
    authored_learning_activities = "UD5UGM0z,wA01urpi"

    def load_fixture_data(self):
        data = super().load_fixture_data()
        data["content_channelmetadata"][0]["min_schema_version"] = VERSION_1
        for row in data["content_contentnode"]:
            if row["kind"] != "topic":
                row["learning_activities"] = self.authored_learning_activities
        return data

    def amend_content_db(self, db_path):
        with closing(sqlite3.connect(db_path)) as connection:
            connection.execute(
                "ALTER TABLE content_localfile ADD COLUMN file_size INTEGER"
            )
            connection.execute(
                "UPDATE content_localfile SET file_size = file_size_bigint"
            )
            connection.commit()

    def test_authored_learning_activities_are_not_backfilled_from_kind(self):
        imported = set(
            ContentNode.objects.filter(channel_id="6199dde695db4ee4ab392222d5af1e5c")
            .exclude(kind="topic")
            .values_list("learning_activities", flat=True)
        )

        self.assertEqual({self.authored_learning_activities}, imported)


class SchemaVersionSelectionTestCase(FrozenSchemaDBMixin, TestCase):
    """
    Which schema version picks the import class, and which one only gates it.
    """

    def build_declaring_floor(self, min_schema_version):
        data = load_content_fixture_data(CONTENT_SCHEMA_VERSION)
        data["content_channelmetadata"][0]["min_schema_version"] = min_schema_version
        db_path = os.path.join(self.directory, "floor.sqlite3")
        build_content_db_from_frozen_schema(db_path, CONTENT_SCHEMA_VERSION, data)
        return db_path

    def import_manager_for(self, min_schema_version):
        db_path = self.build_declaring_floor(min_schema_version)
        return initialize_import_manager(
            read_channel_metadata_from_db_file(db_path), db_path
        )

    def test_the_shape_picks_the_class_over_a_lower_floor(self):
        with self.import_manager_for(VERSION_1) as import_manager:
            self.assertEqual(ChannelImport, type(import_manager))

    def test_a_floor_above_this_kolibri_is_refused(self):
        with self.assertRaises(FutureSchemaError):
            self.import_manager_for(str(int(CONTENT_SCHEMA_VERSION) + 1))

    def test_an_unreadable_floor_is_refused(self):
        with self.assertRaises(InvalidSchemaVersionError):
            self.import_manager_for("not-a-schema-version")
