import os

from django.conf import settings
from django.test import TestCase
from le_utils.constants import format_presets
from mock import MagicMock
from mock import patch

from kolibri.core.content.hooks import SandboxedContentViewerHook
from kolibri.core.content.utils.paths import zip_content_static_root
from kolibri.core.webpack.hooks import WebpackError


class SandboxHook(SandboxedContentViewerHook):
    # register_hook sets this; hooks defined outside a kolibri_plugin module
    # cannot be registered, so mark it concrete directly.
    _not_abstract = True

    bundle_id = "main"
    sandbox_handler_id = "sandbox_handler"
    presets = (format_presets.HTML5_ZIP,)
    css_selectors = ("iframe[data-sandbox]",)


class SandboxedContentViewerHookTestCase(TestCase):
    def setUp(self):
        self.hook = SandboxHook()

    def test_sandbox_handler_unique_id_namespaces_the_bundle(self):
        self.assertEqual(
            self.hook.sandbox_handler_unique_id,
            "kolibri.core.content.test.sandbox_handler",
        )

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
        with self.assertRaises(WebpackError):
            self.hook._get_sandbox_handler_stats()

    def _patch_stats_file(self, contents):
        stats_file = MagicMock()
        stats_file.joinpath.return_value = stats_file
        stats_file.read_text.return_value = contents
        return (
            patch("kolibri.core.content.hooks.files", return_value=stats_file),
            stats_file,
        )

    def test_stats_file_read_once_outside_developer_mode(self):
        patcher, stats_file = self._patch_stats_file('{"chunks": {}}')
        with patcher, self.settings(DEVELOPER_MODE=False):
            self.hook._get_sandbox_handler_stats()
            self.hook._get_sandbox_handler_stats()

        stats_file.read_text.assert_called_once()

    def test_stats_file_reread_in_developer_mode(self):
        patcher, stats_file = self._patch_stats_file('{"chunks": {}}')
        with patcher, self.settings(DEVELOPER_MODE=True):
            self.hook._get_sandbox_handler_stats()
            self.hook._get_sandbox_handler_stats()

        self.assertEqual(stats_file.read_text.call_count, 2)

    def test_sandbox_handler_url_is_none_without_a_js_chunk(self):
        with patch.object(
            SandboxHook, "_get_sandbox_handler_stats", return_value={"chunks": {}}
        ):
            self.assertIsNone(self.hook.sandbox_handler_url)

    def test_sandbox_handler_url_served_from_zip_content_origin(self):
        # The handler <script> loads inside the sandbox iframe, which is served
        # from the alternate (zip content) origin, so the URL must live under
        # that origin's static root — not the main-origin STATIC_URL, which
        # 404s when resolved against the iframe's origin.
        stats = {
            "chunks": {
                self.hook.sandbox_handler_unique_id: [{"name": "handler.js"}],
            }
        }
        with patch.object(
            SandboxHook, "_get_sandbox_handler_stats", return_value=stats
        ):
            url = self.hook.sandbox_handler_url

        self.assertTrue(url.startswith(zip_content_static_root()))
        self.assertFalse(url.startswith(settings.STATIC_URL))
        self.assertTrue(
            url.endswith("kolibri.core.content.test.sandbox_handler/handler.js")
        )

    def test_sandbox_handler_url_prefers_public_path_in_developer_mode(self):
        stats = {
            "chunks": {
                self.hook.sandbox_handler_unique_id: [
                    {"name": "handler.js", "publicPath": "http://localhost:3000/x.js"}
                ],
            }
        }
        with patch.object(
            SandboxHook, "_get_sandbox_handler_stats", return_value=stats
        ):
            with self.settings(DEVELOPER_MODE=True):
                self.assertEqual(
                    self.hook.sandbox_handler_url, "http://localhost:3000/x.js"
                )

    def test_viewer_data_adds_the_handler_url_to_the_base_payload(self):
        stats = {
            "chunks": {
                self.hook.sandbox_handler_unique_id: [{"name": "handler.js"}],
            }
        }
        with patch.object(
            SandboxHook, "_get_sandbox_handler_stats", return_value=stats
        ), patch.object(SandboxHook, "bundle", [{"url": "/main.js"}]):
            data = self.hook.viewer_data

        self.assertEqual(data["urls"], ["/main.js"])
        self.assertEqual(data["presets"], (format_presets.HTML5_ZIP,))
        self.assertEqual(data["css_selectors"], ("iframe[data-sandbox]",))
        self.assertTrue(data["sandboxHandlerUrl"].endswith("handler.js"))

    def test_viewer_data_omits_the_handler_url_without_a_js_chunk(self):
        with patch.object(
            SandboxHook, "_get_sandbox_handler_stats", return_value={"chunks": {}}
        ), patch.object(SandboxHook, "bundle", [{"url": "/main.js"}]):
            data = self.hook.viewer_data

        self.assertNotIn("sandboxHandlerUrl", data)
        self.assertEqual(data["css_selectors"], ("iframe[data-sandbox]",))

    def test_sandbox_handler_url_ignores_auto_public_path(self):
        stats = {
            "chunks": {
                self.hook.sandbox_handler_unique_id: [
                    {"name": "handler.js", "publicPath": "auto"}
                ],
            }
        }
        with patch.object(
            SandboxHook, "_get_sandbox_handler_stats", return_value=stats
        ):
            with self.settings(DEVELOPER_MODE=True):
                url = self.hook.sandbox_handler_url

        self.assertTrue(
            url.endswith("kolibri.core.content.test.sandbox_handler/handler.js")
        )
