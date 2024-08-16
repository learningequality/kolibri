import json
import zlib

import mock
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from requests.models import Response

from .test_utils import BaseDeviceSetupMixin


def load_zipped_json(data):
    try:
        data = zlib.decompress(data)
    except Exception:
        pass
    return json.loads(data)


def mocked_network_client_post_wrapper(json_data, status_code):
    def mocked_network_client_post(*args, **kwargs):
        class MockResponse(Response):
            def __init__(self):
                self.json_data = json_data
                self.status_code = status_code
                self._content = json.dumps(json_data).encode()
                self.reason = ""
                self.url = args[0]
                if 400 <= self.status_code < 600:
                    self.raise_for_status()

            def json(self):
                return self.json_data

        return MockResponse()

    return mocked_network_client_post


class PingCommandTestCase(BaseDeviceSetupMixin, TestCase):
    @mock.patch(
        "kolibri.core.discovery.utils.network.client.NetworkClient.post",
        side_effect=mocked_network_client_post_wrapper({"id": 17}, 200),
    )
    def test_ping_succeeds(self, post_mock):
        call_command("ping", once=True)
        assert len(post_mock.call_args_list) == 2
        assert post_mock.call_args_list[0][0][0].endswith("/pingback")
        assert post_mock.call_args_list[1][0][0].endswith("/statistics")
        assert load_zipped_json(post_mock.call_args_list[1][1]["data"])["pi"] == 17

    @mock.patch(
        "kolibri.core.discovery.utils.network.client.NetworkClient.post",
        side_effect=mocked_network_client_post_wrapper({}, 400),
    )
    def test_ping_fails(self, post_mock):
        with self.assertRaises(CommandError):
            call_command("ping", once=True)
        assert len(post_mock.call_args_list) == 1
        assert post_mock.call_args_list[0][0][0].endswith("/pingback")
