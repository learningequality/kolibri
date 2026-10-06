import json
import os
import re

from django.test import SimpleTestCase

from kolibri.core.content.zip_wsgi import INITIALIZE_SANDBOX_FROM_IFRAME

PLUGIN_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BUILD_DIR = os.path.join(PLUGIN_DIR, "h5p_build")

TEMPLATE = os.path.join(BUILD_DIR, "h5p.html")

BUILD_MANIFEST = os.path.join(BUILD_DIR, "h5p_build.json")

STATIC_DIR = os.path.join(PLUGIN_DIR, "static", "h5p")


def read_built_page():
    with open(BUILD_MANIFEST) as f:
        filename = json.load(f)["filename"]
    with open(os.path.join(STATIC_DIR, filename)) as f:
        return f.read()


def read_built_css():
    css = []
    for stylesheet in set(re.findall(r'<link href="([^"]+\.css)"', read_built_page())):
        with open(os.path.join(STATIC_DIR, stylesheet)) as f:
            css.append(f.read())
    return "".join(css)


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
        self.assertIn(
            "window.parent.sandbox.initializeIframe(window)", read_built_page()
        )


class H5PBuiltStylesTestCase(SimpleTestCase):
    """
    Upstream split fonts and theme variables into their own stylesheets, which
    the automated vendor bump does not know to import.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.css = read_built_css()

    def test_declares_the_h5p_icon_font(self):
        self.assertRegex(self.css, r"@font-face\{[^}]*font-family:h5p;")

    def test_defines_the_theme_variables(self):
        self.assertIn("--h5p-theme-main-cta-base:", self.css)

    def test_theme_font_applies_without_the_h5p_iframe_class(self):
        """
        Upstream only sets the theme font under html.h5p-iframe, which H5P adds
        to iframes it writes itself; Kolibri's externalEmbed page never has it.
        """
        self.assertRegex(
            self.css,
            r"(^|\})\.h5p-theme\{font-family:var\(--h5p-theme-font-name\)\}",
        )

    def test_referenced_files_exist(self):
        urls = re.findall(r"url\(['\"]?([^)'\"#]+)", self.css)
        missing = {
            url
            for url in urls
            if not url.startswith("data:")
            and not os.path.exists(os.path.join(STATIC_DIR, url))
        }
        self.assertEqual(missing, set())
