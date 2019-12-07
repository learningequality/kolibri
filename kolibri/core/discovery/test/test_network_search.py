import socket

import mock
from django.test import TestCase
from zeroconf import BadTypeInNameException
from zeroconf import service_type_name
from zeroconf import ServiceInfo
from zeroconf import Zeroconf

from ..utils.network.search import _id_from_name
from ..utils.network.search import get_available_instances
from ..utils.network.search import initialize_zeroconf_listener
from ..utils.network.search import KolibriZeroconfService
from ..utils.network.search import LOCAL_DOMAIN
from ..utils.network.search import NonUniqueNameException
from ..utils.network.search import register_zeroconf_service
from ..utils.network.search import SERVICE_TYPE
from ..utils.network.search import unregister_zeroconf_service
from ..utils.network.search import ZEROCONF_STATE

MOCK_INTERFACE_IP = "111.222.111.222"
MOCK_PORT = 555
MOCK_ID = "abba"
MOCK_PROPERTIES = {b"version": '[0, 13, 0, "alpha", 0]'}


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
    "kolibri.core.discovery.utils.network.search._is_port_open", lambda *a, **kw: True
)
@mock.patch("kolibri.core.discovery.utils.network.search.Zeroconf", MockZeroconf)
@mock.patch(
    "kolibri.core.discovery.utils.network.search.get_all_addresses",
    lambda: [MOCK_INTERFACE_IP],
)
class TestNetworkSearch(TestCase):
    def test_initialize_zeroconf_listener(self):
        assert ZEROCONF_STATE["listener"] is None
        initialize_zeroconf_listener()
        assert ZEROCONF_STATE["listener"] is not None

    def test_register_zeroconf_service(self):
        assert len(get_available_instances()) == 0
        initialize_zeroconf_listener()
        register_zeroconf_service(MOCK_PORT, MOCK_ID)
        assert get_available_instances() == [
            {
                "id": MOCK_ID,
                "ip": MOCK_INTERFACE_IP,
                "local": True,
                "self": True,
                "port": MOCK_PORT,
                "host": ".".join([MOCK_ID, LOCAL_DOMAIN]),
                "data": {"version": [0, 13, 0, "alpha", 0]},
                "base_url": "http://{ip}:{port}/".format(
                    ip=MOCK_INTERFACE_IP, port=MOCK_PORT
                ),
            }
        ]
        register_zeroconf_service(MOCK_PORT, MOCK_ID)
        unregister_zeroconf_service()
        assert len(get_available_instances()) == 0

    def test_naming_conflict(self):
        assert not ZEROCONF_STATE["listener"]
        service1 = KolibriZeroconfService(id=MOCK_ID, port=MOCK_PORT)
        service1.register()
        assert len(get_available_instances()) == 1
        service2 = KolibriZeroconfService(id=MOCK_ID, port=MOCK_PORT)
        service2.register()
        assert len(get_available_instances()) == 2
        assert service1.id + "-2" == service2.id
        service1.unregister()
        service2.unregister()

    def test_irreconcilable_naming_conflict(self):
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

    def test_excluding_local(self):
        initialize_zeroconf_listener()
        register_zeroconf_service(MOCK_PORT, MOCK_ID)
        assert len(get_available_instances()) == 1
        assert len(get_available_instances(include_local=False)) == 0
        unregister_zeroconf_service()

    def tearDown(self):
        unregister_zeroconf_service()
        ZEROCONF_STATE["zeroconf"] = None
        ZEROCONF_STATE["listener"] = None
        ZEROCONF_STATE["service"] = None
        super(TestNetworkSearch, self).tearDown()
