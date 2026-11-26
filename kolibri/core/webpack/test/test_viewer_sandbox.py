from pathlib import Path
from unittest.mock import patch

from django.http import HttpResponse
from django.test import override_settings
from django.test import RequestFactory
from django.test import SimpleTestCase
from django.utils.safestring import mark_safe

from integration_testing import viewer_sandbox
from integration_testing.viewer_sandbox.urls import urlpatterns
from kolibri.core.device.middleware import ProvisioningErrorHandler
from kolibri.core.webpack.hooks import WebpackBundleHook


@override_settings(
    ROOT_URLCONF="integration_testing.viewer_sandbox.urls",
    TEMPLATES=[
        {
            "BACKEND": "django.template.backends.django.DjangoTemplates",
            "DIRS": [Path(viewer_sandbox.__file__).resolve().parent / "templates"],
            "OPTIONS": {
                "loaders": [
                    (
                        "django.template.loaders.locmem.Loader",
                        {"kolibri/base.html": "{% block content %}{% endblock %}"},
                    ),
                    "django.template.loaders.filesystem.Loader",
                ]
            },
        }
    ],
)
class ViewerSandboxTestCase(SimpleTestCase):
    def test_translated_sandbox_bypasses_provisioning(self):
        callback = urlpatterns[0].callback
        request = RequestFactory().get("/")
        response = HttpResponse()
        middleware = ProvisioningErrorHandler(lambda request: response)
        with patch.object(callback, "translated", True, create=True):
            with patch(
                "kolibri.core.device.middleware.device_provisioned", return_value=False
            ) as provisioned:
                self.assertIs(middleware(request), response)
                provisioned.assert_not_called()

    def test_reload_uses_current_dev_asset_url(self):
        with patch.object(WebpackBundleHook, "get_by_unique_id") as get_bundle:
            render_assets = get_bundle.return_value.render_to_page_load_sync_html
            render_assets.return_value = mark_safe(
                '<script src="http://localhost:3000/viewer.js"></script>'
            )
            first = self.client.get("/")
            render_assets.return_value = mark_safe(
                '<script src="http://localhost:3011/viewer.js"></script>'
            )
            second = self.client.get("/")

        self.assertContains(first, "localhost:3000/viewer.js")
        self.assertContains(second, "localhost:3011/viewer.js")
        self.assertIn("no-store", second.headers["Cache-Control"])
