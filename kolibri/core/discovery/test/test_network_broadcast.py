# -*- coding: utf-8 -*-
import socket

import mock
import pytest
from django.test import SimpleTestCase
from zeroconf import NonUniqueNameException
from zeroconf import ServiceInfo
from zeroconf import Zeroconf

from ..utils.network.broadcast import KolibriBroadcast
from ..utils.network.broadcast import KolibriInstance
from ..utils.network.broadcast import KolibriInstanceListener
from ..utils.network.broadcast import LOCAL_DOMAIN
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
ZEROCONF_NEEDS_UPDATE = getattr(Zeroconf, "update_interfaces", None) is None


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


class KolibriInstanceListenerTestCase(SimpleTestCase):
    def setUp(self):
        super(KolibriInstanceListenerTestCase, self).setUp()
        self.instance = KolibriInstance(MOCK_ID)
        self.broadcast = mock.Mock(spec_set=KolibriBroadcast)(self.instance)
        self.listener = KolibriInstanceListener(self.broadcast)
        self.zeroconf = mock.Mock()

    @mock.patch(BROADCAST_MODULE + "KolibriInstanceListener.add_instance")
    def test_add_service(self, mock_add_instance):
        new_instance = KolibriInstance("abc")
        self.broadcast.add_instance.return_value = new_instance
        self.listener.add_service(self.zeroconf, SERVICE_TYPE, new_instance.name)
        self.broadcast.add_instance.assert_called_once_with(new_instance.name)
        mock_add_instance.assert_called_once_with(new_instance)

    @mock.patch(BROADCAST_MODULE + "KolibriInstanceListener.add_instance")
    def test_add_service__invalid_type(self, mock_add_instance):
        new_instance = KolibriInstance("abc")
        self.broadcast.add_instance.return_value = new_instance
        self.listener.add_service(self.zeroconf, "IoT", new_instance.name)
        self.broadcast.add_instance.assert_not_called()
        mock_add_instance.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriInstanceListener.add_instance")
    def test_add_service__broadcast_none(self, mock_add_instance):
        new_instance = KolibriInstance("abc")
        self.broadcast.add_instance.return_value = None
        self.listener.add_service(self.zeroconf, SERVICE_TYPE, new_instance.name)
        self.broadcast.add_instance.assert_called_once_with(new_instance.name)
        mock_add_instance.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriInstanceListener.update_instance")
    def test_update_service(self, mock_update_instance):
        updated_instance = KolibriInstance("abc")
        self.broadcast.update_instance.return_value = updated_instance
        self.listener.update_service(self.zeroconf, SERVICE_TYPE, updated_instance.name)
        self.broadcast.update_instance.assert_called_once_with(updated_instance.name)
        mock_update_instance.assert_called_once_with(updated_instance)

    @mock.patch(BROADCAST_MODULE + "KolibriInstanceListener.update_instance")
    def test_update_service__invalid_type(self, mock_update_instance):
        updated_instance = KolibriInstance("abc")
        self.broadcast.update_instance.return_value = updated_instance
        self.listener.update_service(self.zeroconf, "IoT", updated_instance.name)
        self.broadcast.update_instance.assert_not_called()
        mock_update_instance.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriInstanceListener.update_instance")
    def test_update_service__broadcast_none(self, mock_update_instance):
        updated_instance = KolibriInstance("abc")
        self.broadcast.update_instance.return_value = None
        self.listener.update_service(self.zeroconf, SERVICE_TYPE, updated_instance.name)
        self.broadcast.update_instance.assert_called_once_with(updated_instance.name)
        mock_update_instance.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriInstanceListener.remove_instance")
    def test_remove_service(self, mock_remove_instance):
        removed_instance = KolibriInstance("abc")
        self.broadcast.remove_instance.return_value = removed_instance
        self.listener.remove_service(self.zeroconf, SERVICE_TYPE, removed_instance.name)
        self.broadcast.remove_instance.assert_called_once_with(removed_instance.name)
        mock_remove_instance.assert_called_once_with(removed_instance)

    @mock.patch(BROADCAST_MODULE + "KolibriInstanceListener.remove_instance")
    def test_remove_service__invalid_type(self, mock_remove_instance):
        removed_instance = KolibriInstance("abc")
        self.broadcast.remove_instance.return_value = removed_instance
        self.listener.remove_service(self.zeroconf, "IoT", removed_instance.name)
        self.broadcast.remove_instance.assert_not_called()
        mock_remove_instance.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriInstanceListener.remove_instance")
    def test_remove_service__broadcast_none(self, mock_remove_instance):
        removed_instance = KolibriInstance("abc")
        self.broadcast.remove_instance.return_value = None
        self.listener.remove_service(self.zeroconf, SERVICE_TYPE, removed_instance.name)
        self.broadcast.remove_instance.assert_called_once_with(removed_instance.name)
        mock_remove_instance.assert_not_called()


