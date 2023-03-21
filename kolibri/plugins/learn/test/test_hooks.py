import mock
import pytest
from django.test import TestCase

from ..kolibri_plugin import _learner_ids
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.discovery.hooks import NetworkLocationDiscoveryHook
from kolibri.core.discovery.models import NetworkLocation


@pytest.mark.django_db(transaction=True)
def test_learner_ids():
    facility = Facility.objects.create()
    create_superuser(facility)
    user1 = FacilityUser.objects.create(username="buster.0", facility=facility)
    user2 = FacilityUser.objects.create(username="buster.1", facility=facility)
    user_ids = list(_learner_ids())
    assert user1.pk in user_ids
    assert user2.pk in user_ids


@mock.patch(
    "kolibri.plugins.learn.kolibri_plugin._learner_ids", return_value=["abc123"]
)
class NetworkDiscoveryForSoUDHookTestCase(TestCase):
    def setUp(self):
        super(NetworkDiscoveryForSoUDHookTestCase, self).setUp()
        self.hook = NetworkLocationDiscoveryHook.get_hook(
            "kolibri.plugins.learn.NetworkDiscoveryForSoUDHook"
        )
        self.mock_location = mock.MagicMock(spec=NetworkLocation())
        begin_patcher = mock.patch("kolibri.core.auth.tasks.begin_request_soud_sync")
        self.mock_begin = begin_patcher.start()
        self.addCleanup(begin_patcher.stop)
        stop_patcher = mock.patch("kolibri.core.auth.tasks.stop_request_soud_sync")
        self.mock_stop = stop_patcher.start()
        self.addCleanup(stop_patcher.stop)
        get_setting_patcher = mock.patch(
            "kolibri.plugins.learn.kolibri_plugin.get_device_setting"
        )
        self.mock_get_setting = get_setting_patcher.start()
        self.mock_get_setting.return_value = True
        self.addCleanup(get_setting_patcher.stop)

    def test_on_connect__location_is_soud(self, _):
        self.mock_location.subset_of_users_device = True
        self.hook.on_connect(self.mock_location)
        self.mock_begin.assert_not_called()
        self.mock_stop.assert_not_called()

    def test_on_connect__location_is_not_soud(self, _):
        self.mock_location.subset_of_users_device = False
        self.hook.on_connect(self.mock_location)
        self.mock_begin.assert_called_once_with(self.mock_location.base_url, "abc123")
        self.mock_stop.assert_not_called()

    def test_on_connect__self_not_soud__location_not_soud(self, _):
        self.mock_get_setting.return_value = False
        self.mock_location.subset_of_users_device = False
        self.hook.on_connect(self.mock_location)
        self.mock_begin.assert_not_called()
        self.mock_stop.assert_not_called()

    def test_on_connect__self_not_soud__location_is_soud(self, _):
        self.mock_get_setting.return_value = False
        self.mock_location.subset_of_users_device = True
        self.hook.on_connect(self.mock_location)
        self.mock_begin.assert_not_called()
        self.mock_stop.assert_not_called()

    def test_on_disconnect__location_is_soud(self, _):
        self.mock_location.subset_of_users_device = True
        self.hook.on_disconnect(self.mock_location)
        self.mock_begin.assert_not_called()
        self.mock_stop.assert_not_called()

    def test_on_disconnect__location_is_not_soud(self, _):
        self.mock_location.subset_of_users_device = False
        self.hook.on_disconnect(self.mock_location)
        self.mock_begin.assert_not_called()
        self.mock_stop.assert_called_once_with(self.mock_location.base_url, "abc123")

    def test_on_disconnect__self_not_soud__location_not_soud(self, _):
        self.mock_get_setting.return_value = False
        self.mock_location.subset_of_users_device = False
        self.hook.on_disconnect(self.mock_location)
        self.mock_begin.assert_not_called()
        self.mock_stop.assert_not_called()

    def test_on_disconnect__self_not_soud__location_is_soud(self, _):
        self.mock_get_setting.return_value = False
        self.mock_location.subset_of_users_device = True
        self.hook.on_disconnect(self.mock_location)
        self.mock_begin.assert_not_called()
        self.mock_stop.assert_not_called()
