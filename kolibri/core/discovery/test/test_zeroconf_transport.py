import socket

import mock
import pytest
from django.test import SimpleTestCase
from zeroconf import NonUniqueNameException
from zeroconf import ServiceInfo
from zeroconf import ServiceStateChange
from zeroconf import Zeroconf

from ..utils.network.broadcast import KolibriInstance
from ..utils.network.broadcast import SERVICE_TTL
from ..utils.network.broadcast import SERVICE_TYPE
from ..utils.network.zeroconf_transport import BARE_LOCAL_LABEL
from ..utils.network.zeroconf_transport import EVENT_UPDATE_LOCAL_NAMES
from ..utils.network.zeroconf_transport import filter_lan_addresses
from ..utils.network.zeroconf_transport import get_outgoing_interface_address
from ..utils.network.zeroconf_transport import LOCAL_NAME_BARE
from ..utils.network.zeroconf_transport import LOCAL_NAME_DEVICE
from ..utils.network.zeroconf_transport import slugify_device_name
from ..utils.network.zeroconf_transport import ZeroconfNetworkDiscovery
from .test_network_broadcast import build_service_info
from .test_network_broadcast import KolibriTestInstanceListener
from .test_network_broadcast import MOCK_ID
from .test_network_broadcast import MOCK_INTERFACE_IP
from .test_network_broadcast import MOCK_PORT

MOCK_LAN_IP = "192.168.1.5"
# A second RFC1918 address on a different subnet, e.g. a Docker/Hyper-V bridge,
# not reachable from LAN peers. Sorts *before* MOCK_LAN_IP as a string, so a
# naive min() over the LAN-filtered addresses would wrongly pick it.
MOCK_SECONDARY_LAN_IP = "172.27.63.113"
MOCK_CGNAT_IP = "100.64.0.5"  # Tailscale-style CGNAT address, not LAN-reachable
MOCK_LINK_LOCAL_IP = "169.254.1.1"
PEER_SERVICE_NAME = "peer.{}".format(SERVICE_TYPE)
ZEROCONF_MODULE = "kolibri.core.discovery.utils.network.zeroconf_transport."
ZEROCONF_NEEDS_UPDATE = getattr(Zeroconf, "update_interfaces", None) is None


class SlugifyDeviceNameTestCase(SimpleTestCase):
    def test_lowercases_and_strips_punctuation(self):
        self.assertEqual("tonyslaptop", slugify_device_name("Tony's Laptop"))

    def test_keeps_digits_and_hyphens(self):
        self.assertEqual("device-42", slugify_device_name("Device-42"))

    def test_all_whitespace_yields_empty(self):
        self.assertEqual("", slugify_device_name("   "))

    def test_non_ascii_yields_empty(self):
        self.assertEqual("", slugify_device_name("日本語"))

    def test_mixed_ascii_and_non_ascii_keeps_ascii_remainder(self):
        self.assertEqual("caf", slugify_device_name("Café"))

    def test_long_name_truncated_to_max_label_length(self):
        self.assertEqual("a" * 32, slugify_device_name("a" * 64))


class FilterLanAddressesTestCase(SimpleTestCase):
    def test_keeps_rfc1918_addresses(self):
        self.assertEqual([MOCK_LAN_IP], filter_lan_addresses([MOCK_LAN_IP]))

    def test_excludes_cgnat_addresses(self):
        self.assertEqual([], filter_lan_addresses([MOCK_CGNAT_IP]))

    def test_excludes_link_local_addresses(self):
        self.assertEqual([], filter_lan_addresses([MOCK_LINK_LOCAL_IP]))

    def test_excludes_loopback_addresses(self):
        self.assertEqual([], filter_lan_addresses(["127.0.0.1"]))

    def test_excludes_public_addresses(self):
        self.assertEqual([], filter_lan_addresses(["8.8.8.8"]))

    def test_mixed_addresses_keeps_only_lan(self):
        self.assertEqual(
            [MOCK_LAN_IP],
            filter_lan_addresses([MOCK_CGNAT_IP, MOCK_LINK_LOCAL_IP, MOCK_LAN_IP]),
        )


