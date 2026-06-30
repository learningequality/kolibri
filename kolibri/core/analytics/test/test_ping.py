import json
import zlib
from datetime import timedelta

import mock
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from requests.models import Response

from kolibri.core.analytics.tasks import _ping
from kolibri.core.analytics.tasks import DEFAULT_PING_CHECKRATE
from kolibri.core.analytics.tasks import DEFAULT_SERVER_URL
from kolibri.core.analytics.tasks import PingAtStartup
from kolibri.utils import conf

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


DEFAULT_PING_INTERVAL_SECONDS = 24 * 60 * 60


class PingTaskTestCase(TestCase):
    def test_ping_at_startup_apply_stamps_started(self):
        fake_now_str = "2026-01-01T00:00:00+00:00"
        task = mock.MagicMock()
        schedule = PingAtStartup(
            timedelta(0),
            interval=DEFAULT_PING_INTERVAL_SECONDS,
            repeat=None,
            retry_interval=DEFAULT_PING_CHECKRATE * 60,
        )
        with mock.patch("kolibri.core.analytics.tasks.local_now") as mock_local_now:
            mock_local_now.return_value.isoformat.return_value = fake_now_str
            schedule.apply(task)
        task.enqueue_in.assert_called_once()
        _, call_kwargs = task.enqueue_in.call_args
        assert call_kwargs["kwargs"]["started"] == fake_now_str

    @mock.patch("kolibri.core.analytics.tasks.ping_once")
    @mock.patch("kolibri.core.analytics.tasks.get_current_job")
    def test_ping_disabled_stops_repeating(self, mock_get_job, mock_ping_once):
        with mock.patch.dict(conf.OPTIONS["Deployment"], {"DISABLE_PING": True}):
            _ping("t", DEFAULT_SERVER_URL, DEFAULT_PING_CHECKRATE)
        mock_get_job.return_value.stop_repeating.assert_called_once()
        mock_ping_once.assert_not_called()

    @mock.patch("kolibri.core.analytics.tasks.ping_once")
    @mock.patch("kolibri.core.analytics.tasks.get_current_job")
    def test_ping_enabled_calls_ping_once(self, mock_get_job, mock_ping_once):
        with mock.patch.dict(conf.OPTIONS["Deployment"], {"DISABLE_PING": False}):
            _ping("t", DEFAULT_SERVER_URL, DEFAULT_PING_CHECKRATE)
        mock_get_job.return_value.stop_repeating.assert_not_called()
        mock_ping_once.assert_called_once()


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
