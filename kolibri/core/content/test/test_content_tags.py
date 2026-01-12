from unittest.mock import patch

from django.template import Context
from django.template import Template
from django.test import SimpleTestCase
from django.utils.safestring import mark_safe


@patch(
    "kolibri.core.content.hooks.ContentViewerHook.html",
    return_value=mark_safe("<script>viewers</script>"),
)
class ContentViewerAssetsTagTestCase(SimpleTestCase):
    def render(self, tag):
        return Template("{% load content_tags %}{% " + tag + " %}").render(Context())

    def test_renders_the_content_viewer_scripts(self, html):
        self.assertEqual(
            self.render("content_viewer_assets"), "<script>viewers</script>"
        )

    def test_keeps_the_deprecated_name_for_overridden_templates(self, html):
        self.assertEqual(
            self.render("content_renderer_assets"), "<script>viewers</script>"
        )
