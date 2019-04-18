import tempfile
import uuid

from django.core.management import call_command
from django.db import DataError
from django.test import TestCase
from django.test import TransactionTestCase
from le_utils.constants import content_kinds
from mock import call
from mock import patch

from .sqlalchemytesting import django_connection_engine
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import CONTENT_SCHEMA_VERSION
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import Language
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.annotation import calculate_included_languages
from kolibri.core.content.utils.annotation import fix_multiple_trees_with_id_one
from kolibri.core.content.utils.annotation import mark_local_files_as_available
from kolibri.core.content.utils.annotation import recurse_availability_up_tree
from kolibri.core.content.utils.annotation import set_leaf_node_availability_from_local_file_availability
from kolibri.core.content.utils.annotation import set_local_file_availability_from_disk
from kolibri.core.content.utils.annotation import topic_coach_content_annotation


def get_engine(connection_string):
    return django_connection_engine()


test_channel_id = "6199dde695db4ee4ab392222d5af1e5c"


@patch('kolibri.core.content.utils.sqlalchemybridge.get_engine', new=get_engine)
class AnnotationFromLocalFileAvailability(TransactionTestCase):

    fixtures = ['content_test.json']

    def test_all_local_files_available(self):
        LocalFile.objects.all().update(available=True)
        set_leaf_node_availability_from_local_file_availability(test_channel_id)
        self.assertTrue(all(File.objects.all().values_list('available', flat=True)))
        self.assertTrue(all(
            ContentNode.objects.exclude(kind=content_kinds.TOPIC).exclude(files=None).values_list('available', flat=True)))

    def test_no_local_files_available(self):
        LocalFile.objects.all().update(available=False)
        set_leaf_node_availability_from_local_file_availability(test_channel_id)
        self.assertEqual(File.objects.filter(available=True).count(), 0)
        self.assertEqual(ContentNode.objects.exclude(kind=content_kinds.TOPIC).filter(available=True).count(), 0)

    def test_one_local_file_available(self):
        LocalFile.objects.all().update(available=False)
        LocalFile.objects.filter(id='6bdfea4a01830fdd4a585181c0b8068c').update(available=True)
        set_leaf_node_availability_from_local_file_availability(test_channel_id)
        self.assertTrue(ContentNode.objects.get(id='32a941fb77c2576e8f6b294cde4c3b0c').available)
        self.assertFalse(all(
            ContentNode.objects.exclude(
                kind=content_kinds.TOPIC).exclude(id='32a941fb77c2576e8f6b294cde4c3b0c').values_list('available', flat=True)))

    def test_other_channel_node_still_available(self):
        test = ContentNode.objects.filter(kind=content_kinds.VIDEO).first()
        test.id = uuid.uuid4().hex
        test.channel_id = uuid.uuid4().hex
        test.available = True
        test.parent = None
        test.save()
        set_leaf_node_availability_from_local_file_availability(test_channel_id)
        test.refresh_from_db()
        self.assertTrue(test.available)

    def tearDown(self):
        call_command('flush', interactive=False)
        super(AnnotationFromLocalFileAvailability, self).tearDown()


