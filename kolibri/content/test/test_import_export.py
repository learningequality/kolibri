import os
import tempfile

from django.core.management import call_command
from django.test import TestCase
from mock import call
from mock import patch
from requests import Session
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError

from kolibri.content.models import LocalFile
from kolibri.utils.tests.helpers import override_option


# helper class for mocking that is equal to anything
def Any(cls):
    class Any(cls):
        def __eq__(self, other):
            return True
    return Any()


@patch('kolibri.content.management.commands.importchannel.channel_import.import_channel_from_local_db')
@patch('kolibri.content.management.commands.importchannel.AsyncCommand.start_progress')
@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class ImportChannelTestCase(TestCase):
    """
    Test case for the importchannel management command.
    """

    the_channel_id = '6199dde695db4ee4ab392222d5af1e5c'

    @patch('kolibri.content.management.commands.importchannel.paths.get_content_database_file_url')
    @patch('kolibri.content.management.commands.importchannel.paths.get_content_database_file_path')
    @patch('kolibri.content.management.commands.importchannel.transfer.FileDownload')
    @patch('kolibri.content.management.commands.importchannel.AsyncCommand.cancel', return_value=True)
    @patch('kolibri.content.management.commands.importchannel.AsyncCommand.is_cancelled', return_value=True)
    def test_remote_cancel_during_transfer(self, is_cancelled_mock, cancel_mock, FileDownloadMock, local_path_mock, remote_path_mock, start_progress_mock,
                                           import_channel_mock):
        local_path = tempfile.mkstemp()[1]
        local_path_mock.return_value = local_path
        remote_path_mock.return_value = 'notest'
        FileDownloadMock.return_value.__iter__.return_value = ['one', 'two', 'three']
        call_command("importchannel", "network", self.the_channel_id)
        # Check that is_cancelled was called
        is_cancelled_mock.assert_called_with()
        # Check that the FileDownload initiated
        FileDownloadMock.assert_called_with('notest', local_path)
        # Check that cancel was called
        cancel_mock.assert_called_with()
        # Test that import channel cleans up database file if cancelled
        self.assertFalse(os.path.exists(local_path))

    @patch('kolibri.content.management.commands.importchannel.paths.get_content_database_file_path')
    @patch('kolibri.content.management.commands.importchannel.transfer.FileCopy')
    @patch('kolibri.content.management.commands.importchannel.AsyncCommand.cancel', return_value=True)
    @patch('kolibri.content.management.commands.importchannel.AsyncCommand.is_cancelled', return_value=True)
    def test_local_cancel_during_transfer(self, is_cancelled_mock, cancel_mock, FileCopyMock, local_path_mock, start_progress_mock, import_channel_mock):
        local_dest_path = tempfile.mkstemp()[1]
        local_src_path = tempfile.mkstemp()[1]
        local_path_mock.side_effect = [local_dest_path, local_src_path]
        FileCopyMock.return_value.__iter__.return_value = ['one', 'two', 'three']
        call_command("importchannel", "disk", self.the_channel_id, tempfile.mkdtemp())
        # Check that is_cancelled was called
        is_cancelled_mock.assert_called_with()
        # Check that the FileCopy initiated
        FileCopyMock.assert_called_with(local_src_path, local_dest_path)
        # Check that cancel was called
        cancel_mock.assert_called_with()
        # Test that import channel cleans up database file if cancelled
        self.assertFalse(os.path.exists(local_dest_path))


