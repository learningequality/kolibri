import os
from unittest.mock import patch

from django.conf import settings
from django.test import TestCase
from le_utils.constants import format_presets

from kolibri.core.content.hooks import SandboxedContentViewerHook
from kolibri.core.content.utils.paths import zip_content_static_root
from kolibri.core.webpack.hooks import WebpackError

HANDLER_ID = "kolibri.core.content.test.sandbox_handler"


class SandboxHook(SandboxedContentViewerHook):
    # register_hook sets this; hooks defined outside a kolibri_plugin module
    # cannot be registered, so mark it concrete directly.
    _not_abstract = True

    bundle_id = "main"
    presets = (format_presets.HTML5_ZIP,)
    css_selectors = ("iframe[data-sandbox]",)


def _stats(*chunks, status="done"):
    return {"status": status, "chunks": {HANDLER_ID: list(chunks)}}


class SandboxedContentViewerHookTestCase(TestCase):
    def setUp(self):
        # define_hook makes hook classes singletons, so the URL cached by one test
        # is still on the instance the next one gets.
        self.hook = SandboxHook()
        if hasattr(self.hook, "_cached_sandbox_handler_url"):
            del self.hook._cached_sandbox_handler_url

    def _patch_stats(self, *results):
        return patch.object(SandboxHook, "get_stats", side_effect=list(results))

    def test_sandbox_static_path_is_the_module_static_dir(self):
        self.assertEqual(
            self.hook.sandbox_static_path,
            os.path.join(os.path.dirname(__file__), "static"),
        )

    def test_get_sandbox_static_paths_puts_core_first(self):
        with patch.object(
            SandboxedContentViewerHook,
            "_registered_hooks",
            {self.hook.unique_id: self.hook},
        ):
            paths = SandboxedContentViewerHook.get_sandbox_static_paths()

        self.assertEqual(len(paths), 2)
        self.assertTrue(paths[0].endswith(os.path.join("content", "static")))
        self.assertEqual(paths[1], self.hook.sandbox_static_path)

    def test_missing_stats_file_raises(self):
        with self._patch_stats(WebpackError("missing")), self.assertRaises(
            WebpackError
        ):
            _ = self.hook.sandbox_handler_url

    def test_stats_read_once_outside_developer_mode(self):
        with self._patch_stats(_stats({"name": "handler.js"})) as get_stats:
            with self.settings(DEVELOPER_MODE=False):
                first = self.hook.sandbox_handler_url
                second = self.hook.sandbox_handler_url

        self.assertEqual(first, second)
        self.assertEqual(get_stats.call_count, 1)

    def test_stats_reread_in_developer_mode(self):
        with self._patch_stats(
            _stats({"name": "handler.js"}), _stats({"name": "handler.js"})
        ) as get_stats:
            with self.settings(DEVELOPER_MODE=True):
                _ = self.hook.sandbox_handler_url
                _ = self.hook.sandbox_handler_url

        self.assertEqual(get_stats.call_count, 2)

    def test_handler_url_waits_for_an_in_progress_compile(self):
        with self._patch_stats(
            {"status": "compile"}, _stats({"name": "handler.js"})
        ), self.settings(DEVELOPER_MODE=True):
            url = self.hook.sandbox_handler_url

        self.assertTrue(url.endswith(f"{HANDLER_ID}/handler.js"))

    def test_handler_url_raises_on_a_failed_compile(self):
        with self._patch_stats(_stats(status="error")), self.settings(
            DEVELOPER_MODE=True
        ):
            with self.assertRaises(WebpackError):
                _ = self.hook.sandbox_handler_url

    def test_sandbox_handler_url_served_from_zip_content_origin(self):
        # The handler <script> loads inside the sandbox iframe, which is served
        # from the alternate (zip content) origin, so the URL must live under
        # that origin's static root — not the main-origin STATIC_URL, which
        # 404s when resolved against the iframe's origin.
        with self._patch_stats(
            _stats({"name": "handler.js.map"}, {"name": "handler.js"})
        ):
            url = self.hook.sandbox_handler_url

        self.assertTrue(url.startswith(zip_content_static_root()))
        self.assertFalse(url.startswith(settings.STATIC_URL))
        self.assertTrue(url.endswith(f"{HANDLER_ID}/handler.js"))

    def test_sandbox_handler_url_prefers_public_path_in_developer_mode(self):
        chunk = {"name": "handler.js", "publicPath": "http://localhost:3000/x.js"}
        with self._patch_stats(_stats(chunk)), self.settings(DEVELOPER_MODE=True):
            self.assertEqual(
                self.hook.sandbox_handler_url, "http://localhost:3000/x.js"
            )

    def test_sandbox_handler_url_ignores_public_path_outside_developer_mode(self):
        chunk = {"name": "handler.js", "publicPath": "http://localhost:3000/x.js"}
        with self._patch_stats(_stats(chunk)), self.settings(DEVELOPER_MODE=False):
            url = self.hook.sandbox_handler_url

        self.assertTrue(url.startswith(zip_content_static_root()))
        self.assertTrue(url.endswith(f"{HANDLER_ID}/handler.js"))

    def test_sandbox_handler_url_ignores_auto_public_path(self):
        chunk = {"name": "handler.js", "publicPath": "auto"}
        with self._patch_stats(_stats(chunk)), self.settings(DEVELOPER_MODE=True):
            url = self.hook.sandbox_handler_url

        self.assertTrue(url.endswith(f"{HANDLER_ID}/handler.js"))

    def test_viewer_data_omits_the_handler_url_without_a_js_chunk(self):
        for stats in ({"status": "done"}, _stats({"name": "handler.js.map"})):
            with self._patch_stats(stats), patch.object(
                SandboxHook, "bundle", [{"url": "/main.js"}]
            ):
                data = self.hook.viewer_data

            self.assertNotIn("sandboxHandlerUrl", data)
            self.assertEqual(data["urls"], ["/main.js"])

    def test_viewer_data_adds_the_handler_url_to_the_base_payload(self):
        with self._patch_stats(_stats({"name": "handler.js"})), patch.object(
            SandboxHook, "bundle", [{"url": "/main.js"}]
        ):
            data = self.hook.viewer_data

        self.assertEqual(data["urls"], ["/main.js"])
        self.assertEqual(data["presets"], (format_presets.HTML5_ZIP,))
        self.assertEqual(data["css_selectors"], ("iframe[data-sandbox]",))
        self.assertTrue(data["sandboxHandlerUrl"].endswith("handler.js"))
