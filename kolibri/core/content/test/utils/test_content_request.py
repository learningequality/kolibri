import uuid

import mock
from django.test import TestCase

from kolibri.core.content.utils.content_request import process_metadata_import
from kolibri.core.content.utils.content_request import synchronize_content_requests


_module = "kolibri.core.content.utils.content_request."


def _facility(dataset_id=None):
    return mock.MagicMock(id=uuid.uuid4().hex, dataset_id=dataset_id)


@mock.patch(_module + "Facility.objects.get", new=_facility)
class ContentRequestsTestCase(TestCase):
    def setUp(self):
        super(ContentRequestsTestCase, self).setUp()

        self.dataset_id = uuid.uuid4().hex
        self.transfer_session = mock.MagicMock()
        self.transfer_session.id = uuid.uuid4().hex

    @mock.patch(_module + "ContentAssignmentManager.find_all_removable_assignments")
    @mock.patch(_module + "ContentAssignmentManager.find_all_downloadable_assignments")
    def test_synchronize_content_requests__dataset_id_passthrough(
        self,
        find_all_downloadable_assignments_mock,
        find_all_removable_assignments_mock,
    ):
        find_all_downloadable_assignments_mock.return_value = []
        find_all_removable_assignments_mock.return_value = []

        synchronize_content_requests(self.dataset_id, None)
        find_all_downloadable_assignments_mock.assert_called_once_with(
            dataset_id=self.dataset_id
        )
        find_all_removable_assignments_mock.assert_called_once_with(
            dataset_id=self.dataset_id
        )

    @mock.patch(_module + "ContentAssignmentManager.find_all_removable_assignments")
    @mock.patch(_module + "ContentAssignmentManager.find_all_downloadable_assignments")
    def test_synchronize_content_requests__transfer_session_id_passthrough(
        self,
        find_all_downloadable_assignments_mock,
        find_all_removable_assignments_mock,
    ):
        find_all_downloadable_assignments_mock.return_value = []
        find_all_removable_assignments_mock.return_value = []

        synchronize_content_requests(
            self.dataset_id,
            transfer_session=self.transfer_session,
        )
        find_all_downloadable_assignments_mock.assert_called_once_with(
            transfer_session_id=self.transfer_session.id
        )
        find_all_removable_assignments_mock.assert_called_once_with(
            transfer_session_id=self.transfer_session.id
        )


class ProcessMetadataImportTestCase(TestCase):
    def setUp(self):
        super(ProcessMetadataImportTestCase, self).setUp()

        get_preferred_network_location_patcher = mock.patch(
            _module + "_get_preferred_network_location"
        )
        self.mock_get_preferred_network_location = (
            get_preferred_network_location_patcher.start()
        )
        self.addCleanup(get_preferred_network_location_patcher.stop)

        capture_connection_state_patcher = mock.patch(
            _module + "capture_connection_state"
        )
        self.mock_capture_connection_state = capture_connection_state_patcher.start()
        self.addCleanup(capture_connection_state_patcher.stop)

        network_client_patcher = mock.patch(_module + "NetworkClient")
        self.mock_network_client = network_client_patcher.start()
        self.addCleanup(network_client_patcher.stop)

        import_metadata_patcher = mock.patch(_module + "_import_metadata")
        self.mock_import_metadata = import_metadata_patcher.start()
        self.addCleanup(import_metadata_patcher.stop)

        self.incomplete_downloads_qs = mock.MagicMock()
        self.incomplete_downloads_qs.values_list.return_value = (
            self.incomplete_downloads_qs
        )
        self.incomplete_downloads_qs.filter.return_value = self.incomplete_downloads_qs
        self.incomplete_downloads_qs.count.return_value = 0

    def test_happy_path(self):
        self.incomplete_downloads_qs.distinct.return_value = [
            "877a1b783fd348bfb87559883e60e9bf",
            "ab9e06e38895578bfb843df387b1a778",
        ]
        first_peer = mock.MagicMock()
        second_peer = mock.MagicMock()
        third_peer = mock.MagicMock()
        self.mock_get_preferred_network_location.side_effect = [
            first_peer,
            second_peer,
            third_peer,
        ]
        process_metadata_import(self.incomplete_downloads_qs)
        self.mock_get_preferred_network_location.assert_has_calls(
            [
                mock.call(
                    instance_id="877a1b783fd348bfb87559883e60e9bf",
                    version_filter=">=0.16.0",
                ),
                mock.call(
                    instance_id="ab9e06e38895578bfb843df387b1a778",
                    version_filter=">=0.16.0",
                ),
                mock.call(instance_id=None, version_filter=">=0.16.0"),
            ]
        )
        client = (
            self.mock_network_client.build_from_network_location.return_value.__enter__.return_value
        )
        self.assertEqual(client.connect.call_count, (1 + 2 + 3))
        self.mock_import_metadata.assert_has_calls(
            [
                mock.call(
                    client,
                    self.incomplete_downloads_qs,
                ),
            ]
        )
        self.incomplete_downloads_qs.filter.assert_has_calls(
            [
                mock.call(source_instance_id="877a1b783fd348bfb87559883e60e9bf"),
                mock.call(source_instance_id="ab9e06e38895578bfb843df387b1a778"),
                mock.call(source_instance_id="ab9e06e38895578bfb843df387b1a778"),
                mock.call(),
                mock.call(),
                mock.call(),
            ]
        )

    def test_no_preferred_peers(self):
        self.incomplete_downloads_qs.distinct.return_value = [
            "877a1b783fd348bfb87559883e60e9bf",
            "ab9e06e38895578bfb843df387b1a778",
        ]
        third_peer = mock.MagicMock()
        self.mock_get_preferred_network_location.side_effect = [
            None,
            None,
            third_peer,
        ]
        process_metadata_import(self.incomplete_downloads_qs)
        self.mock_get_preferred_network_location.assert_has_calls(
            [
                mock.call(
                    instance_id="877a1b783fd348bfb87559883e60e9bf",
                    version_filter=">=0.16.0",
                ),
                mock.call(
                    instance_id="ab9e06e38895578bfb843df387b1a778",
                    version_filter=">=0.16.0",
                ),
                mock.call(instance_id=None, version_filter=">=0.16.0"),
            ]
        )
        self.mock_network_client.build_from_network_location.assert_has_calls(
            [
                mock.call(third_peer),
            ]
        )
        client = (
            self.mock_network_client.build_from_network_location.return_value.__enter__.return_value
        )
        self.assertEqual(client.connect.call_count, 1)
        self.mock_import_metadata.assert_has_calls(
            [
                mock.call(
                    client,
                    self.incomplete_downloads_qs,
                ),
            ]
        )
        self.incomplete_downloads_qs.filter.assert_has_calls(
            [
                mock.call(),
            ]
        )
