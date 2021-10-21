import mock
from django.db.utils import OperationalError
from django.test import TransactionTestCase

from ..models import DynamicNetworkLocation
from ..utils.network.broadcast import KolibriBroadcast
from ..utils.network.broadcast import KolibriInstance
from ..utils.network.search import DynamicNetworkLocationListener
from ..utils.network.search import NETWORK_EVENTS
from ..utils.network.search import SoUDClientListener
from ..utils.network.search import SoUDServerListener
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser

MOCK_INTERFACE_IP = "111.222.111.222"
MOCK_PORT = 555
MOCK_ID = "abba"
SEARCH_MODULE = "kolibri.core.discovery.utils.network.search."


class DynamicNetworkLocationListenerTestCase(TransactionTestCase):
    multi_db = True

    def setUp(self):
        super(DynamicNetworkLocationListenerTestCase, self).setUp()
        self.instance = KolibriInstance(
            MOCK_ID,
            ip=MOCK_INTERFACE_IP,
            port=MOCK_PORT,
            device_info={
                "instance_id": MOCK_ID,
            },
        )
        self.listener = DynamicNetworkLocationListener(mock.Mock())

    def test_register_instance(self):
        DynamicNetworkLocation.objects.update_or_create(
            dict(base_url=self.instance.base_url, **self.instance.device_info),
            id=self.instance.zeroconf_id,
        )
        self.assertEqual(1, DynamicNetworkLocation.objects.count())
        self.listener.register_instance(self.instance)
        self.assertEqual(0, DynamicNetworkLocation.objects.count())

    def test_unregister_instance(self):
        DynamicNetworkLocation.objects.update_or_create(
            dict(base_url=self.instance.base_url, **self.instance.device_info),
            id=self.instance.zeroconf_id,
        )
        self.assertEqual(1, DynamicNetworkLocation.objects.count())
        self.listener.unregister_instance(self.instance)
        self.assertEqual(0, DynamicNetworkLocation.objects.count())

    def test_add_instance(self):
        self.assertEqual(0, DynamicNetworkLocation.objects.count())
        self.listener.add_instance(self.instance)
        self.assertEqual(1, DynamicNetworkLocation.objects.count())
        netloc = DynamicNetworkLocation.objects.all().first()
        self.assertEqual(self.instance.id, netloc.id)
        self.assertEqual(self.instance.id, netloc.instance_id)
        self.assertEqual(self.instance.base_url, netloc.base_url)

    @mock.patch(SEARCH_MODULE + "DynamicNetworkLocation.objects.update_or_create")
    def test_add_instance__locked(self, mock_update_or_create):
        mock_update_or_create.side_effect = OperationalError("database is locked")
        self.listener.add_instance(self.instance)
        self.assertEqual(6, mock_update_or_create.call_count)

    @mock.patch(SEARCH_MODULE + "DynamicNetworkLocation.objects.update_or_create")
    def test_add_instance__error_but_not_locked(self, mock_update_or_create):
        mock_update_or_create.side_effect = OperationalError("Whoops")
        with self.assertRaises(OperationalError):
            self.listener.add_instance(self.instance)

    def test_update_instance(self):
        self.assertEqual(0, DynamicNetworkLocation.objects.count())
        self.listener.update_instance(self.instance)
        self.assertEqual(1, DynamicNetworkLocation.objects.count())
        netloc = DynamicNetworkLocation.objects.all().first()
        self.assertEqual(self.instance.id, netloc.id)
        self.assertEqual(self.instance.id, netloc.instance_id)
        self.assertEqual(self.instance.base_url, netloc.base_url)

    def test_remove_instance(self):
        DynamicNetworkLocation.objects.update_or_create(
            dict(base_url=self.instance.base_url, **self.instance.device_info),
            id=self.instance.zeroconf_id,
        )
        second_instance_id = self.instance.zeroconf_id + "2nd"
        second_device_info = self.instance.device_info.copy()
        second_device_info.update(instance_id=second_instance_id)
        DynamicNetworkLocation.objects.update_or_create(
            dict(base_url=self.instance.base_url, **second_device_info),
            id=second_instance_id,
        )
        self.assertEqual(2, DynamicNetworkLocation.objects.count())
        self.listener.remove_instance(self.instance)
        self.assertEqual(1, DynamicNetworkLocation.objects.count())


