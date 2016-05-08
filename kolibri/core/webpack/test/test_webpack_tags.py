from __future__ import absolute_import, print_function, unicode_literals

import json
import tempfile

from django.test import TestCase


from ..hooks import WebpackBundleHook


TEST_STATS_FILE = None


class TestHook(WebpackBundleHook):
    unique_slug = "non_default_frontend"
    src_file = "assets/src/kolibri_core_app.js"

    @property
    def stats_file(self):
        return TEST_STATS_FILE.name


class KolibriTagNavigationTestCase(TestCase):

    def setUp(self):
        global TEST_STATS_FILE
        TestCase.setUp(self)
        TEST_STATS_FILE = tempfile.NamedTemporaryFile(mode='w+', delete=False)
        self.test_hook = TestHook()
        json.dump(
            {
                "status": "done",
                "chunks": {
                    "non_default_frontend": [
                        {
                            "name": "non_default_frontend-2c4fb3d6a29238b06f84.js",
                            "publicPath": "non_default_frontend/non_default_frontend-2c4fb3d6a29238b06f84.js",
                            "path": "kolibri/core/static/non_default_frontend/non_default_frontend-2c4fb3d6a29238b06f84.js"
                        }
                    ]
                },
                "publicPath": "default_frontend/"
            },
            TEST_STATS_FILE
        )
        TEST_STATS_FILE.close()

    def test_frontend_tag(self):
        self.assertIn(
            "non_default_frontend",
            self.test_hook.render_to_html()
        )
