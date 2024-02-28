"""
Subset of Users Device (SOUD) tests
"""
import time
import uuid
from functools import partial

import mock
from django.db.models.signals import post_save
from django.test import TestCase
from morango.errors import MorangoResumeSyncError
from morango.sync.utils import mute_signals

from ..soud import Context
from ..soud import execute_sync
from ..soud import execute_syncs
from ..soud import request_sync_hook
from ..soud import WINDOW_SEC
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import SyncQueue
from kolibri.core.device.models import SyncQueueStatus
from kolibri.core.discovery.models import ConnectionStatus
from kolibri.core.discovery.models import DynamicNetworkLocation
from kolibri.core.discovery.models import StaticNetworkLocation


class SoudContextTestCase(TestCase):
    databases = "__all__"

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
    databases = "__all__"

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


@mute_signals(post_save)
class SoudExecuteSyncsTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        super(SoudExecuteSyncsTestCase, self).setUp()
        self.user_id = uuid.uuid4().hex
        self.instance_id = uuid.uuid4().hex

        execute_sync = mock.patch("kolibri.core.device.soud.execute_sync")
        self.mock_execute_sync = execute_sync.start()
        self.mock_execute_sync.side_effect = partial(
            self._mock_side_effect, self.mock_execute_sync
        )
        self.addCleanup(execute_sync.stop)

        request_sync = mock.patch("kolibri.core.device.soud.request_sync")
        self.mock_request_sync = request_sync.start()
        self.mock_request_sync.side_effect = partial(
            self._mock_side_effect, self.mock_request_sync
        )
        self.addCleanup(request_sync.stop)

        self.time = time.time()
        self.queue_index = 0
        self.side_effects = {
            id(self.mock_execute_sync): {},
            id(self.mock_request_sync): {},
        }

    def _mock_side_effect(self, mock_func, context):
        updates = self.side_effects[id(mock_func)].get(
            "{}:{}".format(context.user_id, context.instance_id)
        )
        if updates:
            SyncQueue.objects.filter(
                user_id=context.user_id, instance_id=context.instance_id
            ).update(**updates.pop(0))

    def _add_side_effect(self, mock_func, queue, **updates):
        self.side_effects[id(mock_func)][
            "{}:{}".format(queue.user_id, queue.instance_id)
        ].append(updates)

    def _create_queue(
        self, status=SyncQueueStatus.Pending, user_id=None, instance_id=None
    ):
        user_id = user_id or self.user_id
        instance_id = instance_id or self.instance_id
        self.queue_index += 1

        for mock_func in (self.mock_execute_sync, self.mock_request_sync):
            self.side_effects[id(mock_func)]["{}:{}".format(user_id, instance_id)] = []

        return SyncQueue.objects.create(
            user_id=user_id,
            instance_id=instance_id,
            status=status,
            updated=self.time,
            keep_alive=self.queue_index,
        )

    def assertCalledWithContext(
        self, mock_func, user_id=None, instance_id=None, call_index=0
    ):
        user_id = user_id or self.user_id
        instance_id = instance_id or self.instance_id
        calls = mock_func.mock_calls
        _, args, kwargs = calls[call_index]
        self.assertIsInstance(args[0], Context)
        self.assertEqual(args[0].user_id, user_id)
        self.assertEqual(args[0].instance_id, instance_id)

    def assertNotCalledWithContext(self, mock_func, user_id=None, instance_id=None):
        user_id = user_id or self.user_id
        instance_id = instance_id or self.instance_id
        calls = mock_func.mock_calls
        for _, args, kwargs in calls:
            self.assertIsInstance(args[0], Context)
            self.assertFalse(
                args[0].user_id == user_id and args[0].instance_id == instance_id,
                "Unexpected call with context: {}".format(args[0]),
            )

    def test_none(self):
        execute_syncs()
        self.mock_execute_sync.assert_not_called()
        self.mock_request_sync.assert_not_called()

    def test_syncing(self):
        queue = self._create_queue(status=SyncQueueStatus.Syncing)
        self._add_side_effect(
            self.mock_request_sync, queue, status=SyncQueueStatus.Ineligible
        )
        execute_syncs()
        self.mock_execute_sync.assert_not_called()
        self.assertCalledWithContext(self.mock_request_sync)

    def test_ready(self):
        queue = self._create_queue(status=SyncQueueStatus.Ready)
        self._add_side_effect(
            self.mock_execute_sync,
            queue,
            status=SyncQueueStatus.Pending,
            keep_alive=60,
        )
        execute_syncs()
        self.assertCalledWithContext(self.mock_execute_sync)
        self.mock_request_sync.assert_not_called()

    def test_pending(self):
        queue = self._create_queue(status=SyncQueueStatus.Pending)
        self._add_side_effect(
            self.mock_request_sync,
            queue,
            status=SyncQueueStatus.Queued,
            keep_alive=60,
        )
        execute_syncs()
        self.mock_execute_sync.assert_not_called()
        self.assertCalledWithContext(self.mock_request_sync)

    def test_queued(self):
        queue = self._create_queue(status=SyncQueueStatus.Queued)
        self._add_side_effect(
            self.mock_request_sync,
            queue,
            status=SyncQueueStatus.Queued,
            keep_alive=10,
        )
        execute_syncs()
        self.mock_execute_sync.assert_not_called()
        self.assertCalledWithContext(self.mock_request_sync)

    def test_queued__then_ready(self):
        queue = self._create_queue(status=SyncQueueStatus.Queued)
        self._add_side_effect(
            self.mock_request_sync,
            queue,
            status=SyncQueueStatus.Ready,
            keep_alive=0,
        )
        self._add_side_effect(
            self.mock_execute_sync,
            queue,
            status=SyncQueueStatus.Pending,
            keep_alive=60,
        )
        execute_syncs()
        self.assertCalledWithContext(self.mock_request_sync)
        self.assertCalledWithContext(self.mock_execute_sync)
        self.mock_execute_sync.assert_called_once()
        self.mock_request_sync.assert_called_once()

    def test_ready__then_pending(self):
        queue = self._create_queue(status=SyncQueueStatus.Ready)
        self._add_side_effect(
            self.mock_execute_sync,
            queue,
            status=SyncQueueStatus.Pending,
            keep_alive=0,
        )
        self._add_side_effect(
            self.mock_request_sync,
            queue,
            status=SyncQueueStatus.Queued,
            keep_alive=60,
        )
        execute_syncs()
        self.assertCalledWithContext(self.mock_request_sync)
        self.assertCalledWithContext(self.mock_execute_sync)
        self.mock_execute_sync.assert_called_once()
        self.mock_request_sync.assert_called_once()

    def test_ordering(self):
        queues = []
        for i in range(WINDOW_SEC + 2):
            queue = self._create_queue(
                instance_id=uuid.uuid4().hex, status=SyncQueueStatus.Pending
            )
            queues.append(queue)
            self._add_side_effect(
                self.mock_request_sync,
                queue,
                status=SyncQueueStatus.Queued,
                keep_alive=60,
            )

        execute_syncs()
        self.mock_execute_sync.assert_not_called()

        for i, queue in enumerate(queues[:WINDOW_SEC]):
            self.assertCalledWithContext(
                self.mock_request_sync, instance_id=queue.instance_id, call_index=i
            )

        for i, queue in enumerate(queues[WINDOW_SEC:]):
            self.assertNotCalledWithContext(
                self.mock_request_sync, instance_id=queue.instance_id
            )