class SoUDClientListenerTestCase(TransactionTestCase):
    def setUp(self):
        super(SoUDClientListenerTestCase, self).setUp()
        self.instance = KolibriInstance(MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT)
        self.broadcast = mock.Mock(spec_set=KolibriBroadcast)(self.instance)
        self.broadcast.other_instances = {}
        self.listener = SoUDClientListener(self.broadcast)
        self.other_instance = KolibriInstance("test")
        self.other_instance.service_info = True
        self.other_offline_instance = KolibriInstance("test2")
        self.broadcast.other_instances["test"] = self.other_instance
        self.broadcast.other_instances["test2"] = self.other_offline_instance

    def test_get_user_ids(self):
        facility = Facility.objects.create()
        user1 = FacilityUser.objects.create(username="buster.0", facility=facility)
        user2 = FacilityUser.objects.create(username="buster.1", facility=facility)
        user_ids = list(self.listener._get_user_ids())
        self.assertIn(user1.pk, user_ids)
        self.assertIn(user2.pk, user_ids)

    @mock.patch(SEARCH_MODULE + "SoUDClientListener.partial_unsubscribe")
    def test_register_instance(self, mock_unsubscribe):
        self.instance.device_info.update(subset_of_users_device=True)
        self.listener.register_instance(self.instance)
        mock_unsubscribe.assert_not_called()

        self.instance.device_info.update(subset_of_users_device=False)
        self.listener.register_instance(self.instance)
        mock_unsubscribe.assert_called_once_with(NETWORK_EVENTS)

    @mock.patch(SEARCH_MODULE + "SoUDClientListener.add_instance")
    @mock.patch(SEARCH_MODULE + "SoUDClientListener.partial_subscribe")
    def test_renew_instance__became_soud(self, mock_subscribe, mock_add_instance):
        self.instance.device_info.update(subset_of_users_device=True)
        self.listener.renew_instance(self.instance)
        mock_subscribe.assert_called_once_with(NETWORK_EVENTS)
        mock_add_instance.assert_called_once_with(self.other_instance)

    @mock.patch(SEARCH_MODULE + "SoUDClientListener.partial_unsubscribe")
    def test_renew_instance__revert_soud(self, mock_unsubscribe):
        self.instance.device_info.update(subset_of_users_device=False)
        self.listener.renew_instance(self.instance)
        mock_unsubscribe.assert_called_once_with(NETWORK_EVENTS)

    @mock.patch(SEARCH_MODULE + "SoUDClientListener.remove_instance")
    def test_unregister_instance(self, mock_remove_instance):
        self.instance.device_info.update(subset_of_users_device=True)
        self.listener.unregister_instance(self.instance)
        mock_remove_instance.assert_any_call(self.other_instance)
        mock_remove_instance.assert_any_call(self.other_offline_instance)

    @mock.patch(SEARCH_MODULE + "SoUDClientListener.remove_instance")
    def test_unregister_instance__not_soud(self, mock_remove_instance):
        self.listener.unregister_instance(self.instance)
        mock_remove_instance.assert_not_called()

    @mock.patch(SEARCH_MODULE + "begin_request_soud_sync")
    @mock.patch(SEARCH_MODULE + "SoUDClientListener._get_user_ids")
    def test_add_instance(self, mock_get_user_ids, mock_start_sync):
        mock_get_user_ids.return_value = [123, 456]
        self.other_instance.device_info.update(subset_of_users_device=False)
        self.listener.add_instance(self.other_instance)
        mock_get_user_ids.assert_called()
        mock_start_sync.assert_any_call(self.other_instance.base_url, 123)
        mock_start_sync.assert_any_call(self.other_instance.base_url, 456)

    @mock.patch(SEARCH_MODULE + "begin_request_soud_sync")
    @mock.patch(SEARCH_MODULE + "SoUDClientListener._get_user_ids")
    def test_add_instance__not_soud(self, mock_get_user_ids, mock_start_sync):
        self.other_instance.device_info.update(subset_of_users_device=True)
        self.listener.add_instance(self.other_instance)
        mock_get_user_ids.assert_not_called()
        mock_start_sync.assert_not_called()

    @mock.patch(SEARCH_MODULE + "SoUDClientListener.add_instance")
    @mock.patch(SEARCH_MODULE + "SoUDClientListener.remove_instance")
    def test_update_instance(self, mock_remove_instance, mock_add_instance):
        self.listener.update_instance(self.other_instance)
        mock_remove_instance.assert_any_call(self.other_instance)
        mock_add_instance.assert_any_call(self.other_instance)

    @mock.patch(SEARCH_MODULE + "stop_request_soud_sync")
    @mock.patch(SEARCH_MODULE + "SoUDClientListener._get_user_ids")
    def test_remove_instance(self, mock_get_user_ids, mock_stop_sync):
        mock_get_user_ids.return_value = [123, 456]
        self.other_instance.device_info.update(subset_of_users_device=False)
        self.listener.remove_instance(self.other_instance)
        mock_get_user_ids.assert_called()
        mock_stop_sync.assert_any_call(self.other_instance.base_url, 123)
        mock_stop_sync.assert_any_call(self.other_instance.base_url, 456)

    @mock.patch(SEARCH_MODULE + "stop_request_soud_sync")
    @mock.patch(SEARCH_MODULE + "SoUDClientListener._get_user_ids")
    def test_remove_instance__other_not_soud(self, mock_get_user_ids, mock_stop_sync):
        self.other_instance.device_info.update(subset_of_users_device=True)
        self.listener.remove_instance(self.other_instance)
        mock_get_user_ids.assert_not_called()
        mock_stop_sync.assert_not_called()


