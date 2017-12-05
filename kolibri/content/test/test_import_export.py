import os
import tempfile
from django.core.management import call_command
from django.test import TestCase
from django.test.utils import override_settings
from mock import call, patch

from kolibri.content.models import LocalFile

CONTENT_STORAGE_DIR_TEMP = tempfile.mkdtemp()
CONTENT_STORAGE_SOURCE_DIR = tempfile.mkdtemp()

@patch('kolibri.content.management.commands.importchannel.channel_import.import_channel_from_local_db')
@patch('kolibri.content.management.commands.importchannel.AsyncCommand.start_progress')
@override_settings(
    CONTENT_STORAGE_DIR=CONTENT_STORAGE_DIR_TEMP,
)
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
        import_channel_mock.assert_not_called()

    @patch('kolibri.content.management.commands.importchannel.paths.get_content_database_file_path')
    @patch('kolibri.content.management.commands.importchannel.transfer.FileCopy')
    @patch('kolibri.content.management.commands.importchannel.AsyncCommand.cancel', return_value=True)
    @patch('kolibri.content.management.commands.importchannel.AsyncCommand.is_cancelled', return_value=True)
    def test_local_cancel_during_transfer(self, is_cancelled_mock, cancel_mock, FileCopyMock, local_path_mock, start_progress_mock, import_channel_mock):
        local_dest_path = tempfile.mkstemp()[1]
        local_src_path = tempfile.mkstemp()[1]
        local_path_mock.side_effect = [local_dest_path, local_src_path]
        FileCopyMock.return_value.__iter__.return_value = ['one', 'two', 'three']
        call_command("importchannel", "disk", self.the_channel_id, CONTENT_STORAGE_SOURCE_DIR)
        # Check that is_cancelled was called
        is_cancelled_mock.assert_called_with()
        # Check that the FileCopy initiated
        FileCopyMock.assert_called_with(local_src_path, local_dest_path)
        # Check that cancel was called
        cancel_mock.assert_called_with()
        # Test that import channel cleans up database file if cancelled
        self.assertFalse(os.path.exists(local_dest_path))
        import_channel_mock.assert_not_called()


@patch('kolibri.content.management.commands.importcontent.annotation')
@override_settings(
    CONTENT_STORAGE_DIR=CONTENT_STORAGE_DIR_TEMP,
)
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
        FileDownloadMock.assert_called_with('notest', local_path)
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
        call_command("importcontent", "disk", self.the_channel_id, CONTENT_STORAGE_SOURCE_DIR)
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
        call_command("importcontent", "disk", self.the_channel_id, CONTENT_STORAGE_SOURCE_DIR)
        is_cancelled_mock.assert_has_calls([call(), call(), call()])
        FileCopyMock.assert_called_with(local_src_path, local_dest_path)
        FileCopyMock.assert_has_calls([call().cancel()])
        cancel_mock.assert_called_with()
        annotation_mock.set_availability.assert_called()


@override_settings(
    CONTENT_STORAGE_DIR=CONTENT_STORAGE_DIR_TEMP,
)
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


@override_settings(
    CONTENT_STORAGE_DIR=CONTENT_STORAGE_DIR_TEMP,
)
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
        call_command("exportcontent", self.the_channel_id, CONTENT_STORAGE_SOURCE_DIR)
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
        call_command("exportcontent", self.the_channel_id, CONTENT_STORAGE_SOURCE_DIR)
        is_cancelled_mock.assert_has_calls([call(), call(), call()])
        FileCopyMock.assert_called_with(local_src_path, local_dest_path)
        FileCopyMock.assert_has_calls([call().cancel()])
        cancel_mock.assert_called_with()
