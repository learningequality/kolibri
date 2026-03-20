import uuid
from contextlib import contextmanager
from datetime import timedelta
from functools import partial

import mock
from django.test import LiveServerTestCase
from django.test import TestCase
from django.utils import timezone
from le_utils.constants import modalities
from morango.models.core import SyncSession

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentDownloadRequest
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import ContentRemovalRequest
from kolibri.core.content.models import ContentRequestReason
from kolibri.core.content.models import ContentRequestStatus
from kolibri.core.content.models import File
from kolibri.core.content.models import Language
from kolibri.core.content.models import LocalFile
from kolibri.core.content.test.helpers import ChannelBuilder
from kolibri.core.content.utils.content_request import _get_descendants_import_metadata
from kolibri.core.content.utils.content_request import _get_import_metadata
from kolibri.core.content.utils.content_request import _import_descendants_depth
from kolibri.core.content.utils.content_request import _merge_import_metadata
from kolibri.core.content.utils.content_request import _process_content_requests
from kolibri.core.content.utils.content_request import _process_download
from kolibri.core.content.utils.content_request import _total_size
from kolibri.core.content.utils.content_request import completed_downloads_queryset
from kolibri.core.content.utils.content_request import COURSES_DESCENDANTS_DEPTH
from kolibri.core.content.utils.content_request import incomplete_downloads_queryset
from kolibri.core.content.utils.content_request import incomplete_removals_queryset
from kolibri.core.content.utils.content_request import InsufficientStorage
from kolibri.core.content.utils.content_request import MAX_NODES_PER_REQUEST
from kolibri.core.content.utils.content_request import PreferredDevices
from kolibri.core.content.utils.content_request import PreferredDevicesWithClient
from kolibri.core.content.utils.content_request import process_content_removal_requests
from kolibri.core.content.utils.content_request import process_download_request
from kolibri.core.content.utils.content_request import process_metadata_import
from kolibri.core.content.utils.content_request import (
    process_user_downloads_for_removal,
)
from kolibri.core.content.utils.content_request import synchronize_content_requests
from kolibri.core.content.utils.file_availability import LocationError
from kolibri.core.discovery.models import ConnectionStatus
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkError
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_INSTANCE_ID


_module = "kolibri.core.content.utils.content_request."


def _facility(dataset_id=None):
    return mock.MagicMock(id=uuid.uuid4().hex, dataset_id=dataset_id)


class BaseTestCase(TestCase):
    databases = "__all__"

    def _create_sync_and_network_location(
        self, sync_overrides=None, location_overrides=None
    ):
        sync_overrides = sync_overrides or {}
        location_overrides = location_overrides or {}

        sync_kwargs = dict(
            id=uuid.uuid4().hex,
            connection_kind="network",
            connection_path="https://le.fyi",
            profile=uuid.uuid4().hex,
            last_activity_timestamp=timezone.now(),
            client_instance_id=uuid.uuid4().hex,
            server_instance_id=uuid.uuid4().hex,
        )
        sync_kwargs.update(sync_overrides)
        sync_session = SyncSession.objects.create(**sync_kwargs)

        location_kwargs = dict(
            base_url=sync_session.connection_path,
            instance_id=sync_session.server_instance_id,
        )
        location_kwargs.update(location_overrides)
        network_location = self._create_network_location(**location_kwargs)
        return (sync_session, network_location)

    def _create_network_location(self, **location_overrides):
        kwargs = dict(
            id=uuid.uuid4().hex,
            base_url="https://le.fyi",
            instance_id=uuid.uuid4().hex,
            location_type="dynamic",
            kolibri_version="0.16.0",
            is_local=True,
            connection_status=ConnectionStatus.Okay,
        )
        kwargs.update(location_overrides)
        network_location = NetworkLocation.objects.create(**kwargs)
        return network_location


@mock.patch(_module + "Facility.objects.get", new=_facility)
class ContentRequestsTestCase(TestCase):
    def setUp(self):
        super().setUp()

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