class KolibriBroadcastTestCase(SimpleTestCase):
    def setUp(self):
        super(KolibriBroadcastTestCase, self).setUp()
        self.instance = mock.Mock(spec_set=KolibriInstance)(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        self.zeroconf = mock.MagicMock(spec_set=Zeroconf)()
        self.broadcast = KolibriBroadcast(self.instance)
        self.listener = mock.MagicMock(spec_set=KolibriInstanceListener)(self.broadcast)

    def test_is_broadcasting(self):
        self.assertFalse(self.broadcast.is_broadcasting)
        self.broadcast.zeroconf = self.zeroconf
        self.assertTrue(self.broadcast.is_broadcasting)

    @pytest.mark.skipIf(ZEROCONF_NEEDS_UPDATE, "Needs updated Zeroconf")
    def test_addresses(self):
        self.assertEqual(set(), self.broadcast.addresses)
        self.broadcast.zeroconf = self.zeroconf
        self.zeroconf.interfaces = [MOCK_INTERFACE_IP]
        self.assertEqual({MOCK_INTERFACE_IP}, self.broadcast.addresses)

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast.register")
    @mock.patch(BROADCAST_MODULE + "Zeroconf")
    def test_start_broadcast(self, mock_zeroconf, mock_register):
        mock_zeroconf.return_value = self.zeroconf
        self.broadcast.listeners = [self.listener]
        self.broadcast.start_broadcast()
        mock_zeroconf.assert_called_once_with(interfaces=self.broadcast.interfaces)
        self.zeroconf.add_service_listener.assert_called_once_with(
            SERVICE_TYPE, self.listener
        )
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

    @pytest.mark.skipIf(ZEROCONF_NEEDS_UPDATE, "Needs updated Zeroconf")
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
        self.broadcast.listeners = [self.listener]
        self.broadcast.register()
        mock_logger.assert_called_once()
        self.instance.to_service_info.assert_called_once_with(self.instance.zeroconf_id)
        self.zeroconf.check_service.assert_called_once_with(service_info, False)
        self.zeroconf.register_service.assert_called_once_with(service_info, ttl=60)
        self.instance.set_broadcasting.assert_called_once_with(
            service_info, is_self=True
        )
        self.listener.register_instance.assert_called_once_with(self.instance)

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
        self.zeroconf.check_service.side_effect = [NonUniqueNameException(), None]
        self.broadcast.register()
        mock_logger.assert_called_once()
        self.instance.to_service_info.assert_any_call(self.instance.zeroconf_id)
        self.instance.to_service_info.assert_called_with(
            self.instance.zeroconf_id + "-1"
        )
        self.zeroconf.check_service.assert_any_call(service_info_not_unique, False)
        self.zeroconf.check_service.assert_called_with(service_info_unique, False)
        self.zeroconf.register_service.assert_called_once_with(
            service_info_unique, ttl=60
        )
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
    def test_renew(self, mock_logger):
        self.broadcast.zeroconf = self.zeroconf
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        self.instance.to_service_info.return_value = service_info
        self.broadcast.listeners = [self.listener]
        self.broadcast.renew()
        mock_logger.assert_called_once()
        self.instance.to_service_info.assert_called_once_with()
        self.zeroconf.update_service.assert_called_once_with(service_info, ttl=60)
        self.instance.set_broadcasting.assert_called_once_with(
            service_info, is_self=True
        )
        self.listener.renew_instance.assert_called_once_with(self.instance)

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_renew__not_broadcasting(self, mock_logger):
        self.broadcast.renew()
        mock_logger.assert_not_called()

    def test_unregister(self):
        self.broadcast.zeroconf = self.zeroconf
        self.instance.service_info = mock.Mock(spec_set=ServiceInfo)("test")
        self.broadcast.listeners = [self.listener]
        self.broadcast.unregister()
        self.zeroconf.unregister_service.assert_called_once_with(
            self.instance.service_info
        )
        self.instance.reset_broadcasting.assert_called_once_with()
        self.listener.unregister_instance.assert_called_once_with(self.instance)

    def test_unregister__not_broadcasting(self):
        self.broadcast.unregister()
        self.zeroconf.unregister_service.assert_not_called()

    def test_add_listener(self):
        self.broadcast.zeroconf = self.zeroconf
        self.broadcast.add_listener(KolibriInstanceListener)
        self.assertIsInstance(self.broadcast.listeners[0], KolibriInstanceListener)
        self.assertEqual(self.broadcast.listeners[0].broadcast, self.broadcast)
        self.zeroconf.add_service_listener.assert_called_once_with(
            SERVICE_TYPE, self.broadcast.listeners[0]
        )

    def test_add_listener__not_broadcasting(self):
        self.broadcast.add_listener(KolibriInstanceListener)
        self.assertIsInstance(self.broadcast.listeners[0], KolibriInstanceListener)
        self.assertEqual(self.broadcast.listeners[0].broadcast, self.broadcast)
        self.zeroconf.add_service_listener.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_add_instance(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        expected_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        mock_build_instance.return_value = expected_instance
        actual_instance = self.broadcast.add_instance("test")
        self.assertEqual(expected_instance, actual_instance)
        self.assertEqual(expected_instance, self.broadcast.other_instances["test"])
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_called_once()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_add_instance__cached(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        expected_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        expected_instance.service_info = True
        self.broadcast.other_instances["test"] = expected_instance
        actual_instance = self.broadcast.add_instance("test")
        self.assertEqual(expected_instance, actual_instance)
        mock_get_service_info.assert_not_called()
        mock_build_instance.assert_not_called()
        mock_logger.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_add_instance__cached__not_broadcasting(
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
        actual_instance = self.broadcast.add_instance("test")
        self.assertEqual(expected_instance, actual_instance)
        self.assertEqual(expected_instance, self.broadcast.other_instances["test"])
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_called_once()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_add_instance__not_found(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        mock_get_service_info.return_value = None
        actual_instance = self.broadcast.add_instance("test")
        self.assertIsNone(actual_instance)
        self.assertIsNone(self.broadcast.other_instances.get("test"))
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_not_called()
        mock_logger.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_add_instance__is_self(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        instance = KolibriInstance(MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT)
        instance.is_self = True
        mock_build_instance.return_value = instance
        actual_instance = self.broadcast.add_instance("test")
        self.assertIsNone(actual_instance)
        self.assertIsNone(self.broadcast.other_instances.get("test"))
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_update_instance(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        expected_instance = KolibriInstance(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        mock_build_instance.return_value = expected_instance
        actual_instance = self.broadcast.update_instance("test")
        self.assertEqual(expected_instance, actual_instance)
        self.assertEqual(expected_instance, self.broadcast.other_instances["test"])
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_called_once()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast.remove_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_update_instance__not_found(
        self,
        mock_logger,
        mock_get_service_info,
        mock_build_instance,
        mock_remove_instance,
    ):
        mock_get_service_info.return_value = None
        mock_remove_instance.return_value = None
        actual_instance = self.broadcast.update_instance("test")
        self.assertIsNone(actual_instance)
        self.assertIsNone(self.broadcast.other_instances.get("test"))
        mock_get_service_info.assert_called_once_with("test")
        mock_remove_instance.assert_called_once_with("test", lock=False)
        mock_build_instance.assert_not_called()
        mock_logger.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._build_instance")
    @mock.patch(BROADCAST_MODULE + "KolibriBroadcast._get_service_info")
    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_update_instance__is_self(
        self, mock_logger, mock_get_service_info, mock_build_instance
    ):
        service_info = mock.Mock(spec_set=ServiceInfo)("test")
        mock_get_service_info.return_value = service_info
        instance = KolibriInstance(MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT)
        instance.is_self = True
        mock_build_instance.return_value = instance
        actual_instance = self.broadcast.update_instance("test")
        self.assertIsNone(actual_instance)
        self.assertIsNone(self.broadcast.other_instances.get("test"))
        mock_get_service_info.assert_called_once_with("test")
        mock_build_instance.assert_called_once_with(service_info)
        mock_logger.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_remove_instance(self, mock_logger):
        expected_instance = mock.Mock(spec_set=KolibriInstance)(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        expected_instance.service_info = True
        expected_instance.is_self = False
        self.broadcast.other_instances["test"] = expected_instance
        actual_instance = self.broadcast.remove_instance("test")
        self.assertEqual(expected_instance, actual_instance)
        mock_logger.assert_called_once()
        expected_instance.reset_broadcasting.assert_called_once()

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_remove_instance__is_self(self, mock_logger):
        expected_instance = mock.Mock(spec_set=KolibriInstance)(
            MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT
        )
        expected_instance.service_info = True
        expected_instance.is_self = True
        self.broadcast.other_instances["test"] = expected_instance
        actual_instance = self.broadcast.remove_instance("test")
        self.assertIsNone(actual_instance)
        mock_logger.assert_not_called()
        expected_instance.reset_broadcasting.assert_not_called()

    @mock.patch(BROADCAST_MODULE + "logger.info")
    def test_remove_instance__not_found(self, mock_logger):
        actual_instance = self.broadcast.remove_instance("test")
        self.assertIsNone(actual_instance)
        mock_logger.assert_not_called()

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