class SoUDServerListenerTestCase(TransactionTestCase):
    def setUp(self):
        super(SoUDServerListenerTestCase, self).setUp()
        self.instance = KolibriInstance(MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT)
        self.broadcast = mock.Mock(spec_set=KolibriBroadcast)(self.instance)
        self.listener = SoUDServerListener(self.broadcast)

    @mock.patch(SEARCH_MODULE + "SoUDServerListener.partial_unsubscribe")
    def test_register_instance__not_soud(self, mock_unsubscribe):
        self.instance.device_info.update(subset_of_users_device=False)
        self.listener.register_instance(self.instance)
        mock_unsubscribe.assert_not_called()

    @mock.patch(SEARCH_MODULE + "SoUDServerListener.partial_unsubscribe")
    def test_register_instance__soud(self, mock_unsubscribe):
        self.instance.device_info.update(subset_of_users_device=True)
        self.listener.register_instance(self.instance)
        mock_unsubscribe.assert_called_once_with(NETWORK_EVENTS)

    @mock.patch(SEARCH_MODULE + "SoUDServerListener.partial_unsubscribe")
    @mock.patch(SEARCH_MODULE + "SoUDServerListener.partial_subscribe")
    def test_renew_instance__not_soud(self, mock_subscribe, mock_unsubscribe):
        self.instance.device_info.update(subset_of_users_device=False)
        self.listener.renew_instance(self.instance)
        mock_unsubscribe.assert_not_called()
        mock_subscribe.assert_called_once_with(NETWORK_EVENTS)

    @mock.patch(SEARCH_MODULE + "SoUDServerListener.partial_unsubscribe")
    @mock.patch(SEARCH_MODULE + "SoUDServerListener.partial_subscribe")
    def test_renew_instance__soud(self, mock_subscribe, mock_unsubscribe):
        self.instance.device_info.update(subset_of_users_device=True)
        self.listener.renew_instance(self.instance)
        mock_unsubscribe.assert_called_once_with(NETWORK_EVENTS)
        mock_subscribe.assert_not_called()

    @mock.patch(SEARCH_MODULE + "queue_soud_server_sync_cleanup")
    def test_remove_instance__not_soud(self, mock_cleanup):
        self.instance.device_info.update(subset_of_users_device=False)
        self.listener.remove_instance(self.instance)
        mock_cleanup.assert_not_called()

    @mock.patch(SEARCH_MODULE + "queue_soud_server_sync_cleanup")
    def test_remove_instance__soud(self, mock_cleanup):
        self.instance.device_info.update(subset_of_users_device=True)
        self.listener.remove_instance(self.instance)
        mock_cleanup.assert_called_once_with(self.instance.ip)
