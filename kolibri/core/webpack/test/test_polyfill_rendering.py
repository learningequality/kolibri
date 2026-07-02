from unittest.mock import patch
from unittest.mock import PropertyMock

from django.test import TestCase

from kolibri.core.kolibri_plugin import FrontEndCoreAppAssetHook
from kolibri.core.kolibri_plugin import FrontEndPolyfillAssetHook
from kolibri.core.kolibri_plugin import FrontEndPolyfillLoaderHook

LOADER_TAG = (
    '<script type="text/javascript" src="/static/polyfill_loader-def.js"'
    ' data-polyfill-url="/static/polyfills-abc.js"></script>'
)

CORE_CHUNK = {
    "name": "default_frontend-xyz.js",
    "url": "/static/default_frontend-xyz.js",
}


class TestPolyfillLoaderTagFormat(TestCase):
    """_polyfill_loader_tag() must build the script tag with the correct attributes."""

    def test_tag_contains_loader_src_and_polyfill_data_attr(self):
        hook = FrontEndCoreAppAssetHook()

        with patch.object(
            FrontEndPolyfillAssetHook,
            "bundle",
            new_callable=PropertyMock,
            return_value=[
                {"name": "polyfills-abc.js", "url": "/static/polyfills-abc.js"}
            ],
        ), patch.object(
            FrontEndPolyfillLoaderHook,
            "bundle",
            new_callable=PropertyMock,
            return_value=[
                {
                    "name": "polyfill_loader-def.js",
                    "url": "/static/polyfill_loader-def.js",
                }
            ],
        ):
            tag = hook._polyfill_loader_tag()

        self.assertIn('src="/static/polyfill_loader-def.js"', tag)
        self.assertIn('data-polyfill-url="/static/polyfills-abc.js"', tag)
        self.assertNotIn("async", tag)
        self.assertNotIn("defer", tag)


class TestPolyfillLoaderTagRendering(TestCase):
    """render_to_page_load_sync_html must emit the loader tag before core JS."""

    def _render(self):
        hook = FrontEndCoreAppAssetHook()
        with patch.object(
            hook, "_polyfill_loader_tag", return_value=LOADER_TAG
        ), patch.object(hook, "plugin_data_tag", return_value=[]), patch.object(
            hook, "navigation_tags", return_value=[]
        ), patch.object(
            type(hook),
            "bundle",
            new_callable=PropertyMock,
            return_value=[CORE_CHUNK],
        ):
            return hook.render_to_page_load_sync_html()

    def test_loader_tag_included_in_output(self):
        html = self._render()
        self.assertIn("data-polyfill-url=", html)
        self.assertIn("/static/polyfills-abc.js", html)

    def test_loader_tag_precedes_core_bundle_tag(self):
        html = self._render()
        loader_pos = html.find("polyfill_loader-def.js")
        core_pos = html.find("default_frontend-xyz.js")
        self.assertGreater(loader_pos, -1, "loader URL missing from output")
        self.assertGreater(core_pos, -1, "core bundle URL missing from output")
        self.assertLess(loader_pos, core_pos)
