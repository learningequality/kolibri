import itertools
import json
import os
import sys
import tempfile
import time
import uuid
from io import StringIO

from django.core.management import call_command
from django.core.management import CommandError
from django.db.models import Q
from django.test import TestCase
from le_utils.constants import content_kinds
from mock import call
from mock import MagicMock
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
from kolibri.core.content.utils import paths
from kolibri.core.content.utils.content_types_tools import (
    renderable_contentnodes_q_filter,
)
from kolibri.core.content.utils.import_export_content import get_content_nodes_data
from kolibri.core.content.utils.import_export_content import get_import_export_data
from kolibri.core.content.utils.import_export_content import get_import_export_nodes
from kolibri.core.content.utils.resource_import import DiskChannelResourceImportManager
from kolibri.core.content.utils.resource_import import (
    RemoteChannelResourceImportManager,
)
from kolibri.core.device.models import ContentCacheKey
from kolibri.utils.file_transfer import Transfer
from kolibri.utils.file_transfer import TransferCanceled
from kolibri.utils.file_transfer import TransferFailed
from kolibri.utils.tests.helpers import override_option

# helper class for mocking that is equal to anything


def Any(cls):
    class Any(cls):
        def __eq__(self, other):
            return True

    return Any()


class FalseThenTrue(object):
    def __init__(self, times=1):
        self.times = times
        self.count = 0

    def __call__(self):
        self.count += 1
        if self.count > self.times:
            return True
        return False


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class GetImportExportDataTestCase(TestCase):
    """
    Test case for utils.import_export_content.get_import_export_data
    """

    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    @patch("kolibri.core.content.utils.import_export_content.get_import_export_nodes")
    @patch("kolibri.core.content.utils.import_export_content.get_content_nodes_data")
    def test_default_arguments(
        self,
        get_content_nodes_data_mock,
        get_import_export_nodes_mock,
    ):
        get_import_export_data(self.the_channel_id)
        get_content_nodes_data_mock.assert_called_with(
            self.the_channel_id,
            get_import_export_nodes_mock.return_value,
            available=None,
            topic_thumbnails=True,
            all_thumbnails=False,
        )


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class GetImportExportNodesTestCase(TestCase):
    """
    Test case for utils.import_export_content.get_import_export_nodes
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    c1_node_id = "32a941fb77c2576e8f6b294cde4c3b0c"
    c2_node_id = "2e8bac07947855369fe2d77642dfc870"
    c2c1_node_id = "2b6926ed22025518a8b9da91745b51d3"
    c2c2_node_id = "4d0c890de9b65d6880ccfa527800e0f4"
    c2c3_node_id = "b391bfeec8a458f89f013cf1ca9cf33a"

    def test_default_arguments(self):
        expected_content_nodes = list(
            ContentNode.objects.filter(channel_id=self.the_channel_id)
            .filter(renderable_contentnodes_q_filter)
            .exclude(kind=content_kinds.TOPIC)
            .distinct()
        )

        matched_nodes_queries_list = get_import_export_nodes(self.the_channel_id)

        self.assertCountEqual(
            itertools.chain.from_iterable(matched_nodes_queries_list),
            expected_content_nodes,
        )

    def test_available_only(self):
        expected_content_nodes = list(
            ContentNode.objects.filter(
                channel_id=self.the_channel_id, available=True
            ).exclude(kind=content_kinds.TOPIC)
        )

        matched_nodes_queries_list = get_import_export_nodes(
            self.the_channel_id, renderable_only=False, available=True
        )

        self.assertCountEqual(
            itertools.chain.from_iterable(matched_nodes_queries_list),
            expected_content_nodes,
        )

    def test_with_node_ids(self):
        expected_content_nodes = list(
            ContentNode.objects.filter(
                channel_id=self.the_channel_id,
                available=True,
            )
            .filter(Q(parent=self.c2_node_id) | Q(pk=self.c1_node_id))
            .exclude(kind=content_kinds.TOPIC)
        )

        matched_nodes_queries_list = get_import_export_nodes(
            self.the_channel_id,
            renderable_only=False,
            node_ids={
                self.c2_node_id,
                self.c1_node_id,
            },
        )

        self.assertCountEqual(
            itertools.chain.from_iterable(matched_nodes_queries_list),
            expected_content_nodes,
        )

    def test_with_node_ids_and_exclude_node_ids(self):
        expected_content_nodes = list(
            ContentNode.objects.filter(
                channel_id=self.the_channel_id,
                available=True,
            )
            .filter(Q(parent=self.c2_node_id) | Q(pk=self.c1_node_id))
            .exclude(pk=self.c2c3_node_id)
            .exclude(kind=content_kinds.TOPIC)
        )

        matched_nodes_queries_list = get_import_export_nodes(
            self.the_channel_id,
            renderable_only=False,
            node_ids={
                self.c2_node_id,
                self.c1_node_id,
            },
            exclude_node_ids={self.c2c3_node_id},
        )

        self.assertCountEqual(
            itertools.chain.from_iterable(matched_nodes_queries_list),
            expected_content_nodes,
        )

    def test_with_node_ids_equals_exclude_node_ids(self):
        expected_content_nodes = []

        matched_nodes_queries_list = get_import_export_nodes(
            self.the_channel_id,
            renderable_only=False,
            node_ids={self.c1_node_id},
            exclude_node_ids={self.c1_node_id},
        )

        self.assertCountEqual(
            itertools.chain.from_iterable(matched_nodes_queries_list),
            expected_content_nodes,
        )

    def test_with_node_ids_none(self):
        expected_content_nodes = list(
            ContentNode.objects.filter(
                channel_id=self.the_channel_id,
                available=True,
            ).exclude(kind=content_kinds.TOPIC)
        )

        matched_nodes_queries_list = get_import_export_nodes(
            self.the_channel_id,
            renderable_only=False,
            node_ids=None,
            exclude_node_ids=None,
        )

        self.assertCountEqual(
            itertools.chain.from_iterable(matched_nodes_queries_list),
            expected_content_nodes,
        )

    def test_with_node_ids_empty(self):
        expected_content_nodes = []

        matched_nodes_queries_list = get_import_export_nodes(
            self.the_channel_id,
            renderable_only=False,
            node_ids=set(),
            exclude_node_ids=None,
        )

        self.assertCountEqual(
            itertools.chain.from_iterable(matched_nodes_queries_list),
            expected_content_nodes,
        )

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_disk"
    )
    def test_with_drive_id(self, get_channel_stats_from_disk_mock):
        content_nodes_on_drive_1 = [
            self.c2c1_node_id,
            self.c2c2_node_id,
        ]

        # get_import_export_nodes calls filter_by_file_availability, which
        # uses get_channel_stats_from_disk to get a list of content nodes
        # present on a device.
        get_channel_stats_from_disk_mock.return_value = {
            key: {} for key in content_nodes_on_drive_1
        }

        expected_content_nodes = list(
            ContentNode.objects.filter(
                channel_id=self.the_channel_id,
                available=True,
                pk__in=content_nodes_on_drive_1,
            ).exclude(kind=content_kinds.TOPIC)
        )

        matched_nodes_queries_list = get_import_export_nodes(
            self.the_channel_id, renderable_only=False, drive_id="1"
        )

        get_channel_stats_from_disk_mock.assert_called_with(self.the_channel_id, "1")

        self.assertCountEqual(
            itertools.chain.from_iterable(matched_nodes_queries_list),
            expected_content_nodes,
        )


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class GetContentNodesDataTestCase(TestCase):
    """
    Test case for utils.import_export_content.get_content_nodes_data
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    c1_node_id = "32a941fb77c2576e8f6b294cde4c3b0c"
    c2c1_node_id = "2b6926ed22025518a8b9da91745b51d3"

    def test_default_arguments(self):
        (total_resource_count, files, total_bytes_to_transfer) = get_content_nodes_data(
            self.the_channel_id, [], available=True
        )

        self.assertEqual(total_resource_count, 0)
        self.assertCountEqual(files, [])
        self.assertEqual(total_bytes_to_transfer, 0)

    def test_with_content_nodes_selected(self):
        include_node_ids = [
            self.c1_node_id,
            self.c2c1_node_id,
        ]

        expected_files_list = [
            {
                "id": "4c30dc7619f74f97ae2ccd4fffd09bf2",
                "file_size": None,
                "extension": "mp3",
            },
            {
                "id": "8ad3fffedf144cba9492e16daec1e39a",
                "file_size": None,
                "extension": "vtt",
            },
            {
                "id": "6bdfea4a01830fdd4a585181c0b8068c",
                "file_size": None,
                "extension": "mp4",
            },
            {
                "id": "211523265f53825b82f70ba19218a02e",
                "file_size": None,
                "extension": "mp4",
            },
            {
                "id": "2cea0feba5f930c81661c5c759943964",
                "file_size": 1,
                "extension": "jpeg",
            },
            {
                "id": "5437c68903de934521128d7656a3b572",
                "file_size": 1,
                "extension": "jpeg",
            },
            {
                "id": "2318e5a9d6a24ae8f96e9110006e0c53",
                "file_size": 1,
                "extension": "png",
            },
        ]

        selected_content_nodes = ContentNode.objects.filter(
            channel_id=self.the_channel_id, pk__in=include_node_ids
        ).exclude(kind=content_kinds.TOPIC)

        (total_resource_count, files, total_bytes_to_transfer) = get_content_nodes_data(
            self.the_channel_id, [selected_content_nodes], available=True
        )

        self.assertEqual(total_resource_count, 2)
        self.assertCountEqual(files, expected_files_list)
        self.assertEqual(total_bytes_to_transfer, 3)

    def test_selected_content_nodes_all_thumbnails(self):
        expected_files_list = [
            {
                "id": "4c30dc7619f74f97ae2ccd4fffd09bf2",
                "file_size": None,
                "extension": "mp3",
            },
            {
                "id": "8ad3fffedf144cba9492e16daec1e39a",
                "file_size": None,
                "extension": "vtt",
            },
            {
                "id": "2cea0feba5f930c81661c5c759943964",
                "file_size": 1,
                "extension": "jpeg",
            },
            {
                "id": "5437c68903de934521128d7656a3b572",
                "file_size": 1,
                "extension": "jpeg",
            },
            {
                "id": "2318e5a9d6a24ae8f96e9110006e0c53",
                "file_size": 1,
                "extension": "png",
            },
            {
                "id": "37c5c250fbc66e597ae7d604846e9df2",
                "file_size": 1,
                "extension": "png",
            },
            {
                "id": "c6f26814b067da30e1cb6239512dc1da",
                "file_size": 1,
                "extension": "png",
            },
        ]

        selected_content_nodes = ContentNode.objects.filter(
            channel_id=self.the_channel_id, pk=self.c2c1_node_id
        ).exclude(kind=content_kinds.TOPIC)

        (total_resource_count, files, total_bytes_to_transfer) = get_content_nodes_data(
            self.the_channel_id,
            [selected_content_nodes],
            available=True,
            all_thumbnails=True,
        )

        self.assertEqual(total_resource_count, 1)
        self.assertCountEqual(files, expected_files_list)
        self.assertEqual(total_bytes_to_transfer, 5)

    def test_only_thumbnails(self):
        expected_files_list = [
            {
                "id": "2cea0feba5f930c81661c5c759943964",
                "file_size": 1,
                "extension": "jpeg",
            },
            {
                "id": "5437c68903de934521128d7656a3b572",
                "file_size": 1,
                "extension": "jpeg",
            },
            {
                "id": "2318e5a9d6a24ae8f96e9110006e0c53",
                "file_size": 1,
                "extension": "png",
            },
            {
                "id": "37c5c250fbc66e597ae7d604846e9df2",
                "file_size": 1,
                "extension": "png",
            },
            {
                "id": "c6f26814b067da30e1cb6239512dc1da",
                "file_size": 1,
                "extension": "png",
            },
        ]

        (total_resource_count, files, total_bytes_to_transfer) = get_content_nodes_data(
            self.the_channel_id,
            [],
            available=True,
            all_thumbnails=True,
        )

        self.assertEqual(total_resource_count, 0)
        self.assertCountEqual(files, expected_files_list)
        self.assertEqual(total_bytes_to_transfer, 5)

    def test_empty_query(self):
        (total_resource_count, files, total_bytes_to_transfer) = get_content_nodes_data(
            self.the_channel_id, [ContentNode.objects.none()], available=True
        )

        self.assertEqual(total_resource_count, 0)
        self.assertCountEqual(files, [])
        self.assertEqual(total_bytes_to_transfer, 0)


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
        "kolibri.core.content.management.commands.importchannel.AsyncCommand.check_for_cancel",
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
        FileDownloadMock.return_value.run.side_effect = TransferCanceled()
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
        "kolibri.core.content.management.commands.importchannel.AsyncCommand.check_for_cancel",
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
        FileCopyMock.return_value.run.side_effect = TransferCanceled()
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

    @patch(
        "kolibri.core.content.management.commands.importchannel.AsyncCommand.check_for_cancel"
    )
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
            "kolibri.utils.file_transfer.FileDownload._run_download",
            side_effect=SSLERROR,
        ):
            call_command("importchannel", "network", "197934f144305350b5820c7c4dd8e194")
            cancel_mock.assert_called_with()
            import_channel_mock.assert_not_called()

    @patch(
        "kolibri.utils.file_transfer.FileDownload._run_download",
        side_effect=ReadTimeout("Read timed out."),
    )
    @patch(
        "kolibri.core.content.management.commands.importchannel.AsyncCommand.check_for_cancel"
    )
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
        "kolibri.core.content.management.commands.importchannel.transfer.FileDownload"
    )
    @patch(
        "kolibri.core.content.management.commands.importchannel.AsyncCommand.is_cancelled",
        return_value=False,
    )
    def test_remote_import_full_import(
        self,
        is_cancelled_mock,
        FileDownloadMock,
        start_progress_mock,
        import_channel_mock,
    ):
        # Get the current content cache key and sleep a bit to ensure
        # time has elapsed before it's updated.
        cache_key_before = ContentCacheKey.get_cache_key()
        time.sleep(0.01)

        call_command("importchannel", "network", "197934f144305350b5820c7c4dd8e194")
        is_cancelled_mock.assert_called()
        import_channel_mock.assert_called_with(
            "197934f144305350b5820c7c4dd8e194",
            cancel_check=is_cancelled_mock,
            contentfolder=paths.get_content_dir_path(),
        )

        # Check that the content cache key was updated.
        cache_key_after = ContentCacheKey.get_cache_key()
        self.assertNotEqual(cache_key_before, cache_key_after)

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
        import_channel_mock.return_value = True
        call_command("importchannel", "network", self.the_channel_id)
        self.assertTrue(channel_stats_clear_mock.called)


