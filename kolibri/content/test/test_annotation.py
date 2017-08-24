import tempfile

from django.core.management import call_command
from django.test import TransactionTestCase

from kolibri.content.models import ContentNode, File, LocalFile
from kolibri.content.utils.annotation import (
    mark_local_files_as_available, set_local_file_availability_from_disk,
    set_leaf_node_availability_from_local_file_availability, recurse_availability_up_tree
)

from le_utils.constants import content_kinds

from mock import patch

from .sqlalchemytesting import django_connection_engine

def get_engine(connection_string):
    return django_connection_engine()

class AnnotationFromLocalFileAvailability(TransactionTestCase):

    fixtures = ['content_test.json']

    def test_all_local_files_available(self):
        LocalFile.objects.all().update(available=True)
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            set_leaf_node_availability_from_local_file_availability()
        self.assertTrue(all(File.objects.all().values_list('available', flat=True)))
        self.assertTrue(all(
            ContentNode.objects.exclude(kind=content_kinds.TOPIC).exclude(files=None).values_list('available', flat=True)))

    def test_no_local_files_available(self):
        LocalFile.objects.all().update(available=False)
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            set_leaf_node_availability_from_local_file_availability()
        self.assertEqual(File.objects.filter(available=True).count(), 0)
        self.assertEqual(ContentNode.objects.exclude(kind=content_kinds.TOPIC).filter(available=True).count(), 0)

    def test_one_local_file_available(self):
        LocalFile.objects.all().update(available=False)
        localfile = LocalFile.objects.get(id='9f9438fe6b0d42dd8e913d7d04cfb2b2')
        localfile.available = True
        localfile.save()
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            set_leaf_node_availability_from_local_file_availability()
        self.assertTrue(ContentNode.objects.get(id='32a941fb77c2576e8f6b294cde4c3b0c').available)
        self.assertFalse(all(
            ContentNode.objects.exclude(
                kind=content_kinds.TOPIC).exclude(id='32a941fb77c2576e8f6b294cde4c3b0c').values_list('available', flat=True)))

    def tearDown(self):
        call_command('flush', interactive=False)
        super(AnnotationFromLocalFileAvailability, self).tearDown()


class AnnotationTreeRecursion(TransactionTestCase):

    fixtures = ['content_test.json']

    def test_all_content_nodes_available(self):
        ContentNode.objects.all().update(available=False)
        ContentNode.objects.exclude(kind=content_kinds.TOPIC).update(available=True)
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            recurse_availability_up_tree()
        self.assertTrue(all(
            ContentNode.objects.filter(kind=content_kinds.TOPIC).values_list('available', flat=True)))

    def test_no_content_nodes_available(self):
        ContentNode.objects.exclude(kind=content_kinds.TOPIC).update(available=False)
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            recurse_availability_up_tree()
        self.assertEqual(ContentNode.objects.filter(kind=content_kinds.TOPIC).filter(available=True).count(), 0)

    def test_one_content_node_available(self):
        ContentNode.objects.all().update(available=False)
        contentnode = ContentNode.objects.get(id='32a941fb77c2576e8f6b294cde4c3b0c')
        contentnode.available = True
        contentnode.save()
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            recurse_availability_up_tree()
        # Check parent is available
        self.assertTrue(ContentNode.objects.get(id='da7ecc42e62553eebc8121242746e88a').available)

    def tearDown(self):
        call_command('flush', interactive=False)
        super(AnnotationTreeRecursion, self).tearDown()


class LocalFileByChecksum(TransactionTestCase):

    fixtures = ['content_test.json']

    def test_set_one_file(self):
        LocalFile.objects.all().update(available=False)
        file_id = '9f9438fe6b0d42dd8e913d7d04cfb2b2'
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            mark_local_files_as_available([file_id])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=file_id).available)

    def test_set_two_files(self):
        LocalFile.objects.all().update(available=False)
        file_id_1 = '9f9438fe6b0d42dd8e913d7d04cfb2b2'
        file_id_2 = 'e00699f859624e0f875ac6fe1e13d648'
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            mark_local_files_as_available([file_id_1, file_id_2])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 2)
        self.assertTrue(LocalFile.objects.get(id=file_id_1).available)
        self.assertTrue(LocalFile.objects.get(id=file_id_2).available)

    def tearDown(self):
        call_command('flush', interactive=False)
        super(LocalFileByChecksum, self).tearDown()


