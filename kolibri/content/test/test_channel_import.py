import json
import os
import pickle

from django.apps import apps
from django.core.management import call_command
from django.test import TestCase, TransactionTestCase

from kolibri.content.utils.channel_import import ChannelImport, NO_VERSION, mappings
from kolibri.content.utils.sqlalchemybridge import get_default_db_string

from mock import patch, MagicMock, Mock, call

from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import sessionmaker

from .sqlalchemytesting import django_connection_engine
from .test_content_app import ContentNodeTestBase

@patch('kolibri.content.utils.channel_import.Bridge')
@patch('kolibri.content.utils.channel_import.ChannelImport.find_unique_tree_id')
@patch('kolibri.content.utils.channel_import.apps')
class BaseChannelImportClassConstructorTestCase(TestCase):
    """
    Testcase for the base channel import class constructor
    """

    def test_channel_id(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        self.assertEqual(channel_import.channel_id, 'test')

    @patch('kolibri.content.utils.channel_import.get_content_database_file_path')
    def test_two_bridges(self, db_path_mock, apps_mock, tree_id_mock, BridgeMock):
        db_path_mock.return_value = 'test'
        ChannelImport('test')
        BridgeMock.assert_has_calls([call(sqlite_file_path='test'), call(app_name='content')])

    @patch('kolibri.content.utils.channel_import.get_content_database_file_path')
    def test_get_config(self, db_path_mock, apps_mock, tree_id_mock, BridgeMock):
        ChannelImport('test')
        apps_mock.assert_has_calls([call.get_app_config('content'), call.get_app_config().models.values()])

    def test_tree_id(self, apps_mock, tree_id_mock, BridgeMock):
        ChannelImport('test')
        tree_id_mock.assert_called_once_with()


@patch('kolibri.content.utils.channel_import.Bridge')
@patch('kolibri.content.utils.channel_import.ChannelImport.get_all_destination_tree_ids')
@patch('kolibri.content.utils.channel_import.apps')
class BaseChannelImportClassMethodUniqueTreeIdTestCase(TestCase):
    """
    Testcase for the base channel import class unique tree id generator
    """
    def test_empty(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = []
        channel_import = ChannelImport('test')
        self.assertEqual(channel_import.find_unique_tree_id(), 1)

    def test_one_one(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [1]
        channel_import = ChannelImport('test')
        self.assertEqual(channel_import.find_unique_tree_id(), 2)

    def test_one_two(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [2]
        channel_import = ChannelImport('test')
        self.assertEqual(channel_import.find_unique_tree_id(), 1)

    def test_two_one_two(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [1, 2]
        channel_import = ChannelImport('test')
        self.assertEqual(channel_import.find_unique_tree_id(), 3)

    def test_two_one_three(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [1, 3]
        channel_import = ChannelImport('test')
        self.assertEqual(channel_import.find_unique_tree_id(), 2)

    def test_three_one_two_three(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [1, 2, 3]
        channel_import = ChannelImport('test')
        self.assertEqual(channel_import.find_unique_tree_id(), 4)

    def test_three_one_two_four(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [1, 2, 4]
        channel_import = ChannelImport('test')
        self.assertEqual(channel_import.find_unique_tree_id(), 3)

    def test_three_one_three_four(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [1, 3, 4]
        channel_import = ChannelImport('test')
        self.assertEqual(channel_import.find_unique_tree_id(), 2)

    def test_three_one_three_five(self, apps_mock, tree_ids_mock, BridgeMock):
        tree_ids_mock.return_value = [1, 3, 5]
        channel_import = ChannelImport('test')
        self.assertEqual(channel_import.find_unique_tree_id(), 2)


@patch('kolibri.content.utils.channel_import.Bridge')
@patch('kolibri.content.utils.channel_import.ChannelImport.find_unique_tree_id')
@patch('kolibri.content.utils.channel_import.apps')
class BaseChannelImportClassGenRowMapperTestCase(TestCase):
    """
    Testcase for the base channel import class row mapper generator
    """

    def test_base_mapper(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        mapper = channel_import.generate_row_mapper()
        record = MagicMock()
        record.test_attr = 'test_val'
        self.assertEqual(mapper(record, 'test_attr'), 'test_val')

    def test_column_name_mapping(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        mappings = {
            'test_attr': 'test_attr_mapped'
        }
        mapper = channel_import.generate_row_mapper(mappings=mappings)
        record = MagicMock()
        record.test_attr_mapped = 'test_val'
        self.assertEqual(mapper(record, 'test_attr'), 'test_val')

    def test_method_mapping(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        mappings = {
            'test_attr': 'test_map_method'
        }
        mapper = channel_import.generate_row_mapper(mappings=mappings)
        record = {}
        test_map_method = Mock()
        test_map_method.return_value = 'test_val'
        channel_import.test_map_method = test_map_method
        self.assertEqual(mapper(record, 'test_attr'), 'test_val')

    def test_no_column_mapping(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        mappings = {
            'test_attr': 'test_attr_mapped'
        }
        mapper = channel_import.generate_row_mapper(mappings=mappings)
        record = Mock(spec=['test_attr'])
        with self.assertRaises(AttributeError):
            mapper(record, 'test_attr')


@patch('kolibri.content.utils.channel_import.Bridge')
@patch('kolibri.content.utils.channel_import.ChannelImport.find_unique_tree_id')
@patch('kolibri.content.utils.channel_import.apps')
class BaseChannelImportClassGenTableMapperTestCase(TestCase):
    """
    Testcase for the base channel import class table mapper generator
    """

    def test_base_mapper(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        mapper = channel_import.generate_table_mapper()
        self.assertEqual(mapper, channel_import.base_table_mapper)

    def test_method_mapping(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        table_map = 'test_map_method'
        test_map_method = Mock()
        channel_import.test_map_method = test_map_method
        mapper = channel_import.generate_table_mapper(table_map=table_map)
        self.assertEqual(mapper, test_map_method)

    def test_no_column_mapping(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        table_map = 'test_map_method'
        with self.assertRaises(AttributeError):
            channel_import.generate_table_mapper(table_map=table_map)


@patch('kolibri.content.utils.channel_import.Bridge')
@patch('kolibri.content.utils.channel_import.ChannelImport.find_unique_tree_id')
@patch('kolibri.content.utils.channel_import.apps')
class BaseChannelImportClassTableImportTestCase(TestCase):
    """
    Testcase for the base channel import class table import method
    """

    def test_no_models_unflushed_rows_passed_through(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        record_mock = MagicMock(spec=['__table__'])
        channel_import.destination.get_class.return_value = record_mock
        self.assertEqual(0, channel_import.table_import(MagicMock(), lambda x, y: None, lambda x: [], 0))

    def test_no_merge_records_bulk_insert_no_flush(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        record_mock = MagicMock(spec=['__table__'])
        record_mock.__table__.columns.keys.return_value = ['test_attr']
        channel_import.destination.get_class.return_value = record_mock
        channel_import.table_import(MagicMock(), lambda x, y: 'test_val', lambda x: [{}]*100, 0)
        channel_import.destination.session.bulk_insert_mappings.assert_has_calls([call(record_mock, [{'test_attr': 'test_val'}]*100)])
        channel_import.destination.session.flush.assert_not_called()

    def test_no_merge_records_bulk_insert_flush(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        record_mock = MagicMock(spec=['__table__'])
        record_mock.__table__.columns.keys.return_value = ['test_attr']
        channel_import.destination.get_class.return_value = record_mock
        channel_import.table_import(MagicMock(), lambda x, y: 'test_val', lambda x: [{}]*10000, 0)
        channel_import.destination.session.bulk_insert_mappings.assert_has_calls([call(record_mock, [{'test_attr': 'test_val'}]*10000)])
        channel_import.destination.session.flush.assert_called_once_with()

    @patch('kolibri.content.utils.channel_import.merge_models', new=[])
    def test_merge_records_merge_no_flush(self, apps_mock, tree_id_mock, BridgeMock):
        from kolibri.content.utils.channel_import import merge_models
        channel_import = ChannelImport('test')
        record_mock = MagicMock(spec=['__table__'])
        record_mock.__table__.columns.keys.return_value = ['test_attr']
        channel_import.destination.get_class.return_value = record_mock
        model_mock = MagicMock()
        merge_models.append(model_mock)
        channel_import.table_import(model_mock, lambda x, y: 'test_val', lambda x: [{}]*100, 0)
        channel_import.destination.session.merge.assert_has_calls([call(record_mock(**{'test_attr': 'test_val'}))]*100)
        channel_import.destination.session.flush.assert_not_called()

    @patch('kolibri.content.utils.channel_import.merge_models', new=[])
    def test_merge_records_merge_flush(self, apps_mock, tree_id_mock, BridgeMock):
        from kolibri.content.utils.channel_import import merge_models
        channel_import = ChannelImport('test')
        record_mock = Mock(spec=['__table__'])
        record_mock.__table__.columns.keys.return_value = ['test_attr']
        channel_import.destination.get_class.return_value = record_mock
        model_mock = Mock()
        merge_models.append(model_mock)
        channel_import.table_import(model_mock, lambda x, y: 'test_val', lambda x: [{}]*10000, 0)
        channel_import.destination.session.merge.assert_has_calls([call(record_mock(**{'test_attr': 'test_val'}))]*10000)
        channel_import.destination.session.flush.assert_called_once_with()


@patch('kolibri.content.utils.channel_import.Bridge')
@patch('kolibri.content.utils.channel_import.ChannelImport.find_unique_tree_id')
@patch('kolibri.content.utils.channel_import.apps')
class BaseChannelImportClassOtherMethodsTestCase(TestCase):
    """
    Testcase for the base channel import class remaining methods
    """

    def test_import_channel_methods_called(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        model_mock = Mock(spec=['__name__'])
        channel_import.content_models = [model_mock]
        mapping_mock = Mock()
        channel_import.schema_mapping = {
            model_mock: mapping_mock
        }
        with patch.object(channel_import, 'generate_row_mapper'),\
            patch.object(channel_import, 'generate_table_mapper'),\
                patch.object(channel_import, 'table_import'):
            channel_import.import_channel_data()
            channel_import.generate_row_mapper.assert_called_once_with(mapping_mock.get('per_row'))
            channel_import.generate_table_mapper.assert_called_once_with(mapping_mock.get('per_table'))
            channel_import.table_import.assert_called_once()
            channel_import.destination.session.commit.assert_called_once_with()

    def test_end(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        channel_import.end()
        channel_import.destination.end.assert_has_calls([call(), call()])

    def test_destination_tree_ids(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        class_mock = Mock()
        channel_import.destination.get_class.return_value = class_mock
        channel_import.get_all_destination_tree_ids()
        channel_import.destination.assert_has_calls([
            call.session.query(class_mock.tree_id),
            call.session.query().distinct(),
            call.session.query().distinct().all()
        ])

    def test_base_table_mapper(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        class_mock = Mock()
        [record for record in channel_import.base_table_mapper(class_mock)]
        channel_import.destination.assert_has_calls([
            call.session.query(class_mock),
            call.session.query().all()
        ])


SCHEMA_PATH_TEMPLATE = os.path.join(os.path.dirname(__file__), '../fixtures/{name}_content_schema')

DATA_PATH_TEMPLATE = os.path.join(os.path.dirname(__file__), '../fixtures/{name}_content_data.json')

class NaiveImportTestCase(ContentNodeTestBase, TransactionTestCase):
    """
    Integration test for naive import - this is run using a TransactionTestCase,
    as by default, Django runs each test inside an atomic context in order to easily roll back
    any changes to the DB. However, as we are setting things in the Django DB using SQLAlchemy
    these changes are not caught by this atomic context, and data will persist across tests.
    In order to deal with this, we call an explicit db flush at the end of every test case,
    both this flush and the SQLAlchemy insertions can cause issues with the atomic context used
    by Django.
    """

    content_fixture = 'content_test.json'

    # When incrementing content schema versions, this should be incremented to the new version
    # A new TestCase for importing for this old version should then be subclassed from this TestCase
    # See 'NoVersionImportTestCase' below for an example
    name = '1'

    def setUp(self):
        try:
            self.set_content_fixture()
        except (IOError, EOFError):
            self.create_content_fixture()
            self.set_content_fixture()

        super(NaiveImportTestCase, self).setUp()

    def create_content_fixture(self):

        # This is a utility for creating the fixtures that we use in later testing.
        # It should not get called during ordinary test runs, but will happen the first time
        # a new schema version is created and run.
        #
        # When a new content schema version is created, this test suite must be run and the resulting
        # fixtures committed to the codebase.

        engine = django_connection_engine()

        metadata = MetaData()

        app_config = apps.get_app_config('content')
        table_names = [model._meta.db_table for model in app_config.models.values()]
        metadata.reflect(engine, only=table_names)
        Base = automap_base(metadata=metadata)
        # TODO map relationship backreferences using the django names
        Base.prepare()
        session = sessionmaker(bind=engine, autoflush=False)()

        # Load fixture data into the test database with Django
        call_command('loaddata', self.content_fixture, interactive=False)

        def get_dict(item):
            value = {key: value for key, value in item.__dict__.items() if key != '_sa_instance_state'}
            return value

        data = {}

        for table_name, record in Base.classes.items():
            data[table_name] = [get_dict(r) for r in session.query(record).all()]

        with open(SCHEMA_PATH_TEMPLATE.format(name=self.name), 'wb') as f:
            pickle.dump(metadata, f, protocol=2)

        with open(DATA_PATH_TEMPLATE.format(name=self.name), 'w') as f:
            json.dump(data, f)

        call_command('flush', interactive=False)

    def set_content_fixture(self):
        self.content_engine = create_engine('sqlite:///:memory:', convert_unicode=True)

        with open(SCHEMA_PATH_TEMPLATE.format(name=self.name), 'rb') as f:
            metadata = pickle.load(f)

        with open(DATA_PATH_TEMPLATE.format(name=self.name), 'r') as f:
            data = json.load(f)

        metadata.bind = self.content_engine

        metadata.create_all()

        conn = self.content_engine.connect()

        # Write data for each fixture into the table
        for table in metadata.sorted_tables:
            conn.execute(table.insert(), data[table.name])

        conn.close()

        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=self.get_engine):

            channel_import = mappings[self.name]('6199dde695db4ee4ab392222d5af1e5c')

            channel_import.import_channel_data()

            channel_import.end()

    def get_engine(self, connection_string):
        if connection_string == get_default_db_string():
            return django_connection_engine()
        return self.content_engine

    def tearDown(self):
        call_command('flush', interactive=False)
        super(NaiveImportTestCase, self).tearDown()

    @classmethod
    def tearDownClass(cls):
        django_connection_engine().dispose()
        super(NaiveImportTestCase, cls).tearDownClass()


class NoVersionImportTestCase(NaiveImportTestCase):
    """
    Integration test for import from no version import
    """

    name = NO_VERSION