class GetOutgoingInterfaceAddressTestCase(SimpleTestCase):
    @mock.patch(ZEROCONF_MODULE + "socket.socket")
    def test_returns_routing_table_source_address(self, mock_socket):
        sock = mock_socket.return_value
        sock.getsockname.return_value = (MOCK_LAN_IP, 9)
        self.assertEqual(MOCK_LAN_IP, get_outgoing_interface_address())
        sock.close.assert_called_once_with()

    @mock.patch(ZEROCONF_MODULE + "socket.socket")
    def test_returns_none_when_no_default_route(self, mock_socket):
        sock = mock_socket.return_value
        sock.connect.side_effect = OSError()
        self.assertIsNone(get_outgoing_interface_address())
        sock.close.assert_called_once_with()


LOCAL_HOSTNAMES_MODULE = "kolibri.core.discovery.utils.network.local_hostnames."


class ZeroconfNetworkDiscoveryTestCase(SimpleTestCase):
    def setUp(self):
        super().setUp()
        self.instance = mock.Mock(spec_set=KolibriInstance)(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        self.instance.ip = MOCK_INTERFACE_IP
        self.instance.port = MOCK_PORT
        self.instance.device_info = {}
        self.instance.zeroconf_id = MOCK_ID
        self.zeroconf = mock.MagicMock(spec_set=Zeroconf)()
        # The transport attaches LocalHostnameListener on its first
        # register/start_listening, which persists to the DB on local-name
        # events; stub the task enqueue so these unit tests stay DB-free.
        enqueue_patcher = mock.patch(
            LOCAL_HOSTNAMES_MODULE + "sync_local_hostnames.enqueue"
        )
        self.mock_enqueue = enqueue_patcher.start()
        self.addCleanup(enqueue_patcher.stop)
        self.transport = ZeroconfNetworkDiscovery()
        # Captures the transport's local-name events (published on its own bus).
        self.listener = self.transport.add_listener(KolibriTestInstanceListener)
        self.on_add = mock.Mock()
        self.on_update = mock.Mock()
        self.on_remove = mock.Mock()
        self.is_known = mock.Mock(return_value=False)
        browser_patcher = mock.patch(ZEROCONF_MODULE + "ServiceBrowser")
        self.mock_browser = browser_patcher.start()
        self.addCleanup(browser_patcher.stop)
        get_all_addresses_patcher = mock.patch(
            ZEROCONF_MODULE + "get_all_addresses", return_value=[MOCK_LAN_IP]
        )
        get_all_addresses_patcher.start()
        self.addCleanup(get_all_addresses_patcher.stop)
        # Default to "no default route" so tests don't open a real socket and
        # address selection falls back to the LAN-filtered addresses. Tests
        # exercising the outgoing-interface preference override this.
        outgoing_patcher = mock.patch(
            ZEROCONF_MODULE + "get_outgoing_interface_address", return_value=None
        )
        self.mock_outgoing_interface_address = outgoing_patcher.start()
        self.addCleanup(outgoing_patcher.stop)

    def _prepare_register(self, device_name=None):
        """Puts the transport in the state `register` is called in."""
        self.transport.zeroconf = self.zeroconf
        if device_name is not None:
            self.instance.device_info = {"device_name": device_name}
        self.instance.to_service_info.return_value = mock.Mock(spec_set=ServiceInfo)(
            "primary"
        )

    def _register_with_device_name(self, device_name):
        self._prepare_register(device_name)
        self.transport.register(self.instance)

    @mock.patch(ZEROCONF_MODULE + "Zeroconf")
    def test_register_opens_zeroconf_and_registers(self, mock_zeroconf):
        mock_zeroconf.return_value = self.zeroconf
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        self.instance.to_service_info.return_value = service_info
        self.transport.register(self.instance)
        mock_zeroconf.assert_called_once_with(interfaces=self.transport.interfaces)
        self.assertIs(self.instance, self.transport.instance)
        self.zeroconf.check_service.assert_any_call(service_info, False)
        self.zeroconf.register_service.assert_any_call(service_info, ttl=SERVICE_TTL)
        self.instance.set_broadcasting.assert_called_once_with(
            service_info, is_self=True
        )

    @mock.patch(ZEROCONF_MODULE + "Zeroconf")
    def test_register_reuses_open_zeroconf(self, mock_zeroconf):
        self._prepare_register()
        self.transport.register(self.instance)
        mock_zeroconf.assert_not_called()

    def test_register_rename(self):
        self.transport.zeroconf = self.zeroconf
        self.instance.id = "test"
        self.instance.zeroconf_id = "test"
        service_info_not_unique = mock.Mock(spec_set=ServiceInfo)("test")
        service_info_unique = mock.Mock(spec_set=ServiceInfo)("test-1")
        self.instance.to_service_info.side_effect = [
            service_info_not_unique,
            service_info_unique,
        ]
        self.zeroconf.check_service.side_effect = [
            NonUniqueNameException(),
            None,
        ]
        self.transport.register(self.instance)
        self.instance.to_service_info.assert_called_with(self.instance.id + "-1")
        self.zeroconf.register_service.assert_any_call(
            service_info_unique, ttl=SERVICE_TTL
        )

    @mock.patch(ZEROCONF_MODULE + "SERVICE_RENAME_ATTEMPTS", 0)
    def test_register_rename_gives_up(self):
        self.transport.zeroconf = self.zeroconf
        self.instance.id = "test"
        self.instance.zeroconf_id = "test"
        self.instance.to_service_info.return_value = mock.Mock(spec_set=ServiceInfo)(
            "test"
        )
        self.zeroconf.check_service.side_effect = [NonUniqueNameException()]
        with self.assertRaises(NonUniqueNameException):
            self.transport.register(self.instance)
        self.zeroconf.register_service.assert_not_called()

    def test_register__local_names(self):
        self._prepare_register()
        self.transport.register(self.instance)
        bare_label, bare_service = self.transport.local_names[LOCAL_NAME_BARE]
        self.assertEqual(BARE_LOCAL_LABEL, bare_label)
        self.assertEqual("kolibri.local.", bare_service.server)
        self.assertEqual(socket.inet_aton(MOCK_LAN_IP), bare_service.address)
        self.assertNotIn(LOCAL_NAME_DEVICE, self.transport.local_names)

    def test_register__local_names_queued_for_persistence(self):
        # Nothing listens for local-name events until the transport registers,
        # so merely instantiating it — which the plugin registry does in every
        # process — doesn't reach the task queue or its models.
        self.transport.events.publish(EVENT_UPDATE_LOCAL_NAMES, ["kolibri.local"])
        self.mock_enqueue.assert_not_called()
        self._prepare_register()
        self.transport.register(self.instance)
        # Enqueued rather than written inline: `register` runs on the caller's
        # thread, and the hostnames have to be readable from other processes.
        self.mock_enqueue.assert_called_once_with(
            args=(["kolibri.local"],),
        )

    @mock.patch(ZEROCONF_MODULE + "get_all_addresses")
    def test_register__local_names_lan_address_selection(self, mock_get_all_addresses):
        self._prepare_register()
        cases = [
            (
                [MOCK_CGNAT_IP, MOCK_LINK_LOCAL_IP, MOCK_LAN_IP],
                socket.inet_aton(MOCK_LAN_IP),
            ),
            ([MOCK_CGNAT_IP], None),
        ]
        for addresses, expected_address in cases:
            mock_get_all_addresses.return_value = addresses
            self.transport.register(self.instance)
            _, bare_service = self.transport.local_names[LOCAL_NAME_BARE]
            self.assertEqual(expected_address, bare_service.address)

    @mock.patch(ZEROCONF_MODULE + "get_all_addresses")
    def test_register__prefers_outgoing_interface_address(self, mock_get_all_addresses):
        # On a multi-homed host both RFC1918 addresses survive the LAN filter,
        # so we must advertise the default-route interface, not whichever one
        # sorts first. Reproduces the QA-reported case where a Docker-bridge
        # address was handed to LAN peers that couldn't reach it.
        self._prepare_register()
        mock_get_all_addresses.return_value = [MOCK_SECONDARY_LAN_IP, MOCK_LAN_IP]
        self.mock_outgoing_interface_address.return_value = MOCK_LAN_IP
        self.transport.register(self.instance)
        _, bare_service = self.transport.local_names[LOCAL_NAME_BARE]
        self.assertEqual(socket.inet_aton(MOCK_LAN_IP), bare_service.address)

    @mock.patch(ZEROCONF_MODULE + "get_all_addresses")
    def test_register__falls_back_when_outgoing_not_lan_reachable(
        self, mock_get_all_addresses
    ):
        # If the outgoing interface isn't LAN-reachable (e.g. a VPN default
        # route filtered out as CGNAT), fall back to a LAN-filtered address
        # rather than advertising the unreachable one.
        self._prepare_register()
        mock_get_all_addresses.return_value = [MOCK_CGNAT_IP, MOCK_LAN_IP]
        self.mock_outgoing_interface_address.return_value = MOCK_CGNAT_IP
        self.transport.register(self.instance)
        _, bare_service = self.transport.local_names[LOCAL_NAME_BARE]
        self.assertEqual(socket.inet_aton(MOCK_LAN_IP), bare_service.address)

    def test_register__device_name_alias(self):
        self._register_with_device_name("Tony's Laptop")
        device_label, device_service = self.transport.local_names[LOCAL_NAME_DEVICE]
        self.assertEqual("tonyslaptop", device_label)
        self.assertEqual("tonyslaptop.local.", device_service.server)

    def test_register__device_name_alias_empty_slug(self):
        self._register_with_device_name("   ")
        self.assertNotIn(LOCAL_NAME_DEVICE, self.transport.local_names)

    def test_register__local_name_conflict_skipped(self):
        # These aliases make no attempt to stay unique: if the name is already
        # claimed on the network, we skip ours rather than renaming or crashing
        # the whole broadcast.
        self._prepare_register()
        # primary registers fine; the bare alias is already claimed
        self.zeroconf.register_service.side_effect = [None, NonUniqueNameException()]
        self.transport.register(self.instance)  # must not raise
        self.assertNotIn(LOCAL_NAME_BARE, self.transport.local_names)
        self.assertEqual([], self.transport.local_hostnames)

    def test_local_hostnames(self):
        self._register_with_device_name("My Device")
        self.assertEqual(
            {"kolibri.local", "mydevice.local"},
            set(self.transport.local_hostnames),
        )
        self.assertEqual(
            {"kolibri.local", "mydevice.local"},
            set(self.listener.mock.update_local_names.call_args[0][0]),
        )

    @mock.patch(ZEROCONF_MODULE + "get_all_addresses")
    def test_renew__local_names_follow_lan_address_change(self, mock_get_all_addresses):
        mock_get_all_addresses.return_value = [MOCK_LAN_IP]
        self._register_with_device_name("Some Name")

        new_lan_ip = "192.168.1.9"
        mock_get_all_addresses.return_value = [new_lan_ip]
        self.transport.renew()

        _, bare_service = self.transport.local_names[LOCAL_NAME_BARE]
        self.assertEqual(socket.inet_aton(new_lan_ip), bare_service.address)

    def test_renew__device_name_changed(self):
        self._register_with_device_name("Old Name")
        old_service = self.transport.local_names[LOCAL_NAME_DEVICE][1]

        self.instance.device_info = {"device_name": "New Name"}
        self.transport.renew()

        self.zeroconf.unregister_service.assert_any_call(old_service)
        new_label, new_service = self.transport.local_names[LOCAL_NAME_DEVICE]
        self.assertEqual("newname", new_label)
        self.assertEqual("newname.local.", new_service.server)
        self.zeroconf.register_service.assert_any_call(new_service, ttl=new_service.ttl)

    def test_renew__device_name_changed_to_empty_slug(self):
        self._register_with_device_name("Old Name")
        old_service = self.transport.local_names[LOCAL_NAME_DEVICE][1]

        self.instance.device_info = {"device_name": "   "}
        self.transport.renew()

        self.zeroconf.unregister_service.assert_any_call(old_service)
        self.assertNotIn(LOCAL_NAME_DEVICE, self.transport.local_names)

    def test_renew__device_name_unchanged(self):
        self._register_with_device_name("Same Name")
        self.zeroconf.register_service.reset_mock()
        self.zeroconf.unregister_service.reset_mock()

        self.transport.renew()

        self.zeroconf.unregister_service.assert_not_called()
        self.zeroconf.register_service.assert_not_called()
        # 1 for the primary instance (pre-existing, unchanged renew() logic)
        # + 2 for the bare and device aliases, both re-announced with fresh port/ttl
        self.assertEqual(3, self.zeroconf.update_service.call_count)

    def test_unregister(self):
        self.instance.service_info = mock.Mock(spec_set=ServiceInfo)("test")
        self._register_with_device_name("Some Name")
        bare_service = self.transport.local_names[LOCAL_NAME_BARE][1]
        device_service = self.transport.local_names[LOCAL_NAME_DEVICE][1]

        self.transport.unregister()

        self.zeroconf.unregister_service.assert_any_call(self.instance.service_info)
        self.instance.reset_broadcasting.assert_called_once_with()
        self.zeroconf.unregister_service.assert_any_call(bare_service)
        self.zeroconf.unregister_service.assert_any_call(device_service)
        self.assertEqual({}, self.transport.local_names)
        self.listener.mock.update_local_names.assert_called_with([])

    def test_renew__not_broadcasting(self):
        self.transport.instance = self.instance
        self.transport.renew()
        self.instance.to_service_info.assert_not_called()
        self.listener.mock.update_local_names.assert_not_called()

    def test_unregister__not_broadcasting(self):
        self.transport.instance = self.instance
        self.transport.unregister()
        self.instance.reset_broadcasting.assert_not_called()
        self.listener.mock.update_local_names.assert_not_called()

    @pytest.mark.skipif(ZEROCONF_NEEDS_UPDATE, reason="Needs updated Zeroconf")
    def test_update_does_not_rebind_when_addresses_unchanged(self):
        self._register_with_device_name("Some Name")
        self.zeroconf.interfaces = [MOCK_LAN_IP]
        self.zeroconf.update_service.reset_mock()
        on_rebind = mock.Mock()
        self.transport.update(self.instance, on_rebind)
        on_rebind.assert_not_called()
        # no rebind follows, so the renewal has to go out on its own
        self.zeroconf.update_service.assert_called()
        self.zeroconf.update_interfaces.assert_not_called()

    @pytest.mark.skipif(ZEROCONF_NEEDS_UPDATE, reason="Needs updated Zeroconf")
    def test_update_reports_the_rebind_before_rebinding(self):
        self._register_with_device_name("Some Name")
        # currently bound to a different address than the current one
        self.zeroconf.interfaces = [MOCK_INTERFACE_IP]
        self.zeroconf.update_service.reset_mock()
        # the backend cycles its broadcast id in `on_rebind`, and peers the
        # rebind rediscovers have to land under the incoming id
        on_rebind = mock.Mock(
            side_effect=lambda: self.zeroconf.update_interfaces.assert_not_called()
        )
        self.transport.update(self.instance, on_rebind)
        on_rebind.assert_called_once_with()
        # the rebind broadcasts the renewed services, so the renewal doesn't
        self.zeroconf.update_service.assert_not_called()
        self.zeroconf.update_interfaces.assert_called_once_with(
            interfaces=self.transport.interfaces
        )

    def test_local_name_event_listener_error_propagates(self):
        # A raising local-name listener must surface its own exception, not an
        # AttributeError from a bus with no `throws` configured.
        def boom(hostnames):
            raise ValueError("boom")

        self.transport.events.subscribe(EVENT_UPDATE_LOCAL_NAMES, boom)
        with self.assertRaises(ValueError):
            self.transport.events.publish(EVENT_UPDATE_LOCAL_NAMES, [])

    def test_start_listening_attaches_browser(self):
        self.transport.zeroconf = self.zeroconf
        self.zeroconf.browsers = {}
        self.transport.start_listening(
            self.on_add, self.on_update, self.on_remove, self.is_known
        )
        # the browser has to dispatch to our handler on the Zeroconf we're
        # holding, as that pairing is what `_is_current` checks stale events against
        self.mock_browser.assert_called_once_with(
            self.zeroconf,
            SERVICE_TYPE,
            handlers=[self.transport._handle_service_change],
        )
        self.assertEqual(self.mock_browser.return_value, self.zeroconf.browsers["bus"])

    def test_stop_listening_closes_zeroconf(self):
        self.transport.zeroconf = self.zeroconf
        self.zeroconf.browsers = {}
        self.transport.start_listening(
            self.on_add, self.on_update, self.on_remove, self.is_known
        )
        self.transport.stop_listening()
        # closing takes the browser with it, and leaves no Zeroconf for a later
        # event to match on
        self.zeroconf.close.assert_called_once_with()
        self.assertIsNone(self.transport.zeroconf)

    def test_stop_listening_drops_local_names(self):
        # the closed Zeroconf no longer advertises the aliases, so this teardown
        # path can't leave them behind for the next session either
        self._register_with_device_name("Some Name")
        self.transport.stop_listening()
        self.assertEqual({}, self.transport.local_names)

    def _listen(self):
        """Puts the transport in the listening state a browser event arrives in."""
        self.transport.zeroconf = self.zeroconf
        self.transport.instance = self.instance
        self.instance.is_broadcasting = False
        self.transport.start_listening(
            self.on_add, self.on_update, self.on_remove, self.is_known
        )

    def _handle(self, name, state_change):
        self.transport._handle_service_change(
            self.zeroconf, SERVICE_TYPE, name, state_change
        )

    def test_added_event_builds_instance_and_invokes_on_add(self):
        self._listen()
        self.zeroconf.get_service_info.return_value = build_service_info("peer")
        self._handle(PEER_SERVICE_NAME, ServiceStateChange.Added)
        (instance,), _ = self.on_add.call_args
        self.assertEqual(PEER_SERVICE_NAME, instance.name)
        self.assertEqual(MOCK_INTERFACE_IP, instance.ip)
        self.assertEqual(MOCK_PORT, instance.port)
        self.assertFalse(instance.is_self)

    def test_added_event_missing_service_dispatches_nothing(self):
        self._listen()
        self.zeroconf.get_service_info.return_value = None
        self._handle(PEER_SERVICE_NAME, ServiceStateChange.Added)
        self.on_add.assert_not_called()
        self.on_remove.assert_not_called()

    def test_added_event_for_our_own_zeroconf_id_marks_is_self(self):
        # our own service, seen before `register` finished, so the name
        # fast-path can't catch it — `is_self` must, or we'd discover ourselves
        self._listen()
        self.zeroconf.get_service_info.return_value = build_service_info(MOCK_ID)
        self._handle("{}.{}".format(MOCK_ID, SERVICE_TYPE), ServiceStateChange.Added)
        (instance,), _ = self.on_add.call_args
        self.assertTrue(instance.is_self)

    def test_added_event_for_known_service_skips_query(self):
        # querying a service the backend already has cached costs a 10s timeout
        # for a result `on_add` would discard
        self._listen()
        self.is_known.return_value = True
        self._handle(PEER_SERVICE_NAME, ServiceStateChange.Added)
        self.is_known.assert_called_once_with(PEER_SERVICE_NAME)
        self.zeroconf.get_service_info.assert_not_called()
        self.on_add.assert_not_called()

    def test_added_event_for_own_service_ignored(self):
        self._listen()
        self.instance.is_broadcasting = True
        self.instance.service_info.name = PEER_SERVICE_NAME
        self._handle(PEER_SERVICE_NAME, ServiceStateChange.Added)
        self.zeroconf.get_service_info.assert_not_called()
        self.on_add.assert_not_called()

    def test_removed_event_invokes_on_remove_without_query(self):
        self._listen()
        self._handle(PEER_SERVICE_NAME, ServiceStateChange.Removed)
        self.on_remove.assert_called_once_with(PEER_SERVICE_NAME)
        self.zeroconf.get_service_info.assert_not_called()

    def test_updated_event_missing_service_invokes_on_remove(self):
        self._listen()
        self.zeroconf.get_service_info.return_value = None
        self._handle(PEER_SERVICE_NAME, ServiceStateChange.Updated)
        self.on_remove.assert_called_once_with(PEER_SERVICE_NAME)
        self.on_update.assert_not_called()

    def test_event_queued_before_stop_listening_is_dropped(self):
        self._listen()
        self.transport.stop_listening()
        self._handle(PEER_SERVICE_NAME, ServiceStateChange.Added)
        self.is_known.assert_not_called()
        self.zeroconf.get_service_info.assert_not_called()
        self.on_add.assert_not_called()

    def test_event_from_a_previous_listening_session_is_dropped(self):
        self._listen()
        self.transport.stop_listening()
        next_on_remove = mock.Mock()
        self.transport.zeroconf = mock.MagicMock(spec_set=Zeroconf)()
        self.transport.start_listening(
            mock.Mock(), mock.Mock(), next_on_remove, mock.Mock(return_value=False)
        )
        self._handle(PEER_SERVICE_NAME, ServiceStateChange.Removed)
        next_on_remove.assert_not_called()

    def test_event_dispatched_across_a_stop_is_dropped_not_raised(self):
        self._listen()
        stale_zeroconf = self.transport.zeroconf
        self.transport.stop_listening()

        self.transport._added(stale_zeroconf, PEER_SERVICE_NAME)
        self.transport._updated(stale_zeroconf, PEER_SERVICE_NAME)
        self.transport._on_remove(PEER_SERVICE_NAME)

        self.on_add.assert_not_called()
        self.on_update.assert_not_called()
        self.on_remove.assert_not_called()

    def test_instance_built_after_a_stop_is_not_our_own(self):
        # the stop can also land after `_is_current` passed and before the peer
        # instance is built, with our own instance nulled by then
        self._listen()
        self.transport.stop_listening()

        instance = self.transport._build_instance(build_service_info("peer"))

        self.assertFalse(instance.is_self)

    def test_added_event_stopped_during_query_dispatches_nothing(self):
        # the query blocks for up to 10s, ample time for a stop to land
        self._listen()

        def stop_then_answer(*args, **kwargs):
            self.transport.stop_listening()
            return build_service_info("peer")

        self.zeroconf.get_service_info.side_effect = stop_then_answer
        self._handle(PEER_SERVICE_NAME, ServiceStateChange.Added)
        self.on_add.assert_not_called()

    def test_updated_event_stopped_during_query_dispatches_nothing(self):
        self._listen()

        def stop_then_answer(*args, **kwargs):
            self.transport.stop_listening()
            return None

        self.zeroconf.get_service_info.side_effect = stop_then_answer
        self._handle(PEER_SERVICE_NAME, ServiceStateChange.Updated)
        self.on_update.assert_not_called()
        self.on_remove.assert_not_called()
