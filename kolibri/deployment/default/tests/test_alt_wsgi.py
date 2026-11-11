import os
import uuid
from unittest.mock import patch
from wsgiref.util import setup_testing_defaults

from django.test import TestCase

from kolibri.core.kolibri_plugin import FrontEndCoreAppAssetHook
from kolibri.core.kolibri_plugin import FrontEndPolyfillAssetHook
from kolibri.deployment.default.alt_wsgi import alt_application

POLYFILLS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "core",
    "static",
    "kolibri.core.polyfills",
)


class AltWsgiSandboxPolyfillTestCase(TestCase):
    def setUp(self):
        self.name = f"polyfills-{uuid.uuid4().hex}.js"
        if not os.path.isdir(POLYFILLS_DIR):
            os.makedirs(POLYFILLS_DIR)
            self.addCleanup(os.rmdir, POLYFILLS_DIR)
        path = os.path.join(POLYFILLS_DIR, self.name)
        with open(path, "w") as f:
            f.write("/* polyfills */")
        self.addCleanup(os.remove, path)

    def _drop_cached_stats(self, hook):
        if hasattr(hook, "_cached_stats_file_content"):
            del hook._cached_stats_file_content

    def _get(self, path):
        environ = {}
        setup_testing_defaults(environ)
        environ["PATH_INFO"] = path
        statuses = []
        list(alt_application(environ, lambda status, *args: statuses.append(status)))
        return statuses[0]

    def test_serves_the_bundle_at_the_sandbox_polyfill_url(self):
        polyfills = FrontEndPolyfillAssetHook()
        self._drop_cached_stats(polyfills)
        self.addCleanup(self._drop_cached_stats, polyfills)
        stats = {
            "status": "done",
            "chunks": {
                polyfills.unique_id: [{"name": f"{self.name}.map"}, {"name": self.name}]
            },
        }
        with patch.object(
            FrontEndPolyfillAssetHook, "get_stats", return_value=stats
        ), patch(
            "kolibri.core.kolibri_plugin.get_sandbox_path",
            return_value="/sandbox.html",
        ):
            url = FrontEndCoreAppAssetHook().plugin_data["urls"]["__sandboxPolyfillUrl"]

        self.assertEqual(self._get(url), "200 OK")