@patch(
    "kolibri.core.content.utils.resource_import.lookup_channel_listing_status",
    return_value=False,
)
@patch("kolibri.core.content.utils.resource_import.get_import_export_data")
@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class ImportContentTestCase(TestCase):
    """
    Test case for the importcontent management command.
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"
    the_channel_version = 0

    c1_node_id = "32a941fb77c2576e8f6b294cde4c3b0c"
    c2c1_node_id = "2b6926ed22025518a8b9da91745b51d3"
    c2c2_node_id = "4d0c890de9b65d6880ccfa527800e0f4"

    def setUp(self):
        LocalFile.objects.update(available=False)
        patcher = patch("kolibri.core.content.utils.resource_import.annotation")
        self.addCleanup(patcher.stop)
        self.annotation_mock = patcher.start()
        self.annotation_mock.calculate_dummy_progress_for_annotation.return_value = 1

    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.check_for_cancel"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        return_value=True,
    )
    def test_remote_cancel_immediately(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileDownloadMock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        get_import_export_mock.return_value = (
            1,
            [LocalFile.objects.all().values("id", "file_size", "extension").first()],
            10,
        )
        manager = RemoteChannelResourceImportManager(
            self.the_channel_id,
        )
        manager.run()
        is_cancelled_mock.assert_has_calls([call()])
        FileDownloadMock.assert_not_called()
        cancel_mock.assert_called_with()
        self.annotation_mock.mark_local_files_as_available.assert_not_called()
        self.annotation_mock.set_leaf_node_availability_from_local_file_availability.assert_not_called()
        self.annotation_mock.recurse_annotation_up_tree.assert_not_called()

    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_remote_url"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.check_for_cancel"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        side_effect=FalseThenTrue(times=3),
    )
    def test_remote_cancel_during_transfer(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileDownloadMock,
        local_path_mock,
        remote_path_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        # If transfer is cancelled during transfer of first file
        fd, local_path = tempfile.mkstemp()
        os.close(fd)
        local_path_mock.return_value = local_path
        remote_path_mock.return_value = "notest"
        FileDownloadMock.return_value.run.side_effect = TransferCanceled()
        get_import_export_mock.return_value = (
            1,
            [LocalFile.objects.all().values("id", "file_size", "extension").first()],
            10,
        )
        manager = RemoteChannelResourceImportManager(
            self.the_channel_id,
        )
        manager.run()
        # is_cancelled should be called twice.
        is_cancelled_mock.assert_has_calls([call(), call()])
        # Should be set to the local path we mocked
        FileDownloadMock.assert_called_with(
            "notest",
            local_path,
            LocalFile.objects.all()
            .values("id", "file_size", "extension")
            .first()["id"],
            session=Any(Session),
            cancel_check=is_cancelled_mock,
            timeout=Transfer.DEFAULT_TIMEOUT,
        )
        # Check that the command itself was also cancelled.
        cancel_mock.assert_called_with()
        self.annotation_mock.mark_local_files_as_available.assert_not_called()
        self.annotation_mock.set_leaf_node_availability_from_local_file_availability.assert_not_called()
        self.annotation_mock.recurse_annotation_up_tree.assert_not_called()

    @patch(
        "kolibri.core.content.utils.resource_import.transfer.Transfer._checksum_correct",
        return_value=True,
    )
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_remote_url"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.check_for_cancel"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        side_effect=FalseThenTrue(times=3),
    )
    def test_remote_cancel_after_file_copy_file_not_deleted(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileDownloadMock,
        local_path_mock,
        remote_path_mock,
        checksum_mock,
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
        FileDownloadMock.return_value.transfer_size = 1
        FileDownloadMock.return_value.dest = local_path_1
        LocalFile.objects.update(file_size=1)
        get_import_export_mock.return_value = (
            1,
            list(LocalFile.objects.all().values("id", "file_size", "extension")[:3]),
            10,
        )
        manager = RemoteChannelResourceImportManager(
            self.the_channel_id,
        )
        manager.run()
        # Check that the command itself was also cancelled.
        cancel_mock.assert_called_with()
        # Check that the temp file we created where the first file was being downloaded to has not been deleted
        self.assertTrue(os.path.exists(local_path_1))
        self.annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.utils.resource_import.transfer.FileCopy")
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.check_for_cancel"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        return_value=True,
    )
    def test_local_cancel_immediately(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileCopyMock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        # Local version of test above
        get_import_export_mock.return_value = (
            1,
            list(LocalFile.objects.all().values("id", "file_size", "extension")),
            10,
        )
        manager = DiskChannelResourceImportManager(
            self.the_channel_id,
            path=tempfile.mkdtemp(),
        )
        manager.run()
        is_cancelled_mock.assert_has_calls([call()])
        FileCopyMock.assert_not_called()
        cancel_mock.assert_called_with()
        self.annotation_mock.mark_local_files_as_available.assert_not_called()
        self.annotation_mock.set_leaf_node_availability_from_local_file_availability.assert_not_called()
        self.annotation_mock.recurse_annotation_up_tree.assert_not_called()

    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    @patch("kolibri.core.content.utils.resource_import.transfer.FileCopy")
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.check_for_cancel"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        side_effect=FalseThenTrue(times=3),
    )
    def test_local_cancel_during_transfer(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileCopyMock,
        local_path_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        # Local version of test above
        fd1, local_dest_path = tempfile.mkstemp()
        fd2, local_src_path = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        local_path_mock.side_effect = [local_dest_path, local_src_path] * 10
        FileCopyMock.return_value.run.side_effect = TransferCanceled()
        get_import_export_mock.return_value = (
            1,
            [LocalFile.objects.all().values("id", "file_size", "extension").first()],
            10,
        )
        manager = DiskChannelResourceImportManager(
            self.the_channel_id,
            path=tempfile.mkdtemp(),
        )
        manager.run()
        is_cancelled_mock.assert_has_calls([call()])
        FileCopyMock.assert_called_with(
            local_src_path,
            local_dest_path,
            LocalFile.objects.all()
            .values("id", "file_size", "extension")
            .first()["id"],
            cancel_check=is_cancelled_mock,
        )
        cancel_mock.assert_called_with()
        self.annotation_mock.set_content_visibility.assert_called()

    @patch(
        "kolibri.utils.file_transfer.FileDownload._run_download",
        side_effect=ConnectionError("connection error"),
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.check_for_cancel"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        side_effect=FalseThenTrue(times=3),
    )
    def test_remote_cancel_during_connect_error(
        self,
        is_cancelled_mock,
        cancel_mock,
        run_mock,
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
        manager = RemoteChannelResourceImportManager(
            self.the_channel_id, node_ids=[self.c1_node_id]
        )
        manager.run()
        cancel_mock.assert_called_with()
        self.annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.utils.resource_import.logger.warning")
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    def test_remote_import_httperror_404(
        self,
        path_mock,
        logger_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd1, local_dest_path_1 = tempfile.mkstemp()
        fd2, local_dest_path_2 = tempfile.mkstemp()
        fd3, local_dest_path_3 = tempfile.mkstemp()
        fd4, local_dest_path_4 = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        os.close(fd3)
        os.close(fd4)
        path_mock.side_effect = [
            local_dest_path_1,
            local_dest_path_2,
            local_dest_path_3,
            local_dest_path_4,
        ]
        ContentNode.objects.filter(pk=self.c2c1_node_id).update(available=False)
        LocalFile.objects.filter(files__contentnode__pk=self.c2c1_node_id).update(
            file_size=1, available=False
        )
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    files__contentnode__pk=self.c2c1_node_id
                ).values("id", "file_size", "extension")
            ),
            10,
        )

        node_id = [self.c2c1_node_id]
        manager = RemoteChannelResourceImportManager(
            self.the_channel_id, node_ids=node_id, renderable_only=False
        )
        manager.run()
        logger_mock.assert_called_once()
        self.assertIn("4 files are skipped", logger_mock.call_args_list[0][0][0])
        self.annotation_mock.set_content_visibility.assert_called_with(
            self.the_channel_id,
            [],
            node_ids={self.c2c1_node_id},
            exclude_node_ids=None,
            public=False,
            admin_imported=True,
        )

    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    def test_remote_import_httperror_500(
        self,
        file_download_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        response_mock = MagicMock()
        response_mock.status_code = 500
        exception_500 = HTTPError("Internal Server Error", response=response_mock)
        file_download_mock.return_value.run.side_effect = exception_500
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        get_import_export_mock.return_value = (
            1,
            list(LocalFile.objects.all().values("id", "file_size", "extension")),
            10,
        )
        with self.assertRaises(HTTPError):
            manager = RemoteChannelResourceImportManager(self.the_channel_id)
            manager.run()
        self.annotation_mock.set_content_visibility.assert_called_with(
            self.the_channel_id,
            [],
            node_ids=None,
            exclude_node_ids=None,
            public=False,
            admin_imported=True,
        )

    @patch("kolibri.core.content.utils.resource_import.get_free_space")
    @patch(
        "kolibri.core.content.utils.resource_import.transfer.FileDownload._move_tmp_to_dest"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        return_value=False,
    )
    def test_remote_import_no_space_at_first(
        self,
        is_cancelled_mock,
        path_mock,
        move_dest_mock,
        get_free_space_mock,
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
            manager = RemoteChannelResourceImportManager(self.the_channel_id)
            manager.run()

    @patch("kolibri.core.content.utils.resource_import.get_free_space")
    @patch(
        "kolibri.core.content.utils.resource_import.transfer.FileDownload._move_tmp_to_dest"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        return_value=False,
    )
    def test_remote_import_no_space_after_first_download(
        self,
        is_cancelled_mock,
        path_mock,
        _move_tmp_to_dest_mock,
        get_free_space_mock,
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
                    # Use explicit order by to make sure the first item in the pk list
                    # is returned first.
                )
                .values("id", "file_size", "extension")
                .order_by("-id")
            ),
            2201062 + 336974,
        )
        get_free_space_mock.side_effect = [100000000000, 0, 0, 0, 0, 0, 0]
        with self.assertRaises(InsufficientStorageSpaceError):
            manager = RemoteChannelResourceImportManager(self.the_channel_id)
            manager.run()
        self.annotation_mock.set_content_visibility.assert_called_with(
            self.the_channel_id,
            ["6bdfea4a01830fdd4a585181c0b8068c"],
            exclude_node_ids=None,
            node_ids=None,
            public=False,
            admin_imported=True,
        )

    @patch("kolibri.utils.file_transfer.sleep")
    @patch(
        "kolibri.utils.file_transfer.FileDownload._run_download",
        side_effect=ChunkedEncodingError("Chunked Encoding Error"),
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.check_for_cancel"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        side_effect=FalseThenTrue(times=6),
    )
    def test_remote_import_chunkedencodingerror(
        self,
        is_cancelled_mock,
        cancel_mock,
        error_mock,
        sleep_mock,
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
        manager = RemoteChannelResourceImportManager(
            self.the_channel_id, node_ids=[self.c1_node_id]
        )
        manager.run()
        cancel_mock.assert_called_with()
        self.annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.utils.resource_import.logger.warning")
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.check_for_cancel"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        side_effect=FalseThenTrue(times=3),
    )
    def test_local_import_oserror_dne(
        self,
        is_cancelled_mock,
        cancel_mock,
        path_mock,
        logger_mock,
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
        manager = DiskChannelResourceImportManager(
            self.the_channel_id, path="destination"
        )
        manager.run()
        self.assertIn("1 files are skipped", logger_mock.call_args_list[0][0][0])
        self.annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.utils.resource_import.logger.error")
    @patch("kolibri.utils.file_transfer.os.path.getsize")
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    def test_local_import_oserror_permission_denied(
        self,
        path_mock,
        getsize_mock,
        logger_mock,
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
            manager = DiskChannelResourceImportManager(self.the_channel_id)
            manager.run()
            self.assertIn("Permission denied", logger_mock.call_args_list[0][0][0])
            self.annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.utils.resource_import.transfer.os.remove")
    @patch(
        "kolibri.core.content.utils.resource_import.os.path.isfile",
        return_value=False,
    )
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    def test_local_import_source_corrupted(
        self,
        path_mock,
        isfile_mock,
        remove_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd1, local_dest_path = tempfile.mkstemp()
        fd2, local_src_path = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        LocalFile.objects.filter(files__contentnode=self.c1_node_id).update(file_size=1)
        path_mock.side_effect = [local_dest_path, local_src_path]
        get_import_export_mock.return_value = (
            1,
            [
                LocalFile.objects.filter(files__contentnode=self.c1_node_id)
                .values("id", "file_size", "extension")
                .first()
            ],
            10,
        )
        with self.assertRaises(TransferFailed):
            manager = DiskChannelResourceImportManager(
                self.the_channel_id,
                path="destination",
                node_ids=[self.c1_node_id],
            )
            manager.run()
        remove_mock.assert_any_call(local_dest_path + ".transfer")

    @patch(
        "kolibri.core.content.utils.resource_import.os.path.isfile",
        return_value=False,
    )
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.check_for_cancel"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        return_value=False,
    )
    @patch(
        "kolibri.core.content.utils.resource_import.transfer.FileCopy._checksum_correct",
        return_value=True,
    )
    def test_local_import_source_corrupted_full_progress(
        self,
        _checksum_correct_mock,
        is_cancelled_mock,
        cancel_mock,
        path_mock,
        isfile_mock,
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
        files = ContentNode.objects.get(id=self.c1_node_id).files.all()
        first_file = files.first()
        files.exclude(id=first_file.id).delete()
        LocalFile.objects.filter(files__contentnode=self.c1_node_id).update(
            file_size=expected_file_size
        )
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(files__contentnode=self.c1_node_id).values(
                    "id", "file_size", "extension"
                )
            ),
            10,
        )
        path_mock.side_effect = [local_dest_path, local_src_path]
        mock_overall_progress = MagicMock()
        manager = DiskChannelResourceImportManager(
            self.the_channel_id,
            path="destination",
            node_ids=[self.c1_node_id],
        )
        manager.update_progress = mock_overall_progress
        manager.run()

        mock_overall_progress.assert_any_call(expected_file_size)

    @patch(
        "kolibri.core.content.utils.resource_import.transfer.FileDownload._move_tmp_to_dest"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        return_value=False,
    )
    @patch(
        "kolibri.core.content.utils.resource_import.transfer.FileDownload._checksum_correct",
        return_value=False,
    )
    def test_remote_import_source_corrupted(
        self,
        _checksum_correct_mock,
        is_cancelled_mock,
        path_mock,
        _move_tmp_to_dest_mock,
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
        with self.assertRaises(TransferFailed):
            manager = RemoteChannelResourceImportManager(
                self.the_channel_id, node_ids=[self.c1_node_id]
            )
            manager.run()
        self.annotation_mock.set_content_visibility.assert_called_with(
            self.the_channel_id,
            [],
            exclude_node_ids=None,
            node_ids={self.c1_node_id},
            public=False,
            admin_imported=True,
        )

    @patch(
        "kolibri.core.content.utils.resource_import.transfer.FileDownload._move_tmp_to_dest"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        return_value=False,
    )
    def test_remote_import_full_import(
        self,
        is_cancelled_mock,
        path_mock,
        _move_tmp_to_dest_mock,
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
                    # Add explicit order by to ensure they are returned in the order we
                    # later assert.
                )
                .values("id", "file_size", "extension")
                .order_by("-id")
            ),
            10,
        )
        manager = RemoteChannelResourceImportManager(self.the_channel_id)
        manager.run()
        self.annotation_mock.set_content_visibility.assert_called_with(
            self.the_channel_id,
            [
                "6bdfea4a01830fdd4a585181c0b8068c",
                "211523265f53825b82f70ba19218a02e",
            ],
            exclude_node_ids=None,
            node_ids=None,
            public=False,
            admin_imported=True,
        )

    def test_local_import_with_detected_manifest_file(
        self,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        import_source_dir = tempfile.mkdtemp()
        os.mkdir(os.path.join(import_source_dir, "content"))

        get_import_export_mock.return_value = (0, [], 0)

        with open(
            os.path.join(import_source_dir, "content", "manifest.json"), "w"
        ) as manifest_file:
            json.dump(
                {
                    "channels": [
                        {
                            "id": self.the_channel_id,
                            "version": self.the_channel_version,
                            "include_node_ids": [self.c2c1_node_id],
                        }
                    ]
                },
                manifest_file,
            )

        manager = DiskChannelResourceImportManager.from_manifest(
            self.the_channel_id,
            path=import_source_dir,
        )

        manager.run()

        # If a manifest file is present in the source directory and no node_ids are
        # provided, importcontent should call get_import_export using node_ids
        # according to channel_id in the detected manifest file.
        get_import_export_mock.assert_called_once_with(
            self.the_channel_id,
            {str(self.c2c1_node_id)},
            None,
            False,
            renderable_only=True,
            all_thumbnails=False,
            drive_id=None,
        )

    def test_local_import_with_detected_manifest_file_and_unlisted_channel(
        self,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        import_source_dir = tempfile.mkdtemp()
        os.mkdir(os.path.join(import_source_dir, "content"))

        get_import_export_mock.return_value = (0, [], 0)

        with open(
            os.path.join(import_source_dir, "content", "manifest.json"), "w"
        ) as manifest_file:
            json.dump({"channels": []}, manifest_file)

        manager = DiskChannelResourceImportManager(
            self.the_channel_id,
            path=import_source_dir,
        )

        manager.run()

        # If a manifest file is present in the source directory and no node_ids are
        # provided, but the user specifies a channel_id which is not present in the
        # manifest file, importcontent should call get_import_export with an empty list
        # of node_ids.
        get_import_export_mock.assert_called_once_with(
            self.the_channel_id,
            None,
            None,
            False,
            renderable_only=True,
            all_thumbnails=False,
            drive_id=None,
        )

    def test_local_import_with_local_manifest_file_and_node_ids(
        self,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        import_source_dir = tempfile.mkdtemp()

        get_import_export_mock.return_value = (0, [], 0)

        manifest_file = StringIO(
            json.dumps(
                {
                    "channels": [
                        {
                            "id": self.the_channel_id,
                            "version": self.the_channel_version,
                            "include_node_ids": [self.c2c1_node_id, self.c2c2_node_id],
                        }
                    ]
                }
            )
        )

        with self.assertRaises(CommandError):
            # If the user provides a manifest file as well as node_ids, the
            # importcontent command should exit with an error.
            call_command(
                "importcontent",
                "disk",
                self.the_channel_id,
                import_source_dir,
                node_ids=[self.c2c2_node_id],
                manifest=manifest_file,
            )

        with self.assertRaises(CommandError):
            # If the user provides a manifest file as well as exclude_node_ids, the
            # importcontent command should exit with an error.
            call_command(
                "importcontent",
                "disk",
                self.the_channel_id,
                import_source_dir,
                exclude_node_ids=[self.c2c2_node_id],
                manifest=manifest_file,
            )

        with self.assertRaises(CommandError):
            # If the user provides a manifest file as well as an empty (falsey) list of
            # node_ids, the importcontent command should exit with an error.
            call_command(
                "importcontent",
                "disk",
                self.the_channel_id,
                import_source_dir,
                node_ids=[],
                manifest=manifest_file,
            )

    @patch("kolibri.core.content.utils.content_manifest.logger.warning")
    def test_local_import_with_local_manifest_file_with_multiple_versions(
        self,
        warning_logger_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        import_source_dir = tempfile.mkdtemp()

        get_import_export_mock.return_value = (0, [], 0)

        manager = DiskChannelResourceImportManager.from_manifest(
            self.the_channel_id,
            path=import_source_dir,
            manifest_file=StringIO(
                json.dumps(
                    {
                        "channels": [
                            {
                                "id": self.the_channel_id,
                                "version": self.the_channel_version - 1,
                                "include_node_ids": [self.c2c1_node_id],
                            },
                            {
                                "id": self.the_channel_id,
                                "version": self.the_channel_version,
                                "include_node_ids": [self.c2c2_node_id],
                            },
                        ]
                    }
                )
            ),
        )
        manager.run()

        warning_logger_mock.assert_called_once()
        # If a provided manifest file specifies versions of a channel which do not
        # match the channel version in the local database, importcontent should log a
        # warning message explaining the mismatch.
        warning_logger_mock.assert_called_with(
            "Manifest entry for {channel_id} has a different version ({manifest_version}) than the installed channel ({local_version})".format(
                channel_id=self.the_channel_id,
                manifest_version=self.the_channel_version - 1,
                local_version=self.the_channel_version,
            )
        )

        # Regardless, importcontent should continue to call get_import_export with a
        # list of node_ids built from all versions of the channel_id channel.
        get_import_export_mock.assert_called_once_with(
            self.the_channel_id,
            {str(self.c2c1_node_id), str(self.c2c2_node_id)},
            None,
            False,
            renderable_only=True,
            all_thumbnails=False,
            drive_id=None,
        )

    def test_local_import_with_detected_manifest_file_and_node_ids(
        self,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        import_source_dir = tempfile.mkdtemp()
        os.mkdir(os.path.join(import_source_dir, "content"))

        get_import_export_mock.return_value = (0, [], 0)

        with open(
            os.path.join(import_source_dir, "content", "manifest.json"), "w"
        ) as manifest_file:
            json.dump(
                {
                    "channels": [
                        {
                            "id": self.the_channel_id,
                            "version": self.the_channel_version,
                            "include_node_ids": [self.c2c1_node_id],
                        }
                    ]
                },
                manifest_file,
            )

        manager = DiskChannelResourceImportManager(
            self.the_channel_id,
            path=import_source_dir,
            node_ids=[self.c2c2_node_id],
        )

        manager.run()

        # If a manifest file is present in the source directory but node_ids are
        # provided, importcontent should call get_import_export with the provided list
        # of node_ids, ignoring the detected manifest file.
        get_import_export_mock.assert_called_once_with(
            self.the_channel_id,
            {str(self.c2c2_node_id)},
            None,
            False,
            renderable_only=True,
            all_thumbnails=False,
            drive_id=None,
        )

        get_import_export_mock.reset_mock()

        call_command(
            "importcontent", "disk", self.the_channel_id, import_source_dir, node_ids=[]
        )

        # If a manifest file is present in the source directory but node_ids is set to
        # an empty (falsey) list, importcontent should call get_import_export with that
        # empty list of node_ids, ignoring the detected manifest file.
        get_import_export_mock.assert_called_once_with(
            self.the_channel_id,
            set(),
            None,
            False,
            renderable_only=True,
            all_thumbnails=False,
            drive_id="",
        )

    def test_local_import_with_detected_manifest_file_and_manifest_file(
        self,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        import_source_dir = tempfile.mkdtemp()
        os.mkdir(os.path.join(import_source_dir, "content"))

        get_import_export_mock.return_value = (0, [], 0)

        with open(
            os.path.join(import_source_dir, "content", "manifest.json"), "w"
        ) as manifest_file:
            json.dump(
                {
                    "channels": [
                        {
                            "id": self.the_channel_id,
                            "version": self.the_channel_version,
                            "include_node_ids": [self.c2c1_node_id],
                        }
                    ]
                },
                manifest_file,
            )

        manager = DiskChannelResourceImportManager.from_manifest(
            self.the_channel_id,
            path=import_source_dir,
            manifest_file=StringIO(
                json.dumps(
                    {
                        "channels": [
                            {
                                "id": self.the_channel_id,
                                "version": self.the_channel_version,
                                "include_node_ids": [self.c2c2_node_id],
                            }
                        ]
                    }
                )
            ),
        )

        manager.run()

        # If a manifest file is present in the source directory but another manifest
        # has been provided via the manifest argument, importcontent should ignore the
        # detected manifest file and instead call get_import_export with the list of
        # node_ids according to channel_id in the provided manifest file.
        get_import_export_mock.assert_called_once_with(
            self.the_channel_id,
            {str(self.c2c2_node_id)},
            None,
            False,
            renderable_only=True,
            all_thumbnails=False,
            drive_id=None,
        )

    def test_local_import_with_no_detect_manifest(
        self,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        import_source_dir = tempfile.mkdtemp()
        os.mkdir(os.path.join(import_source_dir, "content"))

        get_import_export_mock.return_value = (0, [], 0)

        with open(
            os.path.join(import_source_dir, "content", "manifest.json"), "w"
        ) as manifest_file:
            json.dump(
                {
                    "channels": [
                        {
                            "id": self.the_channel_id,
                            "version": self.the_channel_version,
                            "include_node_ids": [self.c2c1_node_id],
                        }
                    ]
                },
                manifest_file,
            )

        call_command(
            "importcontent",
            "disk",
            self.the_channel_id,
            import_source_dir,
            detect_manifest=False,
        )

        # If a manifest file is present in the source directory but the detect_manifest
        # argument is set to False, importcontent should ignore the detected manifest
        # file. If no node_ids are provided, it should call get_import_export with
        # node_ids set to None.
        get_import_export_mock.assert_called_once_with(
            self.the_channel_id,
            None,
            None,
            False,
            renderable_only=True,
            all_thumbnails=False,
            drive_id="",
        )

    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        return_value=False,
    )
    def test_remote_import_with_local_manifest_file(
        self,
        is_cancelled_mock,
        file_download_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        get_import_export_mock.return_value = (0, [], 0)

        manager = RemoteChannelResourceImportManager.from_manifest(
            self.the_channel_id,
            manifest_file=StringIO(
                json.dumps(
                    {
                        "channels": [
                            {
                                "id": self.the_channel_id,
                                "version": self.the_channel_version,
                                "include_node_ids": [self.c2c1_node_id],
                            }
                        ]
                    }
                )
            ),
        )

        manager.run()

        # If a manifest file is provided when importing from a remote source,
        # importcontent should call get_import_export with node_ids set according to
        # channel_id in the provided manifest file.
        get_import_export_mock.assert_called_once_with(
            self.the_channel_id,
            {str(self.c2c1_node_id)},
            None,
            False,
            renderable_only=True,
            all_thumbnails=False,
            peer_id=None,
        )

    @patch("kolibri.core.content.utils.resource_import.logger.warning")
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    def test_local_import_fail_on_error_missing(
        self,
        path_mock,
        logger_mock,
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

        with self.assertRaises(OSError) as err:
            manager = DiskChannelResourceImportManager(
                self.the_channel_id,
                path="destination",
                fail_on_error=True,
            )
            manager.run()
        self.assertEqual(err.exception.errno, 2)
        self.annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.utils.resource_import.logger.warning")
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    def test_remote_import_fail_on_error_missing(
        self,
        path_mock,
        logger_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd1, local_dest_path_1 = tempfile.mkstemp()
        fd2, local_dest_path_2 = tempfile.mkstemp()
        fd3, local_dest_path_3 = tempfile.mkstemp()
        fd4, local_dest_path_4 = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        os.close(fd3)
        os.close(fd4)
        path_mock.side_effect = [
            local_dest_path_1,
            local_dest_path_2,
            local_dest_path_3,
            local_dest_path_4,
        ]
        ContentNode.objects.filter(pk=self.c2c1_node_id).update(available=False)
        LocalFile.objects.filter(files__contentnode__pk=self.c2c1_node_id).update(
            file_size=1, available=False
        )
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    files__contentnode__pk=self.c2c1_node_id
                ).values("id", "file_size", "extension")
            ),
            10,
        )

        with self.assertRaises(HTTPError):
            manager = RemoteChannelResourceImportManager(
                self.the_channel_id,
                node_ids=[self.c2c1_node_id],
                renderable_only=False,
                fail_on_error=True,
            )
            manager.run()
        self.annotation_mock.set_content_visibility.assert_called_with(
            self.the_channel_id,
            [],
            node_ids={self.c2c1_node_id},
            exclude_node_ids=None,
            public=False,
            admin_imported=True,
        )

    @patch("kolibri.core.content.utils.resource_import.logger.warning")
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    def test_local_import_fail_on_error_corrupted(
        self,
        path_mock,
        logger_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd1, dest_path = tempfile.mkstemp()
        fd2, src_path = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        path_mock.side_effect = [dest_path, src_path]
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        get_import_export_mock.return_value = (
            1,
            [LocalFile.objects.values("id", "file_size", "extension").first()],
            10,
        )

        with self.assertRaises(TransferFailed):
            manager = DiskChannelResourceImportManager(
                self.the_channel_id,
                path="destination",
                fail_on_error=True,
            )
            manager.run()
        self.annotation_mock.set_content_visibility.assert_called()

    @patch("kolibri.core.content.utils.resource_import.logger.warning")
    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload.finalize")
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    def test_remote_import_fail_on_error_corrupted(
        self,
        path_mock,
        finalize_dest_mock,
        logger_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd, dest_path = tempfile.mkstemp()
        os.close(fd)
        path_mock.side_effect = [dest_path]
        finalize_dest_mock.side_effect = TransferFailed
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        get_import_export_mock.return_value = (
            1,
            [LocalFile.objects.values("id", "file_size", "extension").first()],
            10,
        )

        with self.assertRaises(TransferFailed):
            manager = RemoteChannelResourceImportManager(
                self.the_channel_id,
                fail_on_error=True,
            )
            manager.run()
        self.annotation_mock.set_content_visibility.assert_called()

    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_remote_url"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_storage_file_path"
    )
    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    @patch(
        "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
        return_value=False,
    )
    def test_remote_import_timeout_option(
        self,
        is_cancelled_mock,
        FileDownloadMock,
        local_path_mock,
        remote_path_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd, local_path = tempfile.mkstemp()
        os.close(fd)
        LocalFile.objects.update(file_size=1)
        local_path_mock.side_effect = [local_path]
        remote_path_mock.return_value = "notest"
        FileDownloadMock.return_value.transfer_size = 1
        FileDownloadMock.return_value.dest = local_path
        get_import_export_mock.return_value = (
            1,
            [LocalFile.objects.values("id", "file_size", "extension").first()],
            10,
        )
        manager = RemoteChannelResourceImportManager(
            self.the_channel_id,
            timeout=5,
        )
        manager.run()
        FileDownloadMock.assert_called_with(
            "notest",
            local_path,
            LocalFile.objects.values("id", "file_size", "extension").first()["id"],
            session=Any(Session),
            cancel_check=is_cancelled_mock,
            timeout=5,
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
    @patch(
        "kolibri.core.content.management.commands.exportchannel.AsyncCommand.check_for_cancel"
    )
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
        FileCopyMock.return_value.run.side_effect = TransferCanceled()
        call_command("exportchannel", self.the_channel_id, local_dest_path)
        FileCopyMock.assert_called_with(
            local_src_path, local_dest_path, cancel_check=is_cancelled_mock
        )
        cancel_mock.assert_called_with()
        self.assertTrue(os.path.exists(local_dest_path))


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
@patch("kolibri.core.content.management.commands.exportcontent.get_import_export_nodes")
@patch("kolibri.core.content.management.commands.exportcontent.get_content_nodes_data")
@patch("kolibri.core.content.management.commands.exportcontent.ContentManifest")
class ExportContentTestCase(TestCase):
    """
    Test case for the exportcontent management command.
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    @patch("kolibri.core.content.management.commands.exportcontent.transfer.FileCopy")
    @patch(
        "kolibri.core.content.management.commands.exportcontent.AsyncCommand.check_for_cancel"
    )
    @patch(
        "kolibri.core.content.management.commands.exportcontent.AsyncCommand.is_cancelled",
        return_value=True,
    )
    def test_local_cancel_immediately(
        self,
        is_cancelled_mock,
        cancel_mock,
        FileCopyMock,
        ContentManifestMock,
        get_content_nodes_data_mock,
        get_import_export_nodes_mock,
    ):
        # If cancel comes in before we do anything, make sure nothing happens!
        FileCopyMock.return_value.run.side_effect = TransferCanceled()
        get_content_nodes_data_mock.return_value = (
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
    @patch(
        "kolibri.core.content.management.commands.exportcontent.AsyncCommand.check_for_cancel"
    )
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
        ContentManifestMock,
        get_content_nodes_data_mock,
        get_import_export_nodes_mock,
    ):
        # Make sure we cancel during transfer
        fd1, local_dest_path = tempfile.mkstemp()
        fd2, local_src_path = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        local_path_mock.side_effect = [local_src_path, local_dest_path]
        FileCopyMock.return_value.run.side_effect = TransferCanceled()
        get_content_nodes_data_mock.return_value = (
            1,
            [LocalFile.objects.values("id", "file_size", "extension").first()],
            10,
        )
        call_command("exportcontent", self.the_channel_id, tempfile.mkdtemp())
        is_cancelled_mock.assert_has_calls([call()])
        FileCopyMock.assert_called_with(
            local_src_path, local_dest_path, cancel_check=is_cancelled_mock
        )
        cancel_mock.assert_called_with()

    @patch(
        "kolibri.core.content.management.commands.exportcontent.Command.copy_content_files"
    )
    def test_manifest_only(
        self,
        copy_content_files_mock,
        ContentManifestMock,
        get_content_nodes_data_mock,
        get_import_export_nodes_mock,
    ):
        get_content_nodes_data_mock.return_value = (
            1,
            [LocalFile.objects.values("id", "file_size", "extension").first()],
            10,
        )

        # run with manifest-only option
        call_command(
            "exportcontent", self.the_channel_id, tempfile.mkdtemp(), manifest_only=True
        )

        copy_content_files_mock.assert_not_called()

        ContentManifestMock.return_value.write.assert_called_once()

        # Shall be enough mock assertions for now ?


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
            self.the_channel_id, None, None, False, renderable_only=True, drive_id="1"
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
    def test_all_nodes_present_disk_only_thumbnails(self, channel_stats_mock):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        stats = {
            key: {} for key in ContentNode.objects.all().values_list("id", flat=True)
        }
        channel_stats_mock.return_value = stats
        _, files_to_transfer, _ = get_import_export_data(
            self.the_channel_id, [], None, False, all_thumbnails=True, drive_id="1"
        )
        self.assertEqual(
            len(files_to_transfer),
            LocalFile.objects.filter(files__thumbnail=True).count(),
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
            self.the_channel_id, None, None, False, renderable_only=False, drive_id="1"
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
            self.the_channel_id, None, None, False, renderable_only=False, drive_id="1"
        )
        self.assertEqual(
            len(files_to_transfer),
            obj.files.count() + obj.parent.files.filter(thumbnail=True).count(),
        )

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
            None,
            False,
            renderable_only=False,
            drive_id="1",
        )
        self.assertEqual(
            len(files_to_transfer),
            parent.files.filter(thumbnail=True).count() + obj.files.count(),
        )

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_disk"
    )
    def test_no_nodes_present_disk(self, channel_stats_mock):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        stats = {}
        channel_stats_mock.return_value = stats
        _, files_to_transfer, _ = get_import_export_data(
            self.the_channel_id, None, None, False, renderable_only=False, drive_id="1"
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
            self.the_channel_id, None, None, False, renderable_only=False, peer_id="1"
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
            self.the_channel_id, None, None, False, renderable_only=False, peer_id="1"
        )
        self.assertEqual(
            len(files_to_transfer),
            obj.files.count() + obj.parent.files.filter(thumbnail=True).count(),
        )

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_peer"
    )
    def test_no_nodes_present_peer(self, channel_stats_mock):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        stats = {}
        channel_stats_mock.return_value = stats
        _, files_to_transfer, _ = get_import_export_data(
            self.the_channel_id, None, None, False, renderable_only=False, peer_id="1"
        )
        self.assertEqual(len(files_to_transfer), 0)

    def test_no_uncle_thumbnail_files(self):
        """
        Test that the thumbnail files for the 'uncle' node are not included in the import
        """
        root_node = ContentNode.objects.get(parent__isnull=True)
        node = ContentNode.objects.filter(
            parent=root_node, kind=content_kinds.TOPIC
        ).first()
        parent = ContentNode.objects.create(
            title="test1",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=node,
            kind=content_kinds.TOPIC,
            available=False,
        )
        uncle = ContentNode.objects.create(
            title="test2",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=node,
            kind=content_kinds.TOPIC,
            available=False,
        )
        child = ContentNode.objects.create(
            title="test3",
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=root_node.channel_id,
            parent=parent,
            kind=content_kinds.VIDEO,
            available=False,
        )
        parent_thumbnail = LocalFile.objects.create(
            id=uuid.uuid4().hex, extension="png", available=False, file_size=10
        )
        uncle_thumbnail = LocalFile.objects.create(
            id=uuid.uuid4().hex, extension="png", available=False, file_size=10
        )
        local_file = LocalFile.objects.create(
            id=uuid.uuid4().hex, extension="mp4", available=False, file_size=10
        )
        File.objects.create(
            id=uuid.uuid4().hex, local_file=local_file, contentnode=child
        )
        File.objects.create(
            id=uuid.uuid4().hex,
            local_file=parent_thumbnail,
            contentnode=parent,
            thumbnail=True,
            supplementary=True,
        )
        File.objects.create(
            id=uuid.uuid4().hex,
            local_file=uncle_thumbnail,
            contentnode=uncle,
            thumbnail=True,
            supplementary=True,
        )
        _, files_to_transfer, _ = get_import_export_data(
            root_node.channel_id, [child.id], [], False, renderable_only=False
        )
        self.assertEqual(
            len(
                list(
                    filter(lambda x: x["id"] == parent_thumbnail.id, files_to_transfer)
                )
            ),
            1,
        )
        self.assertEqual(
            len(
                list(filter(lambda x: x["id"] == uncle_thumbnail.id, files_to_transfer))
            ),
            0,
        )

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_peer"
    )
    def test_import_supplementary_files_missing(self, channel_stats_mock):
        ContentNode.objects.update(available=True)
        LocalFile.objects.update(available=True)
        supplementary = LocalFile.objects.filter(files__supplementary=True)
        supplementary_ids = set(supplementary.values_list("id", flat=True))
        self.assertNotEqual(supplementary_ids, set())
        supplementary.update(available=False)
        stats = {
            key: {} for key in ContentNode.objects.all().values_list("id", flat=True)
        }
        channel_stats_mock.return_value = stats
        _, files_to_transfer, _ = get_import_export_data(
            self.the_channel_id, None, None, False, renderable_only=False, peer_id="1"
        )
        transfer_ids = set([f["id"] for f in files_to_transfer])
        self.assertEqual(transfer_ids, supplementary_ids)

    @patch(
        "kolibri.core.content.utils.import_export_content.get_channel_stats_from_peer"
    )
    def test_export_supplementary_files_missing(self, channel_stats_mock):
        ContentNode.objects.update(available=True)
        LocalFile.objects.update(available=True)
        supplementary = LocalFile.objects.filter(files__supplementary=True)
        self.assertNotEqual(supplementary.count(), 0)
        supplementary.update(available=False)
        stats = {
            key: {} for key in ContentNode.objects.all().values_list("id", flat=True)
        }
        channel_stats_mock.return_value = stats
        _, files_to_transfer, _ = get_import_export_data(
            self.the_channel_id, None, None, True, renderable_only=False, peer_id="1"
        )
        essential_ids = set(
            LocalFile.objects.filter(files__supplementary=False).values_list(
                "id", flat=True
            )
        )
        transfer_ids = set([f["id"] for f in files_to_transfer])
        self.assertEqual(transfer_ids, essential_ids)
