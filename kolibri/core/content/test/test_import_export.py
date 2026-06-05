import itertools
import json
import os
import sys
import tempfile
import time
import uuid
from contextlib import contextmanager
from io import StringIO

from django.core.management import call_command
from django.core.management import CommandError
from django.db.models import Q
from django.test import TestCase
from le_utils.constants import content_kinds
from le_utils.constants import library as library_constants
from mock import call
from mock import MagicMock
from mock import patch
from requests import Session
from requests.exceptions import ChunkedEncodingError
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError
from requests.exceptions import ReadTimeout
from requests.exceptions import SSLError

import kolibri.core.content.management.commands.importchannel as importchannel_module
from kolibri.core.content.constants.transfer_types import COPY_METHOD
from kolibri.core.content.errors import InsufficientStorageSpaceError
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.tasks import remoteimport
from kolibri.core.content.upgrade import populate_channel_library_field
from kolibri.core.content.utils import paths
from kolibri.core.content.utils.annotation import set_channel_metadata_fields
from kolibri.core.content.utils.channel_transfer import transfer_channel
from kolibri.core.content.utils.content_types_tools import (
    renderable_contentnodes_q_filter,
)
from kolibri.core.content.utils.file_availability import LocationError
from kolibri.core.content.utils.import_export_content import get_content_nodes_data
from kolibri.core.content.utils.import_export_content import get_import_export_data
from kolibri.core.content.utils.import_export_content import get_import_export_nodes
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.content.utils.resource_export import DiskChannelResourceExportManager
from kolibri.core.content.utils.resource_import import DiskChannelResourceImportManager
from kolibri.core.content.utils.resource_import import lookup_channel_listing_status
from kolibri.core.content.utils.resource_import import (
    RemoteChannelDatabaseImportManager,
)
from kolibri.core.content.utils.resource_import import (
    RemoteChannelResourceImportManager,
)
from kolibri.core.device.models import ContentCacheKey
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
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


class FalseThenTrue:
    def __init__(self, times=1):
        self.times = times
        self.count = 0

    def __call__(self):
        self.count += 1
        if self.count > self.times:
            return True
        return False