class ProcessMetadataImportTestCase(BaseTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.facility = Facility.objects.create(name="a")
        cls.learner = FacilityUser.objects.create(
            username="learner", password="password", facility=cls.facility
        )
        cls.admin = FacilityUser.objects.create(
            username="admin", password="password", facility=cls.facility
        )
        cls.facility.add_admin(cls.admin)

    def setUp(self):
        super().setUp()

        self.mock_client = mock.MagicMock()

        get_setting_patcher = mock.patch(_module + "get_device_setting")
        self.mock_setting = get_setting_patcher.start()
        self.mock_setting.return_value = True
        self.addCleanup(get_setting_patcher.stop)

        preferred_patcher = mock.patch(_module + "PreferredDevicesWithClient")
        self.mock_preferred_devices = preferred_patcher.start()
        self.mock_preferred_devices.return_value = self.mock_preferred_devices
        self.addCleanup(preferred_patcher.stop)

        self.mock_sync_devices = mock.MagicMock()
        self.mock_preferred_devices.build_from_sync_sessions.return_value = (
            self.mock_sync_devices
        )

        import_metadata_patcher = mock.patch(_module + "_import_metadata")
        self.mock_import_metadata = import_metadata_patcher.start()
        self.addCleanup(import_metadata_patcher.stop)

        self.mock_import_metadata_return_value = False
        self.mock_import_metadata_calls = []
        self.mock_import_failed_contentnode_ids = []
        self.mock_import_metadata.side_effect = self._mock_import_metadata

        incomplete_downloads = incomplete_downloads_queryset()

        # first, process the metadata import for any incomplete downloads without metadata
        self.incomplete_downloads_qs = incomplete_downloads.filter(has_metadata=False)
        self.count_patcher = mock.patch.object(
            self.incomplete_downloads_qs, "count", return_value=0
        )
        self.mock_count = self.count_patcher.start()
        self.addCleanup(self.count_patcher.stop)

    def _create_request(self, user=None, source_instance_id=None):
        user = user or self.learner
        request = ContentDownloadRequest.build_for_user(user)
        request.contentnode_id = uuid.uuid4().hex
        request.source_instance_id = source_instance_id
        request.save()
        return request

    def _create_request_and_peer(self, user=None, source_instance_id=None):
        request = self._create_request(user=user, source_instance_id=source_instance_id)
        peer = self._create_network_location(
            instance_id=source_instance_id or uuid.uuid4().hex
        )
        return (request, peer)

    def _mock_import_metadata(self, client, contentnode_ids):
        # manually track the calls to import_metadata, so we can resolve `contentnode_ids` to a list
        self.mock_import_metadata_calls.append((client, list(contentnode_ids)))
        for contentnode_id in contentnode_ids:
            # pretend we imported this metadata
            if contentnode_id not in self.mock_import_failed_contentnode_ids:
                ContentNode.objects.create(
                    id=contentnode_id,
                    title="test",
                    kind="video",
                    parent=None,
                    channel_id=uuid.uuid4().hex,
                    content_id=uuid.uuid4().hex,
                )
        return self.mock_import_metadata_return_value

    def test_only_preferred(self):
        request1, peer1 = self._create_request_and_peer(
            source_instance_id=uuid.uuid4().hex
        )
        request2, peer2 = self._create_request_and_peer(
            source_instance_id=uuid.uuid4().hex
        )

        self.mock_preferred_devices.__iter__.return_value = [
            (peer1, self.mock_client),
            (peer2, self.mock_client),
        ]

        process_metadata_import(self.incomplete_downloads_qs)
        self.assertEqual(
            self.mock_import_metadata_calls,
            [
                (self.mock_client, [request1.contentnode_id]),
                (self.mock_client, [request2.contentnode_id]),
            ],
        )

    def test_no_preferred__fallback(self):
        request1 = self._create_request(source_instance_id=uuid.uuid4().hex)
        request2 = self._create_request(source_instance_id=uuid.uuid4().hex)
        _, peer1 = self._create_sync_and_network_location()

        self.mock_preferred_devices.__iter__.return_value = []
        self.mock_sync_devices.__iter__.return_value = [
            (peer1, self.mock_client),
        ]
        self.mock_import_metadata_return_value = True

        process_metadata_import(self.incomplete_downloads_qs)
        self.mock_count.assert_not_called()
        self.assertEqual(self.mock_import_metadata_calls[0][0], self.mock_client)
        self.assertEqual(len(self.mock_import_metadata_calls[0][1]), 2)
        self.assertIn(request1.contentnode_id, self.mock_import_metadata_calls[0][1])
        self.assertIn(request2.contentnode_id, self.mock_import_metadata_calls[0][1])

    def test_no_preferred__fallback__incomplete(self):
        request1 = self._create_request(source_instance_id=uuid.uuid4().hex)
        request2 = self._create_request(source_instance_id=uuid.uuid4().hex)
        _, peer1 = self._create_sync_and_network_location()

        self.mock_preferred_devices.__iter__.return_value = []
        self.mock_sync_devices.__iter__.return_value = [
            (peer1, self.mock_client),
        ]
        self.mock_import_metadata_return_value = False

        process_metadata_import(self.incomplete_downloads_qs)
        self.mock_count.assert_called()
        self.assertEqual(self.mock_import_metadata_calls[0][0], self.mock_client)
        self.assertEqual(len(self.mock_import_metadata_calls[0][1]), 2)
        self.assertIn(request1.contentnode_id, self.mock_import_metadata_calls[0][1])
        self.assertIn(request2.contentnode_id, self.mock_import_metadata_calls[0][1])

    def test_half_and_half(self):
        request1, peer1 = self._create_request_and_peer(
            source_instance_id=uuid.uuid4().hex
        )
        request2 = self._create_request(source_instance_id=uuid.uuid4().hex)
        _, peer2 = self._create_sync_and_network_location()

        self.mock_preferred_devices.__iter__.return_value = [
            (peer1, self.mock_client),
        ]
        self.mock_sync_devices.__iter__.return_value = [
            (peer2, self.mock_client),
        ]
        self.mock_import_metadata_return_value = True

        process_metadata_import(self.incomplete_downloads_qs)
        self.assertEqual(
            self.mock_import_metadata_calls,
            [
                (self.mock_client, [request1.contentnode_id]),
                (self.mock_client, [request2.contentnode_id]),
            ],
        )

    def test_all__and_fail(self):
        request1, peer1 = self._create_request_and_peer(
            source_instance_id=uuid.uuid4().hex
        )
        request2, peer2 = self._create_request_and_peer(
            source_instance_id=uuid.uuid4().hex
        )
        request3 = self._create_request(source_instance_id=uuid.uuid4().hex)
        _, peer3 = self._create_sync_and_network_location()

        self.mock_import_failed_contentnode_ids = [request2.contentnode_id]

        self.mock_preferred_devices.__iter__.return_value = [
            (peer1, self.mock_client),
            (peer2, self.mock_client),
        ]
        self.mock_sync_devices.__iter__.return_value = [
            (peer3, self.mock_client),
        ]
        self.mock_import_metadata_return_value = False

        process_metadata_import(self.incomplete_downloads_qs)
        for mock_call in self.mock_import_metadata_calls:
            self.assertEqual(mock_call[0], self.mock_client)
        self.assertEqual(
            self.mock_import_metadata_calls[0][1], [request1.contentnode_id]
        )  # peer1
        self.assertEqual(
            self.mock_import_metadata_calls[1][1], [request2.contentnode_id]
        )  # peer2
        # Peer 1
        self.assertEqual(len(self.mock_import_metadata_calls[2][1]), 2)
        self.assertIn(request2.contentnode_id, self.mock_import_metadata_calls[2][1])
        self.assertIn(request3.contentnode_id, self.mock_import_metadata_calls[2][1])
        self.assertEqual(self.mock_import_metadata_calls[3][1], [])  # peer2
        self.assertEqual(
            self.mock_import_metadata_calls[4][1], [request2.contentnode_id]
        )  # peer3


class BaseQuerysetTestCase(BaseTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.facility = Facility.objects.create(name="a")
        cls.learner = FacilityUser.objects.create(
            username="learner", password="password", facility=cls.facility
        )
        cls.admin = FacilityUser.objects.create(
            username="admin", password="password", facility=cls.facility
        )
        cls.facility.add_admin(cls.admin)

    def _create_resources(self, node_id, available=False):
        parent = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="parent",
            kind="topic",
            channel_id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            available=available,
        )
        node = ContentNode.objects.create(
            id=node_id,
            title="test",
            kind="video",
            parent=parent,
            channel_id=parent.channel_id,
            content_id=uuid.uuid4().hex,
            available=available,
        )
        # parent thumbnail
        File.objects.create(
            id=uuid.uuid4().hex,
            contentnode=parent,
            thumbnail=True,
            supplementary=True,
            local_file=LocalFile.objects.create(
                id=uuid.uuid4().hex,
                file_size=10,
                available=available,
                extension="png",
            ),
        )
        # primary node file
        File.objects.create(
            id=uuid.uuid4().hex,
            contentnode=node,
            preset="high_res_video",
            local_file=LocalFile.objects.create(
                id=uuid.uuid4().hex,
                file_size=1000,
                available=available,
                extension="mp4",
            ),
        )
        # secondary node file
        File.objects.create(
            id=uuid.uuid4().hex,
            contentnode=node,
            preset="low_res_video",
            local_file=LocalFile.objects.create(
                id=uuid.uuid4().hex,
                file_size=100,
                available=available,
                extension="mp4",
            ),
        )
        node.refresh_from_db()
        self.assertEqual(node.files.all().count(), 2)
        return (parent, node)


class BaseIncompleteDownloadsQuerysetTestCase(BaseQuerysetTestCase):
    def setUp(self):
        super().setUp()
        self.admin_request = ContentDownloadRequest.build_for_user(self.admin)
        self.admin_request.contentnode_id = uuid.uuid4().hex
        self.admin_request.save()
        self.learner_request = ContentDownloadRequest.build_for_user(self.learner)
        self.learner_request.contentnode_id = uuid.uuid4().hex
        self.learner_request.save()


class IncompleteDownloadsQuerysetTestCase(BaseIncompleteDownloadsQuerysetTestCase):
    @mock.patch(_module + "get_device_setting", return_value=False)
    def test_learner_downloads_disabled(self, mock_get_device_setting):
        qs = incomplete_downloads_queryset()
        self.assertEqual(
            qs.count(),
            1,
        )

    @mock.patch(_module + "get_device_setting", return_value=True)
    def test_learner_downloads_enabled(self, mock_get_device_setting):
        qs = incomplete_downloads_queryset()
        self.assertEqual(
            qs.count(),
            2,
        )

    @mock.patch(_module + "get_device_setting", return_value=True)
    def test_no_metadata(self, mock_get_device_setting):
        qs = incomplete_downloads_queryset().filter(has_metadata=True)
        self.assertEqual(
            qs.count(),
            0,
        )

    @mock.patch(_module + "get_device_setting", return_value=True)
    def test_with_metadata(self, mock_get_device_setting):
        ContentNode.objects.create(
            id=self.admin_request.contentnode_id,
            title="test",
            kind="video",
            channel_id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
        )

        qs = incomplete_downloads_queryset().filter(has_metadata=True)
        self.assertEqual(
            qs.count(),
            1,
        )

    @mock.patch(_module + "get_device_setting", return_value=True)
    def test_total_size(self, mock_get_device_setting):
        self._create_resources(self.admin_request.contentnode_id)
        qs = incomplete_downloads_queryset().filter(has_metadata=True)
        self.assertEqual(
            _total_size(qs),
            1110,
        )

    @mock.patch(_module + "get_device_setting", return_value=True)
    def test_total_size__availability(self, mock_get_device_setting):
        parent, _ = self._create_resources(self.admin_request.contentnode_id)
        parent_file = parent.files.first()
        parent_file.local_file.available = True
        parent_file.local_file.save()

        qs = incomplete_downloads_queryset().filter(has_metadata=True)
        self.assertEqual(
            _total_size(qs),
            1100,
        )


class CompletedDownloadsQuerysetTestCase(BaseQuerysetTestCase):
    def setUp(self):
        super().setUp()
        self.request = ContentDownloadRequest.build_for_user(self.learner)
        self.request.contentnode_id = uuid.uuid4().hex
        self.request.status = ContentRequestStatus.Completed
        self.request.save()

    def test_basic(self):
        qs = completed_downloads_queryset()
        self.assertEqual(
            qs.count(),
            1,
        )

    def test_has_metadata__yes(self):
        _, node = self._create_resources(self.request.contentnode_id)
        qs = completed_downloads_queryset().filter(has_metadata=True)
        self.assertEqual(
            qs.count(),
            1,
        )

    def test_has_metadata__no(self):
        qs = completed_downloads_queryset().filter(has_metadata=True)
        self.assertEqual(
            qs.count(),
            0,
        )

    def test_total_size__not_available(self):
        _, node = self._create_resources(self.request.contentnode_id)

        qs = completed_downloads_queryset()
        self.assertEqual(
            _total_size(qs),
            0,
        )

    def test_total_size__available(self):
        _, node = self._create_resources(self.request.contentnode_id, available=True)

        qs = completed_downloads_queryset()
        self.assertEqual(
            _total_size(qs),
            1110,
        )

    def test_total_size__partially_available(self):
        _, node = self._create_resources(self.request.contentnode_id, available=True)
        low_res_video = node.files.all().get(preset="low_res_video")
        low_res_video.local_file.available = False
        low_res_video.local_file.save()

        qs = completed_downloads_queryset()
        self.assertEqual(
            _total_size(qs),
            1010,
        )


class PreferredDevicesTestCase(BaseTestCase):
    def test_no_peers(self):
        instance = PreferredDevices([])
        self.assertEqual(len(list(instance)), 0)

    def test_one_peer(self):
        netloc = self._create_network_location()
        instance = PreferredDevices([netloc.instance_id])
        peers = list(instance)
        self.assertEqual(len(peers), 1)

    def test_one_peer__iterator_restart(self):
        netloc = self._create_network_location()
        instance = PreferredDevices([netloc.instance_id])
        # invoke iterator
        peers = list(instance)
        self.assertEqual(len(peers), 1)
        self.assertEqual(peers[0].instance_id, netloc.instance_id)
        # again
        self.assertEqual(len(list(instance)), 1)

    def test_no_peers__version_filter(self):
        netloc = self._create_network_location(kolibri_version="0.15.0")
        instance = PreferredDevices([netloc.instance_id], version_filter=">=0.16.0")
        self.assertEqual(len(list(instance)), 0)

    @mock.patch(_module + "allow_non_local_download", return_value=False)
    def test_no_peers__metered_connection(self, _mock):
        netloc = self._create_network_location(is_local=False)
        instance = PreferredDevices([netloc.instance_id])
        self.assertEqual(len(list(instance)), 0)

    def test_no_peers__connection_status(self):
        netloc = self._create_network_location(
            connection_status=ConnectionStatus.ConnectionFailure
        )
        instance = PreferredDevices([netloc.instance_id])
        self.assertEqual(len(list(instance)), 0)

    def test_no_peer__reserved__connection_status(self):
        netloc = self._create_network_location(
            location_type="reserved",
            connection_status=ConnectionStatus.ConnectionFailure,
        )
        instance = PreferredDevices([netloc.instance_id])
        self.assertEqual(len(list(instance)), 0)

    def test__peer__studio__reserved__connection_status(self):
        netloc = self._create_network_location(
            location_type="reserved",
            connection_status=ConnectionStatus.ConnectionFailure,
            instance_id=CENTRAL_CONTENT_BASE_INSTANCE_ID,
        )
        instance = PreferredDevices([netloc.instance_id])
        peers = list(instance)
        self.assertEqual(len(peers), 1)
        self.assertEqual(peers[0].instance_id, netloc.instance_id)

    def test_sync_peers(self):
        (sync_session2, network_location2) = self._create_sync_and_network_location(
            sync_overrides=dict(
                last_activity_timestamp=timezone.now() - timedelta(days=1),
            )
        )
        (sync_session1, network_location1) = self._create_sync_and_network_location()
        instance = PreferredDevices.build_from_sync_sessions()
        peer_ids = set([location.id for location in instance])
        self.assertEqual(len(peer_ids), 2)
        self.assertEqual(peer_ids, set([network_location1.id, network_location2.id]))

    def test_sync_peers__with_version_filter(self):
        (sync_session2, network_location2) = self._create_sync_and_network_location(
            sync_overrides=dict(
                last_activity_timestamp=timezone.now() - timedelta(days=1),
            ),
            location_overrides=dict(
                kolibri_version="0.15.0",
            ),
        )
        (sync_session1, network_location1) = self._create_sync_and_network_location()
        instance = PreferredDevices.build_from_sync_sessions(version_filter=">=0.16.0")
        peers = list(instance)
        self.assertEqual(len(peers), 1)
        self.assertEqual(peers[0].id, network_location1.id)

    def test_multiple_peers__version_filter(self):
        network_location1 = self._create_network_location()
        network_location2 = self._create_network_location()
        network_location3 = self._create_network_location(kolibri_version="0.15.0")

        instance = PreferredDevices(
            instance_ids=[
                network_location1.instance_id,
                network_location2.instance_id,
                network_location3.instance_id,
            ],
            version_filter=">=0.16.0",
        )

        peers = list(instance)
        self.assertEqual(len(peers), 2)
        self.assertEqual(peers[0].id, network_location1.id)
        self.assertEqual(peers[1].id, network_location2.id)

    def test_multiple_locations__same_instance_id(self):
        dynamic_location = self._create_network_location(
            connection_status=ConnectionStatus.Unknown,
        )
        static_location = self._create_network_location(
            location_type="static",
            instance_id=dynamic_location.instance_id,
        )
        self.assertEqual(dynamic_location.instance_id, static_location.instance_id)

        instance = PreferredDevices(
            instance_ids=[
                dynamic_location.instance_id,
            ],
        )
        peers = list(instance)
        self.assertEqual(len(peers), 1)
        self.assertEqual(peers[0].id, static_location.id)


class PreferredDevicesWithClientTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()

        capture_connection_patcher = mock.patch(_module + "capture_connection_state")
        self.mock_capture = capture_connection_patcher.start()
        self.mock_capture.side_effect = self._mock_capture_connection_state
        self.mock_capture_errors = []
        self.addCleanup(capture_connection_patcher.stop)

        network_client_build = mock.patch(
            _module + "NetworkClient.build_from_network_location"
        )
        self.mock_client = mock.MagicMock()
        self.mock_client_build = network_client_build.start()
        self.mock_client_build.return_value = self.mock_client
        self.mock_client.__enter__.return_value = self.mock_client
        self.addCleanup(network_client_build.stop)

    @contextmanager
    def _mock_capture_connection_state(self, peer):
        """
        Mimics the behavior of capture_connection_state for suppressing the network errors
        """
        try:
            yield
        except NetworkError as e:
            self.mock_capture_errors.append(e)

    def test_no_peers(self):
        instance = PreferredDevicesWithClient([])
        self.assertEqual(len(list(instance)), 0)

    def test_one_peer(self):
        netloc = self._create_network_location()
        instance = PreferredDevicesWithClient([netloc.instance_id])
        peers = list(instance)
        self.assertEqual(len(peers), 1)
        peer, client = peers[0]
        self.assertEqual(peer.instance_id, netloc.instance_id)
        self.assertEqual(client, self.mock_client)
        self.mock_client.connect.assert_called_once_with()

    def test_multiple_peers__with_failure(self):
        netloc1 = self._create_network_location()
        netloc2 = self._create_network_location()
        instance = PreferredDevicesWithClient(
            [netloc1.instance_id, netloc2.instance_id]
        )
        test_error = NetworkError("test")
        self.mock_client.connect.side_effect = [
            None,
            test_error,
            None,
            None,
        ]

        peers = list(instance)
        self.assertEqual(len(peers), 1)
        peer, client = peers[0]
        self.assertEqual(peer.instance_id, netloc1.instance_id)
        self.assertEqual(client, self.mock_client)
        self.assertEqual(len(self.mock_capture_errors), 1)
        self.assertEqual(self.mock_capture_errors[0], test_error)

        # call generator again
        peers = list(instance)
        self.assertEqual(len(peers), 2)
        self.assertEqual(len(self.mock_capture_errors), 1)


class ProcessContentRequestsTestCase(BaseQuerysetTestCase):
    def setUp(self):
        super().setUp()
        self.request = ContentDownloadRequest.build_for_user(self.learner)
        self.request.contentnode_id = uuid.uuid4().hex
        self.request.save()

        _, self.node = self._create_resources(self.request.contentnode_id)

        get_free_space_patcher = mock.patch(_module + "get_free_space_for_downloads")
        self.mock_get_free_space = get_free_space_patcher.start()
        self.mock_get_free_space.return_value = 2000
        self.addCleanup(get_free_space_patcher.stop)

        # allow_learner_download_resources
        get_setting_patcher = mock.patch(_module + "get_device_setting")
        self.mock_get_setting = get_setting_patcher.start()
        self.mock_get_setting.return_value = True
        self.addCleanup(get_setting_patcher.stop)

        process_download_patcher = mock.patch(_module + "process_download_request")
        self.mock_process_download = process_download_patcher.start()
        self.addCleanup(process_download_patcher.stop)

        process_content_removal_requests_patcher = mock.patch(
            _module + "process_content_removal_requests"
        )
        self.mock_process_removals = process_content_removal_requests_patcher.start()
        self.addCleanup(process_content_removal_requests_patcher.stop)

        process_user_downloads_for_removal_patcher = mock.patch(
            _module + "process_user_downloads_for_removal"
        )
        self.mock_process_user_downloads_for_removal = (
            process_user_downloads_for_removal_patcher.start()
        )
        self.addCleanup(process_user_downloads_for_removal_patcher.stop)

        self.qs = incomplete_downloads_queryset()

    def _side_effect_success(self, request):
        if isinstance(request, (ContentDownloadRequest, ContentRemovalRequest)):
            request.status = ContentRequestStatus.Completed
            request.save()
        else:
            request.update(status=ContentRequestStatus.Completed)
        return True

    def _side_effect_fail(self, request):
        if isinstance(request, (ContentDownloadRequest, ContentRemovalRequest)):
            request.status = ContentRequestStatus.Failed
            request.save()
        else:
            request.update(status=ContentRequestStatus.Failed)
        return False

    def _side_effect_delete(self, request):
        request.delete()
        return True

    def test_basic(self):
        self.assertEqual(self.qs.count(), 1)
        self.mock_process_download.side_effect = self._side_effect_success
        _process_content_requests(self.qs)
        self.mock_process_download.assert_called_once_with(self.request)

    def test_fail(self):
        """
        Ensure it doesn't loop forever if the request fails
        """
        self.assertEqual(self.qs.count(), 1)
        self.mock_process_download.side_effect = self._side_effect_fail
        _process_content_requests(self.qs)
        self.mock_process_download.assert_called_once_with(self.request)

    def test_no_free_space__sync_removal(self):
        self.assertEqual(self.qs.count(), 1)

        sync_session, _ = self._create_sync_and_network_location()
        removal = ContentRemovalRequest(
            facility=self.facility,
            source_model=Facility.morango_model_name,
            source_id=self.facility.id,
            reason=ContentRequestReason.SyncInitiated,
            status=ContentRequestStatus.Pending,
            contentnode_id=uuid.uuid4().hex,
        )
        removal.save()
        self.mock_get_free_space.side_effect = [
            0,
            2000,
        ]
        self.mock_process_removals.side_effect = self._side_effect_success
        self.mock_process_download.side_effect = self._side_effect_success
        _process_content_requests(self.qs)
        self.mock_process_download.assert_called_once_with(self.request)

    def test_no_free_space__user_removal(self):
        self.assertEqual(self.qs.count(), 1)

        sync_session, _ = self._create_sync_and_network_location()
        removal = ContentRemovalRequest.build_for_user(self.learner)
        removal.contentnode_id = uuid.uuid4().hex
        removal.save()
        self.mock_get_free_space.side_effect = [
            0,
            2000,
        ]
        self.mock_process_removals.side_effect = self._side_effect_success
        self.mock_process_download.side_effect = self._side_effect_success
        _process_content_requests(self.qs)
        self.mock_process_download.assert_called_once_with(self.request)

    def test_no_free_space__user_downloads(self):
        self.assertEqual(self.qs.count(), 1)

        sync_session, _ = self._create_sync_and_network_location()
        download = ContentDownloadRequest.build_for_user(self.learner)
        download.contentnode_id = uuid.uuid4().hex
        download.status = ContentRequestStatus.Completed
        download.save()
        self.mock_get_free_space.side_effect = [
            0,
            2000,
        ]
        self.mock_process_user_downloads_for_removal.side_effect = partial(
            self._side_effect_delete, download
        )
        self.mock_process_download.side_effect = self._side_effect_success
        _process_content_requests(self.qs)
        self.mock_process_download.assert_called_once_with(self.request)

    def test_no_free_space__insufficient(self):
        self.assertEqual(self.qs.count(), 1)

        self.mock_get_free_space.return_value = 0
        with self.assertRaises(InsufficientStorage):
            _process_content_requests(self.qs)


class ProcessContentRemovalRequestsTestCase(BaseQuerysetTestCase):
    def setUp(self):
        super().setUp()
        self.download = ContentDownloadRequest.build_for_user(self.learner)
        self.download.contentnode_id = uuid.uuid4().hex
        self.download.status = ContentRequestStatus.Completed
        self.download.save()

        self.request = ContentRemovalRequest.build_for_user(self.learner)
        self.request.contentnode_id = self.download.contentnode_id
        self.request.save()

        _, self.node = self._create_resources(
            self.request.contentnode_id, available=True
        )

        delete_content_patcher = mock.patch(
            "kolibri.core.content.utils.content_delete.delete_content"
        )
        self.mock_delete_call = delete_content_patcher.start()
        self.addCleanup(delete_content_patcher.stop)

        self.qs = incomplete_removals_queryset()

    def test_basic(self):
        self.assertEqual(self.qs.count(), 1)
        process_content_removal_requests(self.qs)
        self.mock_delete_call.assert_called_once_with(
            channel_id=self.node.channel_id,
            node_ids=[self.request.contentnode_id],
            exclude_node_ids=None,
            force_delete=False,
            ignore_admin_flags=True,
            update_content_requests=False,
        )
        self.assertEqual(self.qs.count(), 0)
        self.assertEqual(ContentDownloadRequest.objects.count(), 0)

    def test_basic__unavailable(self):
        self.assertEqual(self.qs.count(), 1)
        self.node.available = False
        self.node.save()

        process_content_removal_requests(self.qs)
        self.mock_delete_call.assert_not_called()
        # should be marked completed
        self.assertEqual(self.qs.count(), 0)
        self.assertEqual(ContentDownloadRequest.objects.count(), 1)

    def test_basic__admin_imported(self):
        self.assertEqual(self.qs.count(), 1)
        self.node.admin_imported = True
        self.node.save()

        process_content_removal_requests(self.qs)
        self.mock_delete_call.assert_not_called()
        # should be marked completed
        self.assertEqual(self.qs.count(), 0)
        self.assertEqual(ContentDownloadRequest.objects.count(), 1)

    def test_basic__has_other_download(self):
        other_download = ContentDownloadRequest(
            contentnode_id=self.download.contentnode_id,
            reason=ContentRequestReason.SyncInitiated,
            status=ContentRequestStatus.Completed,
            source_model="test",
            source_id=uuid.uuid4().hex,
            facility=self.facility,
        )
        other_download.save()

        process_content_removal_requests(self.qs)
        self.mock_delete_call.assert_not_called()
        # should be marked completed
        self.assertEqual(self.qs.count(), 0)
        self.assertEqual(ContentDownloadRequest.objects.count(), 2)


class ProcessDownloadRequestTestCase(BaseQuerysetTestCase):
    def setUp(self):
        super().setUp()
        self.request = ContentDownloadRequest.build_for_user(self.learner)
        self.request.contentnode_id = uuid.uuid4().hex
        self.request.save()
        self.node = ContentNode.objects.create(
            pk=self.request.contentnode_id,
            title="test",
            available=False,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )
        mock_devices_patcher = mock.patch(_module + "PreferredDevices")
        self.mock_devices = mock_devices_patcher.start()
        self.addCleanup(mock_devices_patcher.stop)

        self.mock_sync_peers = self.mock_devices.build_from_sync_sessions.return_value
        self.mock_sync_peer = mock.MagicMock()
        self.mock_sync_peers.__iter__.return_value = [self.mock_sync_peer]

        self.mock_preferred_peers = self.mock_devices.return_value
        self.mock_preferred_peer = mock.MagicMock()
        self.mock_preferred_peers.__iter__.return_value = [self.mock_preferred_peer]

    @mock.patch(_module + "_process_download")
    def test_without_source_instance_id__fail(self, mock_process):
        mock_process.return_value = False
        process_download_request(self.request)
        self.mock_devices.build_from_sync_sessions.assert_called_once()
        self.mock_devices.assert_not_called()
        mock_process.assert_called_once_with(
            self.request,
            self.node.channel_id,
            self.mock_sync_peer,
        )
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, ContentRequestStatus.Failed)

    @mock.patch(_module + "_process_download")
    def test_without_source_instance_id__success(self, mock_process):
        mock_process.return_value = True
        process_download_request(self.request)
        self.mock_devices.build_from_sync_sessions.assert_called_once()
        self.mock_devices.assert_not_called()
        mock_process.assert_called_once_with(
            self.request,
            self.node.channel_id,
            self.mock_sync_peer,
        )
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, ContentRequestStatus.Completed)

    @mock.patch(_module + "_process_download")
    def test_with_source_instance_id__all_fail(self, mock_process):
        self.request.source_instance_id = uuid.uuid4().hex
        self.request.save()

        mock_process.return_value = False
        process_download_request(self.request)
        self.mock_devices.build_from_sync_sessions.assert_called_once()
        self.mock_devices.assert_called_once_with(
            instance_ids=[self.request.source_instance_id]
        )
        mock_process.assert_has_calls(
            [
                # calls preferred peer first
                mock.call(
                    self.request,
                    self.node.channel_id,
                    self.mock_preferred_peer,
                ),
                mock.call(
                    self.request,
                    self.node.channel_id,
                    self.mock_sync_peer,
                ),
            ]
        )
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, ContentRequestStatus.Failed)

    @mock.patch(_module + "_process_download")
    def test_with_source_instance_id__preferred_fail(self, mock_process):
        self.request.source_instance_id = uuid.uuid4().hex
        self.request.save()

        mock_process.side_effect = [False, True]
        process_download_request(self.request)
        self.mock_devices.build_from_sync_sessions.assert_called_once()
        self.mock_devices.assert_called_once_with(
            instance_ids=[self.request.source_instance_id]
        )
        mock_process.assert_has_calls(
            [
                # calls preferred peer first
                mock.call(
                    self.request,
                    self.node.channel_id,
                    self.mock_preferred_peer,
                ),
                mock.call(
                    self.request,
                    self.node.channel_id,
                    self.mock_sync_peer,
                ),
            ]
        )
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, ContentRequestStatus.Completed)

    @mock.patch(_module + "_process_download")
    def test_with_source_instance_id__preferred_success(self, mock_process):
        self.request.source_instance_id = uuid.uuid4().hex
        self.request.save()

        mock_process.side_effect = [True]
        process_download_request(self.request)
        self.mock_devices.build_from_sync_sessions.assert_called_once()
        self.mock_devices.assert_called_once_with(
            instance_ids=[self.request.source_instance_id]
        )
        mock_process.assert_has_calls(
            [
                # calls preferred peer first
                mock.call(
                    self.request,
                    self.node.channel_id,
                    self.mock_preferred_peer,
                ),
            ]
        )
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, ContentRequestStatus.Completed)

    @mock.patch(_module + "ContentDownloadRequestResourceImportManager")
    def test_download__exception(self, mock_import_manager):
        mock_import_manager.return_value.run.side_effect = Exception("test")
        result = _process_download(
            self.request, self.node.channel_id, self.mock_preferred_peer
        )
        mock_import_manager.return_value.run.assert_called_once()
        self.assertFalse(result)

    @mock.patch(_module + "ContentDownloadRequestResourceImportManager")
    def test_download__manager_exception(self, mock_import_manager):
        mock_import_manager.return_value.run.return_value = [None, None]
        mock_import_manager.return_value.exception = LocationError("test")
        result = _process_download(
            self.request, self.node.channel_id, self.mock_preferred_peer
        )
        mock_import_manager.return_value.run.assert_called_once()
        self.assertFalse(result)

    @mock.patch(_module + "ContentDownloadRequestResourceImportManager")
    def test_download__no_count(self, mock_import_manager):
        mock_import_manager.return_value.run.return_value = [None, 0]
        mock_import_manager.return_value.exception = None
        result = _process_download(
            self.request, self.node.channel_id, self.mock_preferred_peer
        )
        mock_import_manager.return_value.run.assert_called_once()
        self.assertFalse(result)

    @mock.patch(_module + "ContentDownloadRequestResourceImportManager")
    def test_download__success(self, mock_import_manager):
        mock_import_manager.return_value.run.return_value = [None, 1]
        mock_import_manager.return_value.exception = None
        result = _process_download(
            self.request, self.node.channel_id, self.mock_preferred_peer
        )
        mock_import_manager.return_value.run.assert_called_once()
        self.assertTrue(result)


