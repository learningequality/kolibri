import io
import json
import os
import tempfile
import uuid

from django.core.management import call_command
from django.test import TestCase
from django.test import TransactionTestCase
from mock import call
from mock import MagicMock
from mock import Mock
from mock import patch
from sqlalchemy import create_engine

from .sqlalchemytesting import django_connection_engine
from .test_content_app import ContentNodeTestBase
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
from kolibri.core.content.models import AssessmentMetaData
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
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
from kolibri.core.content.utils.channel_import import import_channel_from_local_db
from kolibri.core.content.utils.channel_import import topological_sort
from kolibri.core.content.utils.sqlalchemybridge import get_default_db_string
from kolibri.core.content.utils.sqlalchemybridge import load_metadata


class UtilityTestCase(TestCase):
    def test_topological_sort(self):
        sorted_models = topological_sort([File, LocalFile, ContentNode])
        self.assertGreater(sorted_models.index(File), sorted_models.index(ContentNode))
        self.assertGreater(sorted_models.index(File), sorted_models.index(LocalFile))


@patch("kolibri.core.content.utils.channel_import.Bridge")
@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
@patch("kolibri.core.content.utils.channel_import.apps")
class BaseChannelImportClassConstructorTestCase(TestCase):
    """
    Testcase for the base channel import class constructor
    """

    def test_channel_id(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport("test")
        self.assertEqual(channel_import.channel_id, "test")

    @patch("kolibri.core.content.utils.channel_import.get_content_database_file_path")
    def test_two_bridges(self, db_path_mock, apps_mock, tree_id_mock, BridgeMock):
        db_path_mock.return_value = "test"
        ChannelImport("test")
        BridgeMock.assert_has_calls(
            [
                call(sqlite_file_path="test"),
                call(app_name="content", schema_version=CONTENT_SCHEMA_VERSION),
            ]
        )

    @patch("kolibri.core.content.utils.channel_import.get_content_database_file_path")
    def test_get_config(self, db_path_mock, apps_mock, tree_id_mock, BridgeMock):
        ChannelImport("test")
        apps_mock.assert_has_calls(
            [
                call.get_app_config("content"),
                call.get_app_config().get_models(include_auto_created=True),
            ]
        )

    def test_tree_id(self, apps_mock, tree_id_mock, BridgeMock):
        ChannelImport("test")
        tree_id_mock.assert_called_once_with()


@patch("kolibri.core.content.utils.channel_import.Bridge")
@patch(
    "kolibri.core.content.utils.channel_import.ChannelImport.get_all_destination_tree_ids"
)
@patch("kolibri.core.content.utils.channel_import.apps")
class BaseChannelImportClassMethodUniqueTreeIdTestCase(TestCase):
    """
    Testcase for the base channel import class unique tree id generator
    """

    def test_empty(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = []
        channel_import = ChannelImport("test")
        self.assertEqual(channel_import.find_unique_tree_id(), 1)

    def test_one_one(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [1]
        channel_import = ChannelImport("test")
        self.assertEqual(channel_import.find_unique_tree_id(), 2)

    def test_one_two(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [2]
        channel_import = ChannelImport("test")
        self.assertEqual(channel_import.find_unique_tree_id(), 1)

    def test_two_one_two(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [1, 2]
        channel_import = ChannelImport("test")
        self.assertEqual(channel_import.find_unique_tree_id(), 3)

    def test_two_one_three(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [1, 3]
        channel_import = ChannelImport("test")
        self.assertEqual(channel_import.find_unique_tree_id(), 2)

    def test_three_one_two_three(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [1, 2, 3]
        channel_import = ChannelImport("test")
        self.assertEqual(channel_import.find_unique_tree_id(), 4)

    def test_three_one_two_four(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [1, 2, 4]
        channel_import = ChannelImport("test")
        self.assertEqual(channel_import.find_unique_tree_id(), 3)

    def test_three_one_three_four(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [1, 3, 4]
        channel_import = ChannelImport("test")
        self.assertEqual(channel_import.find_unique_tree_id(), 2)

    def test_three_one_three_five(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [1, 3, 5]
        channel_import = ChannelImport("test")
        self.assertEqual(channel_import.find_unique_tree_id(), 2)


@patch("kolibri.core.content.utils.channel_import.Bridge")
@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
@patch("kolibri.core.content.utils.channel_import.apps")
class BaseChannelImportClassGenRowMapperTestCase(TestCase):
    """
    Testcase for the base channel import class row mapper generator
    """

    def test_base_mapper(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport("test")
        mapper = channel_import.generate_row_mapper()
        record = MagicMock()
        record.test_attr = "test_val"
        self.assertEqual(mapper(record, "test_attr"), "test_val")

    def test_column_name_mapping(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport("test")
        mappings = {"test_attr": "test_attr_mapped"}
        mapper = channel_import.generate_row_mapper(mappings=mappings)
        record = MagicMock()
        record.test_attr_mapped = "test_val"
        self.assertEqual(mapper(record, "test_attr"), "test_val")

    def test_method_mapping(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport("test")
        mappings = {"test_attr": "test_map_method"}
        mapper = channel_import.generate_row_mapper(mappings=mappings)
        record = {}
        test_map_method = Mock()
        test_map_method.return_value = "test_val"
        channel_import.test_map_method = test_map_method
        self.assertEqual(mapper(record, "test_attr"), "test_val")

    def test_no_column_mapping(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport("test")
        mappings = {"test_attr": "test_attr_mapped"}
        mapper = channel_import.generate_row_mapper(mappings=mappings)
        record = Mock(spec=["test_attr"])
        with self.assertRaises(AttributeError):
            mapper(record, "test_attr")


@patch("kolibri.core.content.utils.channel_import.Bridge")
@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
@patch("kolibri.core.content.utils.channel_import.apps")
class BaseChannelImportClassGenTableMapperTestCase(TestCase):
    """
    Testcase for the base channel import class table mapper generator
    """

    def test_base_mapper(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport("test")
        mapper = channel_import.generate_table_mapper()
        self.assertEqual(mapper, channel_import.base_table_mapper)

    def test_method_mapping(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport("test")
        table_map = "test_map_method"
        test_map_method = Mock()
        channel_import.test_map_method = test_map_method
        mapper = channel_import.generate_table_mapper(table_map=table_map)
        self.assertEqual(mapper, test_map_method)

    def test_no_column_mapping(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport("test")
        table_map = "test_map_method"
        with self.assertRaises(AttributeError):
            channel_import.generate_table_mapper(table_map=table_map)


@patch("kolibri.core.content.utils.channel_import.Bridge")
@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
@patch("kolibri.core.content.utils.channel_import.apps")
class BaseChannelImportClassTableImportTestCase(TestCase):
    """
    Testcase for the base channel import class table import method
    """

    def test_no_merge_records_bulk_insert_no_flush(
        self, apps_mock, tree_id_mock, BridgeMock
    ):
        channel_import = ChannelImport("test")
        record_mock = MagicMock(spec=["__table__"])
        record_mock.__table__.columns.items.return_value = [("test_attr", MagicMock())]
        channel_import.destination.get_class.return_value = record_mock
        channel_import.table_import(
            MagicMock(), lambda x, y: "test_val", lambda x: [{}] * (BATCH_SIZE // 10)
        )
        channel_import.destination.execute.assert_called_once()

    def test_no_merge_records_bulk_insert_flush(
        self, apps_mock, tree_id_mock, BridgeMock
    ):
        channel_import = ChannelImport("test")
        record_mock = MagicMock(spec=["__table__"])
        record_mock.__table__.columns.items.return_value = [("test_attr", MagicMock())]
        channel_import.destination.get_class.return_value = record_mock
        channel_import.table_import(
            MagicMock(), lambda x, y: "test_val", lambda x: [{}] * (BATCH_SIZE + 1)
        )
        self.assertEqual(channel_import.destination.execute.call_count, 2)


@patch("kolibri.core.content.utils.channel_import.Bridge")
@patch("kolibri.core.content.utils.channel_import.ChannelImport.find_unique_tree_id")
@patch("kolibri.core.content.utils.channel_import.apps")
class BaseChannelImportClassOtherMethodsTestCase(TestCase):
    """
    Testcase for the base channel import class remaining methods
    """

    def test_import_channel_methods_called(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport("test")
        model_mock = Mock(spec=["__name__"])
        channel_import.content_models = [model_mock]
        mapping_mock = Mock()
        channel_import.schema_mapping = {model_mock: mapping_mock}
        with patch.object(channel_import, "generate_row_mapper"), patch.object(
            channel_import, "generate_table_mapper"
        ), patch.object(channel_import, "table_import"), patch.object(
            channel_import, "check_and_delete_existing_channel"
        ), patch.object(
            channel_import, "execute_post_operations"
        ):
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

    def test_end(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport("test")
        channel_import.end()
        channel_import.destination.end.assert_has_calls([call(), call()])

    def test_destination_tree_ids(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport("test")
        class_mock = Mock()
        channel_import.destination.get_class.return_value = class_mock
        channel_import.get_all_destination_tree_ids()
        channel_import.destination.assert_has_calls(
            [
                call.execute().fetchall(),
            ]
        )


class MaliciousDatabaseTestCase(TestCase):
    @patch("kolibri.core.content.utils.channel_import.set_channel_ancestors")
    @patch("kolibri.core.content.utils.channel_import.initialize_import_manager")
    def test_non_existent_root_node(self, initialize_manager_mock, ancestor_mock):
        import_mock = MagicMock()
        initialize_manager_mock.return_value = import_mock
        channel_id = "6199dde695db4ee4ab392222d5af1e5c"

        def create_channel():
            ChannelMetadata.objects.create(
                id=channel_id, name="test", min_schema_version="1", root_id=channel_id
            )

        import_mock.import_channel_data.side_effect = create_channel
        import_channel_from_local_db(channel_id)
        try:
            channel = ChannelMetadata.objects.get(id=channel_id)
            assert channel.root
        except ContentNode.DoesNotExist:
            self.fail("Channel imported without a valid root node")


SCHEMA_PATH_TEMPLATE = os.path.join(
    os.path.dirname(__file__), "../fixtures/{name}_content_schema"
)

DATA_PATH_TEMPLATE = os.path.join(
    os.path.dirname(__file__), "../fixtures/{name}_content_data.json"
)


class ContentImportTestBase(TransactionTestCase):
    """This is run using a TransactionTestCase,
    as by default, Django runs each test inside an atomic context in order to easily roll back
    any changes to the DB. However, as we are setting things in the Django DB using SQLAlchemy
    these changes are not caught by this atomic context, and data will persist across tests.
    In order to deal with this, we call an explicit db flush at the end of every test case,
    both this flush and the SQLAlchemy insertions can cause issues with the atomic context used
    by Django."""

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
            print(
                "No content schema and/or data for {name}".format(name=self.schema_name)
            )

        super(ContentImportTestBase, self).setUp()

    @patch("kolibri.core.content.utils.channel_import.get_content_database_file_path")
    def set_content_fixture(self, db_path_mock):
        _, self.content_db_path = tempfile.mkstemp(suffix=".sqlite3")
        db_path_mock.return_value = self.content_db_path
        self.content_engine = create_engine(
            "sqlite:///" + self.content_db_path, convert_unicode=True
        )

        metadata = load_metadata(self.schema_name)

        data_path = DATA_PATH_TEMPLATE.format(name=self.data_name)
        with io.open(data_path, mode="r", encoding="utf-8") as f:
            data = json.load(f)

        metadata.bind = self.content_engine

        metadata.create_all()

        conn = self.content_engine.connect()

        # Write data for each fixture into the table
        for table in metadata.sorted_tables:
            if data[table.name]:
                conn.execute(table.insert(), data[table.name])

        conn.close()

        with patch(
            "kolibri.core.content.utils.sqlalchemybridge.get_engine",
            new=self.get_engine,
        ):

            import_channel_from_local_db("6199dde695db4ee4ab392222d5af1e5c")
            update_content_metadata("6199dde695db4ee4ab392222d5af1e5c")
        self.content_engine.dispose()

    def get_engine(self, connection_string):
        if connection_string == get_default_db_string():
            return django_connection_engine()
        return self.content_engine

    def tearDown(self):
        call_command("flush", interactive=False)
        super(ContentImportTestBase, self).tearDown()

    @classmethod
    def tearDownClass(cls):
        django_connection_engine().dispose()
        super(ContentImportTestBase, cls).tearDownClass()


class NaiveImportTestCase(ContentNodeTestBase, ContentImportTestBase):
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
                ContentNode.objects.filter(kind=kind)
                .exclude(learning_activities=learning_activity)
                .count(),
                0,
            )

    def test_existing_localfiles_are_not_overwritten(self):

        with patch(
            "kolibri.core.content.utils.sqlalchemybridge.get_engine",
            new=self.get_engine,
        ):

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


class ImportLongDescriptionsTestCase(ContentImportTestBase, TransactionTestCase):
    """
    When using Postgres, char limits on fields are enforced strictly. This was causing errors importing as described in:
    https://github.com/learningequality/kolibri/issues/3600
    """

    name = CONTENT_SCHEMA_VERSION
    legacy_schema = None
    data_name = "longdescriptions"

    longdescription = "soverylong" * 45

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


class Version4ImportTestCase(NaiveImportTestCase):
    """
    Integration test for import from no version import
    """

    name = VERSION_4

    @classmethod
    def tearDownClass(cls):
        super(Version4ImportTestCase, cls).tearDownClass()

    @classmethod
    def setUpClass(cls):
        super(Version4ImportTestCase, cls).setUpClass()


class Version3ImportTestCase(NaiveImportTestCase):
    """
    Integration test for import from no version import
    """

    name = VERSION_3

    @classmethod
    def tearDownClass(cls):
        super(Version3ImportTestCase, cls).tearDownClass()

    @classmethod
    def setUpClass(cls):
        super(Version3ImportTestCase, cls).setUpClass()


class Version2ImportTestCase(NaiveImportTestCase):
    """
    Integration test for import from no version import
    """

    name = VERSION_2

    @classmethod
    def tearDownClass(cls):
        super(Version2ImportTestCase, cls).tearDownClass()

    @classmethod
    def setUpClass(cls):
        super(Version2ImportTestCase, cls).setUpClass()


class Version1ImportTestCase(NaiveImportTestCase):
    """
    Integration test for import from no version import
    """

    name = VERSION_1

    @classmethod
    def tearDownClass(cls):
        super(Version1ImportTestCase, cls).tearDownClass()

    @classmethod
    def setUpClass(cls):
        super(Version1ImportTestCase, cls).setUpClass()


class NoVersionImportTestCase(NaiveImportTestCase):
    """
    Integration test for import from no version import
    """

    name = NO_VERSION

    @classmethod
    def tearDownClass(cls):
        super(NoVersionImportTestCase, cls).tearDownClass()

    @classmethod
    def setUpClass(cls):
        super(NoVersionImportTestCase, cls).setUpClass()


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
        super(NoVersionv020ImportTestCase, cls).tearDownClass()

    @classmethod
    def setUpClass(cls):
        super(NoVersionv020ImportTestCase, cls).setUpClass()


class NoVersionv040ImportTestCase(NoVersionv020ImportTestCase):
    """
    Integration test for import from no version import
    for legacy schema 0.4.0beta3
    """

    legacy_schema = V040BETA3

    @classmethod
    def tearDownClass(cls):
        super(NoVersionv020ImportTestCase, cls).tearDownClass()

    @classmethod
    def setUpClass(cls):
        super(NoVersionv040ImportTestCase, cls).setUpClass()
