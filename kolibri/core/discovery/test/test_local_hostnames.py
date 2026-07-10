import mock
from django.test import TestCase

from ..utils.network.broadcast import KolibriBroadcast
from ..utils.network.broadcast import KolibriInstance
from ..utils.network.local_hostnames import LocalHostnameListener

MOCK_INTERFACE_IP = "111.222.111.222"
MOCK_PORT = 555
MOCK_ID = "abba"
LOCAL_HOSTNAMES_MODULE = "kolibri.core.discovery.utils.network.local_hostnames."


class LocalHostnameListenerTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        super().setUp()
        self.instance = KolibriInstance(MOCK_ID, ip=MOCK_INTERFACE_IP, port=MOCK_PORT)
        self.broadcast = KolibriBroadcast(instance=self.instance)
        self.listener = LocalHostnameListener(self.broadcast)

    @mock.patch(LOCAL_HOSTNAMES_MODULE + "sync_local_hostnames.enqueue")
    def test_update_local_names(self, mock_enqueue):
        hostnames = ["kolibri.local", "tonyslaptop.local"]
        self.listener.update_local_names(hostnames)
        mock_enqueue.assert_called_once_with(args=(hostnames,))
