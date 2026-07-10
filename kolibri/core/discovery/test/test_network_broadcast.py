import socket

import mock
import pytest
from django.test import SimpleTestCase
from magicbus import Bus
from zeroconf import NonUniqueNameException
from zeroconf import ServiceInfo
from zeroconf import Zeroconf

from ..utils.network.broadcast import BARE_LOCAL_LABEL
from ..utils.network.broadcast import filter_lan_addresses
from ..utils.network.broadcast import get_outgoing_interface_address
from ..utils.network.broadcast import KolibriBroadcast
from ..utils.network.broadcast import KolibriInstance
from ..utils.network.broadcast import KolibriInstanceListener
from ..utils.network.broadcast import LOCAL_DOMAIN
from ..utils.network.broadcast import LOCAL_EVENTS
from ..utils.network.broadcast import LOCAL_NAME_BARE
from ..utils.network.broadcast import LOCAL_NAME_DEVICE
from ..utils.network.broadcast import NETWORK_EVENTS
from ..utils.network.broadcast import SERVICE_TTL
from ..utils.network.broadcast import SERVICE_TYPE
from ..utils.network.broadcast import slugify_device_name

MOCK_INTERFACE_IP = "111.222.111.222"
MOCK_LAN_IP = "192.168.1.5"
# A second RFC1918 address on a different subnet, e.g. a Docker/Hyper-V bridge,
# not reachable from LAN peers. Sorts *before* MOCK_LAN_IP as a string, so a
# naive min() over the LAN-filtered addresses would wrongly pick it.
MOCK_SECONDARY_LAN_IP = "172.27.63.113"
MOCK_CGNAT_IP = "100.64.0.5"  # Tailscale-style CGNAT address, not LAN-reachable
MOCK_LINK_LOCAL_IP = "169.254.1.1"
MOCK_PORT = 555
MOCK_ID = "abba"
MOCK_PROPERTIES = {
    b"application": '"kolibri"',
    b"kolibri_version": '"1"',
    b"instance_id": '"abba"',
    b"device_name": '"computer"',
    b"operating_system": '"OS/2"',
}
BROADCAST_MODULE = "kolibri.core.discovery.utils.network.broadcast."
ZEROCONF_NEEDS_UPDATE = getattr(Zeroconf, "update_interfaces", None) is None
ALL_EVENTS = NETWORK_EVENTS.union(LOCAL_EVENTS)


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
    @mock.patch(BROADCAST_MODULE + "socket.socket")
    def test_returns_routing_table_source_address(self, mock_socket):
        sock = mock_socket.return_value
        sock.getsockname.return_value = (MOCK_LAN_IP, 9)
        self.assertEqual(MOCK_LAN_IP, get_outgoing_interface_address())
        sock.close.assert_called_once_with()

    @mock.patch(BROADCAST_MODULE + "socket.socket")
    def test_returns_none_when_no_default_route(self, mock_socket):
        sock = mock_socket.return_value
        sock.connect.side_effect = OSError()
        self.assertIsNone(get_outgoing_interface_address())
        sock.close.assert_called_once_with()


