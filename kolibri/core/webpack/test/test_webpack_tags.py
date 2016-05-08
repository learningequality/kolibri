from __future__ import absolute_import, print_function, unicode_literals
from django.test import TestCase


from ..hooks import WebpackBundleHook


class TestHook(WebpackBundleHook):
    unique_slug = "non_default_frontend"
    entry_file = "assets/src/kolibri_core_app.js"


class KolibriTagNavigationTestCase(TestCase):

    def test_frontend_tag(self):
        self.assertIn(
            "non_default_frontend",
            TestHook().render_to_html()
        )
