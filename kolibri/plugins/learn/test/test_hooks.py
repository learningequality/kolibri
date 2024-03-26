import mock
from django.test import TestCase

from kolibri.core.discovery.hooks import NetworkLocationDiscoveryHook
from kolibri.core.discovery.models import NetworkLocation


class NetworkDiscoveryForSoUDHookTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        super(NetworkDiscoveryForSoUDHookTestCase, self).setUp()
        self.hook = NetworkLocationDiscoveryHook.get_hook(
            "kolibri.plugins.learn.NetworkDiscoveryForSoUDHook"
        )
        self.mock_location = mock.MagicMock(spec=NetworkLocation())
        self.mock_location.is_kolibri = True
        begin_patcher = mock.patch("kolibri.core.device.soud.request_sync_hook")
        self.mock_begin = begin_patcher.start()
        self.addCleanup(begin_patcher.stop)
        get_setting_patcher = mock.patch(
            "kolibri.plugins.learn.kolibri_plugin.get_device_setting"
        )
        self.mock_get_setting = get_setting_patcher.start()
        self.mock_get_setting.return_value = True
        self.addCleanup(get_setting_patcher.stop)

    def test_on_connect__location_is_soud(self):
        self.mock_location.subset_of_users_device = True
        self.hook.on_connect(self.mock_location)
        self.mock_begin.assert_not_called()

    def test_on_connect__location_is_not_soud(self):
        self.mock_location.subset_of_users_device = False
        self.hook.on_connect(self.mock_location)
        self.mock_begin.assert_called_once_with(self.mock_location)

    def test_on_connect__location_is_not_soud__but_not_kolibri(self):
        self.mock_location.subset_of_users_device = False
        self.mock_location.is_kolibri = False
        self.hook.on_connect(self.mock_location)
        self.mock_begin.assert_not_called()

    def test_on_connect__self_not_soud__location_not_soud(self):
        self.mock_get_setting.return_value = False
        self.mock_location.subset_of_users_device = False
        self.hook.on_connect(self.mock_location)
        self.mock_begin.assert_not_called()

    def test_on_connect__self_not_soud__location_is_soud(self):
        self.mock_get_setting.return_value = False
        self.mock_location.subset_of_users_device = True
        self.hook.on_connect(self.mock_location)
        self.mock_begin.assert_not_called()
