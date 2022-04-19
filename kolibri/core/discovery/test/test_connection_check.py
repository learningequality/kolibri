from django.test import TestCase
from mock import patch

from ..utils.network.connections import check_connection_info
from ..utils.network.connections import DEVICE_INFO_CACHE_KEY
from ..utils.network.connections import DEVICE_PORT_CACHE_KEY
from ..utils.network.connections import FAILED_TO_CONNECT
from ..utils.network.connections import INVALID_DEVICE_INFO
from .helpers import info as VALID_DEVICE_INFO
from kolibri.core.utils.cache import process_cache

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
        self.cache = {}

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


def set_device_info_cache(url, info):
    process_cache.set(DEVICE_INFO_CACHE_KEY.format(url=url), info)


def set_device_port_cache(url, is_open):
    process_cache.set(DEVICE_PORT_CACHE_KEY.format(url=url), is_open)


class TestCheckConnection(TestCase):
    def setUp(self):
        process_cache.clear()

    @patch(mock_check_device_info, mock_check_device_info_function)
    @patch(mock_check_if_port_open, mock_check_if_port_open_function)
    def test_check_with_no_previous_information(self):
        self.assertFalse(check_connection_info(FAKE_KOLIBRI_ONLINE))
        self.assertFalse(check_connection_info(FAKE_KOLIBRI_OFFLINE))
        self.assertEqual(check_connection_info(REAL_KOLIBRI_ONLINE), VALID_DEVICE_INFO)
        self.assertFalse(check_connection_info(REAL_KOLIBRI_OFFLINE))

    @patch(mock_check_device_info)
    @patch(mock_check_if_port_open)
    def test_real_kolibri_again_after_recently_checking(
        self, mock_check_if_port_open, mock_check_device_info
    ):
        set_device_info_cache(REAL_KOLIBRI_ONLINE, VALID_DEVICE_INFO)
        set_device_port_cache(REAL_KOLIBRI_ONLINE, True)
        self.assertEqual(check_connection_info(REAL_KOLIBRI_ONLINE), VALID_DEVICE_INFO)
        mock_check_if_port_open.assert_not_called()
        mock_check_device_info.assert_not_called()

    @patch(mock_check_device_info)
    @patch(mock_check_if_port_open)
    def test_fake_kolibri_online(self, mock_check_if_port_open, mock_check_device_info):
        set_device_info_cache(FAKE_KOLIBRI_ONLINE, INVALID_DEVICE_INFO)
        set_device_port_cache(FAKE_KOLIBRI_ONLINE, True)
        self.assertFalse(check_connection_info(FAKE_KOLIBRI_ONLINE))
        mock_check_if_port_open.assert_not_called()
        mock_check_device_info.assert_not_called()

    @patch(mock_check_device_info, return_value=VALID_DEVICE_INFO)
    @patch(mock_check_if_port_open, return_value=True)
    def test_real_kolibri_online_but_its_been_a_little_while(
        self, mock_check_if_port_open, mock_check_device_info
    ):
        set_device_info_cache(REAL_KOLIBRI_ONLINE, VALID_DEVICE_INFO)
        self.assertEqual(check_connection_info(REAL_KOLIBRI_ONLINE), VALID_DEVICE_INFO)
        mock_check_if_port_open.assert_called_once()
        mock_check_device_info.assert_not_called()

    @patch(mock_check_device_info)
    @patch(mock_check_if_port_open, return_value=False)
    def test_real_kolibri_recently_went_offline(
        self, mock_check_if_port_open, mock_check_device_info
    ):
        set_device_info_cache(REAL_KOLIBRI_OFFLINE, VALID_DEVICE_INFO)
        set_device_port_cache(REAL_KOLIBRI_OFFLINE, False)
        self.assertFalse(check_connection_info(REAL_KOLIBRI_OFFLINE))
        mock_check_if_port_open.assert_called()
        mock_check_device_info.assert_not_called()

    @patch(mock_check_device_info, return_value=VALID_DEVICE_INFO)
    @patch(mock_check_if_port_open, return_value=True)
    def test_previously_checked_offline_kolibri_instance_just_came_online(
        self, mock_check_if_port_open, mock_check_device_info
    ):
        set_device_info_cache(REAL_KOLIBRI_ONLINE, FAILED_TO_CONNECT)
        self.assertEqual(check_connection_info(REAL_KOLIBRI_ONLINE), VALID_DEVICE_INFO)
        mock_check_if_port_open.assert_called_once()
        mock_check_device_info.assert_called()
