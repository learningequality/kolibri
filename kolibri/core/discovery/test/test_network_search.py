import mock
from django.test import TransactionTestCase

from ..utils.network.broadcast import KolibriInstance
from ..utils.network.search import NetworkLocationListener


MOCK_INTERFACE_IP = "111.222.111.222"
MOCK_PORT = 555
MOCK_ID = "abba"
SEARCH_MODULE = "kolibri.core.discovery.utils.network.search."


class NetworkLocationListenerTestCase(TransactionTestCase):
    multi_db = True

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
        self.mock_broadcast = mock.MagicMock(id="abc123")
        self.listener = NetworkLocationListener(self.mock_broadcast)

    @mock.patch(SEARCH_MODULE + "reset_connection_states.enqueue")
    def test_register_instance(self, mock_enqueue):
        self.listener.register_instance(self.instance)
        mock_enqueue.assert_called_once_with(args=(self.mock_broadcast.id,))

    @mock.patch(SEARCH_MODULE + "add_dynamic_network_location.enqueue")
    def test_add_instance(self, mock_enqueue):
        self.listener.add_instance(self.instance)
        mock_enqueue.assert_called_once_with(
            job_id="9e89d3ea5256721c9cd631eac36feafe",
            args=(self.mock_broadcast.id, self.instance.to_dict()),
        )

    @mock.patch(SEARCH_MODULE + "add_dynamic_network_location.enqueue")
    def test_update_instance(self, mock_enqueue):
        self.listener.update_instance(self.instance)
        mock_enqueue.assert_called_once_with(
            job_id="9e89d3ea5256721c9cd631eac36feafe",
            args=(self.mock_broadcast.id, self.instance.to_dict()),
        )

    @mock.patch(SEARCH_MODULE + "remove_dynamic_network_location.enqueue")
    def test_remove_instance(self, mock_enqueue):
        self.listener.remove_instance(self.instance)
        mock_enqueue.assert_called_once_with(
            job_id="c5e88d1cb4a342ad3d23081022248fbc",
            args=(self.mock_broadcast.id, self.instance.to_dict()),
        )