@mute_signals(post_save)
class SoudExecuteSyncTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        super(SoudExecuteSyncTestCase, self).setUp()
        self.user_id = uuid.uuid4().hex
        self.instance_id = uuid.uuid4().hex

        self.facility = Facility.objects.create(name="Test")
        self.user = FacilityUser.objects.get_or_create(
            id=self.user_id,
            defaults=dict(
                username=self.user_id,
                facility=self.facility,
            ),
        )

        self.network_location = StaticNetworkLocation.objects.create(
            base_url="https://kolibrihappyurl.qqq/",
            connection_status=ConnectionStatus.Okay,
            application="kolibri",
            instance_id=self.instance_id,
        )
        self.context = Context(self.user_id, self.instance_id)

        self.sync = mock.patch("kolibri.core.device.soud.call_command")
        self.mock_sync = self.sync.start()
        self.addCleanup(self.sync.stop)

        self.sync_queue = SyncQueue.objects.create(
            user_id=self.user_id,
            instance_id=self.instance_id,
            status=SyncQueueStatus.Ready,
            updated=time.time(),
            keep_alive=0,
        )

    def test_success(self):
        queue_updated = self.sync_queue.updated

        def _side_effect(*args, **kwargs):
            """ Assert the sync queue is updated to Syncing when calling the sync command."""
            self.sync_queue.refresh_from_db()
            self.assertEqual(self.sync_queue.status, SyncQueueStatus.Syncing)

        self.mock_sync.side_effect = _side_effect

        execute_sync(self.context)

        self.mock_sync.assert_called_once_with(
            "sync",
            user=self.user_id,
            facility=self.facility.id,
            baseurl=self.network_location.base_url,
            keep_alive=True,
            noninteractive=True,
        )
        self.sync_queue.refresh_from_db()
        self.assertEqual(self.sync_queue.status, SyncQueueStatus.Pending)
        self.assertGreaterEqual(self.sync_queue.updated, queue_updated)
        self.assertEqual(self.sync_queue.keep_alive, 60)

    def test_resume(self):
        queue_updated = self.sync_queue.updated
        self.sync_queue.sync_session_id = uuid.uuid4().hex
        self.sync_queue.save()

        def _side_effect(*args, **kwargs):
            """ Assert the sync queue is updated to Syncing when calling the sync command."""
            self.sync_queue.refresh_from_db()
            self.assertEqual(self.sync_queue.status, SyncQueueStatus.Syncing)

        self.mock_sync.side_effect = _side_effect

        execute_sync(self.context)

        self.mock_sync.assert_called_once_with(
            "resumesync",
            user=self.user_id,
            facility=self.facility.id,
            baseurl=self.network_location.base_url,
            keep_alive=True,
            noninteractive=True,
            id=self.sync_queue.sync_session_id,
        )

        self.sync_queue.refresh_from_db()
        self.assertEqual(self.sync_queue.status, SyncQueueStatus.Pending)
        self.assertGreaterEqual(self.sync_queue.updated, queue_updated)
        self.assertEqual(self.sync_queue.keep_alive, 60)

    def test_no_network_location(self):
        queue_updated = self.sync_queue.updated
        self.network_location.delete()

        execute_sync(self.context)

        self.mock_sync.assert_not_called()

        self.sync_queue.refresh_from_db()
        self.assertEqual(self.sync_queue.status, SyncQueueStatus.Pending)
        self.assertGreaterEqual(self.sync_queue.updated, queue_updated)
        self.assertEqual(self.sync_queue.attempts, 1)
        self.assertEqual(self.sync_queue.keep_alive, 30)

    def test_resume_failure(self):
        queue_updated = self.sync_queue.updated
        self.sync_queue.sync_session_id = uuid.uuid4().hex
        self.sync_queue.save()

        self.mock_sync.side_effect = MorangoResumeSyncError("Some error")

        execute_sync(self.context)

        self.mock_sync.assert_called_once_with(
            "resumesync",
            user=self.user_id,
            facility=self.facility.id,
            baseurl=self.network_location.base_url,
            keep_alive=True,
            noninteractive=True,
            id=self.sync_queue.sync_session_id,
        )

        self.sync_queue.refresh_from_db()
        self.assertEqual(self.sync_queue.status, SyncQueueStatus.Ready)
        self.assertGreaterEqual(self.sync_queue.updated, queue_updated)
        self.assertEqual(self.sync_queue.attempts, 0)
        self.assertEqual(self.sync_queue.keep_alive, 0)
        self.assertIsNone(self.sync_queue.sync_session_id)

    def test_failure(self):
        queue_updated = self.sync_queue.updated

        self.mock_sync.side_effect = RuntimeError("Some error")

        execute_sync(self.context)

        self.mock_sync.assert_called_once_with(
            "sync",
            user=self.user_id,
            facility=self.facility.id,
            baseurl=self.network_location.base_url,
            keep_alive=True,
            noninteractive=True,
        )

        self.sync_queue.refresh_from_db()
        self.assertEqual(self.sync_queue.status, SyncQueueStatus.Pending)
        self.assertGreaterEqual(self.sync_queue.updated, queue_updated)
        self.assertEqual(self.sync_queue.attempts, 1)
        self.assertEqual(self.sync_queue.keep_alive, 30)
