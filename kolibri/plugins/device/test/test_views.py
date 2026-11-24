from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from kolibri.core.auth.test.helpers import clear_process_cache
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.test.helpers import connect_src


@patch("kolibri.core.webpack.hooks.WebpackBundleHook.get_by_unique_id")
@patch("kolibri.core.webpack.hooks.WebpackBundleHook.bundle", return_value=[])
@patch(
    "kolibri.core.content.hooks.SandboxedContentViewerHook.sandbox_handler_url",
    None,
)
class DeviceManagementViewTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        provision_device()
        clear_process_cache()

    def test_connect_src_allows_other_http_origins_on_cold_cached_and_304(self, *mocks):
        url = reverse("kolibri:kolibri.plugins.device:device_management")
        cold = self.client.get(url)
        cached = self.client.get(url)
        not_modified = self.client.get(url, HTTP_IF_NONE_MATCH=cached["ETag"])
        self.assertEqual(
            [r.status_code for r in (cold, cached, not_modified)], [200, 200, 304]
        )
        for response in (cold, cached, not_modified):
            sources = connect_src(response)
            self.assertIn("'self'", sources)
            self.assertIn("http:", sources)

    def test_learn_page_has_no_connect_src(self, *mocks):
        response = self.client.get(reverse("kolibri:kolibri.plugins.learn:learn"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(connect_src(response), [])
