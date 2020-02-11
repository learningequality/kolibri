import os
import sys
import tempfile
import uuid

from django.core.management import call_command
from django.test import TestCase
from le_utils.constants import content_kinds
from mock import call
from mock import MagicMock
from mock import patch
from requests import Response
from requests import Session
from requests.exceptions import ChunkedEncodingError
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError
from requests.exceptions import ReadTimeout
from requests.exceptions import SSLError

from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.content_types_tools import (
    renderable_contentnodes_q_filter,
)
from kolibri.core.content.utils.import_export_content import get_files_to_transfer
from kolibri.utils.tests.helpers import override_option

# helper class for mocking that is equal to anything


def Any(cls):
    class Any(cls):
        def __eq__(self, other):
            return True

    return Any()


@patch(
    "kolibri.core.content.management.commands.importchannel.channel_import.import_channel_from_local_db"
)
@patch(
    "kolibri.core.content.management.commands.importchannel.AsyncCommand.start_progress"
)
@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class ImportChannelTestCase(TestCase):
    """
    Test case for the importchannel management command.
    """

    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    @patch(
        "kolibri.core.content.management.commands.importchannel.paths.get_content_database_file_url"
    )
    @patch(
        "kolibri.core.content.management.commands.importchannel.paths.get_content_database_file_path"
    )
    @patch(
        "kolibri.core.content.management.commands.importchannel.transfer.FileDownload"
    )
    @patch(
        "kolibri.core.content.management.commands.importchannel.AsyncCommand.cancel",
        return_value=True,
    )
    @patch(
        "kolibri.core.content.management.commands.importchannel.AsyncCommand.is_cancelled",
        return_value=True,
    )
    def test_remote_cancel_during_transfer(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileDownloadMock,
        local_path_mock,
        remote_path_mock,
        start_progress_mock,
        import_channel_mock,
    ):
        local_path = tempfile.mkstemp()[1]
        local_path_mock.return_value = local_path
        remote_path_mock.return_value = "notest"
        FileDownloadMock.return_value.__iter__.return_value = ["one", "two", "three"]
        call_command("importchannel", "network", self.the_channel_id)
        # Check that is_cancelled was called
        is_cancelled_mock.assert_called_with()
        # Check that the FileDownload initiated
        FileDownloadMock.assert_called_with("notest", local_path)
        # Check that cancel was called
        cancel_mock.assert_called_with()
        # Test that import channel cleans up database file if cancelled
        self.assertFalse(os.path.exists(local_path))

    @patch(
        "kolibri.core.content.management.commands.importchannel.paths.get_content_database_file_path"
    )
    @patch("kolibri.core.content.management.commands.importchannel.transfer.FileCopy")
    @patch(
        "kolibri.core.content.management.commands.importchannel.AsyncCommand.cancel",
        return_value=True,
    )
    @patch(
        "kolibri.core.content.management.commands.importchannel.AsyncCommand.is_cancelled",
        return_value=True,
    )
    def test_local_cancel_during_transfer(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileCopyMock,
        local_path_mock,
        start_progress_mock,
        import_channel_mock,
    ):
        local_dest_path = tempfile.mkstemp()[1]
        local_src_path = tempfile.mkstemp()[1]
        local_path_mock.side_effect = [local_dest_path, local_src_path]
        FileCopyMock.return_value.__iter__.return_value = ["one", "two", "three"]
        call_command("importchannel", "disk", self.the_channel_id, tempfile.mkdtemp())
        # Check that is_cancelled was called
        is_cancelled_mock.assert_called_with()
        # Check that the FileCopy initiated
        FileCopyMock.assert_called_with(local_src_path, local_dest_path)
        # Check that cancel was called
        cancel_mock.assert_called_with()
        # Test that import channel cleans up database file if cancelled
        self.assertFalse(os.path.exists(local_dest_path))

    @patch("kolibri.core.content.management.commands.importchannel.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importchannel.AsyncCommand.is_cancelled",
        return_value=True,
    )
    def test_remote_import_sslerror(
        self, is_cancelled_mock, cancel_mock, start_progress_mock, import_channel_mock
    ):
        SSLERROR = SSLError(
            ["SSL routines", "ssl3_get_record", "decryption failed or bad record mac"]
        )

        if "OpenSSL" in sys.modules:
            from OpenSSL.SSL import Error

            SSLERROR = Error(
                [
                    "SSL routines",
                    "ssl3_get_record",
                    "decryption failed or bad record mac",
                ]
            )
        with patch(
            "kolibri.core.content.utils.transfer.Transfer.next", side_effect=SSLERROR
        ):
            call_command("importchannel", "network", "197934f144305350b5820c7c4dd8e194")
            cancel_mock.assert_called_with()
            import_channel_mock.assert_not_called()

    @patch(
        "kolibri.core.content.utils.transfer.Transfer.next",
        side_effect=ReadTimeout("Read timed out."),
    )
    @patch("kolibri.core.content.management.commands.importchannel.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importchannel.AsyncCommand.is_cancelled",
        return_value=True,
    )
    def test_remote_import_readtimeout(
        self,
        is_cancelled_mock,
        cancel_mock,
        sslerror_mock,
        start_progress_mock,
        import_channel_mock,
    ):
        call_command("importchannel", "network", "197934f144305350b5820c7c4dd8e194")
        cancel_mock.assert_called_with()
        import_channel_mock.assert_not_called()

    @patch(
        "kolibri.core.content.management.commands.importchannel.paths.get_content_database_file_url"
    )
    @patch(
        "kolibri.core.content.management.commands.importchannel.paths.get_content_database_file_path"
    )
    @patch(
        "kolibri.core.content.management.commands.importchannel.transfer.FileDownload"
    )
    @patch("kolibri.core.content.management.commands.importchannel.clear_channel_stats")
    def test_remote_successful_import_clears_stats_cache(
        self,
        channel_stats_clear_mock,
        FileDownloadMock,
        local_path_mock,
        remote_path_mock,
        start_progress_mock,
        import_channel_mock,
    ):
        local_path = tempfile.mkstemp()[1]
        local_path_mock.return_value = local_path
        remote_path_mock.return_value = "notest"
        FileDownloadMock.return_value.__iter__.return_value = ["one", "two", "three"]
        import_channel_mock.return_value = True
        call_command("importchannel", "network", self.the_channel_id)
        self.assertTrue(channel_stats_clear_mock.called)