class KolibriInstanceTestCase(SimpleTestCase):
    def _build_info(self, properties=None):
        properties = properties or MOCK_PROPERTIES.copy()
        return ServiceInfo(
            SERVICE_TYPE,
            "test.{}".format(SERVICE_TYPE),
            address=socket.inet_aton(MOCK_INTERFACE_IP),
            port=MOCK_PORT,
            server="test.{}.".format(LOCAL_DOMAIN),
            properties=properties,
        )

    def test_name(self):
        instance = KolibriInstance("abc")
        instance.zeroconf_id = "abc-0"
        self.assertEqual("abc-0.Kolibri._sub._http._tcp.local.", instance.name)

    def test_server(self):
        instance = KolibriInstance("abc")
        instance.zeroconf_id = "abc-0"
        self.assertEqual("abc-0.kolibri.local.", instance.server)

    @mock.patch(BROADCAST_MODULE + "get_all_addresses")
    def test_local(self, mock_get_all_addresses):
        instance = KolibriInstance("abc", ip=MOCK_INTERFACE_IP)
        mock_get_all_addresses.return_value = []
        self.assertFalse(instance.local)
        mock_get_all_addresses.return_value = [MOCK_INTERFACE_IP]
        self.assertTrue(instance.local)

    def test_base_url(self):
        instance = KolibriInstance("abc", ip=MOCK_INTERFACE_IP, port=MOCK_PORT)
        self.assertEqual("http://111.222.111.222:555/", instance.base_url)

    def test_is_broadcasting(self):
        instance = KolibriInstance("abc")
        self.assertFalse(instance.is_broadcasting)
        instance.service_info = self._build_info()
        self.assertTrue(instance.is_broadcasting)

    def test_set_broadcasting(self):
        instance = KolibriInstance("abc")
        info = self._build_info()
        instance.set_broadcasting(info, is_self=False)
        self.assertEqual(info, instance.service_info)
        self.assertFalse(instance.is_self)
        instance.set_broadcasting(info, is_self=True)
        self.assertTrue(instance.is_self)

    def test_reset_broadcasting(self):
        instance = KolibriInstance("abc")
        instance.service_info = self._build_info()
        instance.reset_broadcasting()
        self.assertIsNone(instance.service_info)

    def test_from_service_info(self):
        info = self._build_info()
        instance = KolibriInstance.from_service_info(info)
        self.assertEqual("abba", instance.id)
        self.assertEqual("test", instance.zeroconf_id)
        self.assertEqual(MOCK_INTERFACE_IP, instance.ip)
        self.assertEqual(MOCK_PORT, instance.port)
        self.assertEqual(info.name, instance.name)
        self.assertEqual(
            "http://{}:{}/".format(MOCK_INTERFACE_IP, MOCK_PORT), instance.base_url
        )

    def test_from_service_info__bytes_str(self):
        info = self._build_info(
            properties={
                b"operating_system": '"كوليبري"'.encode("utf-8"),
            }
        )
        try:
            instance = KolibriInstance.from_service_info(info)
        except TypeError:
            self.fail("Failed to parse info with bytes values")

        self.assertEqual(instance.device_info["operating_system"], "كوليبري")

    def test_from_service_info__bool(self):
        info = self._build_info(
            properties={
                b"subset_of_users_device": '"FALSE"',
            }
        )
        instance = KolibriInstance.from_service_info(info)
        self.assertEqual(instance.device_info["subset_of_users_device"], False)

    def test_to_service_info__int_key(self):
        instance = KolibriInstance(MOCK_ID, device_info={1: True})
        with self.assertRaises(TypeError):
            instance.to_service_info()

    def test_to_service_info__bool_key(self):
        instance = KolibriInstance(MOCK_ID, device_info={True: True})
        with self.assertRaises(TypeError):
            instance.to_service_info()

    def test_to_service_info__string_key(self):
        instance = KolibriInstance(MOCK_ID, device_info={"True": True})
        try:
            instance.to_service_info()
        except Exception:
            self.fail("Using a string key for data raised an exception")

    def test_to_service_info__int_value(self):
        instance = KolibriInstance(MOCK_ID, device_info={"True": 1})
        try:
            instance.to_service_info()
        except Exception:
            self.fail("Using an integer value for data raised an exception")

    def test_to_service_info__bool_value(self):
        instance = KolibriInstance(MOCK_ID, device_info={"True": True})
        try:
            instance.to_service_info()
        except Exception:
            self.fail("Using a boolean value for data raised an exception")

    def test_to_service_info__str_value(self):
        instance = KolibriInstance(MOCK_ID, device_info={"True": "True"})
        try:
            instance.to_service_info()
        except Exception:
            self.fail("Using a string value for data raised an exception")

    def test_to_service_info__dict_value(self):
        instance = KolibriInstance(MOCK_ID, device_info={"good": {}})
        with self.assertRaises(TypeError):
            instance.to_service_info()

    def test_to_service_info__list_value(self):
        instance = KolibriInstance(MOCK_ID, device_info={"good": []})
        with self.assertRaises(TypeError):
            instance.to_service_info()


class KolibriTestInstanceListener(KolibriInstanceListener):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.mock = mock.Mock()

    def register_instance(self, instance):
        self.mock.register_instance(instance)

    def renew_instance(self, instance):
        self.mock.renew_instance(instance)

    def unregister_instance(self, instance):
        self.mock.unregister_instance(instance)

    def add_instance(self, instance):
        self.mock.add_instance(instance)

    def update_instance(self, instance):
        self.mock.update_instance(instance)

    def remove_instance(self, instance):
        self.mock.remove_instance(instance)

    def update_local_names(self, hostnames):
        self.mock.update_local_names(hostnames)


