import uuid
from contextlib import contextmanager
from datetime import timedelta
from functools import partial

import mock
import pytest
from django.test import LiveServerTestCase
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from le_utils.constants import content_kinds
from morango.models.core import SyncSession
from rest_framework.test import APIClient

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
from kolibri.core.content.test.sqlalchemytesting import django_connection_engine
from kolibri.core.content.utils import sqlalchemybridge as _sabridge
from kolibri.core.content.utils.assignment import ContentAssignment
from kolibri.core.content.utils.assignment import DeletedAssignment
from kolibri.core.content.utils.content_request import _get_import_metadata
from kolibri.core.content.utils.content_request import _merge_import_metadata
from kolibri.core.content.utils.content_request import _process_content_requests
from kolibri.core.content.utils.content_request import _process_download
from kolibri.core.content.utils.content_request import _total_size
from kolibri.core.content.utils.content_request import completed_downloads_queryset
from kolibri.core.content.utils.content_request import create_content_download_requests
from kolibri.core.content.utils.content_request import create_content_removal_requests
from kolibri.core.content.utils.content_request import incomplete_downloads_queryset
from kolibri.core.content.utils.content_request import incomplete_removals_queryset
from kolibri.core.content.utils.content_request import InsufficientStorage
from kolibri.core.content.utils.content_request import MAX_NODES_PER_REQUEST
from kolibri.core.content.utils.content_request import PreferredDevices
from kolibri.core.content.utils.content_request import PreferredDevicesWithClient
from kolibri.core.content.utils.content_request import process_content_removal_requests
from kolibri.core.content.utils.content_request import process_content_requests
from kolibri.core.content.utils.content_request import process_download_request
from kolibri.core.content.utils.content_request import process_metadata_import
from kolibri.core.content.utils.content_request import (
    process_user_downloads_for_removal,
)
from kolibri.core.content.utils.content_request import synchronize_content_requests
from kolibri.core.content.utils.file_availability import LocationError
from kolibri.core.content.utils.sqlalchemybridge import get_default_db_string
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

        # Build the queryset of downloads needing metadata import (only missing metadata
        # here, as the existing tests focus on that path).
        self.downloads_needing_metadata_import = incomplete_downloads.filter(
            has_metadata=False
        )
        self.count_patcher = mock.patch.object(
            self.downloads_needing_metadata_import, "count", return_value=0
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

    def _mock_import_metadata(self, client, incomplete_downloads):
        # manually track the calls to import_metadata, resolving the queryset to a list of IDs
        contentnode_ids = list(
            incomplete_downloads.values_list("contentnode_id", flat=True)
        )
        self.mock_import_metadata_calls.append((client, contentnode_ids))
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

        process_metadata_import(self.downloads_needing_metadata_import)
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

        process_metadata_import(self.downloads_needing_metadata_import)
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

        process_metadata_import(self.downloads_needing_metadata_import)
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

        process_metadata_import(self.downloads_needing_metadata_import)
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

        process_metadata_import(self.downloads_needing_metadata_import)
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


class InternalProcessContentRequestsTestCase(BaseQuerysetTestCase):
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


class GetImportMetadataTestCase(TestCase):
    """Tests for _get_import_metadata function"""

    def setUp(self):
        self.mock_client = mock.MagicMock()
        self.contentnode_id = uuid.uuid4().hex
        self.mock_download = mock.MagicMock()
        self.mock_download.contentnode_id = self.contentnode_id
        self.mock_download.metadata = None

    def _create_basic_metadata(self, contentnode_id):
        return {
            ContentNode._meta.db_table: [
                {
                    "id": contentnode_id,
                    "title": "Test Node",
                }
            ],
            File._meta.db_table: [{"id": "file1"}],
            LocalFile._meta.db_table: [{"id": "localfile1"}],
            ChannelMetadata._meta.db_table: [{"id": "channel1"}],
            "schema_version": "5",
        }

    @mock.patch(_module + "reverse_path")
    def test_basic_metadata_retrieval(self, mock_reverse_path):
        """Test basic metadata retrieval without descendants"""
        mock_reverse_path.return_value = "/api/public/v2/importmetadata/{}/".format(
            self.contentnode_id
        )
        metadata = self._create_basic_metadata(self.contentnode_id)
        self.mock_client.get.return_value.json.return_value = {"results": metadata}

        result = _get_import_metadata(self.mock_client, self.mock_download)

        self.assertEqual(result, metadata)
        self.mock_client.get.assert_called_once()

    @mock.patch(_module + "reverse_path")
    def test_import_descendants_adds_descendants_flag_to_url(self, mock_reverse_path):
        """Test that import_descendants=True adds descendants=true to the API request URL."""
        mock_reverse_path.return_value = "/api/public/v2/importmetadata/{}/".format(
            self.contentnode_id
        )
        self.mock_download.metadata = {"import_descendants": True}
        combined_metadata = {
            ContentNode._meta.db_table: [
                {"id": self.contentnode_id},
                {"id": "child1"},
                {"id": "child2"},
            ],
            File._meta.db_table: [{"id": "ancestor_file"}, {"id": "child_file1"}],
        }
        self.mock_client.get.return_value.json.return_value = {
            "results": combined_metadata
        }

        result = _get_import_metadata(self.mock_client, self.mock_download)

        call_url = self.mock_client.get.call_args[0][0]
        self.assertIn("descendants=true", call_url)
        self.assertEqual(len(result[ContentNode._meta.db_table]), 3)
        self.assertEqual(len(result[File._meta.db_table]), 2)

    @mock.patch(_module + "reverse_path")
    def test_no_import_descendants_does_not_add_descendants_flag(
        self, mock_reverse_path
    ):
        """Test that requests without import_descendants do not include descendants=true."""
        mock_reverse_path.return_value = "/api/public/v2/importmetadata/{}/".format(
            self.contentnode_id
        )
        metadata = self._create_basic_metadata(self.contentnode_id)
        self.mock_client.get.return_value.json.return_value = {"results": metadata}

        result = _get_import_metadata(self.mock_client, self.mock_download)

        call_url = self.mock_client.get.call_args[0][0]
        self.assertNotIn("descendants", call_url)
        self.assertEqual(result, metadata)

    def test_404_returns_none(self):
        """Test that 404 errors return None"""
        mock_response = mock.MagicMock()
        mock_response.status_code = 404
        error = NetworkLocationResponseFailure(response=mock_response)
        self.mock_client.get.side_effect = error

        result = _get_import_metadata(self.mock_client, self.mock_download)

        self.assertIsNone(result)

    def test_400_returns_none(self):
        """Test that 400 errors return None"""
        mock_response = mock.MagicMock()
        mock_response.status_code = 400
        error = NetworkLocationResponseFailure(response=mock_response)
        self.mock_client.get.side_effect = error

        result = _get_import_metadata(self.mock_client, self.mock_download)

        self.assertIsNone(result)

    def test_500_error_raises(self):
        """Test that 500 errors are re-raised"""
        mock_response = mock.MagicMock()
        mock_response.status_code = 500
        error = NetworkLocationResponseFailure(response=mock_response)
        self.mock_client.get.side_effect = error

        with self.assertRaises(NetworkLocationResponseFailure):
            _get_import_metadata(self.mock_client, self.mock_download)

    @mock.patch(_module + "reverse_path")
    def test_merges_paginated_metadata(self, mock_reverse_path):
        """Test that paginated pages from the combined endpoint are properly merged."""
        mock_reverse_path.return_value = "/api/public/v2/importmetadata/{}/".format(
            self.contentnode_id
        )
        self.mock_download.metadata = {"import_descendants": True}
        # Page 1 contains the node itself, its parent, and the first child.
        page1_response = {
            "more": {"descendants": "true", "max_results": "10", "cursor": "abc"},
            "results": {
                ContentNode._meta.db_table: [
                    {"id": self.contentnode_id},
                    {"id": "parent1"},
                    {"id": "child1"},
                ],
                File._meta.db_table: [{"id": "ancestor_file"}, {"id": "child_file1"}],
                Language._meta.db_table: [{"id": "en"}],
                "schema_version": "5",
            },
        }
        # Page 2 contains the second child.
        page2_response = {
            "results": {
                ContentNode._meta.db_table: [{"id": "child2"}],
                File._meta.db_table: [{"id": "child_file2"}],
            }
        }
        self.mock_client.get.return_value.json.side_effect = [
            page1_response,
            page2_response,
        ]

        result = _get_import_metadata(self.mock_client, self.mock_download)

        self.assertEqual(self.mock_client.get.call_count, 2)
        # Should have: node + parent1 + child1 + child2 = 4 nodes
        self.assertEqual(len(result[ContentNode._meta.db_table]), 4)
        # Should have: ancestor_file + child_file1 + child_file2 = 3 files
        self.assertEqual(len(result[File._meta.db_table]), 3)
        # Language and schema_version from page 1 should be preserved
        self.assertEqual(result[Language._meta.db_table], [{"id": "en"}])
        self.assertEqual(result["schema_version"], "5")

    @mock.patch(_module + "reverse_path")
    def test_initial_request_always_includes_max_results(self, mock_reverse_path):
        """Test that every first request includes max_results regardless of import_descendants."""
        mock_reverse_path.return_value = "/api/public/v2/importmetadata/{}/".format(
            self.contentnode_id
        )
        self.mock_client.get.return_value.json.return_value = {
            "results": {ContentNode._meta.db_table: []}
        }

        _get_import_metadata(self.mock_client, self.mock_download)

        call_url = self.mock_client.get.call_args[0][0]
        self.assertIn("max_results={}".format(MAX_NODES_PER_REQUEST), call_url)

    @mock.patch(_module + "reverse_path")
    def test_initial_request_with_descendants_includes_both_flags(
        self, mock_reverse_path
    ):
        """Test that the initial request with import_descendants includes both
        descendants=true and max_results."""
        mock_reverse_path.return_value = "/api/public/v2/importmetadata/{}/".format(
            self.contentnode_id
        )
        self.mock_download.metadata = {"import_descendants": True}
        self.mock_client.get.return_value.json.return_value = {
            "results": {ContentNode._meta.db_table: []}
        }

        _get_import_metadata(self.mock_client, self.mock_download)

        call_url = self.mock_client.get.call_args[0][0]
        self.assertIn("descendants=true", call_url)
        self.assertIn("max_results={}".format(MAX_NODES_PER_REQUEST), call_url)

    @mock.patch(_module + "reverse_path")
    def test_subsequent_requests_use_cursor(self, mock_reverse_path):
        """Test that follow-up requests use the cursor from the 'more' field."""
        mock_reverse_path.return_value = "/api/public/v2/importmetadata/{}/".format(
            self.contentnode_id
        )
        self.mock_download.metadata = {"import_descendants": True}
        page1_response = {
            "more": {
                "descendants": "true",
                "max_results": "10",
                "cursor": "cD00MQ==",
            },
            "results": {ContentNode._meta.db_table: [{"id": "child1"}]},
        }
        page2_response = {"results": {ContentNode._meta.db_table: [{"id": "child2"}]}}
        self.mock_client.get.return_value.json.side_effect = [
            page1_response,
            page2_response,
        ]

        _get_import_metadata(self.mock_client, self.mock_download)

        second_call_url = self.mock_client.get.call_args_list[1][0][0]
        self.assertIn("cursor=cD00MQ%3D%3D", second_call_url)

    @mock.patch(_module + "reverse_path")
    def test_import_descendants_404_returns_none(self, mock_reverse_path):
        """Test that a 404 during a descendants fetch returns None."""
        mock_reverse_path.return_value = "/api/public/v2/importmetadata/{}/".format(
            self.contentnode_id
        )
        self.mock_download.metadata = {"import_descendants": True}
        mock_response = mock.MagicMock()
        mock_response.status_code = 404
        self.mock_client.get.side_effect = NetworkLocationResponseFailure(
            response=mock_response
        )

        result = _get_import_metadata(self.mock_client, self.mock_download)

        self.assertIsNone(result)


class GetImportMetadataLiveServerTestCase(LiveServerTestCase):
    """
    Integration tests for _get_import_metadata against a live server.

    Unlike the unit tests in GetImportMetadataTestCase, these tests use a real
    NetworkClient making actual HTTP requests to a live Django server, verifying
    the end-to-end data flow including the correct format of data returned by
    the endpoint.

    Two cases are covered:
    - Non-course node: only ancestor metadata is returned
    - Course node: ancestors and paginated descendant metadata are returned together
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
        A download without import_descendants returns metadata for the node and its
        ancestors only, without fetching any descendants.
        """
        # Use a level-1 topic node that has both ancestors (root) and many descendants
        topic_node = ContentNode.objects.filter(
            channel_id=self.root.channel_id,
            level=1,
        ).first()

        mock_download = mock.MagicMock()
        mock_download.contentnode_id = topic_node.id
        mock_download.metadata = None

        result = _get_import_metadata(self.network_client, mock_download)

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
        A download with import_descendants in its metadata adds descendants=true to the
        request, triggering paginated fetching of ancestors and descendants together.
        The final result contains all ancestor and descendant nodes merged.

        The default ChannelBuilder tree has enough nodes to exceed
        MAX_NODES_PER_REQUEST, so this exercises the pagination code path
        end-to-end against a real server.
        """
        # Use a level-1 topic node that has both ancestors (root) and many descendants
        topic_node = ContentNode.objects.filter(
            channel_id=self.root.channel_id,
            level=1,
        ).first()

        mock_download = mock.MagicMock()
        mock_download.contentnode_id = topic_node.id
        mock_download.metadata = {"import_descendants": True}

        result = _get_import_metadata(self.network_client, mock_download)

        self.assertIsNotNone(result)
        returned_node_ids = {n["id"] for n in result[ContentNode._meta.db_table]}

        expected_ancestor_ids = set(
            topic_node.get_ancestors(include_self=True).values_list("id", flat=True)
        )
        expected_descendant_ids = set(
            topic_node.get_descendants(include_self=True).values_list("id", flat=True)
        )
        expected_node_ids = expected_ancestor_ids.union(expected_descendant_ids)
        self.assertEqual(returned_node_ids, expected_node_ids)


@mock.patch(_module + "get_device_setting", return_value=True)
class ProcessContentRequestsTestCase(BaseQuerysetTestCase):
    """
    Tests for process_content_requests().

    Covers the three-phase flow end-to-end:
        1. Metadata import — triggered for downloads whose ContentNode is absent.
        2. Descendant request creation — extra download requests are created for
            descendants of nodes that carry ``import_descendants`` in their metadata.
        3. Content download — _process_download is dispatched for every pending
            download that now has metadata.

    ``process_metadata_import`` is mocked to simulate the network import by
    creating ContentNode entries as a side effect (including children when
    ``import_descendants`` is set).  ``_process_download`` and ``PreferredDevices``
    are mocked to avoid real file-transfer and peer-discovery logic.
    """

    def setUp(self):
        super().setUp()

        # Simulate metadata import from a remote peer: creates ContentNode entries
        # for each requested node, plus children when import_descendants is set.
        process_metadata_import_patcher = mock.patch(
            _module + "process_metadata_import"
        )
        self.mock_process_metadata_import = process_metadata_import_patcher.start()
        self.mock_process_metadata_import.side_effect = (
            self._mock_process_metadata_import
        )
        self.addCleanup(process_metadata_import_patcher.stop)

        # Skip actual file transfer; treat every download attempt as a success.
        process_download_patcher = mock.patch(_module + "_process_download")
        self.mock_process_download = process_download_patcher.start()
        self.mock_process_download.return_value = True
        self.addCleanup(process_download_patcher.stop)

        # Provide a fake peer so process_download_request can proceed.
        preferred_devices_patcher = mock.patch(_module + "PreferredDevices")
        self.mock_preferred_devices = preferred_devices_patcher.start()
        mock_peer = mock.MagicMock()
        self.mock_preferred_devices.return_value.__iter__.return_value = [mock_peer]
        self.mock_preferred_devices.build_from_sync_sessions.return_value.__iter__.return_value = [
            mock_peer
        ]
        self.addCleanup(preferred_devices_patcher.stop)

        # Return abundant free space so no download is blocked by storage checks.
        free_space_patcher = mock.patch(_module + "get_free_space_for_downloads")
        self.mock_free_space = free_space_patcher.start()
        self.mock_free_space.return_value = 10**9
        self.addCleanup(free_space_patcher.stop)

        # Suppress device-status side effects (InsufficientStorage signals, etc.)
        learner_status_patcher = mock.patch(_module + "LearnerDeviceStatus")
        learner_status_patcher.start()
        self.addCleanup(learner_status_patcher.stop)

    def _mock_process_metadata_import(self, incomplete_downloads_without_metadata):
        """
        Simulates what ``import_channel_from_data`` would do after a real network
        fetch: writes ContentNode rows for every requested node.  When a download
        carries ``import_descendants``, two child ContentNodes are also created so
        that ``_create_related_download_requests_if_needed`` can traverse the tree.
        """
        channel_id = uuid.uuid4().hex
        for download in incomplete_downloads_without_metadata:
            if ContentNode.objects.filter(id=download.contentnode_id).exists():
                continue
            parent = ContentNode.objects.create(
                id=download.contentnode_id,
                title="imported node",
                kind="topic",
                channel_id=channel_id,
                content_id=uuid.uuid4().hex,
            )
            if (download.metadata or {}).get("import_descendants", False):
                for i in range(2):
                    ContentNode.objects.create(
                        id=uuid.uuid4().hex,
                        title="child {}".format(i),
                        kind="video",
                        parent=parent,
                        channel_id=channel_id,
                        content_id=uuid.uuid4().hex,
                    )

    def _create_download(self, contentnode_id=None, metadata=None):
        download = ContentDownloadRequest.build_for_user(self.admin)
        download.contentnode_id = contentnode_id or uuid.uuid4().hex
        download.metadata = metadata
        download.save()
        return download

    # ------------------------------------------------------------------ #
    # Phase 1: metadata import                                             #
    # ------------------------------------------------------------------ #

    def test_metadata_import_triggered_when_contentnode_missing(self, _mock_setting):
        """process_metadata_import is called when a download has no ContentNode yet."""
        download = self._create_download()

        process_content_requests()

        self.mock_process_metadata_import.assert_called_once()
        self.assertTrue(ContentNode.objects.filter(id=download.contentnode_id).exists())

    def test_metadata_import_skipped_when_contentnode_already_present(
        self, _mock_setting
    ):
        """process_metadata_import is NOT called when all downloads already have a ContentNode
        and no channel_version is set."""
        node_id = uuid.uuid4().hex
        ContentNode.objects.create(
            id=node_id,
            title="pre-existing",
            kind="video",
            channel_id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
        )
        self._create_download(contentnode_id=node_id)

        process_content_requests()

        self.mock_process_metadata_import.assert_not_called()

    def test_metadata_import_triggered_for_versioned_download_with_existing_node(
        self, _mock_setting
    ):
        """process_metadata_import IS called when channel_version exceeds the currently
        imported channel version, even if the ContentNode already exists (channel was
        updated and metadata must be re-imported)."""
        channel_id = uuid.uuid4().hex
        node_id = uuid.uuid4().hex
        root = ContentNode.objects.create(
            id=node_id,
            title="pre-existing",
            kind="topic",
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
        )
        # Simulate a channel that was previously imported at version 1
        ChannelMetadata.objects.create(
            id=channel_id, name="test channel", root=root, version=1
        )
        download = self._create_download(contentnode_id=node_id)
        # channel_version=2 > currently-imported version 1, so metadata must be re-imported
        download.channel_version = 2
        download.save()

        process_content_requests()

        self.mock_process_metadata_import.assert_called_once()

    # ------------------------------------------------------------------ #
    # Phase 2: descendant request creation                                 #
    # ------------------------------------------------------------------ #

    def test_no_descendant_requests_created_without_import_descendants(
        self, _mock_setting
    ):
        """A simple download (no import_descendants) produces exactly one download request."""
        self._create_download(metadata=None)

        process_content_requests()

        self.assertEqual(ContentDownloadRequest.objects.count(), 1)

    def test_descendant_requests_created_when_import_descendants_set(
        self, _mock_setting
    ):
        """
        When a download carries import_descendants, after metadata import the mock
        creates child ContentNodes.  process_content_requests must then create one
        ContentDownloadRequest per child.
        """
        download = self._create_download(metadata={"import_descendants": True})

        process_content_requests()

        # The mock creates 2 children; there should be 3 requests total (parent + 2).
        self.assertEqual(ContentDownloadRequest.objects.count(), 3)
        parent_node = ContentNode.objects.get(id=download.contentnode_id)
        child_ids = list(parent_node.get_descendants().values_list("id", flat=True))
        self.assertEqual(len(child_ids), 2)
        for child_id in child_ids:
            self.assertTrue(
                ContentDownloadRequest.objects.filter(contentnode_id=child_id).exists()
            )

    def test_descendant_requests_inherit_source_and_omit_import_descendants(
        self, _mock_setting
    ):
        """
        Requests created for descendants share source_model/source_id with the
        parent request and do not carry import_descendants in their own metadata.
        """
        download = self._create_download(
            metadata={"import_descendants": True, "extra": "value"}
        )

        process_content_requests()

        parent_node = ContentNode.objects.get(id=download.contentnode_id)
        for child_node in parent_node.get_descendants():
            child_req = ContentDownloadRequest.objects.get(contentnode_id=child_node.id)
            self.assertEqual(child_req.source_model, download.source_model)
            self.assertEqual(child_req.source_id, download.source_id)
            self.assertNotIn("import_descendants", child_req.metadata)
            self.assertEqual(child_req.metadata.get("extra"), "value")

    # ------------------------------------------------------------------ #
    # Phase 3: content download dispatch                                   #
    # ------------------------------------------------------------------ #

    def test_process_download_called_for_simple_download(self, _mock_setting):
        """_process_download is called once for a single download after metadata import."""
        self._create_download()

        process_content_requests()

        self.assertEqual(self.mock_process_download.call_count, 1)

    def test_process_download_called_for_parent_and_all_descendants(
        self, _mock_setting
    ):
        """
        _process_download is called for the parent node and every descendant
        whose download request was created during the descendants phase.
        """
        self._create_download(metadata={"import_descendants": True})

        process_content_requests()

        # parent + 2 children = 3 download attempts
        self.assertEqual(self.mock_process_download.call_count, 3)

    def test_download_requests_marked_completed_after_successful_download(
        self, _mock_setting
    ):
        """All download requests end up Completed when _process_download returns True."""
        self._create_download(metadata={"import_descendants": True})

        process_content_requests()

        completed = ContentDownloadRequest.objects.filter(
            status=ContentRequestStatus.Completed
        )
        # parent + 2 children = 3 completed
        self.assertEqual(completed.count(), 3)


class CreateContentRemovalRequestsTestCase(BaseQuerysetTestCase):
    """
    Tests for create_content_removal_requests().

    Covers both assignment types:
      - ContentAssignment: has contentnode_id and metadata; descendants are
        resolved via metadata["import_descendants"] when present.
      - DeletedAssignment: has no contentnode_id or metadata; removal targets
        are derived from the existing SyncInitiated downloads for that source.
    """

    def _make_content_assignment(
        self, contentnode_id=None, source_id=None, metadata=None
    ):
        return ContentAssignment(
            contentnode_id=contentnode_id or uuid.uuid4().hex,
            source_model="test_model",
            source_id=source_id or uuid.uuid4().hex,
            metadata=metadata,
        )

    def _make_deleted_assignment(self, source_id=None):
        return DeletedAssignment(
            source_model="test_model",
            source_id=source_id or uuid.uuid4().hex,
        )

    def _create_sync_download(self, source_model, source_id, contentnode_id=None):
        """Creates a SyncInitiated ContentDownloadRequest (the kind that gets deleted)."""
        download = ContentDownloadRequest(
            facility=self.facility,
            source_model=source_model,
            source_id=source_id,
            contentnode_id=contentnode_id or uuid.uuid4().hex,
            reason=ContentRequestReason.SyncInitiated,
            status=ContentRequestStatus.Pending,
        )
        download.save()
        return download

    def _create_node_tree(self):
        """Creates a root -> parent -> child1, child2 MPTT tree."""
        channel_id = uuid.uuid4().hex
        root = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="root",
            kind="topic",
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
        )
        parent = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="parent",
            kind="topic",
            parent=root,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
        )
        child1 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="child1",
            kind="video",
            parent=parent,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
        )
        child2 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="child2",
            kind="video",
            parent=parent,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
        )
        parent.refresh_from_db()
        return parent, child1, child2

    def test_content_assignment_creates_removal_request(self):
        """A ContentAssignment produces a removal request for its own contentnode_id."""
        assignment = self._make_content_assignment()

        create_content_removal_requests(self.facility, [assignment])

        self.assertTrue(
            ContentRemovalRequest.objects.filter(
                contentnode_id=assignment.contentnode_id,
                source_model=assignment.source_model,
                source_id=assignment.source_id,
            ).exists()
        )

    def test_content_assignment_without_import_descendants_creates_only_one_removal_request(
        self,
    ):
        """ContentAssignment with no import_descendants creates exactly one removal request."""
        parent, child1, child2 = self._create_node_tree()
        assignment = self._make_content_assignment(
            contentnode_id=parent.id, metadata=None
        )

        create_content_removal_requests(self.facility, [assignment])

        created_ids = set(
            ContentRemovalRequest.objects.values_list("contentnode_id", flat=True)
        )
        self.assertIn(parent.id, created_ids)
        self.assertNotIn(child1.id, created_ids)
        self.assertNotIn(child2.id, created_ids)

    def test_content_assignment_with_import_descendants_creates_removal_requests_for_descendants(
        self,
    ):
        """ContentAssignment with import_descendants creates removal requests for the node and all
        its descendants."""
        parent, child1, child2 = self._create_node_tree()
        assignment = self._make_content_assignment(
            contentnode_id=parent.id,
            metadata={"import_descendants": True},
        )

        create_content_removal_requests(self.facility, [assignment])

        created_ids = set(
            ContentRemovalRequest.objects.values_list("contentnode_id", flat=True)
        )
        self.assertIn(parent.id, created_ids)
        self.assertIn(child1.id, created_ids)
        self.assertIn(child2.id, created_ids)

    def test_content_assignment_deletes_related_sync_downloads(self):
        """Sync-initiated downloads matching source_model/source_id are deleted."""
        source_id = uuid.uuid4().hex
        download = self._create_sync_download("test_model", source_id)
        assignment = self._make_content_assignment(source_id=source_id)

        create_content_removal_requests(self.facility, [assignment])

        self.assertFalse(ContentDownloadRequest.objects.filter(id=download.id).exists())

    def test_content_assignment_removal_request_is_idempotent(self):
        """Calling create_content_removal_requests twice does not create duplicate requests."""
        assignment = self._make_content_assignment()

        create_content_removal_requests(self.facility, [assignment])
        create_content_removal_requests(self.facility, [assignment])

        self.assertEqual(
            ContentRemovalRequest.objects.filter(
                contentnode_id=assignment.contentnode_id
            ).count(),
            1,
        )

    def test_deleted_assignment_creates_removal_requests_from_related_downloads(self):
        """DeletedAssignment derives removal targets from the contentnode_ids of
        its existing SyncInitiated download requests."""
        source_id = uuid.uuid4().hex
        download1 = self._create_sync_download("test_model", source_id)
        download2 = self._create_sync_download("test_model", source_id)
        assignment = self._make_deleted_assignment(source_id=source_id)

        create_content_removal_requests(self.facility, [assignment])

        created_ids = set(
            ContentRemovalRequest.objects.values_list("contentnode_id", flat=True)
        )
        self.assertIn(download1.contentnode_id, created_ids)
        self.assertIn(download2.contentnode_id, created_ids)

    def test_deleted_assignment_with_no_related_downloads_creates_no_removal_requests(
        self,
    ):
        """DeletedAssignment with no matching downloads produces no removal requests."""
        assignment = self._make_deleted_assignment()

        create_content_removal_requests(self.facility, [assignment])

        self.assertEqual(ContentRemovalRequest.objects.count(), 0)

    def test_deleted_assignment_deletes_related_sync_downloads(self):
        """Sync-initiated downloads are deleted when processing a DeletedAssignment."""
        source_id = uuid.uuid4().hex
        download = self._create_sync_download("test_model", source_id)
        assignment = self._make_deleted_assignment(source_id=source_id)

        create_content_removal_requests(self.facility, [assignment])

        self.assertFalse(ContentDownloadRequest.objects.filter(id=download.id).exists())


class CreateContentDownloadRequestsTestCase(BaseQuerysetTestCase):
    """
    Tests for create_content_download_requests().

    Verifies that channel_version is stored on the request and that a new
    request is created when the version changes, allowing re-download after
    a channel update.
    """

    def _make_assignment(
        self, contentnode_id=None, source_id=None, channel_version=None
    ):
        return ContentAssignment(
            contentnode_id=contentnode_id or uuid.uuid4().hex,
            source_model="test_model",
            source_id=source_id or uuid.uuid4().hex,
            metadata=None,
            channel_version=channel_version,
        )

    def test_creates_download_request_with_channel_version(self):
        """channel_version is stored on the created ContentDownloadRequest."""
        assignment = self._make_assignment(channel_version=3)

        create_content_download_requests(self.facility, [assignment])

        req = ContentDownloadRequest.objects.get(
            source_model=assignment.source_model,
            source_id=assignment.source_id,
            contentnode_id=assignment.contentnode_id,
        )
        self.assertEqual(req.channel_version, 3)

    def test_creates_download_request_with_null_channel_version(self):
        """channel_version=None (default) is stored correctly."""
        assignment = self._make_assignment(channel_version=None)

        create_content_download_requests(self.facility, [assignment])

        req = ContentDownloadRequest.objects.get(
            source_model=assignment.source_model,
            source_id=assignment.source_id,
            contentnode_id=assignment.contentnode_id,
        )
        self.assertIsNone(req.channel_version)

    def test_idempotent_for_same_version(self):
        """Calling twice with the same version does not create duplicate requests."""
        assignment = self._make_assignment(channel_version=1)

        create_content_download_requests(self.facility, [assignment])
        create_content_download_requests(self.facility, [assignment])

        count = ContentDownloadRequest.objects.filter(
            source_model=assignment.source_model,
            source_id=assignment.source_id,
            contentnode_id=assignment.contentnode_id,
        ).count()
        self.assertEqual(count, 1)

    def test_new_request_created_when_version_changes(self):
        """When channel_version changes, a new pending download request is created."""
        source_id = uuid.uuid4().hex
        contentnode_id = uuid.uuid4().hex

        assignment_v1 = self._make_assignment(
            contentnode_id=contentnode_id, source_id=source_id, channel_version=1
        )
        assignment_v2 = self._make_assignment(
            contentnode_id=contentnode_id, source_id=source_id, channel_version=2
        )

        create_content_download_requests(self.facility, [assignment_v1])
        create_content_download_requests(self.facility, [assignment_v2])

        requests = ContentDownloadRequest.objects.filter(
            source_model=assignment_v1.source_model,
            source_id=source_id,
            contentnode_id=contentnode_id,
        )
        self.assertEqual(requests.count(), 2)
        versions = set(requests.values_list("channel_version", flat=True))
        self.assertEqual(versions, {1, 2})


def _create_network_location(**location_overrides):
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


@pytest.fixture(scope="module")
def import_metadata_responses(django_db_setup, django_db_blocker):
    """
    Method to build a mock response object for _get_import_metadata, it creates a channel,
    fetches metadata for it using the importmetadata endpoint, do the same for a simulated
    channel upgrade, and removes the channel from the database, so that it doesn't interfere
    with other tests.
    """
    with django_db_blocker.unblock():
        client = APIClient()
        channel_version = 1
        builder = ChannelBuilder(levels=3, num_children=3)
        channel_id = builder.channel["id"]
        builder.channel["version"] = channel_version
        builder.insert_into_default_db()

        channel_root = ChannelMetadata.objects.get(id=channel_id).root
        root_children = channel_root.get_children()
        # leaf from first branch of the tree
        leaf_1 = (
            root_children[0].get_descendants().exclude(kind=content_kinds.TOPIC).first()
        )
        # leaf from second branch of the tree
        leaf_2 = (
            root_children[1].get_descendants().exclude(kind=content_kinds.TOPIC).first()
        )
        # topic from third branch of the tree, useful for import_descendants tests
        folder_3 = root_children[2]

        def _retrieve_metadata():
            response = client.get(
                reverse("kolibri:core:importmetadata-detail", kwargs={"pk": leaf_1.id})
            )
            leaf_1__metadata = response.json()

            response = client.get(
                reverse("kolibri:core:importmetadata-detail", kwargs={"pk": leaf_2.id})
            )
            leaf_2__metadata = response.json()

            response = client.get(
                reverse(
                    "kolibri:core:importmetadata-detail", kwargs={"pk": folder_3.id}
                )
                + "?descendants=true"
            )
            folder_3__metadata = response.json()

            return {
                leaf_1.id: leaf_1__metadata,
                leaf_2.id: leaf_2__metadata,
                folder_3.id: folder_3__metadata,
            }

        v1_metadata = _retrieve_metadata()

        ChannelMetadata.objects.filter(id=channel_id).update(
            version=channel_version + 1
        )
        # Update tree of folder_3 to have different structure
        folder_3.get_children().first().delete()  # Folder 3 now has only 2 children instead of 3
        v2_metadata = _retrieve_metadata()

        builder.remove_from_default_db()

        return {
            "channel_id": channel_id,
            "leaf_1": leaf_1.id,
            "leaf_2": leaf_2.id,
            "folder_3": folder_3.id,
            "v1_metadata": v1_metadata,
            "v2_metadata": v2_metadata,
        }


@pytest.mark.django_db(transaction=True, databases="__all__")
class TestImportMetadataChannelUpgrade:
    """
    Integration tests for _import_metadata covering channel-upgrade scenarios.

    _get_import_metadata is mocked to return data in the format produced by
    ImportMetadataViewset._serialize (keyed by model db_table names, schema_version "5").
    import_channel_from_data is exercised for real so that ContentNode and ChannelMetadata
    rows are actually written to the database, allowing assertions against final DB state.
    """

    @pytest.fixture(autouse=True)
    def _setup(self, import_metadata_responses):
        mock_client = mock.MagicMock()
        self.facility = Facility.objects.create(name="Test Facility")
        self.admin = FacilityUser.objects.create(
            username="admin_upgrade",
            password="password",
            facility=self.facility,
        )
        self.channel_version = 1
        self.instance_id = uuid.uuid4().hex
        self.facility.add_admin(self.admin)
        self.import_metadata_responses = import_metadata_responses
        self.channel_id = import_metadata_responses["channel_id"]
        self.leaf_1 = import_metadata_responses["leaf_1"]
        self.leaf_2 = import_metadata_responses["leaf_2"]
        self.folder_3 = import_metadata_responses["folder_3"]

        # --- SharingPool patch so the local import (import_channel_from_data) uses
        # Django's connection and can see in-memory test data.
        default_cs = get_default_db_string()
        _orig_get_engine = _sabridge.get_engine

        def _patched_get_engine_mock(connection_string):
            if connection_string == default_cs:
                return django_connection_engine()
            return _orig_get_engine(connection_string)

        _engine_patch = mock.patch.object(
            _sabridge, "get_engine", side_effect=_patched_get_engine_mock
        )

        # Mocking _get_import_metadata to return the prepared metadata responses for the test channel
        def _get_import_metadata_mock(client, download):
            node_id = download.contentnode_id
            data = import_metadata_responses[f"v{self.channel_version}_metadata"].get(
                node_id
            )
            if not data:
                return None
            return data

        _get_import_metadata_patch = mock.patch(
            _module + "_get_import_metadata", side_effect=_get_import_metadata_mock
        )

        # Mocking PreferredDevicesWithClient to return a single peer with the test instance_id
        _preferred_mock = mock.MagicMock()
        peer1 = _create_network_location(instance_id=self.instance_id)
        _preferred_mock.return_value.__iter__.return_value = [
            (peer1, mock_client),
        ]
        _preferred_mock.build_from_sync_sessions.return_value = []
        _preferred_patch = mock.patch(
            _module + "PreferredDevicesWithClient", new=_preferred_mock
        )

        # Mocking _process_content_requests to avoid side effects during the test
        def _process_content_requests_mock(incomplete_downloads):
            # Just assume all downloads are completed successfully without doing any real processing
            incomplete_downloads.update(status=ContentRequestStatus.Completed)

        _process_content_requests_patch = mock.patch(
            _module + "_process_content_requests",
            side_effect=_process_content_requests_mock,
        )

        with _engine_patch, _get_import_metadata_patch, _preferred_patch, _process_content_requests_patch:
            yield

    def _upgrade_channel_version_on_server(self):
        """
        Simulates a channel upgrade on the server by incrementing self.channel_version, which is
        used by the mocked _get_import_metadata to know which metadata to return "from the server".
        """
        if self.channel_version == 2:
            raise ValueError("Channel version is already at 2, cannot upgrade further.")

        self.channel_version += 1

    def _create_download(self, contentnode_id, metadata=None, channel_version=None):
        download = ContentDownloadRequest.build_for_user(self.admin)
        download.contentnode_id = contentnode_id
        download.source_instance_id = self.instance_id
        if metadata is not None:
            download.metadata = metadata

        if channel_version is not None:
            download.channel_version = channel_version

        download.save()
        return download

    def _get_metadata(self, contentnode_id, channel_version, model):
        return self.import_metadata_responses[f"v{channel_version}_metadata"][
            contentnode_id
        ][model._meta.db_table]

    def test_smoke_test(self):
        process_content_requests()

    def test_import_metadata_for_leaf_node(self):
        self._create_download(self.leaf_1)

        process_content_requests()

        assert ContentNode.objects.filter(id=self.leaf_1).exists()
        assert not ContentNode.objects.filter(id=self.leaf_2).exists()
        assert not ContentNode.objects.filter(id=self.folder_3).exists()
        assert ChannelMetadata.objects.filter(id=self.channel_id).exists()
        assert (
            ChannelMetadata.objects.get(id=self.channel_id).version
            == self.channel_version
        )

    def test_two_downloads_on_same_process_requests(self):
        self._create_download(self.leaf_1)
        self._create_download(self.leaf_2)

        process_content_requests()

        assert ContentNode.objects.filter(id=self.leaf_1).exists()
        assert ContentNode.objects.filter(id=self.leaf_2).exists()
        assert not ContentNode.objects.filter(id=self.folder_3).exists()

    def test_two_downloads_on_different_process_requests(self):
        self._create_download(self.leaf_1)
        process_content_requests()

        self._create_download(self.leaf_2)
        process_content_requests()

        assert ContentNode.objects.filter(id=self.leaf_1).exists()
        assert ContentNode.objects.filter(id=self.leaf_2).exists()
        assert not ContentNode.objects.filter(id=self.folder_3).exists()

    def test_import_metadata_for_topic_node_with_descendants(self):
        self._create_download(self.folder_3, metadata={"import_descendants": True})

        process_content_requests()

        contentnodes = self._get_metadata(
            self.folder_3, self.channel_version, ContentNode
        )
        contentnodes_ids = {node["id"] for node in contentnodes}

        contentnodes_imported = ContentNode.objects.all().values_list("id", flat=True)
        assert ContentNode.objects.filter(id=self.folder_3).exists()
        assert set(contentnodes_imported) == contentnodes_ids

    def test_channel_upgrade_updates_tree_with_new_structure(
        self, import_metadata_responses
    ):
        self._create_download(self.folder_3, metadata={"import_descendants": True})

        process_content_requests()

        self._upgrade_channel_version_on_server()
        self._create_download(
            self.folder_3,
            metadata={"import_descendants": True},
            channel_version=self.channel_version,
        )

        process_content_requests()
        contentnodes = self._get_metadata(
            self.folder_3, self.channel_version, ContentNode
        )
        contentnodes_ids = {node["id"] for node in contentnodes}

        contentnodes_imported = ContentNode.objects.all().values_list("id", flat=True)
        assert ContentNode.objects.filter(id=self.folder_3).exists()
        # New contentnodes doesn't include the deleted child, if contentnodes on the database
        # are equal, it means that old structure was replaced successfully.
        assert set(contentnodes_imported) == contentnodes_ids
        assert (
            ChannelMetadata.objects.get(id=self.channel_id).version
            == self.channel_version
        )

    def test_channel_upgrade_does_not_remove_previously_imported_contentnodes(
        self, import_metadata_responses
    ):
        # First import the channel with the initial version
        self._create_download(self.leaf_1)

        process_content_requests()

        assert ContentNode.objects.filter(id=self.leaf_1).exists()

        self._upgrade_channel_version_on_server()

        # Import a different leaf node with the new channel version
        self._create_download(self.leaf_2)

        process_content_requests()

        # Assert that both the previously imported leaf and the newly imported leaf exist
        assert ContentNode.objects.filter(id=self.leaf_1).exists()
        assert ContentNode.objects.filter(id=self.leaf_2).exists()
        assert (
            ChannelMetadata.objects.get(id=self.channel_id).version
            == self.channel_version
        )

    def test_lower_channel_version_does_not_overwrite_higher_version(
        self, import_metadata_responses
    ):
        # First import the channel with the initial version
        self.channel_version = 2
        self._create_download(self.leaf_1)

        process_content_requests()

        assert ContentNode.objects.filter(id=self.leaf_1).exists()
        assert (
            ChannelMetadata.objects.get(id=self.channel_id).version
            == self.channel_version
        )

        # Assume preferred peer is not available, and we are falling back to another peer with an
        # older channel version
        self.channel_version = 1
        self._create_download(self.leaf_2)

        process_content_requests()

        # Assert that channel version did not got downgraded and leaf_2 metadata was not imported
        # since it's from an older channel version
        assert not ContentNode.objects.filter(id=self.leaf_2).exists()
        assert ContentNode.objects.filter(id=self.leaf_1).exists()
        assert ChannelMetadata.objects.get(id=self.channel_id).version == 2
