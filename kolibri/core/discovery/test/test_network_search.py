# -*- coding: utf-8 -*-
import socket
import threading

import mock
from django.test import TransactionTestCase
from zeroconf import BadTypeInNameException
from zeroconf import service_type_name
from zeroconf import ServiceInfo
from zeroconf import Zeroconf

from ..utils.network.search import _id_from_name
from ..utils.network.search import get_peer_instances
from ..utils.network.search import initialize_zeroconf_listener
from ..utils.network.search import KolibriZeroconfService
from ..utils.network.search import LOCAL_DOMAIN
from ..utils.network.search import NonUniqueNameException
from ..utils.network.search import parse_device_info
from ..utils.network.search import register_zeroconf_service
from ..utils.network.search import SERVICE_TYPE
from ..utils.network.search import unregister_zeroconf_service
from ..utils.network.search import ZEROCONF_STATE

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


class MockServiceBrowser(object):
    def __init__(self, zc, type_, handlers=None, listener=None):
        assert handlers or listener, "You need to specify at least one handler"
        if not type_.endswith(service_type_name(type_)):
            raise BadTypeInNameException
        self.zc = zc
        self.type = type_

    def cancel(self):
        self.zc.remove_listener(self)


class MockZeroconf(Zeroconf):
    def __init__(self, *args, **kwargs):
        self.browsers = {}
        self.services = {}
        self._GLOBAL_DONE = threading.Event()
        self._GLOBAL_DONE.set()

    def get_service_info(self, type_, name, timeout=3000):
        id = _id_from_name(name)
        info = ServiceInfo(
            SERVICE_TYPE,
            name=".".join([id, SERVICE_TYPE]),
            server=".".join([id, LOCAL_DOMAIN, ""]),
            address=socket.inet_aton(MOCK_INTERFACE_IP),
            port=MOCK_PORT,
            properties=MOCK_PROPERTIES,
        )

        return info

    def add_service_listener(self, type_, listener):
        self.remove_service_listener(listener)
        self.browsers[listener] = MockServiceBrowser(self, type_, listener)

        for info in self.services.values():
            listener.add_service(self, info.type, info.name)

    def register_service(self, info, ttl=60, allow_name_change=False):
        self.check_service(info, allow_name_change)
        self.services[info.name.lower()] = info
        for listener in self.browsers:
            listener.add_service(self, info.type, info.name)

    def unregister_service(self, info):
        for listener in self.browsers:
            listener.remove_service(self, info.type, info.name)

    def check_service(self, info, allow_name_change):
        service_name = service_type_name(info.name)
        if not info.type.endswith(service_name):
            raise BadTypeInNameException

        instance_name = info.name[: -len(service_name) - 1]
        next_instance_number = 2

        # check for a name conflict
        while info.name.lower() in self.services:

            if not allow_name_change:
                raise NonUniqueNameException

            # change the name and look for a conflict
            info.name = "%s-%s.%s" % (instance_name, next_instance_number, info.type)
            next_instance_number += 1
            service_type_name(info.name)