@patch('kolibri.content.management.commands.importcontent.annotation')
@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class ImportContentTestCase(TestCase):
    """
    Test case for the importcontent management command.
    """

    fixtures = ['content_test.json']
    the_channel_id = '6199dde695db4ee4ab392222d5af1e5c'

    def setUp(self):
        LocalFile.objects.update(available=False)

    @patch('kolibri.content.management.commands.importcontent.transfer.FileDownload')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.cancel')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.is_cancelled', return_value=True)
    def test_remote_cancel_immediately(self, is_cancelled_mock, cancel_mock, FileDownloadMock, annotation_mock):
        # Check behaviour if cancellation is called before any file download starts
        FileDownloadMock.return_value.__iter__.return_value = ['one', 'two', 'three']
        call_command("importcontent", "network", self.the_channel_id)
        is_cancelled_mock.assert_has_calls([call(), call()])
        FileDownloadMock.assert_not_called()
        cancel_mock.assert_called_with()
        annotation_mock.mark_local_files_as_available.assert_not_called()
        annotation_mock.set_leaf_node_availability_from_local_file_availability.assert_not_called()
        annotation_mock.recurse_availability_up_tree.assert_not_called()

    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.start_progress')
    @patch('kolibri.content.management.commands.importcontent.paths.get_content_storage_remote_url')
    @patch('kolibri.content.management.commands.importcontent.paths.get_content_storage_file_path')
    @patch('kolibri.content.management.commands.importcontent.transfer.FileDownload')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.cancel')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.is_cancelled', side_effect=[False, True, True, True])
    def test_remote_cancel_during_transfer(self, is_cancelled_mock, cancel_mock, FileDownloadMock, local_path_mock, remote_path_mock, start_progress_mock,
                                           annotation_mock):
        # If transfer is cancelled during transfer of first file
        local_path = tempfile.mkstemp()[1]
        local_path_mock.return_value = local_path
        remote_path_mock.return_value = 'notest'
        # Mock this __iter__ so that the filetransfer can be looped over
        FileDownloadMock.return_value.__iter__.return_value = ['one', 'two', 'three']
        call_command("importcontent", "network", self.the_channel_id)
        # is_cancelled should be called thrice.
        is_cancelled_mock.assert_has_calls([call(), call(), call()])
        # Should be set to the local path we mocked
        FileDownloadMock.assert_called_with('notest', local_path, session=Any(Session))
        # Check that it was cancelled when the command was cancelled, this ensures cleanup
        FileDownloadMock.assert_has_calls([call().cancel()])
        # Check that the command itself was also cancelled.
        cancel_mock.assert_called_with()
        annotation_mock.mark_local_files_as_available.assert_not_called()
        annotation_mock.set_leaf_node_availability_from_local_file_availability.assert_not_called()
        annotation_mock.recurse_availability_up_tree.assert_not_called()

    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.start_progress')
    @patch('kolibri.content.management.commands.importcontent.paths.get_content_storage_remote_url')
    @patch('kolibri.content.management.commands.importcontent.paths.get_content_storage_file_path')
    @patch('kolibri.content.management.commands.importcontent.transfer.FileDownload')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.cancel')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.is_cancelled', side_effect=[False, False, False, False, False, True, True, True])
    def test_remote_cancel_after_file_copy_file_not_deleted(self, is_cancelled_mock, cancel_mock, FileDownloadMock, local_path_mock, remote_path_mock,
                                                            start_progress_mock, annotation_mock):
        # If transfer is cancelled after transfer of first file
        local_path_1 = tempfile.mkstemp()[1]
        local_path_2 = tempfile.mkstemp()[1]
        local_path_mock.side_effect = [local_path_1, local_path_2]
        remote_path_mock.return_value = 'notest'
        # Mock this __iter__ so that the filetransfer can be looped over
        FileDownloadMock.return_value.__iter__.return_value = ['one', 'two', 'three']
        call_command("importcontent", "network", self.the_channel_id)
        # Check that the command itself was also cancelled.
        cancel_mock.assert_called_with()
        # Check that the temp file we created where the first file was being downloaded to has not been deleted
        self.assertTrue(os.path.exists(local_path_1))
        annotation_mock.set_availability.assert_called()

    @patch('kolibri.content.management.commands.importcontent.transfer.FileCopy')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.cancel')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.is_cancelled', return_value=True)
    def test_local_cancel_immediately(self, is_cancelled_mock, cancel_mock, FileCopyMock, annotation_mock):
        # Local version of test above
        FileCopyMock.return_value.__iter__.return_value = ['one', 'two', 'three']
        call_command("importcontent", "disk", self.the_channel_id, tempfile.mkdtemp())
        is_cancelled_mock.assert_has_calls([call(), call()])
        FileCopyMock.assert_not_called()
        cancel_mock.assert_called_with()
        annotation_mock.mark_local_files_as_available.assert_not_called()
        annotation_mock.set_leaf_node_availability_from_local_file_availability.assert_not_called()
        annotation_mock.recurse_availability_up_tree.assert_not_called()

    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.start_progress')
    @patch('kolibri.content.management.commands.importcontent.paths.get_content_storage_file_path')
    @patch('kolibri.content.management.commands.importcontent.transfer.FileCopy')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.cancel')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.is_cancelled', side_effect=[False, True, True, True])
    def test_local_cancel_during_transfer(self, is_cancelled_mock, cancel_mock, FileCopyMock, local_path_mock, start_progress_mock, annotation_mock):
        # Local version of test above
        local_dest_path = tempfile.mkstemp()[1]
        local_src_path = tempfile.mkstemp()[1]
        local_path_mock.side_effect = [local_dest_path, local_src_path]
        FileCopyMock.return_value.__iter__.return_value = ['one', 'two', 'three']
        call_command("importcontent", "disk", self.the_channel_id, tempfile.mkdtemp())
        is_cancelled_mock.assert_has_calls([call(), call(), call()])
        FileCopyMock.assert_called_with(local_src_path, local_dest_path)
        FileCopyMock.assert_has_calls([call().cancel()])
        cancel_mock.assert_called_with()
        annotation_mock.set_availability.assert_called()

    @patch('kolibri.content.management.commands.importcontent.len')
    @patch('kolibri.content.utils.transfer.Transfer.next', side_effect=ConnectionError('connection error'))
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.cancel')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.is_cancelled', side_effect=[False, True, True, True])
    def test_remote_cancel_during_connect_error(self, is_cancelled_mock, cancel_mock, next_mock, len_mock, annotation_mock):
        call_command('importcontent', 'network', self.the_channel_id, node_ids=['32a941fb77c2576e8f6b294cde4c3b0c'])
        cancel_mock.assert_called_with()
        len_mock.assert_not_called()
        annotation_mock.set_availability.assert_called()

    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.start_progress')
    @patch('kolibri.content.management.commands.importcontent.logging.error')
    @patch('kolibri.content.management.commands.importcontent.paths.get_content_storage_file_path')
    def test_remote_import_httperror_404(self, path_mock, logging_mock, start_progress_mock, annotation_mock):
        local_dest_path_1 = tempfile.mkstemp()[1]
        local_dest_path_2 = tempfile.mkstemp()[1]
        local_dest_path_3 = tempfile.mkstemp()[1]
        path_mock.side_effect = [local_dest_path_1, local_dest_path_2, local_dest_path_3]
        call_command('importcontent', 'network', self.the_channel_id, node_ids=['2b6926ed22025518a8b9da91745b51d3'], renderable_only=False)
        self.assertTrue(logging_mock.call_count == 3)
        self.assertTrue('404' in logging_mock.call_args_list[0][0][0])

    @patch('kolibri.content.management.commands.importcontent.sleep')
    @patch('kolibri.content.management.commands.importcontent.logging.error')
    @patch('kolibri.content.management.commands.importcontent.paths.get_content_storage_remote_url')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.cancel')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.is_cancelled', side_effect=[False, False, True, True, True])
    def test_remote_import_httperror_502(self, is_cancelled_mock, cancel_mock, url_mock, logging_mock, sleep_mock, annotation_mock):
        url_mock.return_value = 'http://httpbin.org/status/502'
        call_command('importcontent', 'network', self.the_channel_id)
        cancel_mock.assert_called_with()
        annotation_mock.set_availability.assert_called()
        sleep_mock.assert_called_once()
        self.assertTrue('502' in logging_mock.call_args_list[0][0][0])

    @patch('kolibri.content.management.commands.importcontent.logging.error')
    @patch('kolibri.content.management.commands.importcontent.paths.get_content_storage_remote_url')
    def test_remote_import_httperror_500(self, url_mock, logging_mock, annotation_mock):
        url_mock.return_value = 'http://httpbin.org/status/500'
        with self.assertRaises(HTTPError):
            call_command('importcontent', 'network', self.the_channel_id)
            self.assertTrue('500' in logging_mock.call_args_list[0][0][0])
        annotation_mock.set_availability.assert_not_called()

    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.start_progress')
    @patch('kolibri.content.management.commands.importcontent.logging.error')
    @patch('kolibri.content.management.commands.importcontent.paths.get_content_storage_file_path')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.cancel')
    @patch('kolibri.content.management.commands.importcontent.AsyncCommand.is_cancelled', side_effect=[False, True, True])
    def test_local_import_oserror_dne(self, is_cancelled_mock, cancel_mock, path_mock, logging_mock, start_progress_mock, annotation_mock):
        dest_path = tempfile.mkstemp()[1]
        path_mock.side_effect = [dest_path, '/test/dne']
        call_command('importcontent', 'disk', self.the_channel_id, 'destination')
        self.assertTrue('No such file or directory' in logging_mock.call_args_list[0][0][0])
        annotation_mock.set_availability.assert_called()

    @patch('kolibri.content.management.commands.importcontent.logging.error')
    @patch('kolibri.content.utils.transfer.os.path.getsize')
    @patch('kolibri.content.management.commands.importcontent.paths.get_content_storage_file_path')
    def test_local_import_oserror_permission_denied(self, path_mock, getsize_mock, logging_mock, annotation_mock):
            dest_path = tempfile.mkstemp()[1]
            path_mock.side_effect = [dest_path, '/test/dne']
            getsize_mock.side_effect = ['1', OSError('Permission denied')]
            with self.assertRaises(OSError):
                call_command('importcontent', 'disk', self.the_channel_id, 'destination')
                self.assertTrue('Permission denied' in logging_mock.call_args_list[0][0][0])
                annotation_mock.assert_not_called()


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class ExportChannelTestCase(TestCase):
    """
    Test case for the exportchannel management command.
    """

    the_channel_id = '6199dde695db4ee4ab392222d5af1e5c'

    @patch('kolibri.content.management.commands.exportchannel.AsyncCommand.start_progress')
    @patch('kolibri.content.management.commands.exportchannel.paths.get_content_database_file_path')
    @patch('kolibri.content.management.commands.exportchannel.transfer.FileCopy')
    @patch('kolibri.content.management.commands.exportchannel.AsyncCommand.cancel')
    @patch('kolibri.content.management.commands.exportchannel.AsyncCommand.is_cancelled', return_value=True)
    def test_cancel_during_transfer(self, is_cancelled_mock, cancel_mock, FileCopyMock, local_path_mock, start_progress_mock):
        # Make sure we clean up a database file that is canceled during export
        local_dest_path = tempfile.mkstemp()[1]
        local_src_path = tempfile.mkstemp()[1]
        local_path_mock.side_effect = [local_src_path, local_dest_path]
        FileCopyMock.return_value.__iter__.return_value = ['one', 'two', 'three']
        call_command("exportchannel", self.the_channel_id, local_dest_path)
        is_cancelled_mock.assert_called_with()
        FileCopyMock.assert_called_with(local_src_path, local_dest_path)
        cancel_mock.assert_called_with()
        self.assertFalse(os.path.exists(local_dest_path))


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class ExportContentTestCase(TestCase):
    """
    Test case for the exportcontent management command.
    """

    fixtures = ['content_test.json']
    the_channel_id = '6199dde695db4ee4ab392222d5af1e5c'

    @patch('kolibri.content.management.commands.exportcontent.transfer.FileCopy')
    @patch('kolibri.content.management.commands.exportcontent.AsyncCommand.cancel')
    @patch('kolibri.content.management.commands.exportcontent.AsyncCommand.is_cancelled', return_value=True)
    def test_local_cancel_immediately(self, is_cancelled_mock, cancel_mock, FileCopyMock):
        # If cancel comes in before we do anything, make sure nothing happens!
        FileCopyMock.return_value.__iter__.return_value = ['one', 'two', 'three']
        call_command("exportcontent", self.the_channel_id, tempfile.mkdtemp())
        is_cancelled_mock.assert_has_calls([call(), call()])
        FileCopyMock.assert_not_called()
        cancel_mock.assert_called_with()

    @patch('kolibri.content.management.commands.exportcontent.AsyncCommand.start_progress')
    @patch('kolibri.content.management.commands.exportcontent.paths.get_content_storage_file_path')
    @patch('kolibri.content.management.commands.exportcontent.transfer.FileCopy')
    @patch('kolibri.content.management.commands.exportcontent.AsyncCommand.cancel')
    @patch('kolibri.content.management.commands.exportcontent.AsyncCommand.is_cancelled', side_effect=[False, True, True, True])
    def test_local_cancel_during_transfer(self, is_cancelled_mock, cancel_mock, FileCopyMock, local_path_mock, start_progress_mock):
        # Make sure we cancel during transfer
        local_dest_path = tempfile.mkstemp()[1]
        local_src_path = tempfile.mkstemp()[1]
        local_path_mock.side_effect = [local_src_path, local_dest_path]
        FileCopyMock.return_value.__iter__.return_value = ['one', 'two', 'three']
        call_command("exportcontent", self.the_channel_id, tempfile.mkdtemp())
        is_cancelled_mock.assert_has_calls([call(), call(), call()])
        FileCopyMock.assert_called_with(local_src_path, local_dest_path)
        FileCopyMock.assert_has_calls([call().cancel()])
        cancel_mock.assert_called_with()
