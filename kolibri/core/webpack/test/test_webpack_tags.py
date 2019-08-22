from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.test.testcases import TestCase

from .base import TestHook


class KolibriTagNavigationTestCase(TestCase):
    def setUp(self):
        super(KolibriTagNavigationTestCase, self).setUp()
        self.test_hook = TestHook()

    def test_frontend_tag(self):
        self.assertIn(
            "non_default_frontend", self.test_hook.render_to_page_load_sync_html()
        )
