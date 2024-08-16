import mock
from django.test import TestCase

from ..utils.network.broadcast import KolibriBroadcast
from ..utils.network.broadcast import KolibriInstance
from ..utils.network.search import NetworkLocationListener
from kolibri.core.tasks.job import Priority

MOCK_INTERFACE_IP = "111.222.111.222"
MOCK_PORT = 555
MOCK_ID = "abba"
SEARCH_MODULE = "kolibri.core.discovery.utils.network.search."
DYNAMIC_NETWORK_LOCATION_TASK_PRIORITY_METHOD = (
    SEARCH_MODULE
    + "NetworkLocationListener._get_dynamic_network_location_task_priority"
)


class NetworkLocationListenerTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        super(NetworkLocationListenerTestCase, self).setUp()
        self.instance = KolibriInstance(
            MOCK_ID,
            ip=MOCK_INTERFACE_IP,
            port=MOCK_PORT,
            device_info={
                "instance_id": MOCK_ID,
            },
        )
        self.broadcast_instance = KolibriInstance(
            "abcd",
            ip=MOCK_INTERFACE_IP,
            port=MOCK_PORT,
            device_info={
                "instance_id": "abcd",
            },
        )

        self.broadcast = KolibriBroadcast(instance=self.broadcast_instance)
        self.broadcast.id = "abc123"

        self.listener = NetworkLocationListener(self.broadcast)

    @mock.patch(SEARCH_MODULE + "reset_connection_states.enqueue")
    def test_register_instance(self, mock_enqueue):
        self.listener.register_instance(self.instance)
        mock_enqueue.assert_called_once_with(args=(self.broadcast.id,))

    def test_dynamic_network_location_task_priority_self_no_lod(self):
        # The current device is not a LOD.
        self.broadcast_instance.device_info["subset_of_users_device"] = False

        priority = self.listener._get_dynamic_network_location_task_priority(
            self.instance
        )
        self.assertEqual(priority, Priority.HIGH)

    def test_dynamic_network_location_task_priority_self_discovered_both_lod(self):
        # The current device is a LOD.
        self.broadcast_instance.device_info["subset_of_users_device"] = True
        # The discovered device is LOD as well.
        self.instance.device_info["subset_of_users_device"] = True

        priority = self.listener._get_dynamic_network_location_task_priority(
            self.instance
        )
        self.assertEqual(priority, Priority.REGULAR)

    def test_dynamic_network_location_task_priority_self_lod_discovered_not_lod(self):
        # The current device is a LOD.
        self.broadcast_instance.device_info["subset_of_users_device"] = True
        # The discovered device is not a LOD.
        self.instance.device_info["subset_of_users_device"] = False

        priority = self.listener._get_dynamic_network_location_task_priority(
            self.instance
        )
        self.assertEqual(priority, Priority.HIGH)

    @mock.patch(SEARCH_MODULE + "add_dynamic_network_location.enqueue")
    @mock.patch(DYNAMIC_NETWORK_LOCATION_TASK_PRIORITY_METHOD)
    def test_add_instance(self, mock_priority_method, mock_enqueue):
        self.listener.add_instance(self.instance)
        mock_priority_method.assert_called_once_with(self.instance)
        mock_enqueue.assert_called_once_with(
            job_id="9e89d3ea5256721c9cd631eac36feafe",
            args=(self.broadcast.id, self.instance.to_dict()),
            priority=mock_priority_method(),
        )

    @mock.patch(SEARCH_MODULE + "add_dynamic_network_location.enqueue")
    @mock.patch(DYNAMIC_NETWORK_LOCATION_TASK_PRIORITY_METHOD)
    def test_update_instance(self, mock_priority_method, mock_enqueue):
        self.listener.update_instance(self.instance)
        mock_priority_method.assert_called_once_with(self.instance)
        mock_enqueue.assert_called_once_with(
            job_id="9e89d3ea5256721c9cd631eac36feafe",
            args=(self.broadcast.id, self.instance.to_dict()),
            priority=mock_priority_method(),
        )

    @mock.patch(SEARCH_MODULE + "remove_dynamic_network_location.enqueue")
    def test_remove_instance(self, mock_enqueue):
        self.listener.remove_instance(self.instance)
        mock_enqueue.assert_called_once_with(
            job_id="c5e88d1cb4a342ad3d23081022248fbc",
            args=(self.broadcast.id, self.instance.to_dict()),
        )