class ProcessUserDownloadsForRemovalTestCase(BaseQuerysetTestCase):
    """
    Tests for process_user_downloads_for_removal function
    """

    def setUp(self):
        super().setUp()
        # Create a completed user-initiated download
        self.user_download = ContentDownloadRequest.build_for_user(self.learner)
        self.user_download.contentnode_id = uuid.uuid4().hex
        self.user_download.reason = ContentRequestReason.UserInitiated
        self.user_download.status = ContentRequestStatus.Completed
        self.user_download.save()

    def test_all_downloads_excluded_due_to_has_other_download__no_crash(self):
        """
        Regression test for AttributeError when all user downloads have has_other_download=True.

        Previously, when all completed user-initiated downloads were excluded because
        each had another download request for the same contentnode, the queryset would
        be empty and .first() returned None. The code then accessed
        largest_user_download.source_model, causing an AttributeError.

        This test ensures the function returns gracefully without crashing and
        without creating any ContentRemovalRequest.
        """
        # Create another download for the same contentnode with different source
        # This causes has_other_download=True, excluding our user download
        other_download = ContentDownloadRequest(
            contentnode_id=self.user_download.contentnode_id,
            reason=ContentRequestReason.SyncInitiated,
            status=ContentRequestStatus.Completed,
            source_model="different_model",
            source_id=uuid.uuid4().hex,
            facility=self.facility,
        )
        other_download.save()

        # Verify the setup: we have one user-initiated completed download,
        # but it should be excluded due to has_other_download=True
        self.assertEqual(
            ContentDownloadRequest.objects.filter(
                reason=ContentRequestReason.UserInitiated,
                status=ContentRequestStatus.Completed,
            ).count(),
            1,
        )

        # Count removal requests before
        removal_count_before = ContentRemovalRequest.objects.count()

        # This should NOT raise an AttributeError
        process_user_downloads_for_removal()

        # No ContentRemovalRequest should have been created
        self.assertEqual(
            ContentRemovalRequest.objects.count(),
            removal_count_before,
        )


