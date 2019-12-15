from django.test import TestCase
from mock import patch

from ..utils.network.connections import check_connection_info
from ..utils.network.connections import FAILED_TO_CONNECT
from ..utils.network.connections import INVALID_DEVICE_INFO
from .helpers import info as VALID_DEVICE_INFO

FAKE_KOLIBRI_ONLINE = "http://fake_kolibri_online:80/"
FAKE_KOLIBRI_OFFLINE = "http://fake_kolibri_offline:80/"
REAL_KOLIBRI_ONLINE = "http://real_kolibri_online:80/"
REAL_KOLIBRI_OFFLINE = "http://real_kolibri_offline:80/"


def mock_check_device_info_function(url):
    if url.startswith(FAKE_KOLIBRI_ONLINE):
        return INVALID_DEVICE_INFO
    elif url.startswith(FAKE_KOLIBRI_OFFLINE):
        return FAILED_TO_CONNECT
    elif url.startswith(REAL_KOLIBRI_ONLINE):
        return VALID_DEVICE_INFO
    elif url.startswith(REAL_KOLIBRI_OFFLINE):
        return FAILED_TO_CONNECT


def mock_check_if_port_open_function(url):
    if url.startswith(FAKE_KOLIBRI_ONLINE):
        return True
    elif url.startswith(FAKE_KOLIBRI_OFFLINE):
        return False
    elif url.startswith(REAL_KOLIBRI_ONLINE):
        return True
    elif url.startswith(REAL_KOLIBRI_OFFLINE):
        return False


class MockCache:
    def __init__(self, default):
        self.default = default
        self.cache = dict()

    def get(self, k):
        return self.cache.get(k) or self.default

    def set(self, k, v):
        self.cache[k] = v


mock_check_device_info = (
    "kolibri.core.discovery.utils.network.connections.check_device_info"
)
mock_check_if_port_open = (
    "kolibri.core.discovery.utils.network.connections.check_if_port_open"
)

mock_device_info_cache = (
    "kolibri.core.discovery.utils.network.connections.device_info_cache"
)
mock_device_port_open_cache = (
    "kolibri.core.discovery.utils.network.connections.device_port_open_cache"
)


class TestCheckConnection(TestCase):
    @patch(mock_device_info_cache, MockCache(None))
    @patch(mock_device_port_open_cache, MockCache(None))
    @patch(mock_check_device_info, mock_check_device_info_function)
    @patch(mock_check_if_port_open, mock_check_if_port_open_function)
    def test_check_with_no_previous_information(self):
        self.assertFalse(check_connection_info(FAKE_KOLIBRI_ONLINE))
        self.assertFalse(check_connection_info(FAKE_KOLIBRI_OFFLINE))
        self.assertEqual(check_connection_info(REAL_KOLIBRI_ONLINE), VALID_DEVICE_INFO)
        self.assertFalse(check_connection_info(REAL_KOLIBRI_OFFLINE))

    @patch(mock_device_info_cache, MockCache(VALID_DEVICE_INFO))
    @patch(mock_device_port_open_cache, MockCache(True))
    @patch(mock_check_device_info)
    @patch(mock_check_if_port_open)
    def test_real_kolibri_again_after_recently_checking(
        self, mock_check_if_port_open, mock_check_device_info
    ):
        self.assertEqual(check_connection_info(REAL_KOLIBRI_ONLINE), VALID_DEVICE_INFO)
        mock_check_if_port_open.assert_not_called()
        mock_check_device_info.assert_not_called()

    @patch(mock_device_info_cache, MockCache(INVALID_DEVICE_INFO))
    @patch(mock_device_port_open_cache, MockCache(True))
    @patch(mock_check_device_info)
    @patch(mock_check_if_port_open)
    def test_fake_kolibri_online(self, mock_check_if_port_open, mock_check_device_info):
        self.assertFalse(check_connection_info(FAKE_KOLIBRI_ONLINE))
        mock_check_if_port_open.assert_not_called()
        mock_check_device_info.assert_not_called()

    @patch(mock_device_info_cache, MockCache(VALID_DEVICE_INFO))
    @patch(mock_device_port_open_cache, MockCache(None))
    @patch(mock_check_device_info, return_value=VALID_DEVICE_INFO)
    @patch(mock_check_if_port_open)
    def test_real_kolibri_online_but_its_been_a_little_while(
        self, mock_check_if_port_open, mock_check_device_info
    ):
        self.assertEqual(check_connection_info(REAL_KOLIBRI_ONLINE), VALID_DEVICE_INFO)
        mock_check_if_port_open.assert_called_once()
        mock_check_device_info.assert_not_called()

    @patch(mock_device_info_cache, MockCache(VALID_DEVICE_INFO))
    @patch(mock_device_port_open_cache, MockCache(False))
    @patch(mock_check_device_info)
    @patch(mock_check_if_port_open, return_value=False)
    def test_real_kolibri_recently_went_offline(
        self, mock_check_if_port_open, mock_check_device_info
    ):
        self.assertFalse(check_connection_info(REAL_KOLIBRI_OFFLINE))
        mock_check_if_port_open.assert_called()
        mock_check_device_info.assert_not_called()

    @patch(mock_device_info_cache, MockCache(FAILED_TO_CONNECT))
    @patch(mock_device_port_open_cache, MockCache(None))
    @patch(mock_check_device_info, return_value=VALID_DEVICE_INFO)
    @patch(mock_check_if_port_open, return_value=True)
    def test_previously_checked_offline_kolibri_instance_just_came_online(
        self, mock_check_if_port_open, mock_check_device_info
    ):
        self.assertEqual(check_connection_info(REAL_KOLIBRI_ONLINE), VALID_DEVICE_INFO)
        mock_check_if_port_open.assert_called_once()
        mock_check_device_info.assert_called()
