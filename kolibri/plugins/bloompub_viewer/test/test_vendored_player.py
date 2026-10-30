import os
import re

from django.test import SimpleTestCase

from kolibri.core.content.zip_wsgi import INITIALIZE_SANDBOX_FROM_IFRAME

PLUGIN_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TEMPLATE = os.path.join(PLUGIN_DIR, "bloom_build", "bloomplayer.htm")

STATIC_DIR = os.path.join(PLUGIN_DIR, "static", "bloom")

PLAYER = os.path.join(STATIC_DIR, "bloomplayer.htm")


def read_built_page():
    with open(PLAYER) as f:
        return f.read()


class BloomPlayerTemplateTestCase(SimpleTestCase):
    def test_template_bootstraps_the_sandbox(self):
        with open(TEMPLATE) as f:
            self.assertIn(INITIALIZE_SANDBOX_FROM_IFRAME, f.read())

    def test_built_page_bootstraps_the_sandbox(self):
        self.assertIn(INITIALIZE_SANDBOX_FROM_IFRAME, read_built_page())


class BloomPlayerBuiltFilesTestCase(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.referenced = set(re.findall(r'(?:src|href)="([^":]+)"', read_built_page()))

    def test_referenced_files_exist(self):
        missing = {
            name
            for name in self.referenced
            if not os.path.exists(os.path.join(STATIC_DIR, name))
        }
        self.assertEqual(missing, set())

    def test_no_unreferenced_files(self):
        unreferenced = {
            name
            for name in os.listdir(STATIC_DIR)
            if name != "bloomplayer.htm"
            and name not in self.referenced
            and not name.endswith((".LICENSE.txt", ".gz", ".file_size"))
        }
        self.assertEqual(unreferenced, set())

    def test_license_file_keeps_third_party_notices(self):
        (license_file,) = [
            name for name in os.listdir(STATIC_DIR) if name.endswith(".LICENSE.txt")
        ]
        with open(os.path.join(STATIC_DIR, license_file)) as f:
            self.assertIn("@license React", f.read())