@pytest.mark.parametrize(
    "event_name",
    [event for event in ALL_EVENTS if hasattr(KolibriTestInstanceListener, event)],
)
def test_instance_listener_events(event_name):
    events = Bus(extra_channels=ALL_EVENTS)
    broadcast = mock.Mock(spec_set=KolibriBroadcast)(KolibriInstance(MOCK_ID))
    broadcast.events = events
    listener = KolibriTestInstanceListener(broadcast)
    listener.subscribe()

    new_instance = KolibriInstance("abc")
    events.publish(event_name, new_instance)
    getattr(listener.mock, event_name).assert_called_once_with(new_instance)


class KolibriInstanceListenerTestCase(SimpleTestCase):
    def setUp(self):
        super().setUp()
        self.instance = KolibriInstance(MOCK_ID)
        self.broadcast = mock.Mock(spec_set=KolibriBroadcast)(self.instance)
        self.events = Bus(extra_channels=ALL_EVENTS)
        self.broadcast.events = self.events
        self.listener = KolibriTestInstanceListener(self.broadcast)

    def assertHasListener(self, event):
        self.assertGreaterEqual(len(self.events.listeners.get(event)), 0)

    def assertHasNoListener(self, event):
        self.assertEqual(len(self.events.listeners.get(event)), 0)


