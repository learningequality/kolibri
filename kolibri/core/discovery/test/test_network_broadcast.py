import socket

import mock
import pytest
from django.test import SimpleTestCase
from magicbus import Bus
from zeroconf import ServiceInfo

from ..utils.network.broadcast import INSTANCE_EVENTS
from ..utils.network.broadcast import KolibriInstance
from ..utils.network.broadcast import KolibriInstanceListener
from ..utils.network.broadcast import LOCAL_DOMAIN
from ..utils.network.broadcast import NetworkDiscoveryBackend
from ..utils.network.broadcast import SERVICE_TYPE

MOCK_INTERFACE_IP = "111.222.111.222"
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


def build_service_info(zeroconf_id="test", properties=None):
    """A `ServiceInfo` as Zeroconf would hand one back for `zeroconf_id`."""
    return ServiceInfo(
        SERVICE_TYPE,
        "{}.{}".format(zeroconf_id, SERVICE_TYPE),
        address=socket.inet_aton(MOCK_INTERFACE_IP),
        port=MOCK_PORT,
        server="{}.{}.".format(zeroconf_id, LOCAL_DOMAIN),
        properties=properties or MOCK_PROPERTIES.copy(),
    )


class KolibriInstanceTestCase(SimpleTestCase):
    def _build_info(self, properties=None):
        return build_service_info(properties=properties)

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

    # the local-name channel lives on the transport's bus; the transport tests
    # subscribe this same listener to it
    def update_local_names(self, hostnames):
        self.mock.update_local_names(hostnames)


@pytest.mark.parametrize("event_name", INSTANCE_EVENTS)
def test_instance_listener_events(event_name):
    events = Bus(extra_channels=INSTANCE_EVENTS)
    broadcast = mock.Mock(spec_set=NetworkDiscoveryBackend)(KolibriInstance(MOCK_ID))
    broadcast.events = events
    listener = KolibriTestInstanceListener(broadcast)
    listener.subscribe()

    new_instance = KolibriInstance("abc")
    events.publish(event_name, new_instance)
    getattr(listener.mock, event_name).assert_called_once_with(new_instance)