mock_content_file = tempfile.mkstemp()

class LocalFileByDisk(TransactionTestCase):

    fixtures = ['content_test.json']

    file_id_1 = '9f9438fe6b0d42dd8e913d7d04cfb2b2'
    file_id_2 = 'e00699f859624e0f875ac6fe1e13d648'

    @patch('kolibri.content.utils.annotation.get_content_storage_file_path', return_value=mock_content_file[1])
    def test_set_one_file_not_list_exists(self, path_mock):
        LocalFile.objects.all().update(available=False)
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            set_local_file_availability_from_disk(checksums=self.file_id_1)
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).available)

    @patch('kolibri.content.utils.annotation.get_content_storage_file_path', return_value='')
    def test_set_one_file_not_list_not_exist(self, path_mock):
        LocalFile.objects.all().update(available=False)
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            set_local_file_availability_from_disk(checksums=self.file_id_1)
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_1).available)

    @patch('kolibri.content.utils.annotation.get_content_storage_file_path', return_value=mock_content_file[1])
    def test_set_one_file_exists(self, path_mock):
        LocalFile.objects.all().update(available=False)
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            set_local_file_availability_from_disk(checksums=[self.file_id_1])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).available)

    @patch('kolibri.content.utils.annotation.get_content_storage_file_path', return_value='')
    def test_set_one_file_not_exist(self, path_mock):
        LocalFile.objects.all().update(available=False)
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            set_local_file_availability_from_disk(checksums=[self.file_id_1])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_1).available)

    @patch('kolibri.content.utils.annotation.get_content_storage_file_path', return_value=mock_content_file[1])
    def test_set_two_files_exist(self, path_mock):
        LocalFile.objects.all().update(available=False)
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            set_local_file_availability_from_disk(checksums=[self.file_id_1, self.file_id_2])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 2)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).available)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_2).available)

    @patch('kolibri.content.utils.annotation.get_content_storage_file_path', side_effect=[mock_content_file[1], ''])
    def test_set_two_files_one_exists(self, path_mock):
        LocalFile.objects.all().update(available=False)
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            set_local_file_availability_from_disk(checksums=[self.file_id_1, self.file_id_2])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 1)
        self.assertTrue(LocalFile.objects.get(id=self.file_id_1).available)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_2).available)

    @patch('kolibri.content.utils.annotation.get_content_storage_file_path', return_value='')
    def test_set_two_files_none_exist(self, path_mock):
        LocalFile.objects.all().update(available=False)
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            set_local_file_availability_from_disk(checksums=[self.file_id_1, self.file_id_2])
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 0)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_1).available)
        self.assertFalse(LocalFile.objects.get(id=self.file_id_2).available)

    @patch('kolibri.content.utils.annotation.get_content_storage_file_path', return_value='')
    def test_set_all_files_none_exist(self, path_mock):
        LocalFile.objects.all().update(available=False)
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            set_local_file_availability_from_disk()
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 0)

    @patch('kolibri.content.utils.annotation.get_content_storage_file_path', return_value=mock_content_file[1])
    def test_set_all_files_all_exist(self, path_mock):
        LocalFile.objects.all().update(available=False)
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            set_local_file_availability_from_disk()
        self.assertEqual(LocalFile.objects.exclude(available=True).count(), 0)

    @patch('kolibri.content.utils.annotation.get_content_storage_file_path', side_effect=[mock_content_file[1]]*2 + ['']*3)
    def test_set_all_files_two_exist(self, path_mock):
        LocalFile.objects.all().update(available=False)
        with patch('kolibri.content.utils.sqlalchemybridge.get_engine', new=get_engine):
            set_local_file_availability_from_disk()
        self.assertEqual(LocalFile.objects.filter(available=True).count(), 2)
        self.assertEqual(LocalFile.objects.exclude(available=True).count(), 3)

    def tearDown(self):
        call_command('flush', interactive=False)
        super(LocalFileByDisk, self).tearDown()
