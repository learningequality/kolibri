import datetime
import functools
import uuid

import mock
from django.test import TestCase

from ..models import ConnectionStatus
from ..models import DynamicNetworkLocation
from ..models import LocationTypes
from ..models import NetworkLocation
from ..models import StaticNetworkLocation
from ..tasks import _dispatch_discovery_hooks
from ..tasks import _enqueue_network_location_update_with_backoff
from ..tasks import _update_connection_status
from ..tasks import add_dynamic_network_location
from ..tasks import CONNECTION_FAULT_LIMIT
from ..tasks import dispatch_broadcast_hooks
from ..tasks import generate_job_id
from ..tasks import hydrate_instance
from ..tasks import perform_network_location_update
from ..tasks import remove_dynamic_network_location
from ..tasks import reset_connection_states
from ..utils.network.broadcast import KolibriInstance
from .helpers import info as mock_device_info
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.registry import RegisteredTask

MOCK_INTERFACE_IP = "111.222.111.222"
MOCK_PORT = 555
SEARCH_MODULE = "kolibri.core.discovery.utils.network.search."


def unwrap(func):
    if isinstance(func, RegisteredTask):
        return func.func
    return func.__wrapped__


class PerformNetworkLocationUpdateTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        self.network_location = DynamicNetworkLocation.objects.create(
            id="b" * 32,
            base_url="http://url.qqq",
            nickname="Test device",
            broadcast_id="a" * 32,
            connection_status=ConnectionStatus.Unknown,
            connection_faults=0,
            application="kolibri",
            kolibri_version="0.15.11",
            instance_id="b" * 32,
            subset_of_users_device=False,
        )

    @mock.patch("kolibri.core.discovery.tasks._update_connection_status")
    def test_not_found(self, mock_update):
        perform_network_location_update("c" * 32)
        mock_update.assert_not_called()

    @mock.patch(
        "kolibri.core.discovery.tasks._enqueue_network_location_update_with_backoff"
    )
    @mock.patch("kolibri.core.discovery.tasks._update_connection_status")
    def test_conflict(self, mock_update, mock_enqueue_another):
        self.network_location.connection_status = ConnectionStatus.Conflict
        self.network_location.save()

        mock_update.return_value = ConnectionStatus.Conflict
        perform_network_location_update(self.network_location.id)
        mock_update.assert_called_once_with(self.network_location)
        mock_enqueue_another.assert_not_called()

    @mock.patch(
        "kolibri.core.discovery.tasks._enqueue_network_location_update_with_backoff"
    )
    @mock.patch("kolibri.core.discovery.tasks._update_connection_status")
    def test_fault_limit(self, mock_update, mock_enqueue_another):
        self.network_location.connection_faults = CONNECTION_FAULT_LIMIT
        self.network_location.save()

        mock_update.return_value = ConnectionStatus.InvalidResponse
        perform_network_location_update(self.network_location.id)
        mock_update.assert_called_once_with(self.network_location)
        mock_enqueue_another.assert_not_called()

    @mock.patch(
        "kolibri.core.discovery.tasks._enqueue_network_location_update_with_backoff"
    )
    @mock.patch("kolibri.core.discovery.tasks._update_connection_status")
    def test_enqueue_another(self, mock_update, mock_enqueue_another):
        mock_update.return_value = ConnectionStatus.InvalidResponse
        perform_network_location_update(self.network_location.id)
        mock_update.assert_called_once_with(self.network_location)
        mock_enqueue_another.assert_called_once_with(self.network_location)

    @mock.patch(
        "kolibri.core.discovery.tasks._enqueue_network_location_update_with_backoff"
    )
    @mock.patch("kolibri.core.discovery.tasks._update_connection_status")
    def test_skip_enqueue_another(self, mock_update, mock_enqueue_another):
        mock_update.return_value = ConnectionStatus.Okay
        perform_network_location_update(self.network_location.id)
        mock_update.assert_called_once_with(self.network_location)
        mock_enqueue_another.assert_not_called()


class AddDynamicNetworkLocationTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        self.broadcast_id = uuid.uuid4().hex
        self.instance = KolibriInstance(
            mock_device_info.get("instance_id"),
            ip=MOCK_INTERFACE_IP,
            port=MOCK_PORT,
            device_info=mock_device_info.copy(),
        )
        self.task = unwrap(unwrap(add_dynamic_network_location))

    @mock.patch("kolibri.core.discovery.tasks.perform_network_location_update.enqueue")
    @mock.patch("kolibri.core.discovery.tasks._store_dynamic_instance")
    def test_could_not_add(self, mock_store, mock_enqueue_update):
        mock_store.return_value = None
        self.task(self.broadcast_id, self.instance)
        mock_enqueue_update.assert_not_called()
        self.assertEqual(6, mock_store.call_count)

    @mock.patch("kolibri.core.discovery.tasks.get_device_setting", return_value=True)
    @mock.patch("kolibri.core.discovery.tasks.perform_network_location_update.enqueue")
    def test_added__not_soud(self, mock_enqueue_update, mock_get_device_setting):
        mock_get_device_setting.return_value = False
        self.task(self.broadcast_id, self.instance)
        mock_enqueue_update.assert_called_once_with(
            job_id="88452dfa2ec2726589d4c63732cc51e4",
            args=(self.instance.id,),
            priority=Priority.REGULAR,
        )

    @mock.patch("kolibri.core.discovery.tasks.get_device_setting", return_value=True)
    @mock.patch("kolibri.core.discovery.tasks.perform_network_location_update.enqueue")
    def test_added__soud(self, mock_enqueue_update, mock_get_device_setting):
        mock_get_device_setting.return_value = True
        self.task(self.broadcast_id, self.instance)
        mock_enqueue_update.assert_called_once_with(
            job_id="88452dfa2ec2726589d4c63732cc51e4",
            args=(self.instance.id,),
            priority=Priority.HIGH,
        )

    @mock.patch("kolibri.core.discovery.tasks.get_device_setting", return_value=True)
    @mock.patch("kolibri.core.discovery.tasks.perform_network_location_update.enqueue")
    def test_added__both_souds(self, mock_enqueue_update, mock_get_device_setting):
        self.instance.device_info.update(subset_of_users_device=True)
        mock_get_device_setting.return_value = True
        self.task(self.broadcast_id, self.instance)
        mock_enqueue_update.assert_called_once_with(
            job_id="88452dfa2ec2726589d4c63732cc51e4",
            args=(self.instance.id,),
            priority=Priority.LOW,
        )


class RemoveDynamicNetworkLocationTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        self.broadcast_id = uuid.uuid4().hex
        self.instance = KolibriInstance(
            mock_device_info.get("instance_id"),
            ip=MOCK_INTERFACE_IP,
            port=MOCK_PORT,
            device_info=mock_device_info,
        )
        self.network_location = NetworkLocation.objects.create(
            id=mock_device_info.get("instance_id"),
            base_url="http://url.qqq",
            nickname="Test device",
            broadcast_id=self.broadcast_id,
            connection_status=ConnectionStatus.Unknown,
            connection_faults=0,
            application="kolibri",
            kolibri_version="0.15.11",
            instance_id=mock_device_info.get("instance_id"),
            subset_of_users_device=False,
            location_type=LocationTypes.Dynamic,
        )
        self.task = unwrap(unwrap(remove_dynamic_network_location))

    @mock.patch("kolibri.core.discovery.tasks._dispatch_discovery_hooks")
    def test_not_found(self, mock_dispatch):
        self.task("b" * 32, self.instance)
        mock_dispatch.assert_not_called()

    @mock.patch("kolibri.core.discovery.tasks._dispatch_discovery_hooks")
    def test_static_location(self, mock_dispatch):
        self.network_location.location_type = LocationTypes.Static
        self.network_location.save()
        self.task(self.broadcast_id, self.instance)
        mock_dispatch.assert_not_called()

    @mock.patch("kolibri.core.discovery.tasks._dispatch_discovery_hooks")
    def test_dispatch(self, mock_dispatch):
        self.task(self.broadcast_id, self.instance)
        mock_dispatch.assert_called_once()
        call_args = mock_dispatch.call_args[0]
        self.assertIsInstance(call_args[0], DynamicNetworkLocation)
        self.assertFalse(call_args[1])
        self.assertFalse(
            DynamicNetworkLocation.objects.filter(pk=self.network_location.pk).exists()
        )


class DispatchBroadcastHooksTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        self.broadcast_id = uuid.uuid4().hex
        self.instance = KolibriInstance(
            mock_device_info.get("instance_id"),
            ip=MOCK_INTERFACE_IP,
            port=MOCK_PORT,
            device_info=mock_device_info,
        )
        self.network_location = DynamicNetworkLocation.objects.create(
            id=mock_device_info.get("instance_id"),
            base_url="http://url.qqq",
            nickname="Test device",
            broadcast_id=self.broadcast_id,
            connection_status=ConnectionStatus.Unknown,
            connection_faults=0,
            application="kolibri",
            kolibri_version="0.15.11",
            instance_id=mock_device_info.get("instance_id"),
            subset_of_users_device=False,
        )
        broadcast_hooks = mock.patch(
            "kolibri.core.discovery.tasks.NetworkLocationBroadcastHook"
        )
        self.mock_broadcast_hooks = broadcast_hooks.start()
        self.mock_broadcast_hooks.registered_hooks = []
        self.addCleanup(broadcast_hooks.stop)

    def test_no_okay_netlocs(self):
        hook = mock.MagicMock()
        self.mock_broadcast_hooks.registered_hooks.append(hook)
        dispatch_broadcast_hooks("on_renew", self.instance.to_dict())
        hook.on_renew.assert_not_called()

    def test_okay_dispatch(self):
        self.network_location.connection_status = ConnectionStatus.Okay
        self.network_location.save()
        hook = mock.MagicMock()
        self.mock_broadcast_hooks.registered_hooks.append(hook)
        dispatch_broadcast_hooks("on_renew", self.instance.to_dict())
        hook.on_renew.assert_called()
        call = hook.on_renew.call_args[0]
        self.assertIsInstance(call[0], KolibriInstance)
        call_arg_1 = next(iter(call[1]))
        self.assertIsInstance(call_arg_1, NetworkLocation)
        self.assertEqual(call[0].id, self.instance.id)
        self.assertEqual(call_arg_1.id, self.network_location.id)

    def test_okay__no_method(self):
        self.network_location.connection_status = ConnectionStatus.Okay
        self.network_location.save()
        hook = mock.MagicMock()
        hook.on_renew = None
        self.mock_broadcast_hooks.registered_hooks.append(hook)
        dispatch_broadcast_hooks("on_renew", self.instance.to_dict())


class ResetConnectionStatesTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        self.old_broadcast_id = uuid.uuid4().hex
        self.new_broadcast_id = uuid.uuid4().hex
        self.dynamic_network_location = DynamicNetworkLocation.objects.create(
            id=mock_device_info.get("instance_id"),
            base_url="http://url.qqq",
            broadcast_id=self.old_broadcast_id,
            connection_status=ConnectionStatus.Okay,
            connection_faults=0,
            instance_id=mock_device_info.get("instance_id"),
            subset_of_users_device=False,
        )
        self.static_network_location = StaticNetworkLocation.objects.create(
            id="z" * 32,
            base_url="http://url2.qqq",
            connection_status=ConnectionStatus.Okay,
            connection_faults=0,
            instance_id="z" * 32,
            subset_of_users_device=False,
        )
        self.unreachable_network_location = DynamicNetworkLocation.objects.create(
            id="y" * 32,
            base_url="http://url3.qqq",
            broadcast_id=self.old_broadcast_id,
            connection_status=ConnectionStatus.ConnectionFailure,
            connection_faults=CONNECTION_FAULT_LIMIT,
            instance_id="y" * 32,
            subset_of_users_device=False,
        )
        self.task = unwrap(reset_connection_states)

    @mock.patch("kolibri.core.discovery.tasks.perform_network_location_update.enqueue")
    @mock.patch("kolibri.core.discovery.tasks._dispatch_discovery_hooks")
    def test_new_broadcast(self, mock_dispatch, mock_enqueue_update):
        self.task(self.new_broadcast_id)
        self.assertEqual(2, mock_dispatch.call_count)

        for call_args, _ in mock_dispatch.call_args_list:
            self.assertIsInstance(call_args[0], NetworkLocation)
            self.assertFalse(call_args[1])

        self.static_network_location.refresh_from_db()
        self.assertEqual(
            self.static_network_location.connection_status, ConnectionStatus.Unknown
        )
        self.assertEqual(DynamicNetworkLocation.objects.count(), 0)

        mock_enqueue_update.assert_called_once_with(
            job_id="4a5f6088c8c0e5e22fde5945a7f91789",
            args=(self.static_network_location.id,),
        )

    @mock.patch("kolibri.core.discovery.tasks.perform_network_location_update.enqueue")
    @mock.patch("kolibri.core.discovery.tasks._dispatch_discovery_hooks")
    def test_dynamic_already_added_for_new_broadcast(
        self, mock_dispatch, mock_enqueue_update
    ):
        self.task(self.old_broadcast_id)
        self.assertEqual(1, mock_dispatch.call_count)

        for call_args, _ in mock_dispatch.call_args_list:
            self.assertIsInstance(call_args[0], NetworkLocation)
            self.assertEqual(call_args[0].id, self.static_network_location.id)
            self.assertFalse(call_args[1])

        self.static_network_location.refresh_from_db()
        self.assertEqual(
            self.static_network_location.connection_status, ConnectionStatus.Unknown
        )
        self.assertEqual(
            DynamicNetworkLocation.objects.exclude(
                connection_status=ConnectionStatus.Unknown
            ).count(),
            2,
        )

        mock_enqueue_update.assert_called_once_with(
            job_id="4a5f6088c8c0e5e22fde5945a7f91789",
            args=(self.static_network_location.id,),
        )


class TaskUtilitiesTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        self.broadcast_id = uuid.uuid4().hex
        self.instance = KolibriInstance(
            mock_device_info.get("instance_id"),
            ip=MOCK_INTERFACE_IP,
            port=MOCK_PORT,
            device_info=mock_device_info,
        )
        self.network_location = DynamicNetworkLocation.objects.create(
            id=mock_device_info.get("instance_id"),
            base_url="http://url.qqq",
            nickname="Test device",
            broadcast_id=self.broadcast_id,
            connection_status=ConnectionStatus.Unknown,
            connection_faults=0,
            application="kolibri",
            kolibri_version="0.15.11",
            instance_id=mock_device_info.get("instance_id"),
            subset_of_users_device=False,
        )

    def _set_connection_status(self, status, *args):
        self.network_location.connection_status = status

    @mock.patch("kolibri.core.discovery.tasks.NetworkLocationDiscoveryHook")
    def test_dispatch_hooks__is_connected(self, mock_hooks):
        hook = mock.Mock()
        mock_hooks.registered_hooks = [hook]
        _dispatch_discovery_hooks(self.network_location, True)
        hook.on_connect.assert_called_once_with(self.network_location)
        hook.on_disconnect.assert_not_called()

    @mock.patch("kolibri.core.discovery.tasks.NetworkLocationDiscoveryHook")
    def test_dispatch_hooks__is_disconnected(self, mock_hooks):
        hook = mock.Mock()
        mock_hooks.registered_hooks = [hook]
        _dispatch_discovery_hooks(self.network_location, False)
        hook.on_connect.assert_not_called()
        hook.on_disconnect.assert_called_once_with(self.network_location)

    @mock.patch("kolibri.core.discovery.tasks.NetworkLocationDiscoveryHook")
    def test_dispatch_hooks__hook_exception(self, mock_hooks):
        hook1 = mock.Mock()
        hook2 = mock.Mock()
        mock_hooks.registered_hooks = [hook1, hook2]
        hook1.on_connect.side_effect = RuntimeError("Ooops")
        _dispatch_discovery_hooks(self.network_location, True)
        hook1.on_connect.assert_called_once_with(self.network_location)
        hook2.on_connect.assert_called_once_with(self.network_location)

    @mock.patch("kolibri.core.discovery.tasks._dispatch_discovery_hooks")
    @mock.patch("kolibri.core.discovery.tasks.update_network_location")
    def test_update_connection_status__connected(self, mock_update, mock_dispatch):
        mock_update.side_effect = functools.partial(
            self._set_connection_status, ConnectionStatus.Okay
        )
        _update_connection_status(self.network_location)
        mock_dispatch.assert_called_once_with(self.network_location, True)

    @mock.patch("kolibri.core.discovery.tasks._dispatch_discovery_hooks")
    @mock.patch("kolibri.core.discovery.tasks.update_network_location")
    def test_update_connection_status__disconnected(self, mock_update, mock_dispatch):
        self.network_location.connection_status = ConnectionStatus.Okay
        mock_update.side_effect = functools.partial(
            self._set_connection_status, ConnectionStatus.ConnectionFailure
        )
        _update_connection_status(self.network_location)
        mock_dispatch.assert_called_once_with(self.network_location, False)

    @mock.patch("kolibri.core.discovery.tasks._dispatch_discovery_hooks")
    @mock.patch("kolibri.core.discovery.tasks.update_network_location")
    def test_update_connection_status__no_dispatch(self, mock_update, mock_dispatch):
        self.network_location.connection_status = ConnectionStatus.ConnectionFailure
        mock_update.side_effect = functools.partial(
            self._set_connection_status, ConnectionStatus.ResponseTimeout
        )
        _update_connection_status(self.network_location)
        mock_dispatch.assert_not_called()

    def test_hydrate_instance(self):
        other_arg_value = "123"

        @hydrate_instance
        def test_func(other_arg, instance):
            self.assertIsInstance(instance, KolibriInstance)
            self.assertEqual(instance.id, self.instance.id)
            self.assertEqual(other_arg, other_arg_value)

        test_func(other_arg_value, self.instance.to_dict())

    def test_generate_job_id(self):
        self.assertEqual(
            generate_job_id("test", "a" * 32), "42440939765e6e06237a90ec42c80b4b"
        )

    @mock.patch("kolibri.core.discovery.tasks.get_current_job")
    def test_enqueue_network_location_update_with_backoff__zero_faults(
        self, mock_get_current_job
    ):
        current_job_mock = mock.MagicMock()
        mock_get_current_job.return_value = current_job_mock
        next_attempt = datetime.timedelta(minutes=1)
        _enqueue_network_location_update_with_backoff(self.network_location)
        current_job_mock.retry_in.assert_called_once_with(
            next_attempt,
            priority=Priority.LOW,
        )

    @mock.patch("kolibri.core.discovery.tasks.get_current_job")
    def test_enqueue_network_location_update_with_backoff__non_zero_faults(
        self, mock_get_current_job
    ):
        current_job_mock = mock.MagicMock()
        mock_get_current_job.return_value = current_job_mock
        self.network_location.connection_faults = 3
        next_attempt = datetime.timedelta(minutes=8)
        _enqueue_network_location_update_with_backoff(self.network_location)
        current_job_mock.retry_in.assert_called_once_with(
            next_attempt,
            priority=Priority.LOW,
        )

    @mock.patch("kolibri.core.discovery.tasks.get_current_job")
    def test_enqueue_network_location_update_with_backoff__not_local(
        self, mock_get_current_job
    ):
        current_job_mock = mock.MagicMock()
        mock_get_current_job.return_value = current_job_mock
        self.network_location.is_local = False

        with mock.patch("kolibri.core.discovery.tasks.logger") as mock_logger:
            _enqueue_network_location_update_with_backoff(self.network_location)
            # 'retry_in' should not be called since is_local is False
            current_job_mock.retry_in.assert_not_called()
            # Verify the function logged the appropriate message
            mock_logger.info.assert_called_once_with(
                "Network location {} is not local. Skipping enqueue.".format(
                    self.network_location.id
                )
            )
