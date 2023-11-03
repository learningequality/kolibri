"""
Subset of Users Device (SOUD) tests
"""
import time
import uuid

import mock
from django.test import TestCase

from ..soud import Context
from ..soud import request_sync_hook
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import SyncQueue
from kolibri.core.device.models import SyncQueueStatus
from kolibri.core.discovery.models import ConnectionStatus
from kolibri.core.discovery.models import DynamicNetworkLocation
from kolibri.core.discovery.models import StaticNetworkLocation


class SoudContextTestCase(TestCase):
    def setUp(self):
        super(SoudContextTestCase, self).setUp()
        self.context = Context(uuid.uuid4().hex, uuid.uuid4().hex)

    def test_property__network_location(self):
        netloc = StaticNetworkLocation.objects.create(
            base_url="https://kolibrihappyurl.qqq/",
            connection_status=ConnectionStatus.Okay,
            application="kolibri",
            instance_id=self.context.instance_id,
        )
        self.assertEqual(self.context.network_location, netloc)

    def test_property__network_location__not_kolibri(self):
        StaticNetworkLocation.objects.create(
            base_url="https://kolibrihappyurl.qqq/",
            connection_status=ConnectionStatus.Okay,
            application="studio",
            instance_id=self.context.instance_id,
        )
        self.assertIsNone(self.context.network_location)

    def test_property__network_location__not_connected(self):
        StaticNetworkLocation.objects.create(
            base_url="https://kolibrihappyurl.qqq/",
            connection_status=ConnectionStatus.ConnectionFailure,
            application="kolibri",
            instance_id=self.context.instance_id,
        )
        self.assertIsNone(self.context.network_location)


class SoudRequestSyncHookHandlerTestCase(TestCase):
    multi_db = True

    def setUp(self):
        super(SoudRequestSyncHookHandlerTestCase, self).setUp()
        self.instance_id = uuid.uuid4().hex
        self.user_ids = [
            uuid.uuid4().hex,
        ]

        self.facility = Facility.objects.create(name="Test")
        self._create_users()

        self.mock_network_location = mock.Mock(
            spec=DynamicNetworkLocation,
            instance_id=self.instance_id,
        )

        get_all_user_ids = mock.patch("kolibri.core.device.soud.get_all_user_ids")
        self.mock_get_all_user_ids = get_all_user_ids.start()
        self.mock_get_all_user_ids.return_value = self.user_ids
        self.addCleanup(get_all_user_ids.stop)

        request_sync = mock.patch("kolibri.core.device.soud.request_sync")
        self.mock_request_sync = request_sync.start()
        self.addCleanup(request_sync.stop)

    def _create_users(self):
        for user_id in self.user_ids:
            FacilityUser.objects.get_or_create(
                id=user_id,
                defaults=dict(
                    username=user_id,
                    facility=self.facility,
                ),
            )

    def assertRequestSyncCalled(self, user_id, call_index=0):
        calls = self.mock_request_sync.mock_calls
        _, args, kwargs = calls[call_index]
        self.assertIsInstance(args[0], Context)
        self.assertEqual(args[0].user_id, user_id)
        self.assertEqual(args[0].instance_id, self.instance_id)
        self.assertEqual(kwargs, {"network_location": self.mock_network_location})

    def assertPendingQueue(self, user_id):
        queue = SyncQueue.objects.get(user_id=user_id)
        self.assertEqual(queue.instance_id, self.instance_id)
        self.assertEqual(queue.status, SyncQueueStatus.Pending)
        self.assertGreaterEqual(queue.updated, time.time() - 1)

    def test_single_user__no_queue(self):
        request_sync_hook(self.mock_network_location)
        self.assertRequestSyncCalled(self.user_ids[0])
        self.assertPendingQueue(self.user_ids[0])

    def test_single_user__existing_queue__active(self):
        queue = SyncQueue.objects.create(
            user_id=self.user_ids[0],
            instance_id=self.instance_id,
            status=SyncQueueStatus.Syncing,
        )
        request_sync_hook(self.mock_network_location)
        self.mock_request_sync.assert_not_called()
        updated = queue.updated
        queue.refresh_from_db()
        self.assertEqual(queue.status, SyncQueueStatus.Syncing)
        self.assertEqual(queue.updated, updated)

    def test_single_user__existing_queue__inactive(self):
        SyncQueue.objects.create(
            user_id=self.user_ids[0],
            instance_id=self.instance_id,
            status=SyncQueueStatus.Syncing,
            updated=time.time() - 100,
        )
        request_sync_hook(self.mock_network_location)
        self.assertRequestSyncCalled(self.user_ids[0])
        self.assertPendingQueue(self.user_ids[0])

    def test_multiple_users(self):
        self.user_ids.extend([uuid.uuid4().hex, uuid.uuid4().hex])
        self._create_users()
        user_a, user_b, user_c = self.user_ids

        # user_a stale
        SyncQueue.objects.create(
            user_id=user_a,
            instance_id=self.instance_id,
            status=SyncQueueStatus.Pending,
            updated=time.time() - 100,
        )
        # user_b active
        queue = SyncQueue.objects.create(
            user_id=user_b,
            instance_id=self.instance_id,
            status=SyncQueueStatus.Syncing,
        )
        # user_c no queue
        request_sync_hook(self.mock_network_location)
        self.assertEqual(self.mock_request_sync.call_count, 2)
        self.assertRequestSyncCalled(user_a, call_index=0)
        self.assertRequestSyncCalled(user_c, call_index=1)
        self.assertPendingQueue(user_a)
        self.assertPendingQueue(user_c)
        updated = queue.updated
        queue.refresh_from_db()
        self.assertEqual(queue.status, SyncQueueStatus.Syncing)
        self.assertEqual(queue.updated, updated)