class MergeImportMetadataTestCase(TestCase):
    """Tests for _merge_import_metadata function"""

    def test_merge_empty_list(self):
        result = _merge_import_metadata([])
        self.assertEqual(result, {})

    def test_merge_single_metadata(self):
        metadata = {
            ContentNode._meta.db_table: [{"id": "node1"}],
            File._meta.db_table: [{"id": "file1"}],
            "schema_version": "5",
        }
        result = _merge_import_metadata([metadata])
        self.assertEqual(result[ContentNode._meta.db_table], [{"id": "node1"}])
        self.assertEqual(result[File._meta.db_table], [{"id": "file1"}])
        self.assertEqual(result["schema_version"], "5")

    def test_merge_multiple_metadata(self):
        metadata1 = {
            ContentNode._meta.db_table: [{"id": "node1"}],
            File._meta.db_table: [{"id": "file1"}],
            "schema_version": "5",
        }
        metadata2 = {
            ContentNode._meta.db_table: [{"id": "node2"}, {"id": "node3"}],
            File._meta.db_table: [{"id": "file2"}],
            "schema_version": "5",
        }
        result = _merge_import_metadata([metadata1, metadata2])
        self.assertEqual(len(result[ContentNode._meta.db_table]), 3)
        self.assertEqual(len(result[File._meta.db_table]), 2)

    def test_merge_ignores_non_dict(self):
        metadata1 = {ContentNode._meta.db_table: [{"id": "node1"}]}
        result = _merge_import_metadata([metadata1, None, "invalid"])
        self.assertEqual(result[ContentNode._meta.db_table], [{"id": "node1"}])

    def test_merge_preserves_simple_fields(self):
        metadata1 = {"schema_version": "5", "some_bool": True, "some_int": 42}
        metadata2 = {"schema_version": "5", "some_bool": False, "some_int": 100}
        result = _merge_import_metadata([metadata1, metadata2])
        # First value should be preserved for simple fields
        self.assertEqual(result["schema_version"], "5")
        self.assertEqual(result["some_bool"], True)
        self.assertEqual(result["some_int"], 42)