@patch('kolibri.core.content.utils.sqlalchemybridge.get_engine', new=get_engine)
class AnnotationTreeRecursion(TransactionTestCase):

    fixtures = ['content_test.json']

    def setUp(self):
        super(AnnotationTreeRecursion, self).setUp()
        ContentNode.objects.all().update(available=False)

    def test_all_content_nodes_available(self):
        ContentNode.objects.exclude(kind=content_kinds.TOPIC).update(available=True)
        recurse_availability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        self.assertTrue(ContentNode.objects.get(id="da7ecc42e62553eebc8121242746e88a").available)
        self.assertTrue(ContentNode.objects.get(id="2e8bac07947855369fe2d77642dfc870").available)

    def test_no_content_nodes_available(self):
        ContentNode.objects.filter(kind=content_kinds.TOPIC).update(available=True)
        recurse_availability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        # 3, as there are three childless topics in the fixture, these cannot exist in real databases
        self.assertEqual(ContentNode.objects.filter(kind=content_kinds.TOPIC).filter(available=True).count(), 3)

    def test_one_content_node_available(self):
        ContentNode.objects.filter(id='32a941fb77c2576e8f6b294cde4c3b0c').update(available=True)
        recurse_availability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        # Check parent is available
        self.assertTrue(ContentNode.objects.get(id='da7ecc42e62553eebc8121242746e88a').available)

    def test_all_content_nodes_available_coach_content(self):
        ContentNode.objects.exclude(kind=content_kinds.TOPIC).update(available=True, coach_content=True)
        topic_coach_content_annotation(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        self.assertTrue(ContentNode.objects.get(id="da7ecc42e62553eebc8121242746e88a").coach_content)
        self.assertTrue(ContentNode.objects.get(id="2e8bac07947855369fe2d77642dfc870").coach_content)

    def test_no_content_nodes_coach_content(self):
        ContentNode.objects.all().update(available=True)
        ContentNode.objects.all().update(coach_content=False)
        recurse_availability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        self.assertEqual(ContentNode.objects.filter(coach_content=True).count(), 0)

    def test_all_root_content_nodes_coach_content(self):
        ContentNode.objects.all().update(available=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        ContentNode.objects.filter(parent=root_node).exclude(kind=content_kinds.TOPIC).update(coach_content=True)
        recurse_availability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        self.assertFalse(root_node.coach_content)

    def test_one_root_content_node_coach_content(self):
        ContentNode.objects.all().update(available=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        node = ContentNode.objects.filter(parent=root_node).exclude(kind=content_kinds.TOPIC).first()
        node.coach_content = True
        node.save()
        recurse_availability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        self.assertFalse(root_node.coach_content)

    def test_one_root_topic_node_coach_content(self):
        ContentNode.objects.all().update(available=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        node = ContentNode.objects.filter(parent=root_node, kind=content_kinds.TOPIC).first()
        node.coach_content = True
        node.save()
        recurse_availability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        self.assertFalse(root_node.coach_content)

    def test_one_child_node_coach_content(self):
        ContentNode.objects.all().update(available=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        node = ContentNode.objects.filter(parent=root_node, kind=content_kinds.TOPIC).first()
        ContentNode.objects.create(
            title='test1',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=node,
            kind=content_kinds.VIDEO,
            available=True,
            coach_content=True,
        )
        recurse_availability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        node.refresh_from_db()
        self.assertFalse(root_node.coach_content)
        self.assertFalse(node.coach_content)

    def test_one_child_coach_content_parent_no_siblings(self):
        ContentNode.objects.all().update(available=True, coach_content=False)
        root_node = ContentNode.objects.get(parent__isnull=True)
        topic_node = ContentNode.objects.filter(parent=root_node, kind=content_kinds.TOPIC).first()
        parent_node = ContentNode.objects.create(
            title='test1',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=topic_node,
            kind=content_kinds.TOPIC,
            available=True,
            coach_content=False,
        )
        ContentNode.objects.create(
            title='test2',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=parent_node,
            kind=content_kinds.VIDEO,
            available=True,
            coach_content=True,
        )
        ContentNode.objects.create(
            title='test3',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=parent_node,
            kind=content_kinds.VIDEO,
            available=True,
            coach_content=False,
        )
        recurse_availability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        parent_node.refresh_from_db()
        self.assertFalse(parent_node.coach_content)

    def test_one_content_node_many_siblings_coach_content(self):
        ContentNode.objects.filter(kind=content_kinds.TOPIC).update(available=True)
        ContentNode.objects.filter(id='32a941fb77c2576e8f6b294cde4c3b0c').update(coach_content=True)
        recurse_availability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        # Check parent is not marked as coach_content True because there are non-coach_content siblings
        self.assertFalse(ContentNode.objects.get(id='da7ecc42e62553eebc8121242746e88a').coach_content)

    def test_two_channels_no_annotation_collision_child_false(self):
        root_node = ContentNode.objects.create(
            title='test',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            kind=content_kinds.TOPIC,
            available=True,
            coach_content=True,
        )
        ContentNode.objects.create(
            title='test1',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=root_node,
            kind=content_kinds.VIDEO,
            available=False,
            coach_content=False,
        )
        recurse_availability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        self.assertTrue(root_node.available)
        self.assertTrue(root_node.coach_content)

    def test_two_channels_no_annotation_collision_child_true(self):
        root_node = ContentNode.objects.create(
            title='test',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            kind=content_kinds.TOPIC,
            available=False,
            coach_content=False,
        )
        ContentNode.objects.create(
            title='test1',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=root_node,
            kind=content_kinds.VIDEO,
            available=True,
            coach_content=True,
        )
        recurse_availability_up_tree(channel_id="6199dde695db4ee4ab392222d5af1e5c")
        root_node.refresh_from_db()
        self.assertFalse(root_node.available)
        self.assertFalse(root_node.coach_content)

    def tearDown(self):
        call_command('flush', interactive=False)
        super(AnnotationTreeRecursion, self).tearDown()


@patch('kolibri.core.content.utils.sqlalchemybridge.get_engine', new=get_engine)
class LocalFileByChecksum(TransactionTestCase):

    fixtures = ['content_test.json']

    def setUp(self):
        super(LocalFileByChecksum, self).setUp()
        LocalFile.objects.all().update(available=False)

    def test_set_one_file(self):
        file_id = '6bdfea4a01830fdd4a585181c0b8068c'
        mark_local_files_as_available([file_id])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=file_id).available)

    def test_set_two_files(self):
        file_id_1 = '6bdfea4a01830fdd4a585181c0b8068c'
        file_id_2 = 'e00699f859624e0f875ac6fe1e13d648'
        mark_local_files_as_available([file_id_1, file_id_2])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 2)
        self.assertTrue(LocalFile.objects.get(id=file_id_1).available)
        self.assertTrue(LocalFile.objects.get(id=file_id_2).available)

    def tearDown(self):
        call_command('flush', interactive=False)
        super(LocalFileByChecksum, self).tearDown()


mock_content_file = tempfile.mkstemp()


@patch('kolibri.core.content.utils.sqlalchemybridge.get_engine', new=get_engine)
class LocalFileByDisk(TransactionTestCase):

    fixtures = ['content_test.json']

    file_id_1 = '6bdfea4a01830fdd4a585181c0b8068c'
    file_id_2 = 'e00699f859624e0f875ac6fe1e13d648'

    def setUp(self):
        super(LocalFileByDisk, self).setUp()
        LocalFile.objects.all().update(available=False)

    @patch('kolibri.core.content.utils.annotation.get_content_storage_file_path', return_value=mock_content_file[1])
    def test_set_one_file_not_list_exists(self, path_mock):
        set_local_file_availability_from_disk(checksums=self.file_id_1)
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).available)

    @patch('kolibri.core.content.utils.annotation.get_content_storage_file_path', return_value='')
    def test_set_one_file_not_list_not_exist(self, path_mock):
        set_local_file_availability_from_disk(checksums=self.file_id_1)
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_1).available)

    @patch('kolibri.core.content.utils.annotation.get_content_storage_file_path', return_value=mock_content_file[1])
    def test_set_one_file_exists(self, path_mock):
        set_local_file_availability_from_disk(checksums=[self.file_id_1])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).available)

    @patch('kolibri.core.content.utils.annotation.get_content_storage_file_path', return_value='')
    def test_set_one_file_not_exist(self, path_mock):
        set_local_file_availability_from_disk(checksums=[self.file_id_1])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_1).available)

    @patch('kolibri.core.content.utils.annotation.get_content_storage_file_path', return_value=mock_content_file[1])
    def test_set_two_files_exist(self, path_mock):
        set_local_file_availability_from_disk(checksums=[self.file_id_1, self.file_id_2])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 2)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).available)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_2).available)

    @patch('kolibri.core.content.utils.annotation.get_content_storage_file_path', side_effect=[mock_content_file[1], ''])
    def test_set_two_files_one_exists(self, path_mock):
        set_local_file_availability_from_disk(checksums=[self.file_id_1, self.file_id_2])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).available)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_2).available)

    @patch('kolibri.core.content.utils.annotation.get_content_storage_file_path', return_value='')
    def test_set_two_files_none_exist(self, path_mock):
        set_local_file_availability_from_disk(checksums=[self.file_id_1, self.file_id_2])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_1).available)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_2).available)

    @patch('kolibri.core.content.utils.annotation.get_content_storage_file_path', return_value='')
    def test_set_all_files_none_exist(self, path_mock):
        set_local_file_availability_from_disk()
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 0)

    @patch('kolibri.core.content.utils.annotation.get_content_storage_file_path', return_value=mock_content_file[1])
    def test_set_all_files_all_exist(self, path_mock):
        set_local_file_availability_from_disk()
        self.assertEqual(LocalFile.objects.exclude(available=True).count(), 0)

    @patch('kolibri.core.content.utils.annotation.get_content_storage_file_path', side_effect=[mock_content_file[1]] * 2 + [''] * 3)
    def test_set_all_files_two_exist(self, path_mock):
        set_local_file_availability_from_disk()
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 2)
        self.assertEqual(LocalFile.objects.exclude(available=True).count(), 3)

    def test_set_bad_filenames(self):
        local_files = list(LocalFile.objects.all())
        LocalFile.objects.all().delete()
        for i, lf in enumerate(local_files):
            lf.id = 'bananas' + str(i)
            lf.save()
        set_local_file_availability_from_disk()
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 0)

    def tearDown(self):
        call_command('flush', interactive=False)
        super(LocalFileByDisk, self).tearDown()


