from __future__ import absolute_import, print_function, unicode_literals

from django.template import Template, Context
from django.test.testcases import TestCase

from ..hooks import WebpackBundleHook
from .base import TestHookMixin


class TestHook(TestHookMixin, WebpackBundleHook):
    unique_slug = 'non_default_frontend'


class KolibriTagNavigationTestCase(TestCase):

    def setUp(self):
        super(KolibriTagNavigationTestCase, self).setUp()
        self.test_hook = TestHook()

    def test_frontend_tag(self):
        self.assertIn(
            "non_default_frontend",
            self.test_hook.render_to_page_load_sync_html()
        )

    def test_frontend_tag_in_template(self):
        t = Template(
            """{% load webpack_tags %}\n{% webpack_asset 'non_default_frontend' %}""")
        c = Context({})
        self.test_hook.stats_file
        self.assertIn(
            self.test_hook.TEST_STATS_FILE_DATA['chunks'][TestHook.unique_slug][0]['name'],
            t.render(c)
        )