class ImportDescendantsDepthTestCase(TestCase):
    """Tests for _import_descendants_depth function"""

    def test_non_course_node_returns_zero(self):
        import_metadata = {
            ContentNode._meta.db_table: [
                {"id": "node1", "options": "{}"},
            ]
        }
        result = _import_descendants_depth(import_metadata, "node1")
        self.assertEqual(result, 0)

    def test_course_node_returns_depth(self):
        options = '{"modality": "' + modalities.COURSE + '"}'
        import_metadata = {
            ContentNode._meta.db_table: [
                {"id": "node1", "options": options},
            ]
        }
        result = _import_descendants_depth(import_metadata, "node1")
        self.assertEqual(result, COURSES_DESCENDANTS_DEPTH)

    def test_node_not_found_returns_zero(self):
        options = '{"modality": "' + modalities.COURSE + '"}'
        import_metadata = {
            ContentNode._meta.db_table: [
                {"id": "other_node", "options": options},
            ]
        }
        result = _import_descendants_depth(import_metadata, "node1")
        self.assertEqual(result, 0)

    def test_invalid_options_json_returns_zero(self):
        import_metadata = {
            ContentNode._meta.db_table: [
                {"id": "node1", "options": "invalid json"},
            ]
        }
        result = _import_descendants_depth(import_metadata, "node1")
        self.assertEqual(result, 0)

    def test_empty_metadata_returns_zero(self):
        import_metadata = {ContentNode._meta.db_table: []}
        result = _import_descendants_depth(import_metadata, "node1")
        self.assertEqual(result, 0)

    def test_missing_options_returns_zero(self):
        import_metadata = {
            ContentNode._meta.db_table: [
                {"id": "node1"},
            ]
        }
        result = _import_descendants_depth(import_metadata, "node1")
        self.assertEqual(result, 0)