@mock.patch(
    "kolibri.core.discovery.utils.network.search.get_device_info",
    return_value={"instance_id": MOCK_ID},
)
@mock.patch("kolibri.core.discovery.utils.network.search.Zeroconf", MockZeroconf)
@mock.patch(
    "kolibri.core.discovery.utils.network.search.get_all_addresses",
    lambda: [MOCK_INTERFACE_IP],
)
@mock.patch("django.db.models.Manager.update_or_create")
class TestNetworkSearch(TransactionTestCase):
    def test_initialize_zeroconf_listener(self, *mocks):
        assert ZEROCONF_STATE["listener"] is None
        initialize_zeroconf_listener()
        assert ZEROCONF_STATE["listener"] is not None

    def test_call_parse_device_info_value_bytes(self, *mocks):
        info_mock = mock.MagicMock()
        info_mock.properties = MOCK_PROPERTIES.copy()
        info_mock.properties[b"operating_system"] = '"كوليبري"'.encode("utf-8")
        try:
            device_info = parse_device_info(info_mock)
        except TypeError:
            self.fail("Failed to parse info with bytes values")
        self.assertEqual(device_info["operating_system"], "كوليبري")

    def test_call_parse_device_info_value_boolean(self, *mocks):
        info_mock = mock.MagicMock()
        info_mock.properties = MOCK_PROPERTIES.copy()
        info_mock.properties[b"operating_system"] = '"FALSE"'
        device_info = parse_device_info(info_mock)
        self.assertEqual(device_info["operating_system"], False)

    def test_register_zeroconf_service(self, mock_db, get_device_mock):
        assert len(get_peer_instances()) == 0
        initialize_zeroconf_listener()
        register_zeroconf_service(MOCK_PORT)
        assert [x for x in get_peer_instances()] == [
            {
                "id": MOCK_ID,
                "ip": MOCK_INTERFACE_IP,
                "local": True,
                "self": True,
                "port": MOCK_PORT,
                "host": ".".join([MOCK_ID, LOCAL_DOMAIN]),
                "self": True,
                "application": "kolibri",
                "kolibri_version": "1",
                "instance_id": MOCK_ID,
                "device_name": "computer",
                "operating_system": "OS/2",
                "base_url": "http://{ip}:{port}/".format(
                    ip=MOCK_INTERFACE_IP, port=MOCK_PORT
                ),
            }
        ]
        register_zeroconf_service(MOCK_PORT)
        unregister_zeroconf_service()
        assert len(get_peer_instances()) == 0

        mock_db.assert_called()

    def test_data_validation_keys_int(self, *mocks):
        with self.assertRaises(TypeError):
            KolibriZeroconfService(id=MOCK_ID, port=MOCK_PORT, data={1: True})

    def test_data_validation_keys_bool(self, *mocks):
        with self.assertRaises(TypeError):
            KolibriZeroconfService(id=MOCK_ID, port=MOCK_PORT, data={True: True})

    def test_data_validation_keys_string(self, *mocks):
        try:
            KolibriZeroconfService(id=MOCK_ID, port=MOCK_PORT, data={"True": True})
        except Exception:
            self.fail("Using a string key for data raised an exception")

    def test_data_validation_val_int(self, *mocks):
        try:
            KolibriZeroconfService(id=MOCK_ID, port=MOCK_PORT, data={"True": 1})
        except Exception:
            self.fail("Using an integer value for data raised an exception")

    def test_data_validation_val_bool(self, *mocks):
        try:
            KolibriZeroconfService(id=MOCK_ID, port=MOCK_PORT, data={"True": True})
        except Exception:
            self.fail("Using a boolean value for data raised an exception")

    def test_data_validation_val_string(self, *mocks):
        try:
            KolibriZeroconfService(id=MOCK_ID, port=MOCK_PORT, data={"True": "true"})
        except Exception:
            self.fail("Using a string value for data raised an exception")

    def test_data_validation_val_dict(self, *mocks):
        with self.assertRaises(TypeError):
            KolibriZeroconfService(id=MOCK_ID, port=MOCK_PORT, data={"good": {}})

    def test_data_validation_val_list(self, *mocks):
        with self.assertRaises(TypeError):
            KolibriZeroconfService(id=MOCK_ID, port=MOCK_PORT, data={"good": []})

    def test_naming_conflict(self, *mocks):
        assert not ZEROCONF_STATE["listener"]
        service1 = KolibriZeroconfService(id=MOCK_ID, port=MOCK_PORT)
        service1.register()
        service2 = KolibriZeroconfService(id=MOCK_ID, port=MOCK_PORT)
        service2.register()
        assert service1.id + "-2" == service2.id
        service1.unregister()
        service2.unregister()

    def test_irreconcilable_naming_conflict(self, *mocks):
        services = [KolibriZeroconfService(id=MOCK_ID, port=MOCK_PORT).register()]
        for i in range(110):
            services.append(
                KolibriZeroconfService(
                    id="-".join([MOCK_ID, str(i)]), port=MOCK_PORT
                ).register()
            )
        with self.assertRaises(NonUniqueNameException):
            KolibriZeroconfService(id=MOCK_ID, port=MOCK_PORT).register()
        for service in services:
            service.unregister()

    def tearDown(self):
        unregister_zeroconf_service()
        ZEROCONF_STATE["zeroconf"] = None
        ZEROCONF_STATE["listener"] = None
        ZEROCONF_STATE["service"] = None
        super(TestNetworkSearch, self).tearDown()