@contextmanager
def temp_file_with_size(size_bytes):
    """Create a temporary file with specific size, auto-cleanup on exit."""
    fd, path = tempfile.mkstemp()
    if size_bytes > 0:
        os.write(fd, b"x" * size_bytes)
    os.close(fd)
    try:
        yield path
    finally:
        if os.path.exists(path):
            os.unlink(path)


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

    def test_unavailable_node_with_available_files_included_when_available_false(self):
        # Get a node that exists in the test data
        test_node = ContentNode.objects.get(
            pk=self.c2c1_node_id, channel_id=self.the_channel_id
        )

        # Mark the node as unavailable but ensure its files are available
        test_node.available = False
        test_node.save()

        # Ensure all local files for this node are marked as available
        for file_obj in test_node.files.all():
            local_file = file_obj.local_file
            local_file.available = True
            local_file.save()

        # When available=False, the node should be included in the result
        # even though it's marked unavailable (because it has available files)
        matched_nodes_queries_list = get_import_export_nodes(
            self.the_channel_id, renderable_only=False, available=False
        )

        result_node_ids = [
            node.pk
            for node in itertools.chain.from_iterable(matched_nodes_queries_list)
        ]

        self.assertIn(self.c2c1_node_id, result_node_ids)


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
        total_resource_count, files, total_bytes_to_transfer = get_content_nodes_data(
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

        total_resource_count, files, total_bytes_to_transfer = get_content_nodes_data(
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

        total_resource_count, files, total_bytes_to_transfer = get_content_nodes_data(
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

        total_resource_count, files, total_bytes_to_transfer = get_content_nodes_data(
            self.the_channel_id,
            [],
            available=True,
            all_thumbnails=True,
        )

        self.assertEqual(total_resource_count, 0)
        self.assertCountEqual(files, expected_files_list)
        self.assertEqual(total_bytes_to_transfer, 5)

    def test_empty_query(self):
        total_resource_count, files, total_bytes_to_transfer = get_content_nodes_data(
            self.the_channel_id, [ContentNode.objects.none()], available=True
        )

        self.assertEqual(total_resource_count, 0)
        self.assertCountEqual(files, [])
        self.assertEqual(total_bytes_to_transfer, 0)


def create_dummy_job(is_cancelled=True, check_for_cancel_return=True):
    dummy = MagicMock()
    dummy.is_cancelled.return_value = is_cancelled
    dummy.check_for_cancel.return_value = check_for_cancel_return
    dummy.start_progress.return_value = None
    dummy.update_progress.return_value = None
    dummy.extra_metadata = {}
    dummy.save_meta.return_value = None
    return dummy


@patch("kolibri.core.content.utils.channel_import.import_channel_from_local_db")
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
        "kolibri.core.content.utils.channel_transfer.paths.get_content_database_file_url"
    )
    @patch(
        "kolibri.core.content.utils.channel_transfer.paths.get_content_database_file_path"
    )
    @patch("kolibri.core.content.utils.channel_transfer.transfer.FileDownload")
    @patch("kolibri.core.content.utils.channel_transfer.get_current_job")
    def test_remote_cancel_during_transfer(
        self,
        get_current_job_mock,
        FileDownloadMock,
        local_path_mock,
        remote_path_mock,
        start_progress_mock,
        import_channel_mock,
    ):
        dummy_job = create_dummy_job()
        get_current_job_mock.return_value = dummy_job
        fd, local_path = tempfile.mkstemp()
        os.close(fd)
        local_path_mock.return_value = local_path
        remote_path_mock.return_value = "notest"
        FileDownloadMock.return_value.run.side_effect = TransferCanceled()
        call_command("importchannel", "network", self.the_channel_id)
        # Check that is_cancelled was called
        dummy_job.is_cancelled.assert_called_with()
        # Check that the FileDownload initiated
        FileDownloadMock.assert_called_with(
            "notest", local_path, cancel_check=dummy_job.is_cancelled
        )
        # Check that cancel was called
        dummy_job.check_for_cancel.assert_called_with()
        # Test that import channel cleans up database file if cancelled
        self.assertFalse(os.path.exists(local_path))

    @patch(
        "kolibri.core.content.utils.channel_transfer.paths.get_content_database_file_path"
    )
    @patch("kolibri.core.content.utils.channel_transfer.transfer.FileCopy")
    @patch("kolibri.core.content.utils.channel_transfer.get_current_job")
    def test_local_cancel_during_transfer(
        self,
        get_current_job_mock,
        FileCopyMock,
        local_path_mock,
        start_progress_mock,
        import_channel_mock,
    ):
        dummy_job = create_dummy_job()
        get_current_job_mock.return_value = dummy_job
        fd1, local_dest_path = tempfile.mkstemp()
        fd2, local_src_path = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        local_path_mock.side_effect = [local_dest_path, local_src_path]
        FileCopyMock.return_value.run.side_effect = TransferCanceled()
        call_command("importchannel", "disk", self.the_channel_id, tempfile.mkdtemp())
        # Check that is_cancelled was called
        dummy_job.is_cancelled.assert_called()
        FileCopyMock.assert_called_with(
            local_src_path, local_dest_path, cancel_check=dummy_job.is_cancelled
        )
        dummy_job.check_for_cancel.assert_called()
        self.assertFalse(os.path.exists(local_dest_path))

    @patch("kolibri.utils.file_transfer.FileDownload._set_headers")
    @patch("kolibri.core.content.utils.channel_transfer.get_current_job")
    def test_remote_import_sslerror(
        self,
        get_current_job_mock,
        set_headers_mock,
        start_progress_mock,
        import_channel_mock,
    ):
        dummy_job = create_dummy_job()
        get_current_job_mock.return_value = dummy_job
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
            dummy_job.check_for_cancel.assert_called_with()
            import_channel_mock.assert_not_called()

    @patch(
        "kolibri.utils.file_transfer.FileDownload._run_download",
        side_effect=ReadTimeout("Read timed out."),
    )
    @patch("kolibri.utils.file_transfer.FileDownload._set_headers")
    @patch("kolibri.core.content.utils.channel_transfer.get_current_job")
    def test_remote_import_readtimeout(
        self,
        get_current_job_mock,
        set_headers_mock,
        run_download_mock,
        start_progress_mock,
        import_channel_mock,
    ):
        dummy_job = create_dummy_job()
        get_current_job_mock.return_value = dummy_job
        call_command("importchannel", "network", "197934f144305350b5820c7c4dd8e194")
        dummy_job.check_for_cancel.assert_called_with()
        import_channel_mock.assert_not_called()

    @patch("kolibri.core.content.utils.channel_transfer.transfer.FileDownload")
    @patch("kolibri.core.content.utils.channel_transfer.get_current_job")
    def test_remote_import_full_import(
        self,
        get_current_job_mock,
        FileDownloadMock,
        start_progress_mock,
        import_channel_mock,
    ):
        dummy_job = create_dummy_job()
        get_current_job_mock.return_value = dummy_job
        # Get the current content cache key and sleep a bit to ensure
        # time has elapsed before it's updated.
        cache_key_before = ContentCacheKey.get_cache_key()
        time.sleep(0.01)

        call_command("importchannel", "network", "197934f144305350b5820c7c4dd8e194")
        dummy_job.is_cancelled.assert_called()
        import_channel_mock.assert_called_with(
            "197934f144305350b5820c7c4dd8e194",
            cancel_check=dummy_job.is_cancelled,
            contentfolder=paths.get_content_dir_path(),
            version_requested=False,
        )

        # Check that the content cache key was updated.
        cache_key_after = ContentCacheKey.get_cache_key()
        self.assertNotEqual(cache_key_before, cache_key_after)

    @patch(
        "kolibri.core.content.utils.channel_transfer.paths.get_content_database_file_url"
    )
    @patch(
        "kolibri.core.content.utils.channel_transfer.paths.get_content_database_file_path"
    )
    @patch("kolibri.core.content.utils.channel_transfer.transfer.FileDownload")
    @patch("kolibri.core.content.utils.channel_transfer.clear_channel_stats")
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
        "kolibri.core.content.management.commands.importchannel.set_channel_metadata_fields"
    )
    @patch(
        "kolibri.core.content.utils.channel_transfer.paths.get_content_database_file_url"
    )
    @patch(
        "kolibri.core.content.utils.channel_transfer.paths.get_content_database_file_path"
    )
    @patch("kolibri.core.content.utils.channel_transfer.transfer.FileDownload")
    @patch("kolibri.core.content.utils.channel_transfer.get_current_job")
    @patch(
        "kolibri.core.content.management.commands.importchannel.lookup_channel_listing_status"
    )
    def test_network_import_with_token(
        self,
        mock_lookup,
        get_current_job_mock,
        FileDownloadMock,
        local_path_mock,
        remote_path_mock,
        mock_set_fields,
        start_progress_mock,
        import_channel_mock,
    ):
        """Test that network import resolves tokens to channel IDs"""
        mock_lookup.return_value = {
            "id": self.the_channel_id,
            "public": True,
            "version": 5,
            "library": "KOLIBRI",
        }

        # Setup mock for the actual import
        dummy_job = create_dummy_job()
        get_current_job_mock.return_value = dummy_job
        fd, local_path = tempfile.mkstemp()
        os.close(fd)
        local_path_mock.return_value = local_path
        remote_path_mock.return_value = "notest"
        import_channel_mock.return_value = True

        # Call with a token instead of channel ID
        call_command("importchannel", "network", "test-token")

        # Verify token was resolved via lookup_channel_listing_status
        mock_lookup.assert_called_once()
        # Verify the import proceeded
        import_channel_mock.assert_called_once()
        # Verify library and version from token resolution are persisted
        mock_set_fields.assert_called_once_with(
            self.the_channel_id, library="KOLIBRI", version=5
        )

    @patch(
        "kolibri.core.content.management.commands.importchannel.lookup_channel_listing_status",
        return_value=None,
    )
    def test_network_import_token_not_found(
        self,
        mock_lookup,
        start_progress_mock,
        import_channel_mock,
    ):
        """Test that network import fails gracefully when token is not found"""
        with self.assertRaises(CommandError) as context:
            call_command("importchannel", "network", "invalid-token")

        self.assertIn("not found", str(context.exception).lower())

    def test_disk_import_rejects_token(
        self,
        start_progress_mock,
        import_channel_mock,
    ):
        """Test that disk import rejects tokens and only accepts UUIDs"""
        # Call with a token instead of UUID - should raise CommandError
        with self.assertRaises(CommandError) as context:
            call_command("importchannel", "disk", "test-token", tempfile.mkdtemp())

        error_msg = str(context.exception)
        self.assertIn("invalid channel id", error_msg.lower())
        self.assertIn("disk", error_msg.lower())

    @patch(
        "kolibri.core.content.management.commands.importchannel.set_channel_metadata_fields"
    )
    @patch("kolibri.core.content.management.commands.importchannel.transfer_channel")
    @patch(
        "kolibri.core.content.management.commands.importchannel.lookup_channel_listing_status"
    )
    def test_token_resolution_uses_lookup_channel_listing_status(
        self,
        mock_lookup,
        mock_transfer,
        mock_set_fields,
        start_progress_mock,
        import_channel_mock,
    ):
        """importchannel network uses lookup_channel_listing_status, not resolve_channel_token."""
        the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"
        mock_lookup.return_value = {
            "id": the_channel_id,
            "public": True,
            "version": 5,
            "library": "KOLIBRI",
        }
        call_command("importchannel", "network", "my-channel-token")
        mock_lookup.assert_called_once()
        call_kwargs = mock_lookup.call_args[1]
        self.assertEqual(call_kwargs["token"], "my-channel-token")
        mock_set_fields.assert_called_once_with(
            the_channel_id, library="KOLIBRI", version=5
        )

    @patch("kolibri.core.content.utils.channel_transfer.transfer.FileCopy")
    @patch("kolibri.core.content.utils.channel_transfer.get_current_job")
    def test_disk_channel_import(
        self,
        get_current_job_mock,
        FileCopyMock,
        start_progress_mock,
        import_channel_mock,
    ):
        dummy_job = create_dummy_job(is_cancelled=False)
        get_current_job_mock.return_value = dummy_job
        fd, local_path = tempfile.mkstemp()
        os.close(fd)

        with patch(
            "kolibri.core.content.utils.channel_transfer.paths.get_content_database_file_path",
            return_value=local_path,
        ):
            transfer_channel(
                self.the_channel_id,
                COPY_METHOD,
                source_path=tempfile.mkdtemp(),
            )

        import_channel_mock.assert_called_once_with(
            self.the_channel_id,
            cancel_check=dummy_job.is_cancelled,
            contentfolder=None,
            version_requested=False,
        )

    @patch(
        "kolibri.core.content.management.commands.importchannel.lookup_channel_listing_status",
        return_value=None,
    )
    def test_token_not_found_raises_command_error(
        self, mock_lookup, start_progress_mock, import_channel_mock
    ):
        with self.assertRaises(CommandError):
            call_command("importchannel", "network", "bad-token")

    def test_resolve_channel_token_no_longer_imported(
        self, start_progress_mock, import_channel_mock
    ):
        """The old resolve_channel_token function should not be importable from importchannel."""
        self.assertFalse(
            hasattr(importchannel_module, "resolve_channel_token"),
            "resolve_channel_token should be removed",
        )

    @patch(
        "kolibri.core.content.management.commands.importchannel.lookup_channel_listing_status"
    )
    def test_network_import_token_multiple_channels(
        self,
        mock_lookup,
        start_progress_mock,
        import_channel_mock,
    ):
        """Token resolving to multiple channels raises a CommandError."""
        mock_lookup.side_effect = LocationError(
            "Token 'multi-token' matches multiple channels: Channel A (aa480b60a7f4526f886e7df9f4e9b8ca), "
            "Channel B (bb480b60a7f4526f886e7df9f4e9b8cb). Use a channel ID instead."
        )

        with self.assertRaises(CommandError) as context:
            call_command("importchannel", "network", "multi-token")

        self.assertIn("multiple channels", str(context.exception).lower())

    @patch(
        "kolibri.core.content.management.commands.importchannel.set_channel_metadata_fields"
    )
    @patch("kolibri.core.content.management.commands.importchannel.transfer_channel")
    @patch(
        "kolibri.core.content.management.commands.importchannel.lookup_channel_listing_status"
    )
    def test_download_channel_with_token_and_integer_version_passes_version(
        self,
        mock_lookup,
        mock_transfer_channel,
        mock_set_fields,
        start_progress_mock,
        import_channel_mock,
    ):
        """When a token resolves to a channel with version=5, transfer_channel is called with version=5."""
        mock_lookup.return_value = {
            "id": self.the_channel_id,
            "public": True,
            "version": 5,
            "library": None,
        }

        call_command("importchannel", "network", "test-token")

        mock_transfer_channel.assert_called_once()
        _, call_kwargs = mock_transfer_channel.call_args
        self.assertEqual(call_kwargs.get("version"), 5)

    @patch(
        "kolibri.core.content.management.commands.importchannel.set_channel_metadata_fields"
    )
    @patch("kolibri.core.content.management.commands.importchannel.transfer_channel")
    @patch(
        "kolibri.core.content.management.commands.importchannel.lookup_channel_listing_status"
    )
    def test_download_channel_with_token_and_null_version_passes_next(
        self,
        mock_lookup,
        mock_transfer_channel,
        mock_set_fields,
        start_progress_mock,
        import_channel_mock,
    ):
        """When token resolves to a draft channel (version=None), transfer_channel gets version='next'."""
        mock_lookup.return_value = {
            "id": self.the_channel_id,
            "public": True,
            "version": None,
            "library": None,
        }

        call_command("importchannel", "network", "test-token")

        mock_transfer_channel.assert_called_once()
        _, call_kwargs = mock_transfer_channel.call_args
        self.assertEqual(call_kwargs.get("version"), "next")

    @patch(
        "kolibri.core.content.utils.channel_transfer.paths.get_content_database_file_url"
    )
    @patch(
        "kolibri.core.content.utils.channel_transfer.paths.get_content_database_file_path"
    )
    @patch("kolibri.core.content.utils.channel_transfer.transfer.FileDownload")
    @patch("kolibri.core.content.utils.channel_transfer.get_current_job")
    def test_download_channel_with_uuid_passes_no_version(
        self,
        get_current_job_mock,
        FileDownloadMock,
        local_path_mock,
        remote_path_mock,
        start_progress_mock,
        import_channel_mock,
    ):
        """When a UUID (not a token) is passed, get_content_database_file_url is called with version=None."""
        dummy_job = create_dummy_job()
        get_current_job_mock.return_value = dummy_job
        fd, local_path = tempfile.mkstemp()
        os.close(fd)
        local_path_mock.return_value = local_path
        remote_path_mock.return_value = "notest"
        import_channel_mock.return_value = True

        call_command("importchannel", "network", self.the_channel_id)

        _, call_kwargs = remote_path_mock.call_args
        # Assert `version` is explicitly present as a kwarg (not merely absent, which would
        # also make .get() return None). Before the fix, version is not passed at all.
        self.assertIn("version", call_kwargs)
        self.assertIsNone(call_kwargs["version"])


@patch(
    "kolibri.core.content.utils.resource_import.lookup_channel_listing_status",
)
class ChannelDbVersionTestCase(TestCase):
    """Tests for _channel_db_version property on RemoteResourceImportManagerBase."""

    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_database_file_url",
        return_value="http://test/channel.db",
    )
    def test_token_with_integer_version_uses_versioned_db_url(
        self, db_url_mock, FileDownloadMock, mock_lookup
    ):
        """When token is set and remote_version is an int, versioned URL is passed to file transfer."""
        mock_lookup.return_value = {
            "id": self.the_channel_id,
            "public": True,
            "version": 5,
            "library": None,
        }
        manager = RemoteChannelDatabaseImportManager(
            self.the_channel_id,
            token="some-token",
        )
        manager.create_channel_database_transfer("/tmp/test.db")

        db_url_mock.assert_called_with(
            self.the_channel_id, baseurl=manager.baseurl, version=5
        )

    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_database_file_url",
        return_value="http://test/channel-next.db",
    )
    def test_token_with_null_version_uses_next_db_url(
        self, db_url_mock, FileDownloadMock, mock_lookup
    ):
        """When token is set and remote_version is None (draft), version='next' is used."""
        mock_lookup.return_value = {
            "id": self.the_channel_id,
            "public": True,
            "version": None,
            "library": None,
        }
        manager = RemoteChannelDatabaseImportManager(
            self.the_channel_id,
            token="some-token",
        )
        manager.create_channel_database_transfer("/tmp/test.db")

        db_url_mock.assert_called_with(
            self.the_channel_id, baseurl=manager.baseurl, version="next"
        )

    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_database_file_url",
        return_value="http://test/channel.db",
    )
    def test_no_token_uses_standard_db_url(
        self, db_url_mock, FileDownloadMock, mock_lookup
    ):
        """When no token (peer import or plain channel-ID import), standard URL is used."""
        mock_lookup.return_value = {
            "id": self.the_channel_id,
            "public": True,
            "version": 9,
            "library": None,
        }
        manager = RemoteChannelDatabaseImportManager(
            self.the_channel_id,
            # No token — simulates peer import or channel-ID-only import
        )
        manager.create_channel_database_transfer("/tmp/test.db")

        db_url_mock.assert_called_with(
            self.the_channel_id, baseurl=manager.baseurl, version=None
        )

    @patch(
        "kolibri.core.content.utils.resource_import.SameHostSession",
    )
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_database_file_url",
        return_value="http://test/channel.db",
    )
    def test_get_channel_database_size_uses_versioned_url(
        self, db_url_mock, MockSession, mock_lookup
    ):
        """get_channel_database_size also constructs the versioned URL when a token is set."""
        mock_lookup.return_value = {
            "id": self.the_channel_id,
            "public": True,
            "version": 7,
            "library": None,
        }
        mock_response = MagicMock()
        mock_response.headers = {"Content-Length": "1024"}
        MockSession.return_value.head.return_value = mock_response

        manager = RemoteChannelDatabaseImportManager(
            self.the_channel_id,
            token="some-token",
        )
        manager.get_channel_database_size()

        db_url_mock.assert_called_with(
            self.the_channel_id, baseurl=manager.baseurl, version=7
        )

    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_database_file_url",
        return_value="http://test/channel.db",
    )
    def test_token_with_listing_not_found_uses_standard_db_url(
        self, db_url_mock, FileDownloadMock, mock_lookup
    ):
        """When a token is set but the listing lookup returns None, the standard URL is used."""
        mock_lookup.return_value = None
        manager = RemoteChannelDatabaseImportManager(
            self.the_channel_id,
            token="some-token",
        )
        manager.create_channel_database_transfer("/tmp/test.db")

        db_url_mock.assert_called_with(
            self.the_channel_id, baseurl=manager.baseurl, version=None
        )

    def test_token_sets_version_requested_true(self, mock_lookup):
        """A token indicates the caller explicitly requested a specific version — downgrade allowed."""
        mock_lookup.return_value = {
            "id": self.the_channel_id,
            "public": True,
            "version": 3,
            "library": None,
        }
        manager = RemoteChannelDatabaseImportManager(
            self.the_channel_id,
            token="some-token",
        )
        self.assertTrue(manager.version_requested)

    def test_no_token_sets_version_requested_false(self, mock_lookup):
        """Without a token, version_requested is False — downgrades remain blocked."""
        mock_lookup.return_value = {
            "id": self.the_channel_id,
            "public": True,
            "version": 9,
            "library": None,
        }
        manager = RemoteChannelDatabaseImportManager(self.the_channel_id)
        self.assertFalse(manager.version_requested)