@mock.patch(_module + "reverse_path")
class GetDescendantsImportMetadataTestCase(TestCase):
    """Tests for _get_descendants_import_metadata function"""

    def setUp(self):
        self.mock_client = mock.MagicMock()
        self.contentnode_id = uuid.uuid4().hex

    def test_single_page_response(self, mock_reverse_path):
        """Test when response has no pagination (no 'more' key)"""
        mock_reverse_path.return_value = "/api/public/v2/importmetadata/{}/".format(
            self.contentnode_id
        )
        response_data = {
            "results": {
                ContentNode._meta.db_table: [{"id": "child1"}],
                File._meta.db_table: [{"id": "file1"}],
                "schema_version": "5",
            }
        }
        self.mock_client.get.return_value.json.return_value = response_data

        result = _get_descendants_import_metadata(
            self.mock_client, self.contentnode_id, depth=1
        )

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0][ContentNode._meta.db_table], [{"id": "child1"}])
        self.mock_client.get.assert_called_once()

    def test_paginated_response(self, mock_reverse_path):
        """Test when response has multiple pages with 'more' cursor"""
        mock_reverse_path.return_value = "/api/public/v2/importmetadata/{}/".format(
            self.contentnode_id
        )
        page1_response = {
            "more": {
                "schema_version": "5",
                "depth": "1",
                "max_results": "1",
                "cursor": "cD00MQ==",
            },
            "results": {
                ContentNode._meta.db_table: [{"id": "child1"}],
                "schema_version": "5",
            },
        }
        page2_response = {
            "results": {
                ContentNode._meta.db_table: [{"id": "child2"}],
                "schema_version": "5",
            }
        }
        self.mock_client.get.return_value.json.side_effect = [
            page1_response,
            page2_response,
        ]

        result = _get_descendants_import_metadata(
            self.mock_client, self.contentnode_id, depth=1
        )

        self.assertEqual(len(result), 2)
        self.assertEqual(result[0][ContentNode._meta.db_table], [{"id": "child1"}])
        self.assertEqual(result[1][ContentNode._meta.db_table], [{"id": "child2"}])
        self.assertEqual(self.mock_client.get.call_count, 2)

    def test_500_error_raises(self, mock_reverse_path):
        """Test that 500 errors are re-raised"""
        mock_reverse_path.return_value = "/api/public/v2/importmetadata/{}/".format(
            self.contentnode_id
        )
        mock_response = mock.MagicMock()
        mock_response.status_code = 500
        error = NetworkLocationResponseFailure(response=mock_response)
        self.mock_client.get.side_effect = error

        with self.assertRaises(NetworkLocationResponseFailure):
            _get_descendants_import_metadata(
                self.mock_client, self.contentnode_id, depth=1
            )

    def test_initial_request_has_depth_and_max_results(self, mock_reverse_path):
        """Test that the initial request includes depth and max_results params"""
        mock_reverse_path.return_value = "/api/public/v2/importmetadata/{}/".format(
            self.contentnode_id
        )
        response_data = {
            "results": {
                ContentNode._meta.db_table: [],
                "schema_version": "5",
            }
        }
        self.mock_client.get.return_value.json.return_value = response_data

        _get_descendants_import_metadata(
            self.mock_client, self.contentnode_id, depth=COURSES_DESCENDANTS_DEPTH
        )

        call_args = self.mock_client.get.call_args[0][0]
        self.assertIn("depth={}".format(COURSES_DESCENDANTS_DEPTH), call_args)
        self.assertIn("max_results={}".format(MAX_NODES_PER_REQUEST), call_args)

    def test_empty_results(self, mock_reverse_path):
        """Test handling of empty results"""
        mock_reverse_path.return_value = "/api/public/v2/importmetadata/{}/".format(
            self.contentnode_id
        )
        response_data = {"results": {}}
        self.mock_client.get.return_value.json.return_value = response_data

        result = _get_descendants_import_metadata(
            self.mock_client, self.contentnode_id, depth=1
        )

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0], {})

    def test_subsequent_requests_use_cursor(self, mock_reverse_path):
        """Test that subsequent requests use the cursor from 'more'"""
        mock_reverse_path.return_value = "/api/public/v2/importmetadata/{}/".format(
            self.contentnode_id
        )
        page1_response = {
            "more": {
                "schema_version": "5",
                "depth": "1",
                "max_results": "10",
                "cursor": "cD00MQ==",
            },
            "results": {
                ContentNode._meta.db_table: [{"id": "child1"}],
            },
        }
        page2_response = {
            "results": {
                ContentNode._meta.db_table: [{"id": "child2"}],
            }
        }
        self.mock_client.get.return_value.json.side_effect = [
            page1_response,
            page2_response,
        ]

        _get_descendants_import_metadata(self.mock_client, self.contentnode_id, depth=1)

        # Check second call uses cursor params
        second_call_url = self.mock_client.get.call_args_list[1][0][0]
        self.assertIn("cursor=cD00MQ%3D%3D", second_call_url)


