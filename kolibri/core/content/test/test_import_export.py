import os
import sys
import tempfile
import uuid

from django.core.management import call_command
from django.test import TestCase
from le_utils.constants import content_kinds
from mock import call
from mock import MagicMock
from mock import mock_open
from mock import patch
from requests import Session
from requests.exceptions import ChunkedEncodingError
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError
from requests.exceptions import ReadTimeout
from requests.exceptions import SSLError

from kolibri.core.content.errors import InsufficientStorageSpaceError
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.content_types_tools import (
    renderable_contentnodes_q_filter,
)
from kolibri.core.content.utils.import_export_content import get_import_export_data
from kolibri.core.content.utils.transfer import TransferCanceled
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
        fd, local_path = tempfile.mkstemp()
        os.close(fd)
        local_path_mock.return_value = local_path
        remote_path_mock.return_value = "notest"
        FileDownloadMock.return_value.__iter__.side_effect = TransferCanceled()
        call_command("importchannel", "network", self.the_channel_id)
        # Check that is_cancelled was called
        is_cancelled_mock.assert_called_with()
        # Check that the FileDownload initiated
        FileDownloadMock.assert_called_with(
            "notest", local_path, cancel_check=is_cancelled_mock
        )
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
        fd1, local_dest_path = tempfile.mkstemp()
        fd2, local_src_path = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        local_path_mock.side_effect = [local_dest_path, local_src_path]
        FileCopyMock.return_value.__iter__.side_effect = TransferCanceled()
        call_command("importchannel", "disk", self.the_channel_id, tempfile.mkdtemp())
        # Check that is_cancelled was called
        is_cancelled_mock.assert_called_with()
        # Check that the FileCopy initiated
        FileCopyMock.assert_called_with(
            local_src_path, local_dest_path, cancel_check=is_cancelled_mock
        )
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
        "kolibri.core.content.management.commands.importchannel.AsyncCommand.is_cancelled",
        return_value=False,
    )
    def test_remote_import_full_import(
        self, is_cancelled_mock, start_progress_mock, import_channel_mock
    ):
        call_command("importchannel", "network", "197934f144305350b5820c7c4dd8e194")
        is_cancelled_mock.assert_called()
        import_channel_mock.assert_called_with(
            "197934f144305350b5820c7c4dd8e194", cancel_check=is_cancelled_mock
        )

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
        fd, local_path = tempfile.mkstemp()
        os.close(fd)
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
@patch("kolibri.core.content.management.commands.importcontent.get_import_export_data")
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
        get_import_export_mock,
        channel_list_status_mock,
    ):
        # Check behaviour if cancellation is called before any file download starts
        FileDownloadMock.return_value.__iter__.return_value = ["one", "two", "three"]
        get_import_export_mock.return_value = (
            1,
            list(LocalFile.objects.all().values("id", "file_size", "extension")),
            10,
        )
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
        side_effect=[False, False, False, True, True, True],
    )
    def test_remote_cancel_during_transfer(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileDownloadMock,
        local_path_mock,
        remote_path_mock,
        annotation_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        # If transfer is cancelled during transfer of first file
        fd, local_path = tempfile.mkstemp()
        os.close(fd)
        local_path_mock.return_value = local_path
        remote_path_mock.return_value = "notest"
        # Mock this __iter__ so that the filetransfer can be looped over
        FileDownloadMock.return_value.__iter__.side_effect = TransferCanceled()
        get_import_export_mock.return_value = (
            1,
            list(LocalFile.objects.all().values("id", "file_size", "extension")),
            10,
        )
        call_command("importcontent", "network", self.the_channel_id)
        # is_cancelled should be called thrice.
        is_cancelled_mock.assert_has_calls([call(), call()])
        # Should be set to the local path we mocked
        FileDownloadMock.assert_called_with(
            "notest", local_path, session=Any(Session), cancel_check=is_cancelled_mock
        )
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
        side_effect=[False, True, True],
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
        get_import_export_mock,
        channel_list_status_mock,
    ):
        # If transfer is cancelled after transfer of first file
        fd1, local_path_1 = tempfile.mkstemp()
        fd2, local_path_2 = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        with open(local_path_1, "w") as f:
            f.write("a")
        local_path_mock.side_effect = [local_path_1, local_path_2]
        remote_path_mock.return_value = "notest"
        # Mock this __iter__ so that the filetransfer can be looped over
        FileDownloadMock.return_value.__iter__.return_value = ["one", "two", "three"]
        FileDownloadMock.return_value.total_size = 1
        FileDownloadMock.return_value.dest = local_path_1
        LocalFile.objects.update(file_size=1)
        get_import_export_mock.return_value = (
            1,
            list(LocalFile.objects.all().values("id", "file_size", "extension")[:3]),
            10,
        )
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
        get_import_export_mock,
        channel_list_status_mock,
    ):
        # Local version of test above
        FileCopyMock.return_value.__iter__.return_value = ["one", "two", "three"]
        get_import_export_mock.return_value = (
            1,
            list(LocalFile.objects.all().values("id", "file_size", "extension")),
            10,
        )
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
        side_effect=[False, True, True],
    )
    def test_local_cancel_during_transfer(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileCopyMock,
        local_path_mock,
        annotation_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        # Local version of test above
        fd1, local_dest_path = tempfile.mkstemp()
        fd2, local_src_path = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        local_path_mock.side_effect = [local_dest_path, local_src_path]
        FileCopyMock.return_value.__iter__.side_effect = TransferCanceled()
        get_import_export_mock.return_value = (
            1,
            list(LocalFile.objects.all().values("id", "file_size", "extension")),
            10,
        )
        call_command("importcontent", "disk", self.the_channel_id, tempfile.mkdtemp())
        is_cancelled_mock.assert_has_calls([call(), call()])
        FileCopyMock.assert_called_with(
            local_src_path, local_dest_path, cancel_check=is_cancelled_mock
        )
        cancel_mock.assert_called_with()
        annotation_mock.set_content_visibility.assert_called()

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
        annotation_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        LocalFile.objects.filter(pk="6bdfea4a01830fdd4a585181c0b8068c").update(
            file_size=2201062
        )
        LocalFile.objects.filter(pk="211523265f53825b82f70ba19218a02e").update(
            file_size=336974
        )
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    pk__in=[
                        "6bdfea4a01830fdd4a585181c0b8068c",
                        "211523265f53825b82f70ba19218a02e",
                    ]
                )
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
        annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.management.commands.importcontent.logger.warning")
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path"
    )
    def test_remote_import_httperror_404(
        self,
        path_mock,
        logger_mock,
        annotation_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd1, local_dest_path_1 = tempfile.mkstemp()
        fd2, local_dest_path_2 = tempfile.mkstemp()
        fd3, local_dest_path_3 = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        os.close(fd3)
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
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    files__contentnode__pk="2b6926ed22025518a8b9da91745b51d3"
                ).values("id", "file_size", "extension")
            ),
            10,
        )

        node_id = ["2b6926ed22025518a8b9da91745b51d3"]
        call_command(
            "importcontent",
            "network",
            self.the_channel_id,
            node_ids=node_id,
            renderable_only=False,
        )
        logger_mock.assert_called_once()
        self.assertTrue("3 files are skipped" in logger_mock.call_args_list[0][0][0])
        annotation_mock.set_content_visibility.assert_called_with(
            self.the_channel_id,
            [],
            node_ids=node_id,
            exclude_node_ids=None,
            public=False,
        )

    @patch("kolibri.core.content.utils.transfer.Transfer.next")
    @patch("kolibri.core.content.utils.transfer.sleep")
    @patch("kolibri.core.content.utils.transfer.requests.Session.get")
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        side_effect=[False, False, True, True, True, True],
    )
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path",
        return_value="test/test",
    )
    def test_remote_import_httperror_502(
        self,
        content_storage_file_path_mock,
        is_cancelled_mock,
        cancel_mock,
        requests_get_mock,
        sleep_mock,
        transfer_next_mock,
        annotation_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        response_mock = MagicMock()
        response_mock.status_code = 502
        exception_502 = HTTPError("Bad Gateway", response=response_mock)
        requests_get_mock.return_value.raise_for_status.side_effect = exception_502
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        get_import_export_mock.return_value = (
            1,
            [LocalFile.objects.values("id", "file_size", "extension").first()],
            10,
        )
        call_command("importcontent", "network", self.the_channel_id)

        sleep_mock.assert_called_once()
        transfer_next_mock.assert_not_called()
        cancel_mock.assert_called_with()
        annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.utils.transfer.requests.Session.get")
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path",
        return_value="test/test",
    )
    def test_remote_import_httperror_500(
        self,
        content_storage_file_path_mock,
        requests_get_mock,
        annotation_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        response_mock = MagicMock()
        response_mock.status_code = 500
        exception_500 = HTTPError("Internal Server Error", response=response_mock)
        requests_get_mock.return_value.raise_for_status.side_effect = exception_500
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        get_import_export_mock.return_value = (
            1,
            list(LocalFile.objects.all().values("id", "file_size", "extension")),
            10,
        )
        with self.assertRaises(HTTPError):
            call_command("importcontent", "network", self.the_channel_id)
        annotation_mock.set_content_visibility.assert_called_with(
            self.the_channel_id, [], node_ids=None, exclude_node_ids=None, public=False
        )

    @patch("kolibri.core.content.management.commands.importcontent.get_free_space")
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
    def test_remote_import_no_space_at_first(
        self,
        is_cancelled_mock,
        path_mock,
        finalize_dest_mock,
        get_free_space_mock,
        annotation_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd1, dest_path_1 = tempfile.mkstemp()
        fd2, dest_path_2 = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        path_mock.side_effect = [dest_path_1, dest_path_2]
        LocalFile.objects.filter(pk="6bdfea4a01830fdd4a585181c0b8068c").update(
            file_size=2201062
        )
        LocalFile.objects.filter(pk="211523265f53825b82f70ba19218a02e").update(
            file_size=336974
        )
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    pk__in=[
                        "6bdfea4a01830fdd4a585181c0b8068c",
                        "211523265f53825b82f70ba19218a02e",
                    ]
                ).values("id", "file_size", "extension")
            ),
            10,
        )
        get_free_space_mock.return_value = 0
        with self.assertRaises(InsufficientStorageSpaceError):
            call_command("importcontent", "network", self.the_channel_id)

    @patch("kolibri.core.content.management.commands.importcontent.get_free_space")
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
    def test_remote_import_no_space_after_first_download(
        self,
        is_cancelled_mock,
        path_mock,
        finalize_dest_mock,
        get_free_space_mock,
        annotation_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd1, dest_path_1 = tempfile.mkstemp()
        fd2, dest_path_2 = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        path_mock.side_effect = [dest_path_1, dest_path_2]
        LocalFile.objects.filter(pk="6bdfea4a01830fdd4a585181c0b8068c").update(
            file_size=2201062
        )
        LocalFile.objects.filter(pk="211523265f53825b82f70ba19218a02e").update(
            file_size=336974
        )
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    pk__in=[
                        "6bdfea4a01830fdd4a585181c0b8068c",
                        "211523265f53825b82f70ba19218a02e",
                    ]
                ).values("id", "file_size", "extension")
            ),
            2201062 + 336974,
        )
        get_free_space_mock.side_effect = [100000000000, 0, 0, 0, 0, 0, 0]
        with self.assertRaises(InsufficientStorageSpaceError):
            call_command("importcontent", "network", self.the_channel_id)
        annotation_mock.set_content_visibility.assert_called_with(
            self.the_channel_id, [], exclude_node_ids=None, node_ids=None, public=False
        )

    @patch("kolibri.core.content.utils.transfer.sleep")
    @patch(
        "kolibri.core.content.utils.transfer.Transfer.next",
        side_effect=ChunkedEncodingError("Chunked Encoding Error"),
    )
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        side_effect=[False, False, False, True, True, True, True],
    )
    def test_remote_import_chunkedencodingerror(
        self,
        is_cancelled_mock,
        cancel_mock,
        error_mock,
        sleep_mock,
        annotation_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        LocalFile.objects.filter(pk="6bdfea4a01830fdd4a585181c0b8068c").update(
            file_size=2201062
        )
        LocalFile.objects.filter(pk="211523265f53825b82f70ba19218a02e").update(
            file_size=336974
        )
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    pk__in=[
                        "6bdfea4a01830fdd4a585181c0b8068c",
                        "211523265f53825b82f70ba19218a02e",
                    ]
                ).values("id", "file_size", "extension")
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
        annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.management.commands.importcontent.logger.warning")
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path"
    )
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        side_effect=[False, True],
    )
    def test_local_import_oserror_dne(
        self,
        is_cancelled_mock,
        cancel_mock,
        path_mock,
        logger_mock,
        annotation_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd, dest_path = tempfile.mkstemp()
        os.close(fd)
        path_mock.side_effect = [dest_path, "/test/dne"]
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        get_import_export_mock.return_value = (
            1,
            [LocalFile.objects.values("id", "file_size", "extension").first()],
            10,
        )
        call_command("importcontent", "disk", self.the_channel_id, "destination")
        self.assertTrue("1 files are skipped" in logger_mock.call_args_list[0][0][0])
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
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd, dest_path = tempfile.mkstemp()
        os.close(fd)
        path_mock.side_effect = [dest_path, "/test/dne"]
        getsize_mock.side_effect = ["1", OSError("Permission denied")]
        get_import_export_mock.return_value = (
            1,
            [LocalFile.objects.values("id", "file_size", "extension").first()],
            10,
        )
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
        side_effect=[False, False, True, True, True],
    )
    def test_local_import_source_corrupted(
        self,
        is_cancelled_mock,
        cancel_mock,
        path_mock,
        isfile_mock,
        remove_mock,
        annotation_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd1, local_dest_path = tempfile.mkstemp()
        fd2, local_src_path = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        LocalFile.objects.filter(
            files__contentnode="32a941fb77c2576e8f6b294cde4c3b0c"
        ).update(file_size=1)
        path_mock.side_effect = [local_dest_path, local_src_path]
        get_import_export_mock.return_value = (
            1,
            [
                LocalFile.objects.filter(
                    files__contentnode="32a941fb77c2576e8f6b294cde4c3b0c"
                )
                .values("id", "file_size", "extension")
                .first()
            ],
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
        remove_mock.assert_any_call(local_dest_path)

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
        get_import_export_mock,
        channel_list_status_mock,
    ):
        """
        Ensure that when a file is imported that does not match the file size in the database
        that the overall progress tracking for the content import process is properly updated
        to reflect the size of the file in the database, not the file on disk.
        This is important, as the total progress for the overall process is measured against
        the total file size recorded in the database for all files, not for the
        transferred file size.
        """
        local_src_path = tempfile.mkstemp()[1]
        with open(local_src_path, "w") as f:
            f.write("This is just a test")
        expected_file_size = 10000
        fd, local_dest_path = tempfile.mkstemp()
        os.close(fd)
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
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    files__contentnode="32a941fb77c2576e8f6b294cde4c3b0c"
                ).values("id", "file_size", "extension")
            ),
            10,
        )
        path_mock.side_effect = [local_dest_path, local_src_path]
        mock_overall_progress = MagicMock()
        with patch(
            "kolibri.core.tasks.management.commands.base.ProgressTracker"
        ) as progress_mock:
            progress_mock.return_value.update_progress = mock_overall_progress
            call_command(
                "importcontent",
                "disk",
                self.the_channel_id,
                "destination",
                node_ids=["32a941fb77c2576e8f6b294cde4c3b0c"],
            )

            mock_overall_progress.assert_any_call(expected_file_size)

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
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd1, dest_path_1 = tempfile.mkstemp()
        fd2, dest_path_2 = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        path_mock.side_effect = [dest_path_1, dest_path_2]
        LocalFile.objects.filter(pk="6bdfea4a01830fdd4a585181c0b8068c").update(
            file_size=2201062
        )
        LocalFile.objects.filter(pk="211523265f53825b82f70ba19218a02e").update(
            file_size=336974
        )
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    pk__in=[
                        "6bdfea4a01830fdd4a585181c0b8068c",
                        "211523265f53825b82f70ba19218a02e",
                    ]
                ).values("id", "file_size", "extension")
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
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd1, dest_path_1 = tempfile.mkstemp()
        fd2, dest_path_2 = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        path_mock.side_effect = [dest_path_1, dest_path_2]
        LocalFile.objects.filter(pk="6bdfea4a01830fdd4a585181c0b8068c").update(
            file_size=2201062
        )
        LocalFile.objects.filter(pk="211523265f53825b82f70ba19218a02e").update(
            file_size=336974
        )
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    pk__in=[
                        "6bdfea4a01830fdd4a585181c0b8068c",
                        "211523265f53825b82f70ba19218a02e",
                    ]
                ).values("id", "file_size", "extension")
            ),
            10,
        )
        call_command("importcontent", "network", self.the_channel_id)
        annotation_mock.set_content_visibility.assert_called_with(
            self.the_channel_id, [], exclude_node_ids=None, node_ids=None, public=False
        )

    @patch("kolibri.core.content.utils.transfer.sleep")
    @patch("kolibri.core.content.utils.transfer.Transfer.next")
    @patch("kolibri.core.content.utils.transfer.requests.Session.get")
    @patch(
        "kolibri.core.content.management.commands.importcontent.paths.get_content_storage_file_path",
        return_value="test/test",
    )
    @patch("kolibri.core.content.management.commands.importcontent.AsyncCommand.cancel")
    @patch(
        "kolibri.core.content.management.commands.importcontent.AsyncCommand.is_cancelled",
        # We have to return False for 30 1-second checks to ensure we actually retry.
        side_effect=[False] * 32 + [True] * 5,
    )
    def test_remote_import_file_compressed_on_gcs(
        self,
        is_cancelled_mock,
        cancel_mock,
        content_storage_file_path_mock,
        requests_get_mock,
        transfer_next_mock,
        sleep_mock,
        annotation_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        response_mock = MagicMock()
        response_mock.status_code = 503
        exception_503 = HTTPError("Service Unavailable", response=response_mock)
        transfer_next_mock.side_effect = exception_503
        requests_get_mock.return_value.headers = {"X-Goog-Stored-Content-Length": "1"}
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        get_import_export_mock.return_value = (
            1,
            [LocalFile.objects.values("id", "file_size", "extension").first()],
            10,
        )

        m = mock_open()
        with patch("kolibri.core.content.utils.transfer.open", m) as open_mock:
            call_command("importcontent", "network", self.the_channel_id)
            # Check if truncate() is called since byte-range file resuming is not supported
            open_mock.assert_called_with("test/test.transfer", "wb")
            open_mock.return_value.truncate.assert_called_once()
            sleep_mock.assert_called()
            annotation_mock.set_content_visibility.assert_called_with(
                self.the_channel_id,
                [],
                node_ids=None,
                exclude_node_ids=None,
                public=False,
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
        fd1, local_dest_path = tempfile.mkstemp()
        fd2, local_src_path = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        local_path_mock.side_effect = [local_src_path, local_dest_path]
        FileCopyMock.return_value.__iter__.side_effect = TransferCanceled()
        call_command("exportchannel", self.the_channel_id, local_dest_path)
        is_cancelled_mock.assert_called_with()
        FileCopyMock.assert_called_with(
            local_src_path, local_dest_path, cancel_check=is_cancelled_mock
        )
        cancel_mock.assert_called_with()
        self.assertFalse(os.path.exists(local_dest_path))


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
@patch("kolibri.core.content.management.commands.exportcontent.get_import_export_data")
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
        self,
        is_cancelled_mock,
        cancel_mock,
        FileCopyMock,
        get_import_export_mock,
    ):
        # If cancel comes in before we do anything, make sure nothing happens!
        FileCopyMock.return_value.__iter__.side_effect = TransferCanceled()
        get_import_export_mock.return_value = (
            1,
            [LocalFile.objects.values("id", "file_size", "extension").first()],
            10,
        )
        call_command("exportcontent", self.the_channel_id, tempfile.mkdtemp())
        is_cancelled_mock.assert_has_calls([call()])
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
        side_effect=[False, True, True],
    )
    def test_local_cancel_during_transfer(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileCopyMock,
        local_path_mock,
        start_progress_mock,
        get_import_export_mock,
    ):
        # Make sure we cancel during transfer
        fd1, local_dest_path = tempfile.mkstemp()
        fd2, local_src_path = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        local_path_mock.side_effect = [local_src_path, local_dest_path]
        FileCopyMock.return_value.__iter__.side_effect = TransferCanceled()
        get_import_export_mock.return_value = (
            1,
            [LocalFile.objects.values("id", "file_size", "extension").first()],
            10,
        )
        call_command("exportcontent", self.the_channel_id, tempfile.mkdtemp())
        is_cancelled_mock.assert_has_calls([call(), call()])
        FileCopyMock.assert_called_with(
            local_src_path, local_dest_path, cancel_check=is_cancelled_mock
        )
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
        _, files_to_transfer, _ = get_import_export_data(
            root_node.channel_id, [node1.id], [node2.id], False, renderable_only=False
        )
        self.assertEqual(
            len(list(filter(lambda x: x["id"] == local_file.id, files_to_transfer))), 1
        )

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
        _, files_to_transfer, _ = get_import_export_data(
            self.the_channel_id, [], [], False, renderable_only=True, drive_id="1"
        )
        self.assertEqual(
            len(files_to_transfer),
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
        _, files_to_transfer, _ = get_import_export_data(
            self.the_channel_id, [], [], False, renderable_only=False, drive_id="1"
        )
        self.assertEqual(
            len(files_to_transfer), LocalFile.objects.filter(available=False).count()
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
        _, files_to_transfer, _ = get_import_export_data(
            self.the_channel_id, [], [], False, renderable_only=False, drive_id="1"
        )
        self.assertEqual(len(files_to_transfer), obj.files.count())

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
        _, files_to_transfer, _ = get_import_export_data(
            self.the_channel_id,
            [parent.id],
            [],
            False,
            renderable_only=False,
            drive_id="1",
        )
        self.assertEqual(len(files_to_transfer), obj.files.count())

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_disk"
    )
    def test_no_nodes_present_disk(self, channel_stats_mock):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        stats = {}
        channel_stats_mock.return_value = stats
        _, files_to_transfer, _ = get_import_export_data(
            self.the_channel_id, [], [], False, renderable_only=False, drive_id="1"
        )
        self.assertEqual(len(files_to_transfer), 0)

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
        _, files_to_transfer, _ = get_import_export_data(
            self.the_channel_id, [], [], False, renderable_only=False, peer_id="1"
        )
        self.assertEqual(
            len(files_to_transfer), LocalFile.objects.filter(available=False).count()
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
        _, files_to_transfer, _ = get_import_export_data(
            self.the_channel_id, [], [], False, renderable_only=False, peer_id="1"
        )
        self.assertEqual(len(files_to_transfer), obj.files.count())

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_peer"
    )
    def test_no_nodes_present_peer(self, channel_stats_mock):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        stats = {}
        channel_stats_mock.return_value = stats
        _, files_to_transfer, _ = get_import_export_data(
            self.the_channel_id, [], [], False, renderable_only=False, peer_id="1"
        )
        self.assertEqual(len(files_to_transfer), 0)