@patch(
    "kolibri.core.content.utils.resource_import.lookup_channel_listing_status",
    return_value={
        "id": "6199dde695db4ee4ab392222d5af1e5c",
        "public": False,
        "version": None,
        "library": None,
    },
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
        local_path_mock.side_effect = [local_path_1, local_path_2, local_path_2]
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
        local_path_mock.side_effect = [
            local_dest_path,
            local_dest_path,
            local_src_path,
        ] * 10
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
            local_dest_path_1,
            local_dest_path_2,
            local_dest_path_2,
            local_dest_path_3,
            local_dest_path_3,
            local_dest_path_4,
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
        with patch(
            "kolibri.core.content.utils.resource_import.transfer.FileDownload.run",
            side_effect=HTTPError("Not Found", response=MagicMock(status_code=404)),
        ):
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
    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload.finalize")
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
    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload.finalize")
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
        # Ensure single threaded operation for deterministic testing
        with patch(
            "kolibri.core.tasks.utils.get_fd_limit", return_value=1
        ), self.assertRaises(InsufficientStorageSpaceError):
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
        path_mock.side_effect = [dest_path, dest_path, "/test/dne"]
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
        path_mock.side_effect = [dest_path, dest_path, "/test/dne"]
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
        get_import_export_mock,
        channel_list_status_mock,
    ):
        fd1, dest_path_1 = tempfile.mkstemp()
        fd2, dest_path_2 = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        path_mock.side_effect = [
            dest_path_1,
            dest_path_1,
            dest_path_2,
            dest_path_2,
        ]
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

    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload.finalize")
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
        path_mock.side_effect = [
            dest_path_1,
            dest_path_1,
            dest_path_2,
            dest_path_2,
        ]
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
        # Ensure single threaded operation for deterministic testing
        with patch("kolibri.core.tasks.utils.get_fd_limit", return_value=1):
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
        path_mock.side_effect = [dest_path, dest_path, "/test/dne"]
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
            local_dest_path_1,
            local_dest_path_2,
            local_dest_path_2,
            local_dest_path_3,
            local_dest_path_3,
            local_dest_path_4,
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

        with patch(
            "kolibri.core.content.utils.resource_import.transfer.FileDownload.run",
            side_effect=HTTPError,
        ), self.assertRaises(HTTPError):
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
        path_mock.side_effect = [dest_path, dest_path, src_path]
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
        path_mock.side_effect = [dest_path, dest_path]
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
        local_path_mock.side_effect = [local_path, local_path]
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

    def test_manager_passes_token_to_lookup(
        self, get_import_export_mock, channel_list_status_mock
    ):
        channel_list_status_mock.return_value = {
            "id": self.the_channel_id,
            "public": True,
            "version": 5,
            "library": "KOLIBRI",
        }
        RemoteChannelResourceImportManager(
            self.the_channel_id,
            token="test-token",
        )
        channel_list_status_mock.assert_called_once_with(
            channel_id=self.the_channel_id,
            token="test-token",
            baseurl=channel_list_status_mock.call_args[1].get("baseurl"),
        )

    @patch("kolibri.core.content.utils.resource_import.transfer.FileCopy")
    @patch(
        "kolibri.core.content.utils.resource_import.os.path.getsize",
        return_value=1,
    )
    @patch(
        "kolibri.core.content.utils.paths.existing_file_path_in_content_fallback_dirs",
        return_value="/fallback/storage/a/b/abc123.mp4",
    )
    @patch(
        "kolibri.core.content.utils.resource_import.os.path.isfile",
        return_value=True,
    )
    def test_start_file_transfer_fallback_matching_size_skips(
        self,
        isfile_mock,
        fallback_mock,
        getsize_mock,
        FileCopy_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    files__contentnode__channel_id=self.the_channel_id
                )
                .values("id", "file_size", "extension")
                .order_by("id")[:1]
            ),
            1,
        )
        manager = DiskChannelResourceImportManager(
            self.the_channel_id,
            path=tempfile.mkdtemp(),
        )
        manager.run()
        FileCopy_mock.assert_not_called()

    @patch("kolibri.core.content.utils.resource_import.transfer.FileCopy")
    @patch(
        "kolibri.core.content.utils.resource_import.os.path.getsize",
        return_value=99,  # wrong size — expected is 1
    )
    @patch(
        "kolibri.core.content.utils.paths.existing_file_path_in_content_fallback_dirs",
        return_value="/fallback/storage/a/b/abc123.mp4",
    )
    @patch(
        "kolibri.core.content.utils.resource_import.os.path.isfile",
        return_value=True,
    )
    def test_start_file_transfer_fallback_wrong_size_downloads(
        self,
        isfile_mock,
        fallback_mock,
        getsize_mock,
        FileCopy_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    files__contentnode__channel_id=self.the_channel_id
                )
                .values("id", "file_size", "extension")
                .order_by("id")[:1]
            ),
            1,
        )
        manager = DiskChannelResourceImportManager(
            self.the_channel_id,
            path=tempfile.mkdtemp(),
        )
        manager.run()
        FileCopy_mock.assert_called_once()

    @patch("kolibri.core.content.utils.resource_import.transfer.FileCopy")
    @patch(
        "kolibri.core.content.utils.paths.existing_file_path_in_content_fallback_dirs",
        return_value=None,
    )
    @patch(
        "kolibri.core.content.utils.resource_import.os.path.isfile",
        return_value=False,
    )
    def test_start_file_transfer_no_fallback_downloads(
        self,
        isfile_mock,
        fallback_mock,
        FileCopy_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    files__contentnode__channel_id=self.the_channel_id
                )
                .values("id", "file_size", "extension")
                .order_by("id")[:1]
            ),
            1,
        )
        manager = DiskChannelResourceImportManager(
            self.the_channel_id,
            path=tempfile.mkdtemp(),
        )
        manager.run()
        FileCopy_mock.assert_called_once()

    @patch("kolibri.core.content.utils.resource_import.transfer.FileCopy")
    @patch(
        "kolibri.core.content.utils.resource_import.os.path.getsize",
        return_value=1,
    )
    @patch(
        "kolibri.core.content.utils.resource_import.os.path.isfile",
        return_value=True,
    )
    def test_start_file_transfer_primary_matching_size_skips(
        self,
        isfile_mock,
        getsize_mock,
        FileCopy_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    files__contentnode__channel_id=self.the_channel_id
                )
                .values("id", "file_size", "extension")
                .order_by("id")[:1]
            ),
            1,
        )
        manager = DiskChannelResourceImportManager(
            self.the_channel_id,
            path=tempfile.mkdtemp(),
        )
        manager.run()
        FileCopy_mock.assert_not_called()

    @patch("kolibri.core.content.utils.resource_import.transfer.FileCopy")
    @patch(
        "kolibri.core.content.utils.resource_import.os.path.getsize",
        return_value=99,  # wrong size — expected is 1
    )
    @patch(
        "kolibri.core.content.utils.resource_import.os.path.isfile",
        return_value=True,
    )
    def test_start_file_transfer_primary_wrong_size_downloads(
        self,
        isfile_mock,
        getsize_mock,
        FileCopy_mock,
        get_import_export_mock,
        channel_list_status_mock,
    ):
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        get_import_export_mock.return_value = (
            1,
            list(
                LocalFile.objects.filter(
                    files__contentnode__channel_id=self.the_channel_id
                )
                .values("id", "file_size", "extension")
                .order_by("id")[:1]
            ),
            1,
        )
        manager = DiskChannelResourceImportManager(
            self.the_channel_id,
            path=tempfile.mkdtemp(),
        )
        manager.run()
        FileCopy_mock.assert_called_once()


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class ExportChannelTestCase(TestCase):
    """
    Test case for the exportchannel management command.
    """

    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    @patch(
        "kolibri.core.content.utils.resource_export.paths.get_content_database_file_path"
    )
    @patch("kolibri.core.content.utils.resource_export.transfer.FileCopy")
    @patch("kolibri.core.content.utils.resource_export.JobProgressMixin.is_cancelled")
    @patch(
        "kolibri.core.content.utils.resource_export.JobProgressMixin.check_for_cancel"
    )
    def test_cancel_during_transfer(
        self,
        check_for_cancel_mock,
        is_cancelled_mock,
        FileCopyMock,
        local_path_mock,
    ):
        # Make sure we clean up a database file that is canceled during export
        is_cancelled_mock.return_value = False
        fd1, local_dest_path = tempfile.mkstemp()
        fd2, local_src_path = tempfile.mkstemp()
        os.close(fd1)
        os.close(fd2)
        # Called 3 times: once in prepare_for_export() for size check, twice in do_channel_database_export()
        local_path_mock.side_effect = [local_src_path, local_src_path, local_dest_path]
        FileCopyMock.return_value.__enter__ = MagicMock(
            return_value=FileCopyMock.return_value
        )
        FileCopyMock.return_value.__exit__ = MagicMock(return_value=False)
        FileCopyMock.return_value.run.side_effect = TransferCanceled()
        call_command("exportchannel", self.the_channel_id, local_dest_path)
        FileCopyMock.assert_called_with(
            local_src_path, local_dest_path, cancel_check=is_cancelled_mock
        )
        check_for_cancel_mock.assert_called_with()
        self.assertTrue(os.path.exists(local_dest_path))


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
@patch("kolibri.core.content.utils.resource_export.get_import_export_nodes")
@patch("kolibri.core.content.utils.resource_export.get_content_nodes_data")
@patch("kolibri.core.content.utils.resource_export.ContentManifest")
class ExportContentTestCase(TestCase):
    """
    Test case for the exportcontent management command.
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    @patch("kolibri.core.content.utils.resource_export.transfer.FileCopy")
    @patch("kolibri.core.content.utils.resource_export.JobProgressMixin.is_cancelled")
    @patch(
        "kolibri.core.content.utils.resource_export.JobProgressMixin.check_for_cancel"
    )
    def test_local_cancel_immediately(
        self,
        check_for_cancel_mock,
        is_cancelled_mock,
        FileCopyMock,
        ContentManifestMock,
        get_content_nodes_data_mock,
        get_import_export_nodes_mock,
    ):
        # If cancel comes in before we do anything, make sure nothing happens!
        is_cancelled_mock.return_value = True
        FileCopyMock.return_value.__enter__ = MagicMock(
            return_value=FileCopyMock.return_value
        )
        FileCopyMock.return_value.__exit__ = MagicMock(return_value=False)
        FileCopyMock.return_value.run.side_effect = TransferCanceled()
        get_content_nodes_data_mock.return_value = (
            1,
            [LocalFile.objects.values("id", "file_size", "extension").first()],
            10,
        )
        call_command("exportcontent", self.the_channel_id, tempfile.mkdtemp())
        is_cancelled_mock.assert_called()
        # FileCopy should not actually copy files since is_cancelled returns True
        check_for_cancel_mock.assert_called_with()

    @patch(
        "kolibri.core.content.utils.resource_export.paths.get_content_storage_file_path"
    )
    @patch("kolibri.core.content.utils.resource_export.transfer.FileCopy")
    @patch(
        "kolibri.core.content.utils.resource_export.JobProgressMixin.is_cancelled",
        side_effect=FalseThenTrue(times=1),
    )
    @patch(
        "kolibri.core.content.utils.resource_export.JobProgressMixin.check_for_cancel"
    )
    def test_local_cancel_during_transfer(
        self,
        check_for_cancel_mock,
        is_cancelled_mock,
        FileCopyMock,
        local_path_mock,
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
        FileCopyMock.return_value.__enter__ = MagicMock(
            return_value=FileCopyMock.return_value
        )
        FileCopyMock.return_value.__exit__ = MagicMock(return_value=False)
        FileCopyMock.return_value.run.side_effect = TransferCanceled()
        get_content_nodes_data_mock.return_value = (
            1,
            [LocalFile.objects.values("id", "file_size", "extension").first()],
            10,
        )
        call_command("exportcontent", self.the_channel_id, tempfile.mkdtemp())
        is_cancelled_mock.assert_called()
        check_for_cancel_mock.assert_called_with()

    @patch(
        "kolibri.core.content.utils.resource_export.DiskChannelResourceExportManager._copy_content_files"
    )
    @patch(
        "kolibri.core.content.utils.resource_export.JobProgressMixin.is_cancelled",
        return_value=False,
    )
    def test_manifest_only(
        self,
        is_cancelled_mock,
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


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class DiskChannelResourceExportManagerTestCase(TestCase):
    """
    Test case for the DiskChannelResourceExportManager class.
    Tests that progress is properly coordinated across export phases.

    Uses real fixture data for content queries, only mocks file operations.
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def setUp(self):
        # Only mock what we must: file operations and progress tracking
        self.patches = [
            patch(
                "kolibri.core.content.utils.resource_export.paths.get_content_database_file_path"
            ),
            patch("kolibri.core.content.utils.resource_export.transfer.FileCopy"),
            patch(
                "kolibri.core.content.utils.resource_export.JobProgressMixin.start_progress"
            ),
            patch(
                "kolibri.core.content.utils.resource_export.JobProgressMixin.update_progress"
            ),
        ]

        mocks = [p.start() for p in self.patches]
        self.db_path_mock = mocks[0]
        self.file_copy_mock = mocks[1]
        self.start_progress_mock = mocks[2]
        self.update_progress_mock = mocks[3]

        # Configure FileCopy mock as a context manager
        self.file_copy_mock.return_value.__enter__ = MagicMock(
            return_value=self.file_copy_mock.return_value
        )
        self.file_copy_mock.return_value.__exit__ = MagicMock(return_value=False)
        self.file_copy_mock.return_value.run = MagicMock()

    def tearDown(self):
        for p in self.patches:
            p.stop()

    def test_progress_initialized_once_for_both_phases(self):
        """Test that progress is initialized once with combined total for both phases."""
        with temp_file_with_size(1000) as db_path:
            self.db_path_mock.return_value = db_path

            manager = DiskChannelResourceExportManager(
                self.the_channel_id,
                tempfile.mkdtemp(),
            )
            manager.run()

            # Verify start_progress was called once (not twice for each phase)
            self.start_progress_mock.assert_called_once()
            # Total should include channel_db_size (1000) + content from fixture
            call_args = self.start_progress_mock.call_args
            total = call_args[1].get("total", 0)
            self.assertGreaterEqual(total, 1000)  # At least the DB size

    def test_export_channel_only(self):
        """Test that export_content=False only exports channel database."""
        with temp_file_with_size(1000) as db_path:
            self.db_path_mock.return_value = db_path

            manager = DiskChannelResourceExportManager(
                self.the_channel_id,
                tempfile.mkdtemp(),
                export_channel_database=True,
                export_content=False,
            )
            manager.run()

            # With no content export, total should be just the DB size
            call_args = self.start_progress_mock.call_args
            total = call_args[1].get("total", 0)
            self.assertEqual(total, 1000)

    def test_export_content_only(self):
        """Test that export_channel_database=False only exports content files."""
        with temp_file_with_size(0) as db_path:
            self.db_path_mock.return_value = db_path

            manager = DiskChannelResourceExportManager(
                self.the_channel_id,
                tempfile.mkdtemp(),
                export_channel_database=False,
                export_content=True,
            )
            manager.run()

            # With no DB export, total should be just content (0 DB size)
            call_args = self.start_progress_mock.call_args
            total = call_args[1].get("total", 0)
            # Content size from fixture - should be > 0 if fixture has content
            self.assertGreaterEqual(total, 0)


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class ImportManagerWithChannelDatabaseTestCase(TestCase):
    """
    Test case for import managers with import_channel_database=True.
    Tests that progress is properly coordinated across channel database import and content import.

    Uses real fixture data for content queries, only mocks file/network operations.
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def setUp(self):
        # Only mock network/file operations and progress tracking
        # Let get_import_export_data run on real fixture data
        self.patches = [
            patch("kolibri.core.content.utils.resource_import.annotation"),
            patch(
                "kolibri.core.content.utils.resource_import.lookup_channel_listing_status"
            ),
            patch(
                "kolibri.core.content.utils.resource_import.JobProgressMixin.start_progress"
            ),
            patch(
                "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
                return_value=False,
            ),
        ]

        mocks = [p.start() for p in self.patches]
        self.annotation_mock = mocks[0]
        self.channel_list_status_mock = mocks[1]
        self.start_progress_mock = mocks[2]
        self.is_cancelled_mock = mocks[3]

        # Configure annotation mock default
        self.annotation_mock.calculate_dummy_progress_for_annotation.return_value = 0
        # Default lookup return value - tests can override this
        self.channel_list_status_mock.return_value = {
            "id": self.the_channel_id,
            "public": None,
            "version": None,
            "library": None,
        }

    def tearDown(self):
        for p in self.patches:
            p.stop()

    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_database_file_url"
    )
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_database_file_path"
    )
    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    @patch("kolibri.core.content.utils.resource_import.import_channel_by_id")
    def test_remote_import_progress_includes_channel_database(
        self,
        import_channel_mock,
        FileDownloadMock,
        db_path_mock,
        db_url_mock,
    ):
        """Test that remote import with import_channel_database=True includes channel DB size in progress."""
        channel_db_size = 2000

        # Mock the HEAD request for channel database size
        mock_session = MagicMock()
        mock_response = MagicMock()
        mock_response.headers = {"Content-Length": str(channel_db_size)}
        mock_session.head.return_value = mock_response

        # Configure FileDownload mock as context manager
        FileDownloadMock.return_value.__enter__ = MagicMock(
            return_value=FileDownloadMock.return_value
        )
        FileDownloadMock.return_value.__exit__ = MagicMock(return_value=False)
        FileDownloadMock.return_value.run = MagicMock()

        import_channel_mock.return_value = True

        manager = RemoteChannelResourceImportManager(
            self.the_channel_id,
            import_channel_database=True,
        )
        manager.session = mock_session

        manager.run()

        # With import_channel_database=True, start_progress is called with estimated
        # total (channel_db_size * 10001)
        self.start_progress_mock.assert_called_once()
        call_args = self.start_progress_mock.call_args
        total = call_args[1].get("total", 0)
        expected_estimated = channel_db_size * 10001
        self.assertEqual(total, expected_estimated)

    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_database_file_path"
    )
    @patch("kolibri.core.content.utils.resource_import.transfer.FileCopy")
    @patch("kolibri.core.content.utils.resource_import.import_channel_by_id")
    def test_disk_import_progress_includes_channel_database(
        self,
        import_channel_mock,
        FileCopyMock,
        db_path_mock,
    ):
        """Test that disk import with import_channel_database=True includes channel DB size in progress."""
        channel_db_size = 1500

        with temp_file_with_size(channel_db_size) as source_db_path:
            dest_dir = tempfile.mkdtemp()
            db_path_mock.side_effect = (
                lambda channel_id, datafolder=None, contentfolder=None: (
                    source_db_path
                    if datafolder
                    else os.path.join(dest_dir, "db.sqlite3")
                )
            )

            # Configure FileCopy mock as context manager
            FileCopyMock.return_value.__enter__ = MagicMock(
                return_value=FileCopyMock.return_value
            )
            FileCopyMock.return_value.__exit__ = MagicMock(return_value=False)
            FileCopyMock.return_value.run = MagicMock()

            import_channel_mock.return_value = True

            manager = DiskChannelResourceImportManager(
                self.the_channel_id,
                path=tempfile.mkdtemp(),
                import_channel_database=True,
            )

            manager.run()

            # With import_channel_database=True, start_progress is called with estimated
            # total (channel_db_size * 10001)
            self.start_progress_mock.assert_called_once()
            call_args = self.start_progress_mock.call_args
            total = call_args[1].get("total", 0)
            expected_estimated = channel_db_size * 10001
            self.assertEqual(total, expected_estimated)

    def test_import_without_channel_database_flag(self):
        """Test that import without import_channel_database=True does not include channel DB size."""
        manager = RemoteChannelResourceImportManager(
            self.the_channel_id,
            import_channel_database=False,
        )

        manager.run()

    def test_token_metadata_stored_on_channel_metadata(self):
        """When a token is provided, library and version from lookup flow to ChannelMetadata."""
        self.channel_list_status_mock.return_value = {
            "id": self.the_channel_id,
            "public": True,
            "version": 9,
            "library": "KOLIBRI",
        }

        manager = RemoteChannelResourceImportManager(
            self.the_channel_id,
            token="some-channel-token",
        )
        self.assertEqual(manager.library, "KOLIBRI")
        self.assertEqual(manager.remote_version, 9)

    def test_no_token_leaves_library_and_version_as_none(self):
        self.channel_list_status_mock.return_value = {
            "id": self.the_channel_id,
            "public": True,
            "version": None,
            "library": None,
        }

        manager = RemoteChannelResourceImportManager(self.the_channel_id)
        self.assertIsNone(manager.library)
        self.assertEqual(manager.remote_version, 0)
        self.assertTrue(manager.listing_found)

    def test_listing_not_found_sets_listing_found_false(self):
        """When the channel lookup returns None (e.g. 404), listing_found is False."""
        self.channel_list_status_mock.return_value = None

        manager = RemoteChannelResourceImportManager(self.the_channel_id)
        self.assertFalse(manager.listing_found)
        self.assertIsNone(manager.library)
        self.assertIsNone(manager.remote_version)

    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_database_file_url",
        return_value="http://test/channel.db",
    )
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_database_file_path",
        return_value="/tmp/test.db",
    )
    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    @patch("kolibri.core.content.utils.resource_import.import_channel_by_id")
    def test_library_set_on_channel_metadata_after_remoteimport(
        self,
        import_channel_mock,
        FileDownloadMock,
        db_path_mock,
        db_url_mock,
    ):
        """Token metadata flows to set_channel_metadata_fields after remoteimport."""
        self.channel_list_status_mock.return_value = {
            "id": self.the_channel_id,
            "public": True,
            "version": 9,
            "library": "KOLIBRI",
        }

        import_channel_mock.return_value = True
        FileDownloadMock.return_value.__enter__ = MagicMock(
            return_value=FileDownloadMock.return_value
        )
        FileDownloadMock.return_value.__exit__ = MagicMock(return_value=False)
        FileDownloadMock.return_value.run = MagicMock()

        mock_session = MagicMock()
        mock_response = MagicMock()
        mock_response.headers = {"Content-Length": "1000"}
        mock_session.head.return_value = mock_response

        with patch(
            "kolibri.core.content.utils.resource_import.SameHostSession",
            return_value=mock_session,
        ):
            remoteimport(
                self.the_channel_id,
                token="my-channel-token",
            )

        self.annotation_mock.set_channel_metadata_fields.assert_called_once_with(
            self.the_channel_id,
            library="KOLIBRI",
            version=9,
        )

    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_database_file_url",
        return_value="http://test/channel.db",
    )
    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_database_file_path",
        return_value="/tmp/test.db",
    )
    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    @patch("kolibri.core.content.utils.resource_import.import_channel_by_id")
    def test_no_metadata_update_when_listing_not_found(
        self,
        import_channel_mock,
        FileDownloadMock,
        db_path_mock,
        db_url_mock,
    ):
        """When listing returns None (404), set_channel_metadata_fields is not called."""
        self.channel_list_status_mock.return_value = None  # 404 from Studio

        import_channel_mock.return_value = True
        FileDownloadMock.return_value.__enter__ = MagicMock(
            return_value=FileDownloadMock.return_value
        )
        FileDownloadMock.return_value.__exit__ = MagicMock(return_value=False)
        FileDownloadMock.return_value.run = MagicMock()

        mock_session = MagicMock()
        mock_response = MagicMock()
        mock_response.headers = {"Content-Length": "1000"}
        mock_session.head.return_value = mock_response

        with patch(
            "kolibri.core.content.utils.resource_import.SameHostSession",
            return_value=mock_session,
        ):
            remoteimport(
                self.the_channel_id,
                token="my-channel-token",
            )

        self.annotation_mock.set_channel_metadata_fields.assert_not_called()


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class NewChannelImportRegressionTestCase(TestCase):
    """
    Regression test for importing a channel that doesn't exist locally yet.

    When import_channel_database=True and the channel doesn't exist in the
    local database, the channel database must be imported BEFORE calling
    get_import_data(), otherwise it will fail trying to query non-existent
    content nodes with: TypeError: unsupported operand type(s) for *: 'int' and 'NoneType'
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def test_new_channel_import_does_not_fail_on_missing_channel(self):
        """
        Import a channel that doesn't exist locally with import_channel_database=True.

        Verifies that do_channel_database_import() is called BEFORE prepare_for_import()
        so that get_import_export_data() can query the now-existing content nodes.
        """
        # Use a channel ID that does NOT exist in the database
        new_channel_id = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

        manager = DiskChannelResourceImportManager(
            new_channel_id,
            path=tempfile.mkdtemp(),
            import_channel_database=True,
        )

        # Track call order
        call_order = []

        def mock_db_import():
            call_order.append("db_import")

        def mock_prepare():
            call_order.append("prepare")
            # Set attributes that prepare_for_import normally sets
            manager.total_bytes = 1000
            manager.total_bytes_to_transfer = 1000
            manager.total_resource_count = 5

        # Mock methods - we're testing the ordering, not the actual operations
        with patch.object(
            manager, "get_channel_database_size", return_value=100
        ), patch.object(
            manager, "do_channel_database_import", side_effect=mock_db_import
        ), patch.object(
            manager, "prepare_for_import", side_effect=mock_prepare
        ), patch.object(manager, "run_import", return_value=(0, 0)), patch.object(
            manager, "finalize_standalone_progress_tracking"
        ):
            manager.run()

            # Verify do_channel_database_import is called BEFORE prepare_for_import
            self.assertEqual(call_order, ["db_import", "prepare"])

    def test_database_ready_set_before_content_import(self):
        """
        When import_channel_database=True, the manager should set
        database_ready=True in job metadata right after importing the channel
        database and before starting the content file import.

        The frontend (NewChannelVersionPage) watches for this flag to redirect
        the user to the content selection page while files are still importing.
        """
        manager = DiskChannelResourceImportManager(
            self.the_channel_id,
            path=tempfile.mkdtemp(),
            import_channel_database=True,
        )

        call_order = []

        def mock_db_import():
            call_order.append("db_import")

        def mock_prepare():
            call_order.append("prepare")
            manager.total_bytes = 1000
            manager.total_bytes_to_transfer = 1000
            manager.total_resource_count = 5

        def mock_run_import():
            call_order.append("run_import")
            return (0, 0)

        mock_job = MagicMock()

        with patch.object(
            manager, "get_channel_database_size", return_value=100
        ), patch.object(
            manager, "do_channel_database_import", side_effect=mock_db_import
        ), patch.object(
            manager, "prepare_for_import", side_effect=mock_prepare
        ), patch.object(
            manager, "run_import", side_effect=mock_run_import
        ), patch.object(manager, "finalize_standalone_progress_tracking"):
            manager.job = mock_job
            manager.run()

            # database_ready must be set after db_import but before run_import
            mock_job.update_metadata.assert_any_call(database_ready=True)
            db_ready_call_index = None
            for i, c in enumerate(mock_job.update_metadata.call_args_list):
                if c == call(database_ready=True):
                    db_ready_call_index = i
                    break
            self.assertIsNotNone(
                db_ready_call_index, "database_ready=True was never set"
            )
            # Verify ordering: db_import happened before database_ready,
            # and run_import happened after
            db_import_index = call_order.index("db_import")
            run_import_index = call_order.index("run_import")
            self.assertGreater(run_import_index, db_import_index)


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class UpgradeDBReuseTestCase(TestCase):
    """
    Test that do_channel_database_import reuses a previously-downloaded upgrade
    database (e.g. from diff_stats) instead of re-downloading, and cleans it up
    after import.
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def setUp(self):
        self.patches = [
            patch("kolibri.core.content.utils.resource_import.annotation"),
            patch(
                "kolibri.core.content.utils.resource_import.lookup_channel_listing_status"
            ),
            patch(
                "kolibri.core.content.utils.resource_import.JobProgressMixin.start_progress"
            ),
            patch(
                "kolibri.core.content.utils.resource_import.JobProgressMixin.is_cancelled",
                return_value=False,
            ),
            patch(
                "kolibri.core.content.utils.resource_import.import_channel_by_id",
                return_value=True,
            ),
        ]

        mocks = [p.start() for p in self.patches]
        self.annotation_mock = mocks[0]
        self.annotation_mock.calculate_dummy_progress_for_annotation.return_value = 0
        mocks[1].return_value = {
            "id": self.the_channel_id,
            "public": None,
            "version": None,
            "library": None,
        }

    def tearDown(self):
        for p in self.patches:
            p.stop()

    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_database_file_url"
    )
    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    @patch("kolibri.core.content.utils.resource_import.transfer.FileCopy")
    def test_reuses_upgrade_db_instead_of_downloading(
        self,
        FileCopyMock,
        FileDownloadMock,
        db_url_mock,
    ):
        """
        When a previously-downloaded upgrade database exists on disk (e.g. from
        diff_stats), do_channel_database_import should use a local FileCopy from
        the upgrade path instead of creating a new FileDownload from the remote.
        """
        # Create a fake upgrade database file
        upgrade_db_path = paths.get_upgrade_content_database_file_path(
            self.the_channel_id
        )
        os.makedirs(os.path.dirname(upgrade_db_path), exist_ok=True)
        with open(upgrade_db_path, "wb") as f:
            f.write(b"x" * 500)

        # Configure FileCopy mock as context manager
        FileCopyMock.return_value.__enter__ = MagicMock(
            return_value=FileCopyMock.return_value
        )
        FileCopyMock.return_value.__exit__ = MagicMock(return_value=False)
        FileCopyMock.return_value.run = MagicMock()

        # Configure FileDownload mock as context manager
        FileDownloadMock.return_value.__enter__ = MagicMock(
            return_value=FileDownloadMock.return_value
        )
        FileDownloadMock.return_value.__exit__ = MagicMock(return_value=False)
        FileDownloadMock.return_value.run = MagicMock()

        try:
            manager = RemoteChannelResourceImportManager(
                self.the_channel_id,
                import_channel_database=True,
            )
            # Mock session for get_channel_database_size HEAD request
            mock_session = MagicMock()
            mock_response = MagicMock()
            mock_response.headers = {"Content-Length": "500"}
            mock_session.head.return_value = mock_response
            manager.session = mock_session

            manager.do_channel_database_import()

            # Should use FileCopy from upgrade path, NOT FileDownload
            FileCopyMock.assert_called_once()
            call_args = FileCopyMock.call_args
            self.assertEqual(call_args[0][0], upgrade_db_path)
            FileDownloadMock.assert_not_called()
        finally:
            if os.path.exists(upgrade_db_path):
                os.remove(upgrade_db_path)

    @patch(
        "kolibri.core.content.utils.resource_import.paths.get_content_database_file_url"
    )
    @patch("kolibri.core.content.utils.resource_import.transfer.FileDownload")
    @patch("kolibri.core.content.utils.resource_import.transfer.FileCopy")
    def test_cleans_up_upgrade_db_after_import(
        self,
        FileCopyMock,
        FileDownloadMock,
        db_url_mock,
    ):
        """
        After importing from the upgrade database, do_channel_database_import
        should remove the upgrade file from disk.
        """
        upgrade_db_path = paths.get_upgrade_content_database_file_path(
            self.the_channel_id
        )
        os.makedirs(os.path.dirname(upgrade_db_path), exist_ok=True)
        with open(upgrade_db_path, "wb") as f:
            f.write(b"x" * 500)

        # Configure FileCopy mock as context manager
        FileCopyMock.return_value.__enter__ = MagicMock(
            return_value=FileCopyMock.return_value
        )
        FileCopyMock.return_value.__exit__ = MagicMock(return_value=False)
        FileCopyMock.return_value.run = MagicMock()

        try:
            manager = RemoteChannelResourceImportManager(
                self.the_channel_id,
                import_channel_database=True,
            )
            mock_session = MagicMock()
            mock_response = MagicMock()
            mock_response.headers = {"Content-Length": "500"}
            mock_session.head.return_value = mock_response
            manager.session = mock_session

            manager.do_channel_database_import()

            # Upgrade DB should be cleaned up after import
            self.assertFalse(
                os.path.exists(upgrade_db_path),
                "Upgrade database should be removed after import",
            )
        finally:
            if os.path.exists(upgrade_db_path):
                os.remove(upgrade_db_path)


class TestGetChannelLookupUrl(TestCase):
    def test_channel_versions_parameter_always_included(self):
        url = get_channel_lookup_url(identifier="abc123")
        self.assertIn("channel_versions=true", url)

    def test_channel_versions_parameter_included_without_identifier(self):
        url = get_channel_lookup_url()
        self.assertIn("channel_versions=true", url)


class LookupChannelListingStatusTest(TestCase):
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def _mock_client(self, response_data):
        mock_response = MagicMock()
        mock_response.json.return_value = response_data
        mock_client = MagicMock()
        mock_client.get.return_value = mock_response
        return mock_client

    @patch(
        "kolibri.core.content.utils.resource_import.NetworkClient.discover_from_address"
    )
    def test_returns_dict_with_all_fields(self, mock_build):
        mock_build.return_value = self._mock_client(
            [
                {
                    "id": self.the_channel_id,
                    "public": True,
                    "version": 5,
                    "library": "KOLIBRI",
                }
            ]
        )
        result = lookup_channel_listing_status(channel_id=self.the_channel_id)
        self.assertEqual(result["id"], self.the_channel_id)
        self.assertTrue(result["public"])
        self.assertEqual(result["version"], 5)
        self.assertEqual(result["library"], "KOLIBRI")

    @patch(
        "kolibri.core.content.utils.resource_import.NetworkClient.discover_from_address"
    )
    def test_token_lookup_uses_channel_versions_param(self, mock_build):
        mock_client = self._mock_client(
            [
                {
                    "id": self.the_channel_id,
                    "public": True,
                    "version": 3,
                    "library": "KOLIBRI",
                }
            ]
        )
        mock_build.return_value = mock_client
        lookup_channel_listing_status(token="test-token-abc")
        call_url = mock_client.get.call_args[0][0]
        self.assertIn("channel_versions=true", call_url)

    @patch(
        "kolibri.core.content.utils.resource_import.NetworkClient.discover_from_address"
    )
    def test_channel_id_lookup_includes_channel_versions_param(self, mock_build):
        mock_client = self._mock_client(
            [
                {
                    "id": self.the_channel_id,
                    "public": True,
                    "version": 3,
                    "library": "KOLIBRI",
                }
            ]
        )
        mock_build.return_value = mock_client
        lookup_channel_listing_status(channel_id=self.the_channel_id)
        call_url = mock_client.get.call_args[0][0]
        self.assertIn("channel_versions=true", call_url)

    @patch(
        "kolibri.core.content.utils.resource_import.NetworkClient.discover_from_address"
    )
    def test_token_with_channel_id_validates_match(self, mock_build):
        other_channel_id = "aa480b60a7f4526f886e7df9f4e9b8ca"
        mock_build.return_value = self._mock_client(
            [
                {
                    "id": other_channel_id,
                    "public": True,
                    "version": 1,
                    "library": "KOLIBRI",
                }
            ]
        )
        with self.assertRaises(LocationError):
            lookup_channel_listing_status(
                channel_id=self.the_channel_id, token="test-token-abc"
            )

    @patch(
        "kolibri.core.content.utils.resource_import.NetworkClient.discover_from_address"
    )
    def test_404_returns_none(self, mock_build):
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_client = MagicMock()
        mock_client.get.side_effect = NetworkLocationResponseFailure(
            response=mock_response
        )
        mock_build.return_value = mock_client
        result = lookup_channel_listing_status(channel_id=self.the_channel_id)
        self.assertIsNone(result)

    @patch(
        "kolibri.core.content.utils.resource_import.NetworkClient.discover_from_address"
    )
    def test_draft_channel_version_null_returns_none_in_dict(self, mock_build):
        mock_build.return_value = self._mock_client(
            [
                {
                    "id": self.the_channel_id,
                    "public": False,
                    "version": None,
                    "library": None,
                }
            ]
        )
        result = lookup_channel_listing_status(token="draft-token")
        self.assertIsNone(result["version"])

    @patch(
        "kolibri.core.content.utils.resource_import.NetworkClient.discover_from_address"
    )
    def test_token_only_multiple_channels_raises_location_error(self, mock_build):
        mock_build.return_value = self._mock_client(
            [
                {"id": "aa480b60a7f4526f886e7df9f4e9b8ca", "name": "Channel A"},
                {"id": "bb480b60a7f4526f886e7df9f4e9b8cb", "name": "Channel B"},
            ]
        )
        with self.assertRaises(LocationError) as context:
            lookup_channel_listing_status(token="multi-token")

        self.assertIn("multiple channels", str(context.exception).lower())


class ChannelMetadataLibraryFieldTest(TestCase):
    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def test_library_field_exists_and_defaults_to_null(self):
        channel = ChannelMetadata.objects.get(id=self.the_channel_id)
        self.assertIsNone(channel.library)

    def test_library_field_accepts_kolibri_value(self):
        ChannelMetadata.objects.filter(id=self.the_channel_id).update(
            library=library_constants.KOLIBRI
        )
        channel = ChannelMetadata.objects.get(id=self.the_channel_id)
        self.assertEqual(channel.library, "KOLIBRI")


class SetChannelMetadataFieldsTest(TestCase):
    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def test_sets_library_field(self):
        set_channel_metadata_fields(self.the_channel_id, library="KOLIBRI")
        channel = ChannelMetadata.objects.get(id=self.the_channel_id)
        self.assertEqual(channel.library, "KOLIBRI")

    def test_sets_version_field(self):
        set_channel_metadata_fields(self.the_channel_id, version=7)
        channel = ChannelMetadata.objects.get(id=self.the_channel_id)
        self.assertEqual(channel.version, 7)

    def test_zero_version_stored_as_zero(self):
        # Pre-set to non-zero so the update is observable (default is already 0)
        ChannelMetadata.objects.filter(id=self.the_channel_id).update(version=3)
        set_channel_metadata_fields(self.the_channel_id, version=0)
        channel = ChannelMetadata.objects.get(id=self.the_channel_id)
        self.assertEqual(channel.version, 0)


class PopulateChannelLibraryUpgradeTest(TestCase):
    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def test_public_channel_gets_kolibri_library(self):
        ChannelMetadata.objects.filter(id=self.the_channel_id).update(
            public=True, library=None
        )
        populate_channel_library_field()
        channel = ChannelMetadata.objects.get(id=self.the_channel_id)
        self.assertEqual(channel.library, "KOLIBRI")

    def test_non_public_channel_unchanged(self):
        ChannelMetadata.objects.filter(id=self.the_channel_id).update(
            public=False, library=None
        )
        populate_channel_library_field()
        channel = ChannelMetadata.objects.get(id=self.the_channel_id)
        self.assertIsNone(channel.library)

    def test_channel_with_library_already_set_not_overwritten(self):
        ChannelMetadata.objects.filter(id=self.the_channel_id).update(
            public=True, library="COMMUNITY"
        )
        populate_channel_library_field()
        channel = ChannelMetadata.objects.get(id=self.the_channel_id)
        self.assertEqual(channel.library, "COMMUNITY")
