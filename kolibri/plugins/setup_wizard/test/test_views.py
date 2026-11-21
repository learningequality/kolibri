from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from kolibri.core.auth.test.helpers import clear_process_cache
from kolibri.core.test.helpers import connect_src


@patch("kolibri.core.webpack.hooks.WebpackBundleHook.get_by_unique_id")
@patch("kolibri.core.webpack.hooks.WebpackBundleHook.bundle", return_value=[])
@patch(
    "kolibri.core.content.hooks.SandboxedContentViewerHook.sandbox_handler_url",
    None,
)
class SetupWizardViewTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        clear_process_cache()

    def test_connect_src_allows_other_http_origins_and_self(self, *mocks):
        response = self.client.get(
            reverse("kolibri:kolibri.plugins.setup_wizard:setupwizard")
        )
        self.assertEqual(response.status_code, 200)
        sources = connect_src(response)
        self.assertIn("'self'", sources)
        self.assertIn("http:", sources)