@patch(
    "kolibri.core.content.management.commands.importcontent.lookup_channel_listing_status",
    return_value=False,
)
@patch(
    "kolibri.core.content.management.commands.importcontent.calculate_files_to_transfer"
)
@patch("kolibri.core.content.management.commands.importcontent.annotation")
@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class ImportContentTestCase(TestCase):
    """
    Test case for the importcontent management command.
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def setUp(self):
        LocalFile.objects.update(available=False)

    @patch(
        "kolibri.core.content.management.commands.importcontent.transfer.FileDownload"
    )
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        return_value=True,
    )
    def test_remote_cancel_immediately(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileDownloadMock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        # Check behaviour if cancellation is called before any file download starts
        FileDownloadMock.return_value.__iter__.return_value = ["one", "two", "three"]
        files_to_transfer_mock.return_value = (LocalFile.objects.all(), 10)
        call_command("importcontent", "network", self.the_channel_id)
        is_cancelled_mock.assert_has_calls([call(), call()])
        FileDownloadMock.assert_not_called()
        cancel_mock.assert_called_with()
        annotation_mock.mark_local_files_as_available.assert_not_called()
        annotation_mock.set_leaf_node_availability_from_local_file_availability.assert_not_called()
        annotation_mock.recurse_annotation_up_tree.assert_not_called()

    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_remote_url"
    )
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path"
    )
    @patch(
        "kolibri.core.content.management.commands.importcontent.transfer.FileDownload"
    )
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        side_effect=[False, True, True, True, True],
    )
    def test_remote_cancel_during_transfer(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileDownloadMock,
        local_path_mock,
        remote_path_mock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        # If transfer is cancelled during transfer of first file
        local_path = tempfile.mkstemp()[1]
        local_path_mock.return_value = local_path
        remote_path_mock.return_value = "notest"
        # Mock this __iter__ so that the filetransfer can be looped over
        FileDownloadMock.return_value.__iter__.return_value = ["one", "two", "three"]
        FileDownloadMock.return_value.total_size = 1
        files_to_transfer_mock.return_value = (LocalFile.objects.all(), 10)
        call_command("importcontent", "network", self.the_channel_id)
        # is_cancelled should be called thrice.
        is_cancelled_mock.assert_has_calls([call(), call(), call()])
        # Should be set to the local path we mocked
        FileDownloadMock.assert_called_with("notest", local_path, session=Any(Session))
        # Check that it was cancelled when the command was cancelled, this ensures cleanup
        FileDownloadMock.assert_has_calls([call().cancel()])
        # Check that the command itself was also cancelled.
        cancel_mock.assert_called_with()
        annotation_mock.mark_local_files_as_available.assert_not_called()
        annotation_mock.set_leaf_node_availability_from_local_file_availability.assert_not_called()
        annotation_mock.recurse_annotation_up_tree.assert_not_called()

    @patch(
        "kolibri.core.content.management.commands.importcontent.compare_checksums",
        return_value=True,
    )
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_remote_url"
    )
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path"
    )
    @patch(
        "kolibri.core.content.management.commands.importcontent.transfer.FileDownload"
    )
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        side_effect=[False, False, False, False, False, True, True, True],
    )
    def test_remote_cancel_after_file_copy_file_not_deleted(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileDownloadMock,
        local_path_mock,
        remote_path_mock,
        checksum_mock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        # If transfer is cancelled after transfer of first file
        local_path_1 = tempfile.mkstemp()[1]
        local_path_2 = tempfile.mkstemp()[1]
        with open(local_path_1, "w") as f:
            f.write("a")
        local_path_mock.side_effect = [local_path_1, local_path_2]
        remote_path_mock.return_value = "notest"
        # Mock this __iter__ so that the filetransfer can be looped over
        FileDownloadMock.return_value.__iter__.return_value = ["one", "two", "three"]
        FileDownloadMock.return_value.total_size = 1
        FileDownloadMock.return_value.dest = local_path_1
        LocalFile.objects.update(file_size=1)
        files_to_transfer_mock.return_value = (LocalFile.objects.all()[:3], 10)
        call_command("importcontent", "network", self.the_channel_id)
        # Check that the command itself was also cancelled.
        cancel_mock.assert_called_with()
        # Check that the temp file we created where the first file was being downloaded to has not been deleted
        self.assertTrue(os.path.exists(local_path_1))
        annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.management.commands.importcontent.transfer.FileCopy")
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        return_value=True,
    )
    def test_local_cancel_immediately(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileCopyMock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        # Local version of test above
        FileCopyMock.return_value.__iter__.return_value = ["one", "two", "three"]
        files_to_transfer_mock.return_value = (LocalFile.objects.all(), 10)
        call_command("importcontent", "disk", self.the_channel_id, tempfile.mkdtemp())
        is_cancelled_mock.assert_has_calls([call(), call()])
        FileCopyMock.assert_not_called()
        cancel_mock.assert_called_with()
        annotation_mock.mark_local_files_as_available.assert_not_called()
        annotation_mock.set_leaf_node_availability_from_local_file_availability.assert_not_called()
        annotation_mock.recurse_annotation_up_tree.assert_not_called()

    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path"
    )
    @patch("kolibri.core.content.management.commands.importcontent.transfer.FileCopy")
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        side_effect=[False, True, True, True, True],
    )
    def test_local_cancel_during_transfer(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileCopyMock,
        local_path_mock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        # Local version of test above
        local_dest_path = tempfile.mkstemp()[1]
        local_src_path = tempfile.mkstemp()[1]
        local_path_mock.side_effect = [local_dest_path, local_src_path]
        FileCopyMock.return_value.__iter__.return_value = ["one", "two", "three"]
        FileCopyMock.return_value.total_size = 1
        files_to_transfer_mock.return_value = (LocalFile.objects.all(), 10)
        call_command("importcontent", "disk", self.the_channel_id, tempfile.mkdtemp())
        is_cancelled_mock.assert_has_calls([call(), call(), call()])
        FileCopyMock.assert_called_with(local_src_path, local_dest_path)
        FileCopyMock.assert_has_calls([call().cancel()])
        cancel_mock.assert_called_with()
        annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.management.commands.importcontent.len")
    @patch(
        "kolibri.core.content.utils.transfer.Transfer.next",
        side_effect=ConnectionError("connection error"),
    )
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        side_effect=[False, True, True, True],
    )
    def test_remote_cancel_during_connect_error(
        self,
        is_cancelled_mock,
        cancel_mock,
        next_mock,
        len_mock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        LocalFile.objects.filter(pk="6bdfea4a01830fdd4a585181c0b8068c").update(
            file_size=2201062
        )
        LocalFile.objects.filter(pk="211523265f53825b82f70ba19218a02e").update(
            file_size=336974
        )
        files_to_transfer_mock.return_value = (
            LocalFile.objects.filter(
                pk__in=[
                    "6bdfea4a01830fdd4a585181c0b8068c",
                    "211523265f53825b82f70ba19218a02e",
                ]
            ),
            10,
        )
        call_command(
            "importcontent",
            "network",
            self.the_channel_id,
            node_ids=["32a941fb77c2576e8f6b294cde4c3b0c"],
        )
        cancel_mock.assert_called_with()
        len_mock.assert_not_called()
        annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.management.commands.importcontent.logger.error")
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path"
    )
    def test_remote_import_httperror_404(
        self,
        path_mock,
        logger_mock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        local_dest_path_1 = tempfile.mkstemp()[1]
        local_dest_path_2 = tempfile.mkstemp()[1]
        local_dest_path_3 = tempfile.mkstemp()[1]
        path_mock.side_effect = [
            local_dest_path_1,
            local_dest_path_2,
            local_dest_path_3,
        ]
        ContentNode.objects.filter(pk="2b6926ed22025518a8b9da91745b51d3").update(
            available=False
        )
        LocalFile.objects.filter(
            files__contentnode__pk="2b6926ed22025518a8b9da91745b51d3"
        ).update(file_size=1, available=False)
        files_to_transfer_mock.return_value = (
            LocalFile.objects.filter(
                files__contentnode__pk="2b6926ed22025518a8b9da91745b51d3"
            ),
            10,
        )
        call_command(
            "importcontent",
            "network",
            self.the_channel_id,
            node_ids=["2b6926ed22025518a8b9da91745b51d3"],
            renderable_only=False,
        )
        self.assertTrue(logger_mock.call_count == 3)
        self.assertTrue("404" in logger_mock.call_args_list[0][0][0])

    @patch("kolibri.core.content.management.commands.importcontent.sleep")
    @patch(
        "kolibri.core.content.management.commands.importcontent.transfer.FileDownload"
    )
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        side_effect=[False, True, True, True],
    )
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path",
        return_value="test",
    )
    def test_remote_import_httperror_502(
        self,
        content_storage_file_path_mock,
        is_cancelled_mock,
        cancel_mock,
        file_download_mock,
        sleep_mock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        response = Response()
        response.status_code = 502
        file_download_mock.return_value.__enter__.side_effect = HTTPError(
            response=response
        )
        file_download_mock.return_value.dest = "test"
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        files_to_transfer_mock.return_value = (LocalFile.objects.all(), 10)
        call_command("importcontent", "network", self.the_channel_id)
        cancel_mock.assert_called_with()
        annotation_mock.set_content_visibility.assert_called()
        sleep_mock.assert_called_once()

    @patch(
        "kolibri.core.content.management.commands.importcontent.transfer.FileDownload"
    )
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path",
        return_value="test",
    )
    def test_remote_import_httperror_500(
        self,
        content_storage_file_path_mock,
        file_download_mock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        response = Response()
        response.status_code = 500
        file_download_mock.return_value.__enter__.side_effect = HTTPError(
            response=response
        )
        file_download_mock.return_value.dest = "test"
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        files_to_transfer_mock.return_value = (LocalFile.objects.all(), 10)
        with self.assertRaises(HTTPError):
            call_command("importcontent", "network", self.the_channel_id)
        annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.management.commands.importcontent.len")
    @patch(
        "kolibri.core.content.utils.transfer.Transfer.next",
        side_effect=ChunkedEncodingError("Chunked Encoding Error"),
    )
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        side_effect=[False, True, True, True],
    )
    def test_remote_import_chunkedencodingerror(
        self,
        is_cancelled_mock,
        cancel_mock,
        error_mock,
        len_mock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        LocalFile.objects.filter(pk="6bdfea4a01830fdd4a585181c0b8068c").update(
            file_size=2201062
        )
        LocalFile.objects.filter(pk="211523265f53825b82f70ba19218a02e").update(
            file_size=336974
        )
        files_to_transfer_mock.return_value = (
            LocalFile.objects.filter(
                pk__in=[
                    "6bdfea4a01830fdd4a585181c0b8068c",
                    "211523265f53825b82f70ba19218a02e",
                ]
            ),
            10,
        )
        call_command(
            "importcontent",
            "network",
            self.the_channel_id,
            node_ids=["32a941fb77c2576e8f6b294cde4c3b0c"],
        )
        cancel_mock.assert_called_with()
        len_mock.assert_not_called()
        annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.management.commands.importcontent.logger.error")
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path"
    )
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        side_effect=[False, True, True, True],
    )
    def test_local_import_oserror_dne(
        self,
        is_cancelled_mock,
        cancel_mock,
        path_mock,
        logger_mock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        dest_path = tempfile.mkstemp()[1]
        path_mock.side_effect = [dest_path, "/test/dne"]
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        files_to_transfer_mock.return_value = (LocalFile.objects.all(), 10)
        call_command("importcontent", "disk", self.the_channel_id, "destination")
        self.assertTrue(
            "No such file or directory" in logger_mock.call_args_list[0][0][0]
        )
        annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.management.commands.importcontent.logger.error")
    @patch("kolibri.core.content.utils.transfer.os.path.getsize")
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path"
    )
    def test_local_import_oserror_permission_denied(
        self,
        path_mock,
        getsize_mock,
        logger_mock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        dest_path = tempfile.mkstemp()[1]
        path_mock.side_effect = [dest_path, "/test/dne"]
        getsize_mock.side_effect = ["1", OSError("Permission denied")]
        files_to_transfer_mock.return_value = (LocalFile.objects.all(), 10)
        with self.assertRaises(OSError):
            call_command("importcontent", "disk", self.the_channel_id, "destination")
            self.assertTrue("Permission denied" in logger_mock.call_args_list[0][0][0])
            annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.management.commands.importcontent.os.remove")
    @patch(
        "kolibri.core.content.management.commands.importcontent.os.path.isfile",
        return_value=False,
    )
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path"
    )
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        side_effect=[False, False, True, True],
    )
    def test_local_import_source_corrupted(
        self,
        is_cancelled_mock,
        cancel_mock,
        path_mock,
        isfile_mock,
        remove_mock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        local_src_path = tempfile.mkstemp()[1]
        local_dest_path = tempfile.mkstemp()[1]
        LocalFile.objects.filter(
            files__contentnode="32a941fb77c2576e8f6b294cde4c3b0c"
        ).update(file_size=1)
        path_mock.side_effect = [local_dest_path, local_src_path]
        files_to_transfer_mock.return_value = (
            LocalFile.objects.filter(
                files__contentnode="32a941fb77c2576e8f6b294cde4c3b0c"
            ),
            10,
        )
        call_command(
            "importcontent",
            "disk",
            self.the_channel_id,
            "destination",
            node_ids=["32a941fb77c2576e8f6b294cde4c3b0c"],
        )
        cancel_mock.assert_called_with()
        remove_mock.assert_called_with(local_dest_path)

    @patch(
        "kolibri.core.content.management.commands.importcontent.os.path.isfile",
        return_value=False,
    )
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path"
    )
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        return_value=False,
    )
    def test_local_import_source_corrupted_full_progress(
        self,
        is_cancelled_mock,
        cancel_mock,
        path_mock,
        isfile_mock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        """
        Ensure that when a file is imported that does not match the file size in the database
        that the overall progress tracking for the content import process is properly updated
        to reflect the size of the file in the database, not the file on disk.
        This is important, as the total progress for the overall process is measured against
        the total file size recorded in the database for all files, not for the the
        transferred file size.
        """
        local_src_path = tempfile.mkstemp()[1]
        with open(local_src_path, "w") as f:
            f.write("This is just a test")
        src_file_size = os.path.getsize(local_src_path)
        expected_file_size = 10000
        local_dest_path = tempfile.mkstemp()[1]
        os.remove(local_dest_path)
        # Delete all but one file associated with ContentNode to reduce need for mocking
        files = ContentNode.objects.get(
            id="32a941fb77c2576e8f6b294cde4c3b0c"
        ).files.all()
        first_file = files.first()
        files.exclude(id=first_file.id).delete()
        LocalFile.objects.filter(
            files__contentnode="32a941fb77c2576e8f6b294cde4c3b0c"
        ).update(file_size=expected_file_size)
        files_to_transfer_mock.return_value = (
            LocalFile.objects.filter(
                files__contentnode="32a941fb77c2576e8f6b294cde4c3b0c"
            ),
            10,
        )
        path_mock.side_effect = [local_dest_path, local_src_path]
        mock_overall_progress = MagicMock()
        mock_file_progress = MagicMock()
        with patch(
            "kolibri.core.tasks.management.commands.base.ProgressTracker"
        ) as progress_mock:
            progress_mock.return_value.__enter__.side_effect = [
                mock_overall_progress,
                mock_file_progress,
            ]
            call_command(
                "importcontent",
                "disk",
                self.the_channel_id,
                "destination",
                node_ids=["32a941fb77c2576e8f6b294cde4c3b0c"],
            )
            mock_overall_progress.assert_called_with(expected_file_size - src_file_size)

    @patch(
        "kolibri.core.content.management.commands.importcontent.transfer.FileDownload.finalize"
    )
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path"
    )
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        return_value=False,
    )
    def test_remote_import_source_corrupted(
        self,
        is_cancelled_mock,
        path_mock,
        finalize_dest_mock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        dest_path_1 = tempfile.mkstemp()[1]
        dest_path_2 = tempfile.mkstemp()[1]
        path_mock.side_effect = [dest_path_1, dest_path_2]
        LocalFile.objects.filter(pk="6bdfea4a01830fdd4a585181c0b8068c").update(
            file_size=2201062
        )
        LocalFile.objects.filter(pk="211523265f53825b82f70ba19218a02e").update(
            file_size=336974
        )
        files_to_transfer_mock.return_value = (
            LocalFile.objects.filter(
                pk__in=[
                    "6bdfea4a01830fdd4a585181c0b8068c",
                    "211523265f53825b82f70ba19218a02e",
                ]
            ),
            10,
        )
        call_command(
            "importcontent",
            "network",
            self.the_channel_id,
            node_ids=["32a941fb77c2576e8f6b294cde4c3b0c"],
        )
        annotation_mock.set_content_visibility.assert_called_with(
            self.the_channel_id,
            [],
            exclude_node_ids=None,
            node_ids=["32a941fb77c2576e8f6b294cde4c3b0c"],
            public=False,
        )

    @patch(
        "kolibri.core.content.management.commands.importcontent.transfer.FileDownload.finalize"
    )
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path"
    )
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        return_value=False,
    )
    def test_remote_import_full_import(
        self,
        is_cancelled_mock,
        path_mock,
        finalize_dest_mock,
        annotation_mock,
        files_to_transfer_mock,
        channel_list_status_mock,
    ):
        dest_path_1 = tempfile.mkstemp()[1]
        dest_path_2 = tempfile.mkstemp()[1]
        path_mock.side_effect = [dest_path_1, dest_path_2]
        LocalFile.objects.filter(pk="6bdfea4a01830fdd4a585181c0b8068c").update(
            file_size=2201062
        )
        LocalFile.objects.filter(pk="211523265f53825b82f70ba19218a02e").update(
            file_size=336974
        )
        files_to_transfer_mock.return_value = (
            LocalFile.objects.filter(
                pk__in=[
                    "6bdfea4a01830fdd4a585181c0b8068c",
                    "211523265f53825b82f70ba19218a02e",
                ]
            ),
            10,
        )
        call_command(
            "importcontent", "network", self.the_channel_id,
        )
        annotation_mock.set_content_visibility.assert_called_with(
            self.the_channel_id, [], exclude_node_ids=None, node_ids=None, public=False,
        )


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class ExportChannelTestCase(TestCase):
    """
    Test case for the exportchannel management command.
    """

    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    @patch(
        "kolibri.core.content.management.commands.exportchannel.AsyncCommand.start_progress"
    )
    @patch(
        "kolibri.core.content.management.commands.exportchannel.paths.get_content_database_file_path"
    )
    @patch("kolibri.core.content.management.commands.exportchannel.transfer.FileCopy")
    @patch("kolibri.core.content.management.commands.exportchannel.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.exportchannel.AsyncCommand.is_cancelled",
        return_value=True,
    )
    def test_cancel_during_transfer(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileCopyMock,
        local_path_mock,
        start_progress_mock,
    ):
        # Make sure we clean up a database file that is canceled during export
        local_dest_path = tempfile.mkstemp()[1]
        local_src_path = tempfile.mkstemp()[1]
        local_path_mock.side_effect = [local_src_path, local_dest_path]
        FileCopyMock.return_value.__iter__.return_value = ["one", "two", "three"]
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

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    @patch("kolibri.core.content.management.commands.exportcontent.transfer.FileCopy")
    @patch("kolibri.core.content.management.commands.exportcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.exportcontent.AsyncCommand.is_cancelled",
        return_value=True,
    )
    def test_local_cancel_immediately(
        self, is_cancelled_mock, cancel_mock, FileCopyMock
    ):
        # If cancel comes in before we do anything, make sure nothing happens!
        FileCopyMock.return_value.__iter__.return_value = ["one", "two", "three"]
        call_command("exportcontent", self.the_channel_id, tempfile.mkdtemp())
        is_cancelled_mock.assert_has_calls([call(), call()])
        FileCopyMock.assert_not_called()
        cancel_mock.assert_called_with()

    @patch(
        "kolibri.core.content.management.commands.exportcontent.AsyncCommand.start_progress"
    )
    @patch(
        "kolibri.core.content.management.commands.exportcontent.paths.get_content_storage_file_path"
    )
    @patch("kolibri.core.content.management.commands.exportcontent.transfer.FileCopy")
    @patch("kolibri.core.content.management.commands.exportcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.exportcontent.AsyncCommand.is_cancelled",
        side_effect=[False, True, True, True],
    )
    def test_local_cancel_during_transfer(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileCopyMock,
        local_path_mock,
        start_progress_mock,
    ):
        # Make sure we cancel during transfer
        local_dest_path = tempfile.mkstemp()[1]
        local_src_path = tempfile.mkstemp()[1]
        local_path_mock.side_effect = [local_src_path, local_dest_path]
        FileCopyMock.return_value.__iter__.return_value = ["one", "two", "three"]
        call_command("exportcontent", self.the_channel_id, tempfile.mkdtemp())
        is_cancelled_mock.assert_has_calls([call(), call(), call()])
        FileCopyMock.assert_called_with(local_src_path, local_dest_path)
        FileCopyMock.assert_has_calls([call().cancel()])
        cancel_mock.assert_called_with()


class TestFilesToTransfer(TestCase):

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def test_no_exclude_duplicate_files(self):
        """
        Test that including a node id in exclude_node_ids does not
        exclude a shared file that is also used an in included node
        """
        root_node = ContentNode.objects.get(parent__isnull=True)
        node = ContentNode.objects.filter(
            parent=root_node, kind=content_kinds.TOPIC
        ).first()
        node1 = ContentNode.objects.create(
            title="test1",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=node,
            kind=content_kinds.VIDEO,
            available=False,
        )
        node2 = ContentNode.objects.create(
            title="test2",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=node,
            kind=content_kinds.VIDEO,
            available=False,
        )
        local_file = LocalFile.objects.create(
            id=uuid.uuid4().hex, extension="mp4", available=False, file_size=10
        )
        File.objects.create(
            id=uuid.uuid4().hex, local_file=local_file, contentnode=node1
        )
        File.objects.create(
            id=uuid.uuid4().hex, local_file=local_file, contentnode=node2
        )
        files_to_transfer, _ = get_files_to_transfer(
            root_node.channel_id, [node1.id], [node2.id], False, False
        )
        self.assertEqual(files_to_transfer.filter(id=local_file.id).count(), 1)

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_disk"
    )
    def test_all_nodes_present_disk_renderable_only(self, channel_stats_mock):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        stats = {
            key: {} for key in ContentNode.objects.all().values_list("id", flat=True)
        }
        channel_stats_mock.return_value = stats
        files_to_transfer, _ = get_files_to_transfer(
            self.the_channel_id, [], [], False, True, drive_id="1"
        )
        self.assertEqual(
            files_to_transfer.count(),
            LocalFile.objects.filter(
                available=False,
                files__contentnode__in=ContentNode.objects.filter(
                    renderable_contentnodes_q_filter
                ),
            ).count(),
        )

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_disk"
    )
    def test_all_nodes_present_disk(self, channel_stats_mock):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        stats = {
            key: {} for key in ContentNode.objects.all().values_list("id", flat=True)
        }
        channel_stats_mock.return_value = stats
        files_to_transfer, _ = get_files_to_transfer(
            self.the_channel_id, [], [], False, False, drive_id="1"
        )
        self.assertEqual(
            files_to_transfer.count(), LocalFile.objects.filter(available=False).count()
        )

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_disk"
    )
    def test_one_node_present_disk(self, channel_stats_mock):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        obj = ContentNode.objects.get(title="c2c1")
        stats = {obj.id: {}}
        channel_stats_mock.return_value = stats
        files_to_transfer, _ = get_files_to_transfer(
            self.the_channel_id, [], [], False, False, drive_id="1"
        )
        self.assertEqual(files_to_transfer.count(), obj.files.count())

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_disk"
    )
    def test_include_one_available_nodes_disk(self, channel_stats_mock):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        parent = ContentNode.objects.get(title="c2")
        obj = ContentNode.objects.get(title="c2c1")
        stats = {obj.id: {}, parent.id: {}}
        channel_stats_mock.return_value = stats
        files_to_transfer, _ = get_files_to_transfer(
            self.the_channel_id, [parent.id], [], False, False, drive_id="1"
        )
        self.assertEqual(files_to_transfer.count(), obj.files.count())

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_disk"
    )
    def test_no_nodes_present_disk(self, channel_stats_mock):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        stats = {}
        channel_stats_mock.return_value = stats
        files_to_transfer, _ = get_files_to_transfer(
            self.the_channel_id, [], [], False, False, drive_id="1"
        )
        self.assertEqual(files_to_transfer.count(), 0)

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_peer"
    )
    def test_all_nodes_present_peer(self, channel_stats_mock):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        stats = {
            key: {} for key in ContentNode.objects.all().values_list("id", flat=True)
        }
        channel_stats_mock.return_value = stats
        files_to_transfer, _ = get_files_to_transfer(
            self.the_channel_id, [], [], False, False, peer_id="1"
        )
        self.assertEqual(
            files_to_transfer.count(), LocalFile.objects.filter(available=False).count()
        )

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_peer"
    )
    def test_one_node_present_peer(self, channel_stats_mock):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        obj = ContentNode.objects.get(title="c2c1")
        stats = {obj.id: {}}
        channel_stats_mock.return_value = stats
        files_to_transfer, _ = get_files_to_transfer(
            self.the_channel_id, [], [], False, False, peer_id="1"
        )
        self.assertEqual(files_to_transfer.count(), obj.files.count())

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_peer"
    )
    def test_no_nodes_present_peer(self, channel_stats_mock):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        stats = {}
        channel_stats_mock.return_value = stats
        files_to_transfer, _ = get_files_to_transfer(
            self.the_channel_id, [], [], False, False, peer_id="1"
        )
        self.assertEqual(files_to_transfer.count(), 0)