class GetImportMetadataTestCase(TestCase):
    """Tests for _get_import_metadata function"""

    def setUp(self):
        self.mock_client = mock.MagicMock()
        self.contentnode_id = uuid.uuid4().hex

    def _create_basic_metadata(self, contentnode_id, options="{}"):
        return {
            ContentNode._meta.db_table: [
                {
                    "id": contentnode_id,
                    "title": "Test Node",
                    "options": options,
                }
            ],
            File._meta.db_table: [{"id": "file1"}],
            LocalFile._meta.db_table: [{"id": "localfile1"}],
            ChannelMetadata._meta.db_table: [{"id": "channel1"}],
            "schema_version": "5",
        }

    def test_basic_metadata_retrieval(self):
        """Test basic metadata retrieval without descendants"""
        metadata = self._create_basic_metadata(self.contentnode_id)
        self.mock_client.get.return_value.json.return_value = metadata

        result = _get_import_metadata(self.mock_client, self.contentnode_id)

        self.assertEqual(result, metadata)
        self.mock_client.get.assert_called_once()

    @mock.patch(_module + "_get_descendants_import_metadata")
    def test_course_node_fetches_descendants(self, mock_get_descendants):
        """Test that COURSE nodes trigger descendants fetching"""
        options = '{"modality": "' + modalities.COURSE + '"}'
        metadata = self._create_basic_metadata(self.contentnode_id, options=options)
        descendants_metadata = {
            ContentNode._meta.db_table: [{"id": "child1"}, {"id": "child2"}],
            File._meta.db_table: [{"id": "child_file1"}],
        }
        self.mock_client.get.return_value.json.return_value = metadata
        mock_get_descendants.return_value = [descendants_metadata]

        result = _get_import_metadata(self.mock_client, self.contentnode_id)

        mock_get_descendants.assert_called_once_with(
            self.mock_client, self.contentnode_id, COURSES_DESCENDANTS_DEPTH
        )
        # Check merged results
        self.assertEqual(len(result[ContentNode._meta.db_table]), 3)
        self.assertEqual(len(result[File._meta.db_table]), 2)

    @mock.patch(_module + "_get_descendants_import_metadata")
    def test_non_course_node_does_not_fetch_descendants(self, mock_get_descendants):
        """Test that non-COURSE nodes don't trigger descendants fetching"""
        metadata = self._create_basic_metadata(self.contentnode_id)
        self.mock_client.get.return_value.json.return_value = metadata

        result = _get_import_metadata(self.mock_client, self.contentnode_id)

        mock_get_descendants.assert_not_called()
        self.assertEqual(result, metadata)

    def test_404_returns_none(self):
        """Test that 404 errors return None"""
        mock_response = mock.MagicMock()
        mock_response.status_code = 404
        error = NetworkLocationResponseFailure(response=mock_response)
        self.mock_client.get.side_effect = error

        result = _get_import_metadata(self.mock_client, self.contentnode_id)

        self.assertIsNone(result)

    def test_400_returns_none(self):
        """Test that 400 errors return None"""
        mock_response = mock.MagicMock()
        mock_response.status_code = 400
        error = NetworkLocationResponseFailure(response=mock_response)
        self.mock_client.get.side_effect = error

        result = _get_import_metadata(self.mock_client, self.contentnode_id)

        self.assertIsNone(result)

    def test_500_error_raises(self):
        """Test that 500 errors are re-raised"""
        mock_response = mock.MagicMock()
        mock_response.status_code = 500
        error = NetworkLocationResponseFailure(response=mock_response)
        self.mock_client.get.side_effect = error

        with self.assertRaises(NetworkLocationResponseFailure):
            _get_import_metadata(self.mock_client, self.contentnode_id)

    @mock.patch(_module + "_get_descendants_import_metadata")
    def test_merges_ancestor_and_descendant_metadata(self, mock_get_descendants):
        """Test that ancestor and descendant metadata are properly merged"""
        options = '{"modality": "' + modalities.COURSE + '"}'
        ancestor_metadata = {
            ContentNode._meta.db_table: [
                {"id": self.contentnode_id, "options": options},
                {"id": "parent1"},
            ],
            File._meta.db_table: [{"id": "ancestor_file"}],
            Language._meta.db_table: [{"id": "en"}],
            "schema_version": "5",
        }
        page1_descendants = {
            ContentNode._meta.db_table: [{"id": "child1"}],
            File._meta.db_table: [{"id": "child_file1"}],
        }
        page2_descendants = {
            ContentNode._meta.db_table: [{"id": "child2"}],
            File._meta.db_table: [{"id": "child_file2"}],
        }
        self.mock_client.get.return_value.json.return_value = ancestor_metadata
        mock_get_descendants.return_value = [page1_descendants, page2_descendants]

        result = _get_import_metadata(self.mock_client, self.contentnode_id)

        # Should have: ancestor node + parent + child1 + child2 = 4 nodes
        self.assertEqual(len(result[ContentNode._meta.db_table]), 4)
        # Should have: ancestor_file + child_file1 + child_file2 = 3 files
        self.assertEqual(len(result[File._meta.db_table]), 3)
        # Language should be preserved
        self.assertEqual(result[Language._meta.db_table], [{"id": "en"}])
        self.assertEqual(result["schema_version"], "5")


