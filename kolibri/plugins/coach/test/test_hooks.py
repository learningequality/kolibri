import mock
from django.test import TestCase

from kolibri.core.discovery.hooks import NetworkLocationDiscoveryHook
from kolibri.core.discovery.models import NetworkLocation


class NetworkDiscoveryForSoUDHookTestCase(TestCase):
    def setUp(self):
        super(NetworkDiscoveryForSoUDHookTestCase, self).setUp()
        self.hook = NetworkLocationDiscoveryHook.get_hook(
            "kolibri.plugins.coach.NetworkDiscoveryForSoUDHook"
        )
        self.mock_location = mock.MagicMock(
            spec=NetworkLocation(), instance_id=("a" * 32)
        )

    @mock.patch("kolibri.core.auth.tasks.queue_soud_server_sync_cleanup")
    def test_on_disconnect__location_not_soud(self, mock_cleanup):
        self.mock_location.subset_of_users_device = False
        self.hook.on_disconnect(self.mock_location)
        mock_cleanup.assert_not_called()

    @mock.patch("kolibri.core.auth.tasks.queue_soud_server_sync_cleanup")
    def test_on_disconnect__location_is_soud(self, mock_cleanup):
        self.mock_location.subset_of_users_device = True
        self.hook.on_disconnect(self.mock_location)
        mock_cleanup.assert_called_once_with(self.mock_location.instance_id)

    @mock.patch(
        "kolibri.plugins.coach.kolibri_plugin.get_device_setting", return_value=True
    )
    @mock.patch("kolibri.core.auth.tasks.queue_soud_server_sync_cleanup")
    def test_on_disconnect__self_soud__location_not_soud(self, mock_cleanup, _):
        self.mock_location.subset_of_users_device = False
        self.hook.on_disconnect(self.mock_location)
        mock_cleanup.assert_not_called()

    @mock.patch(
        "kolibri.plugins.coach.kolibri_plugin.get_device_setting", return_value=True
    )
    @mock.patch("kolibri.core.auth.tasks.queue_soud_server_sync_cleanup")
    def test_on_disconnect__self_soud__location_is_soud(self, mock_cleanup, _):
        self.mock_location.subset_of_users_device = True
        self.hook.on_disconnect(self.mock_location)
        mock_cleanup.assert_not_called()