mock_content_db_file = tempfile.mkstemp()


@patch('kolibri.core.content.utils.channel_import.import_channel_from_local_db')
class FixMultipleTreesWithIdOneTestCase(TransactionTestCase):

    fixtures = ['content_test.json']

    @patch('kolibri.core.content.utils.annotation.get_content_database_file_path', return_value=mock_content_file[1])
    def test_extra_channel_contentdb_exists(self, path_mock, import_mock):
        root_node = ContentNode.objects.create(
            title='test',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        ChannelMetadata.objects.create(
            id=root_node.channel_id,
            root=root_node,
            name='test',
            min_schema_version=CONTENT_SCHEMA_VERSION,
        )
        # Do this to side step django mptts auto tree_id code
        ContentNode.objects.filter(parent=None).update(tree_id=1)
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 2)
        fix_multiple_trees_with_id_one()
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 1)
        import_mock.assert_called_with(root_node.channel_id)

    @patch('kolibri.core.content.utils.annotation.get_content_database_file_path', return_value=mock_content_file[1])
    def test_two_extra_channels_contentdb_exists(self, path_mock, import_mock):
        root_node_1 = ContentNode.objects.create(
            title='test',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        ChannelMetadata.objects.create(
            id=root_node_1.channel_id,
            root=root_node_1,
            name='test',
            min_schema_version=CONTENT_SCHEMA_VERSION,
        )
        root_node_2 = ContentNode.objects.create(
            title='test',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        # Add an additional node so that root_node_1 channel is processed first.
        ContentNode.objects.create(
            title='test1',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node_2.channel_id,
            parent=root_node_2,
        )
        ChannelMetadata.objects.create(
            id=root_node_2.channel_id,
            root=root_node_2,
            name='test',
            min_schema_version=CONTENT_SCHEMA_VERSION,
        )
        # Do this to side step django mptts auto tree_id code
        ContentNode.objects.filter(parent=None).update(tree_id=1)
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 3)
        fix_multiple_trees_with_id_one()
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 1)
        import_mock.assert_has_calls([call(root_node_1.channel_id), call(root_node_2.channel_id)])

    @patch('kolibri.core.content.utils.annotation.get_content_database_file_path', return_value='')
    def test_extra_channel_no_contentdb_exists(self, path_mock, import_mock):
        root_node = ContentNode.objects.create(
            title='test',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        ChannelMetadata.objects.create(
            id=root_node.channel_id,
            root=root_node,
            name='test',
            min_schema_version=CONTENT_SCHEMA_VERSION,
        )
        # Do this to side step django mptts auto tree_id code
        ContentNode.objects.filter(parent=None).update(tree_id=1)
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 2)
        fix_multiple_trees_with_id_one()
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 2)
        import_mock.assert_not_called()

    @patch('kolibri.core.content.utils.annotation.get_content_database_file_path', side_effect=['', mock_content_file[1]])
    def test_two_extra_channels_one_contentdb_exists(self, path_mock, import_mock):
        root_node_1 = ContentNode.objects.create(
            title='test',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        ChannelMetadata.objects.create(
            id=root_node_1.channel_id,
            root=root_node_1,
            name='test',
            min_schema_version=CONTENT_SCHEMA_VERSION,
        )
        root_node_2 = ContentNode.objects.create(
            title='test',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        # Add an additional node so that root_node_1 channel is processed first.
        ContentNode.objects.create(
            title='test1',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node_2.channel_id,
            parent=root_node_2,
        )
        ChannelMetadata.objects.create(
            id=root_node_2.channel_id,
            root=root_node_2,
            name='test',
            min_schema_version=CONTENT_SCHEMA_VERSION,
        )
        # Do this to side step django mptts auto tree_id code
        ContentNode.objects.filter(parent=None).update(tree_id=1)
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 3)
        fix_multiple_trees_with_id_one()
        self.assertEqual(ContentNode.objects.filter(parent=None, tree_id=1).count(), 2)
        with self.assertRaises(AssertionError):
            import_mock.assert_called_with(root_node_1.channel_id)
        import_mock.assert_called_with(root_node_2.channel_id)


class CalculateChannelFieldsTestCase(TestCase):
    def setUp(self):
        self.node = ContentNode.objects.create(
            title='test',
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            available=True
        )
        self.channel = ChannelMetadata.objects.create(id=self.node.channel_id, name="channel", root=self.node)
        Language.objects.create(id='en', lang_code='en')

    def test_calculate_included_languages(self):
        calculate_included_languages(self.channel)
        self.assertEqual(list(self.channel.included_languages.values_list('id', flat=True)), [])
        ContentNode.objects.update(lang_id='en')
        calculate_included_languages(self.channel)
        self.assertEqual(list(self.channel.included_languages.values_list('id', flat=True)), ['en'])
        self.assertEqual(
            list(self.channel.included_languages.values_list("id", flat=True)), ["en"]
        )

    def test_published_size_big_integer_field(self):
        self.channel.published_size = (
            2150000000
        )  # out of range for integer field on postgres
        try:
            self.channel.save()
        except DataError:
            self.fail("DataError: integer out of range")