class GetImportMetadataLiveServerTestCase(LiveServerTestCase):
    """
    Integration tests for _get_import_metadata against a live server.

    Unlike the unit tests in GetDescendantsImportMetadataTestCase and
    GetImportMetadataTestCase, these tests use a real NetworkClient making
    actual HTTP requests to a live Django server, verifying the end-to-end
    data flow including the correct format of data returned by the endpoint.

    Two cases are covered:
    - Non-course node: only ancestor metadata is returned
    - Course node: ancestors are merged with paginated descendant metadata
    """

    databases = "__all__"

    def setUp(self):
        self.builder = ChannelBuilder()
        self.builder.insert_into_default_db()
        self.root = ContentNode.objects.get(id=self.builder.root_node["id"])
        self.network_client = NetworkClient(self.live_server_url)

    def tearDown(self):
        self.network_client.close()

    def test_non_course_node_returns_ancestor_metadata_only(self):
        """
        A non-course node returns the metadata for itself and its ancestors,
        without fetching any descendants.
        """
        # Use a level-1 topic node that has both ancestors (root) and many descendants
        topic_node = ContentNode.objects.filter(
            channel_id=self.root.channel_id,
            level=1,
        ).first()

        result = _get_import_metadata(self.network_client, topic_node.id)

        self.assertIsNotNone(result)
        returned_node_ids = {n["id"] for n in result[ContentNode._meta.db_table]}

        # Should contain the topic node and its ancestors (root) only
        expected_ancestor_ids = set(
            topic_node.get_ancestors(include_self=True).values_list("id", flat=True)
        )
        self.assertEqual(returned_node_ids, expected_ancestor_ids)

        # No descendants should be included
        descendant_ids = set(topic_node.get_descendants().values_list("id", flat=True))
        self.assertTrue(returned_node_ids.isdisjoint(descendant_ids))

    def test_course_node_returns_merged_ancestor_and_descendant_metadata(self):
        """
        A course node triggers paginated descendant fetching via
        _get_descendants_import_metadata. The final result contains nodes from
        the ancestors call merged with all descendants up to
        COURSES_DESCENDANTS_DEPTH levels deep.

        The default ChannelBuilder tree has enough nodes to exceed
        MAX_NODES_PER_REQUEST, so this exercises the pagination code path
        end-to-end against a real server.
        """
        # Use a level-1 topic node that has both ancestors (root) and many descendants
        topic_node = ContentNode.objects.filter(
            channel_id=self.root.channel_id,
            level=1,
        ).first()
        topic_node.options = {"modality": modalities.COURSE}
        topic_node.save()

        result = _get_import_metadata(self.network_client, topic_node.id)

        self.assertIsNotNone(result)
        returned_node_ids = {n["id"] for n in result[ContentNode._meta.db_table]}

        expected_ancestor_ids = set(
            topic_node.get_ancestors(include_self=True).values_list("id", flat=True)
        )
        expected_descendant_ids = set(
            topic_node.get_descendants(include_self=True)
            .filter(level__lte=topic_node.level + COURSES_DESCENDANTS_DEPTH)
            .values_list("id", flat=True)
        )
        expected_node_ids = expected_ancestor_ids.union(expected_descendant_ids)
        self.assertEqual(returned_node_ids, expected_node_ids)
