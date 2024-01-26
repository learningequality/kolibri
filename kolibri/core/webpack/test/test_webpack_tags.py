from django.test.testcases import TestCase

from .base import Hook
from kolibri.plugins.hooks import register_hook


class KolibriTagNavigationTestCase(TestCase):
    def setUp(self):
        super(KolibriTagNavigationTestCase, self).setUp()
        Hook.__module__ = "test.kolibri_plugin"
        self.test_hook = register_hook(Hook)()

    def test_frontend_tag(self):
        self.assertIn(
            "non_default_frontend", self.test_hook.render_to_page_load_sync_html()
        )
