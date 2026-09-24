import json
import os

from django.test import SimpleTestCase

from kolibri.core.content.zip_wsgi import INITIALIZE_SANDBOX_FROM_IFRAME

PLUGIN_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BUILD_DIR = os.path.join(PLUGIN_DIR, "h5p_build")

TEMPLATE = os.path.join(BUILD_DIR, "h5p.html")

BUILD_MANIFEST = os.path.join(BUILD_DIR, "h5p_build.json")


class H5PTemplateTestCase(SimpleTestCase):
    def test_template_bootstraps_the_sandbox(self):
        """
        The H5P host page is served from the sandbox origin rather than through
        zip_wsgi, so nothing injects the script for it at request time.
        """
        with open(TEMPLATE) as f:
            self.assertIn(INITIALIZE_SANDBOX_FROM_IFRAME, f.read())

    def test_built_page_bootstraps_the_sandbox(self):
        """
        The built page is committed and never re-derived at install time, so it can
        drift from the template - build-h5p needs network access to re-run.
        """
        with open(BUILD_MANIFEST) as f:
            filename = json.load(f)["filename"]
        with open(os.path.join(PLUGIN_DIR, "static", "h5p", filename)) as f:
            page = f.read()
        self.assertIn("window.parent.sandbox.initializeIframe(window)", page)
