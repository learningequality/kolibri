from django.test import TestCase

from kolibri.content.utils.channel_import import ChannelImport

from mock import patch, MagicMock, Mock, call

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
        mapping = 'test_map_method'
        test_map_method = Mock()
        channel_import.test_map_method = test_map_method
        mapper = channel_import.generate_table_mapper(mapping=mapping)
        self.assertEqual(mapper, test_map_method)

    def test_no_column_mapping(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        mapping = 'test_map_method'
        with self.assertRaises(AttributeError):
            channel_import.generate_table_mapper(mapping=mapping)


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

    def test_delete_content_tree(self, apps_mock, tree_id_mock, BridgeMock):
        channel_import = ChannelImport('test')
        with patch('kolibri.content.utils.channel_import.delete_content_tree_and_files') as delete_mock:
            channel_import.delete_content_tree_and_files()
            delete_mock.assert_called_once_with('test')

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