class KolibriBroadcastTestCase(SimpleTestCase):
    def setUp(self):
        super().setUp()
        self.instance = mock.Mock(spec_set=KolibriInstance)(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        self.instance.ip = MOCK_INTERFACE_IP
        self.instance.port = MOCK_PORT
        self.instance.device_info = {}
        self.zeroconf = mock.MagicMock(spec_set=Zeroconf)()
        self.broadcast = KolibriBroadcast(self.instance)
        self.listener = self.broadcast.add_listener(KolibriTestInstanceListener)
        get_all_addresses_patcher = mock.patch(
            BROADCAST_MODULE + "get_all_addresses", return_value=[MOCK_LAN_IP]
        )
        get_all_addresses_patcher.start()
        self.addCleanup(get_all_addresses_patcher.stop)
        # Default to "no default route" so tests don't open a real socket and
        # address selection falls back to the LAN-filtered addresses. Tests
        # exercising the outgoing-interface preference override this.
        outgoing_patcher = mock.patch(
            BROADCAST_MODULE + "get_outgoing_interface_address", return_value=None
        )
        self.mock_outgoing_interface_address = outgoing_patcher.start()
        self.addCleanup(outgoing_patcher.stop)

    def _register_with_device_name(self, device_name):
        self.broadcast.zeroconf = self.zeroconf
        self.instance.device_info = {"device_name": device_name}
        self.instance.to_service_info.return_value = mock.Mock(spec_set=ServiceInfo)(
            "primary"
        )
        self.broadcast.register()

    def test_is_broadcasting(self):
        self.assertFalse(self.broadcast.is_broadcasting)
        self.broadcast.zeroconf = self.zeroconf
        self.assertTrue(self.broadcast.is_broadcasting)

    @pytest.mark.skipif(ZEROCONF_NEEDS_UPDATE, reason="Needs updated Zeroconf")
    def test_addresses(self):
        self.assertEqual(set(), self.broadcast.addresses)
        self.broadcast.zeroconf = self.zeroconf
        self.zeroconf.interfaces = [MOCK_INTERFACE_IP]
        self.assertEqual({MOCK_INTERFACE_IP}, self.broadcast.addresses)

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast.register")
    @mock.patch(BROADCAST_MODULE + "Zeroconf")
    def test_start_broadcast(self, mock_zeroconf, mock_register):
        mock_zeroconf.return_value = self.zeroconf
        self.broadcast.start_broadcast()
        mock_zeroconf.assert_called_once_with(interfaces=self.broadcast.interfaces)
        mock_register.assert_called_once()

    @mock.patch(BROADCAST_MODULE + "logger.error")
    def test_start_broadcast__already_broadcasting(self, mock_logger):
        self.broadcast.zeroconf = self.zeroconf
        self.broadcast.start_broadcast()
        mock_logger.assert_called_once()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast.renew")
    def test_update_broadcast__instance(self, mock_renew):
        self.instance.zeroconf_id = "abc-1"
        updated_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        updated_instance.zeroconf_id = "abc"
        self.assertNotEqual(
            self.broadcast.instance.zeroconf_id, updated_instance.zeroconf_id
        )
        self.broadcast.zeroconf = self.zeroconf
        self.broadcast.update_broadcast(instance=updated_instance)
        self.assertEqual(updated_instance, self.broadcast.instance)
        self.assertEqual("abc-1", self.broadcast.instance.zeroconf_id)
        mock_renew.assert_called_once()

    @pytest.mark.skipif(ZEROCONF_NEEDS_UPDATE, reason="Needs updated Zeroconf")
    def test_update_broadcast__interfaces(self):
        new_interfaces = [MOCK_INTERFACE_IP]
        self.assertNotEqual(new_interfaces, self.broadcast.interfaces)
        self.broadcast.zeroconf = self.zeroconf
        self.broadcast.update_broadcast(interfaces=new_interfaces)
        self.assertEqual(new_interfaces, self.broadcast.interfaces)
        self.zeroconf.update_interfaces.assert_called_once_with(
            interfaces=new_interfaces
        )

    @mock.patch(BROADCAST_MODULE + "logger.error")
    def test_update_broadcast__not_broadcasting(self, mock_logger):
        self.broadcast.update_broadcast()
        mock_logger.assert_called_once()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast.unregister")
    def test_stop_broadcast(self, mock_unregister):
        self.broadcast.zeroconf = self.zeroconf
        self.broadcast.stop_broadcast()
        mock_unregister.assert_called_once()
        self.zeroconf.close.assert_called_once()
        self.assertIsNone(self.broadcast.zeroconf)

    @mock.patch(BROADCAST_MODULE + "logger.error")
    def test_stop_broadcast__not_broadcasting(self, mock_logger):
        self.broadcast.stop_broadcast()
        mock_logger.assert_called_once()

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_register(self, mock_logger):
        self.broadcast.zeroconf = self.zeroconf
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        self.instance.to_service_info.return_value = service_info
        self.broadcast.register()
        mock_logger.assert_called_once()
        self.instance.to_service_info.assert_called_once_with(self.instance.zeroconf_id)
        self.zeroconf.check_service.assert_any_call(service_info, False)
        self.zeroconf.register_service.assert_any_call(service_info, ttl=60)
        self.instance.set_broadcasting.assert_called_once_with(
            service_info, is_self=True
        )
        self.listener.mock.register_instance.assert_called_once_with(self.instance)
        self.listener.mock.update_local_names.assert_called_once_with(["kolibri.local"])

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_register__rename(self, mock_logger):
        self.broadcast.zeroconf = self.zeroconf
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
            None,
        ]
        self.broadcast.register()
        mock_logger.assert_called_once()
        self.instance.to_service_info.assert_any_call(self.instance.zeroconf_id)
        self.instance.to_service_info.assert_called_with(
            self.instance.zeroconf_id + "-1"
        )
        self.zeroconf.check_service.assert_any_call(service_info_not_unique, False)
        self.zeroconf.check_service.assert_any_call(service_info_unique, False)
        self.zeroconf.register_service.assert_any_call(service_info_unique, ttl=60)
        self.instance.set_broadcasting.assert_called_once_with(
            service_info_unique, is_self=True
        )

    @mock.patch(BROADCAST_MODULE + "SERVICE_RENAME_ATTEMPTS", 0)
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_register__rename_fail(self, mock_logger, *args):
        self.broadcast.zeroconf = self.zeroconf
        self.instance.id = "test"
        self.instance.zeroconf_id = "test"
        service_info_not_unique = mock.Mock(spec_set=ServiceInfo)("test")
        self.instance.to_service_info.return_value = service_info_not_unique
        self.zeroconf.check_service.side_effect = [
            NonUniqueNameException(),
        ]
        with self.assertRaises(NonUniqueNameException):
            self.broadcast.register()

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_register__not_broadcasting(self, mock_logger):
        self.broadcast.register()
        mock_logger.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_register__local_names(self, mock_logger):
        self.broadcast.zeroconf = self.zeroconf
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        self.instance.to_service_info.return_value = service_info
        self.broadcast.register()
        bare_label, bare_service = self.broadcast.local_names[LOCAL_NAME_BARE]
        self.assertEqual(BARE_LOCAL_LABEL, bare_label)
        self.assertEqual("kolibri.local.", bare_service.server)
        self.assertEqual(socket.inet_aton(MOCK_LAN_IP), bare_service.address)
        self.assertNotIn(LOCAL_NAME_DEVICE, self.broadcast.local_names)

    @mock.patch(BROADCAST_MODULE + "get_all_addresses")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_register__local_names_lan_address_selection(
        self, mock_logger, mock_get_all_addresses
    ):
        self.broadcast.zeroconf = self.zeroconf
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        self.instance.to_service_info.return_value = service_info
        cases = [
            (
                [MOCK_CGNAT_IP, MOCK_LINK_LOCAL_IP, MOCK_LAN_IP],
                socket.inet_aton(MOCK_LAN_IP),
            ),
            ([MOCK_CGNAT_IP], None),
        ]
        for addresses, expected_address in cases:
            mock_get_all_addresses.return_value = addresses
            self.broadcast.register()
            _, bare_service = self.broadcast.local_names[LOCAL_NAME_BARE]
            self.assertEqual(expected_address, bare_service.address)

    @mock.patch(BROADCAST_MODULE + "get_all_addresses")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_register__prefers_outgoing_interface_address(
        self, mock_logger, mock_get_all_addresses
    ):
        # On a multi-homed host both RFC1918 addresses survive the LAN filter,
        # so we must advertise the default-route interface, not whichever one
        # sorts first. Reproduces the QA-reported case where a Docker-bridge
        # address was handed to LAN peers that couldn't reach it.
        self.broadcast.zeroconf = self.zeroconf
        self.instance.to_service_info.return_value = mock.Mock(spec_set=ServiceInfo)(
            "primary"
        )
        mock_get_all_addresses.return_value = [MOCK_SECONDARY_LAN_IP, MOCK_LAN_IP]
        self.mock_outgoing_interface_address.return_value = MOCK_LAN_IP
        self.broadcast.register()
        _, bare_service = self.broadcast.local_names[LOCAL_NAME_BARE]
        self.assertEqual(socket.inet_aton(MOCK_LAN_IP), bare_service.address)

    @mock.patch(BROADCAST_MODULE + "get_all_addresses")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_register__falls_back_when_outgoing_not_lan_reachable(
        self, mock_logger, mock_get_all_addresses
    ):
        # If the outgoing interface isn't LAN-reachable (e.g. a VPN default
        # route filtered out as CGNAT), fall back to a LAN-filtered address
        # rather than advertising the unreachable one.
        self.broadcast.zeroconf = self.zeroconf
        self.instance.to_service_info.return_value = mock.Mock(spec_set=ServiceInfo)(
            "primary"
        )
        mock_get_all_addresses.return_value = [MOCK_CGNAT_IP, MOCK_LAN_IP]
        self.mock_outgoing_interface_address.return_value = MOCK_CGNAT_IP
        self.broadcast.register()
        _, bare_service = self.broadcast.local_names[LOCAL_NAME_BARE]
        self.assertEqual(socket.inet_aton(MOCK_LAN_IP), bare_service.address)

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_register__device_name_alias(self, mock_logger):
        self._register_with_device_name("Tony's Laptop")
        device_label, device_service = self.broadcast.local_names[LOCAL_NAME_DEVICE]
        self.assertEqual("tonyslaptop", device_label)
        self.assertEqual("tonyslaptop.local.", device_service.server)

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_register__device_name_alias_empty_slug(self, mock_logger):
        self._register_with_device_name("   ")
        self.assertNotIn(LOCAL_NAME_DEVICE, self.broadcast.local_names)

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_register__local_name_conflict_skipped(self, mock_logger):
        # These aliases make no attempt to stay unique: if the name is already
        # claimed on the network, we skip ours rather than renaming or crashing
        # the whole broadcast.
        self.broadcast.zeroconf = self.zeroconf
        self.instance.to_service_info.return_value = mock.Mock(spec_set=ServiceInfo)(
            "primary"
        )
        # primary registers fine; the bare alias is already claimed
        self.zeroconf.register_service.side_effect = [None, NonUniqueNameException()]
        self.broadcast.register()  # must not raise
        self.assertNotIn(LOCAL_NAME_BARE, self.broadcast.local_names)
        self.assertEqual([], self.broadcast.local_hostnames)

    def test_local_hostnames(self):
        self._register_with_device_name("My Device")
        self.assertEqual(
            {"kolibri.local", "mydevice.local"},
            set(self.broadcast.local_hostnames),
        )
        self.assertEqual(
            {"kolibri.local", "mydevice.local"},
            set(self.listener.mock.update_local_names.call_args[0][0]),
        )

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_renew(self, mock_logger):
        self.broadcast.zeroconf = self.zeroconf
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        self.instance.to_service_info.return_value = service_info
        self.broadcast.renew()
        mock_logger.assert_called_once()
        self.instance.to_service_info.assert_called_once_with()
        self.zeroconf.update_service.assert_called_once_with(service_info, ttl=60)
        self.instance.set_broadcasting.assert_called_once_with(
            service_info, is_self=True
        )
        self.listener.mock.renew_instance.assert_called_once_with(self.instance)
        self.listener.mock.update_local_names.assert_called_once_with([])

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_renew__not_broadcasting(self, mock_logger):
        self.broadcast.renew()
        mock_logger.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "get_all_addresses")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_renew__local_names_follow_lan_address_change(
        self, mock_logger, mock_get_all_addresses
    ):
        mock_get_all_addresses.return_value = [MOCK_LAN_IP]
        self._register_with_device_name("Some Name")

        new_lan_ip = "192.168.1.9"
        mock_get_all_addresses.return_value = [new_lan_ip]
        self.broadcast.renew()

        _, bare_service = self.broadcast.local_names[LOCAL_NAME_BARE]
        self.assertEqual(socket.inet_aton(new_lan_ip), bare_service.address)

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_renew__device_name_changed(self, mock_logger):
        self._register_with_device_name("Old Name")
        old_service = self.broadcast.local_names[LOCAL_NAME_DEVICE][1]

        self.instance.device_info = {"device_name": "New Name"}
        self.broadcast.renew()

        self.zeroconf.unregister_service.assert_any_call(old_service)
        new_label, new_service = self.broadcast.local_names[LOCAL_NAME_DEVICE]
        self.assertEqual("newname", new_label)
        self.assertEqual("newname.local.", new_service.server)
        self.zeroconf.register_service.assert_any_call(new_service, ttl=new_service.ttl)

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_renew__device_name_changed_to_empty_slug(self, mock_logger):
        self._register_with_device_name("Old Name")
        old_service = self.broadcast.local_names[LOCAL_NAME_DEVICE][1]

        self.instance.device_info = {"device_name": "   "}
        self.broadcast.renew()

        self.zeroconf.unregister_service.assert_any_call(old_service)
        self.assertNotIn(LOCAL_NAME_DEVICE, self.broadcast.local_names)

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_renew__device_name_unchanged(self, mock_logger):
        self._register_with_device_name("Same Name")
        self.zeroconf.register_service.reset_mock()
        self.zeroconf.unregister_service.reset_mock()

        self.broadcast.renew()

        self.zeroconf.unregister_service.assert_not_called()
        self.zeroconf.register_service.assert_not_called()
        # 1 for the primary instance (pre-existing, unchanged renew() logic)
        # + 2 for the bare and device aliases, both re-announced with fresh port/ttl
        self.assertEqual(3, self.zeroconf.update_service.call_count)

    def test_unregister(self):
        self.broadcast.zeroconf = self.zeroconf
        self.instance.service_info = mock.Mock(spec_set=ServiceInfo)("test")
        self.broadcast.unregister()
        self.zeroconf.unregister_service.assert_called_once_with(
            self.instance.service_info
        )
        self.instance.reset_broadcasting.assert_called_once_with()
        self.listener.mock.unregister_instance.assert_called_once_with(self.instance)
        self.listener.mock.update_local_names.assert_called_once_with([])

    def test_unregister__not_broadcasting(self):
        self.broadcast.unregister()
        self.zeroconf.unregister_service.assert_not_called()

    def test_unregister__local_names(self):
        self.instance.service_info = mock.Mock(spec_set=ServiceInfo)("test")
        self._register_with_device_name("Some Name")
        bare_service = self.broadcast.local_names[LOCAL_NAME_BARE][1]
        device_service = self.broadcast.local_names[LOCAL_NAME_DEVICE][1]

        self.broadcast.unregister()

        self.zeroconf.unregister_service.assert_any_call(bare_service)
        self.zeroconf.unregister_service.assert_any_call(device_service)
        self.assertEqual({}, self.broadcast.local_names)
        self.listener.mock.update_local_names.assert_called_with([])

    @mock.patch(__name__ + ".KolibriTestInstanceListener.subscribe")
    def test_add_listener(self, mock_subscribe):
        self.broadcast.add_listener(KolibriTestInstanceListener)
        mock_subscribe.assert_called_once_with()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_add_service(self, mock_logger, mock_get_service_info, mock_build_instance):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        expected_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        mock_build_instance.return_value = expected_instance
        self.broadcast.add_service("test")
        self.assertEqual(expected_instance, self.broadcast.other_instances["test"])
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_called_once()
        self.listener.mock.add_instance.assert_called_once_with(expected_instance)

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_add_service__cached(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        expected_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        expected_instance.service_info = True
        self.broadcast.other_instances["test"] = expected_instance
        self.broadcast.add_service("test")
        mock_get_service_info.assert_not_called()
        mock_build_instance.assert_not_called()
        mock_logger.assert_not_called()
        self.listener.mock.add_instance.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_add_service__cached__not_broadcasting(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        existing_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        expected_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        self.broadcast.other_instances["test"] = existing_instance
        mock_build_instance.return_value = expected_instance
        self.broadcast.add_service("test")
        self.assertEqual(expected_instance, self.broadcast.other_instances["test"])
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_called_once()
        self.listener.mock.add_instance.assert_called_once_with(expected_instance)

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_add_service__not_found(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        mock_get_service_info.return_value = None
        self.broadcast.add_service("test")
        self.assertIsNone(self.broadcast.other_instances.get("test"))
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_not_called()
        mock_logger.assert_not_called()
        self.listener.mock.add_instance.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_add_service__is_self(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        instance = KolibriInstance(MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT)
        instance.is_self = True
        mock_build_instance.return_value = instance
        self.broadcast.add_service("test")
        self.assertIsNone(self.broadcast.other_instances.get("test"))
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_not_called()
        self.listener.mock.add_instance.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_update_service(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        expected_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        mock_build_instance.return_value = expected_instance
        self.broadcast.update_service("test")
        self.assertEqual(expected_instance, self.broadcast.other_instances["test"])
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_called_once()
        self.listener.mock.update_instance.assert_called_once_with(expected_instance)

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast.remove_service")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_update_service__not_found(
        self,
        mock_logger,
        mock_get_service_info,
        mock_build_instance,
        mock_remove_service,
    ):
        mock_get_service_info.return_value = None
        mock_remove_service.return_value = None
        self.broadcast.update_service("test")
        self.assertIsNone(self.broadcast.other_instances.get("test"))
        mock_get_service_info.assert_called_once_with("test")
        mock_remove_service.assert_called_once_with("test")
        mock_build_instance.assert_not_called()
        mock_logger.assert_not_called()
        self.listener.mock.update_instance.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_update_service__is_self(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        instance = KolibriInstance(MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT)
        instance.is_self = True
        mock_build_instance.return_value = instance
        self.broadcast.update_service("test")
        self.assertIsNone(self.broadcast.other_instances.get("test"))
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_not_called()
        self.listener.mock.update_instance.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_update_service__no_change_less_than_TTL(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        original_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        expected_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        mock_build_instance.return_value = expected_instance
        self.broadcast.other_instances["test"] = original_instance
        self.broadcast.update_service("test")
        self.assertEqual(expected_instance, self.broadcast.other_instances["test"])
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_not_called()
        self.listener.mock.update_instance.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_update_service__no_change_more_than_or_equal_to_TTL(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        original_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        expected_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        expected_instance.last_seen = original_instance.last_seen + SERVICE_TTL
        mock_build_instance.return_value = expected_instance
        self.broadcast.other_instances["test"] = original_instance
        self.broadcast.update_service("test")
        self.assertEqual(expected_instance, self.broadcast.other_instances["test"])
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_called_once()
        self.listener.mock.update_instance.assert_called_once_with(expected_instance)

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_update_service__change_id(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        original_instance = KolibriInstance(
            "not the same id", ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        expected_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        mock_build_instance.return_value = expected_instance
        self.broadcast.other_instances["test"] = original_instance
        self.broadcast.update_service("test")
        self.assertEqual(expected_instance, self.broadcast.other_instances["test"])
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_called_once()
        self.listener.mock.update_instance.assert_called_once_with(expected_instance)

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_update_service__change_ip(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        original_instance = KolibriInstance(MOCK_ID, ip="211.211.16.1", port=MOCK_PORT)
        expected_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        mock_build_instance.return_value = expected_instance
        self.broadcast.other_instances["test"] = original_instance
        self.broadcast.update_service("test")
        self.assertEqual(expected_instance, self.broadcast.other_instances["test"])
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_called_once()
        self.listener.mock.update_instance.assert_called_once_with(expected_instance)

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_update_service__change_port(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        original_instance = KolibriInstance(MOCK_ID, ip=MOCK_INTERFACE_IP, port="2121")
        expected_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        mock_build_instance.return_value = expected_instance
        self.broadcast.other_instances["test"] = original_instance
        self.broadcast.update_service("test")
        self.assertEqual(expected_instance, self.broadcast.other_instances["test"])
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_called_once()
        self.listener.mock.update_instance.assert_called_once_with(expected_instance)

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_update_service__change_host(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        original_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT, host="http://test.com"
        )
        expected_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT, host="http://test2.com"
        )
        mock_build_instance.return_value = expected_instance
        self.broadcast.other_instances["test"] = original_instance
        self.broadcast.update_service("test")
        self.assertEqual(expected_instance, self.broadcast.other_instances["test"])
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_called_once()
        self.listener.mock.update_instance.assert_called_once_with(expected_instance)

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_update_service__change_device_info(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        original_instance = KolibriInstance(
            MOCK_ID,
            ip=MOCK_INTERFACE_IP,
            port=MOCK_PORT,
            device_info={"kolibri_version": "0.15.12"},
        )
        expected_instance = KolibriInstance(
            MOCK_ID,
            ip=MOCK_INTERFACE_IP,
            port=MOCK_PORT,
            device_info={"kolibri_version": "0.16.0"},
        )
        mock_build_instance.return_value = expected_instance
        self.broadcast.other_instances["test"] = original_instance
        self.broadcast.update_service("test")
        self.assertEqual(expected_instance, self.broadcast.other_instances["test"])
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_called_once()
        self.listener.mock.update_instance.assert_called_once_with(expected_instance)

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_update_service__change_prefix(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        original_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        expected_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT, prefix="/kolibri"
        )
        mock_build_instance.return_value = expected_instance
        self.broadcast.other_instances["test"] = original_instance
        self.broadcast.update_service("test")
        self.assertEqual(expected_instance, self.broadcast.other_instances["test"])
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_called_once()
        self.listener.mock.update_instance.assert_called_once_with(expected_instance)

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_remove_service(self, mock_logger):
        expected_instance = mock.Mock(spec_set=KolibriInstance)(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        expected_instance.service_info = True
        expected_instance.is_self = False
        self.broadcast.other_instances["test"] = expected_instance
        self.broadcast.remove_service("test")
        mock_logger.assert_called_once()
        expected_instance.reset_broadcasting.assert_called_once()
        self.listener.mock.remove_instance.assert_called_once_with(expected_instance)

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_remove_service__is_self(self, mock_logger):
        expected_instance = mock.Mock(spec_set=KolibriInstance)(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        expected_instance.service_info = True
        expected_instance.is_self = True
        self.broadcast.other_instances["test"] = expected_instance
        self.broadcast.remove_service("test")
        mock_logger.assert_not_called()
        expected_instance.reset_broadcasting.assert_not_called()
        self.listener.mock.remove_instance.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_remove_service__not_found(self, mock_logger):
        self.broadcast.remove_service("test")
        mock_logger.assert_not_called()
        self.listener.mock.remove_instance.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriInstance.from_service_info")
    def test_build_instance(self, mock_from_service_info):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        instance = mock.Mock(spec_set=KolibriInstance)(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        instance.zeroconf_id = "abc"
        mock_from_service_info.return_value = instance
        actual_instance = self.broadcast._build_instance(service_info)
        self.assertEqual(instance, actual_instance)
        instance.set_broadcasting.assert_called_once_with(service_info, is_self=False)

    @mock.patch(BROADCAST_MODULE + "KolibriInstance.from_service_info")
    def test_build_instance__self(self, mock_from_service_info):
        self.instance.zeroconf_id = "abc"
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        instance = mock.Mock(spec_set=KolibriInstance)(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        instance.zeroconf_id = self.instance.zeroconf_id
        mock_from_service_info.return_value = instance
        actual_instance = self.broadcast._build_instance(service_info)
        self.assertEqual(instance, actual_instance)
        instance.set_broadcasting.assert_called_once_with(service_info, is_self=True)

    @mock.patch(BROADCAST_MODULE + "logger.warning")
    def test_get_service_info(self, mock_logger):
        self.broadcast.zeroconf = self.zeroconf
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        self.zeroconf.get_service_info.return_value = service_info
        actual_service_info = self.broadcast._get_service_info("test")
        self.assertEqual(service_info, actual_service_info)
        self.zeroconf.get_service_info.assert_called_once_with(
            SERVICE_TYPE, "test", timeout=10000
        )
        mock_logger.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "logger.warning")
    def test_get_service_info__not_broadcasting(self, mock_logger):
        actual_service_info = self.broadcast._get_service_info("test")
        self.assertIsNone(actual_service_info)
        self.zeroconf.get_service_info.assert_not_called()
        mock_logger.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "logger.warning")
    def test_get_service_info__not_found(self, mock_logger):
        self.broadcast.zeroconf = self.zeroconf
        self.zeroconf.get_service_info.return_value = None
        actual_service_info = self.broadcast._get_service_info("test")
        self.assertIsNone(actual_service_info)
        self.zeroconf.get_service_info.assert_called_once_with(
            SERVICE_TYPE, "test", timeout=10000
        )
        mock_logger.assert_called_once()
