import json
import os
import re

from django.test import SimpleTestCase

from kolibri.core.content.zip_wsgi import INITIALIZE_SANDBOX_FROM_IFRAME

PLUGIN_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BUILD_DIR = os.path.join(PLUGIN_DIR, "bloom_build")

TEMPLATE = os.path.join(BUILD_DIR, "bloomplayer.htm")

BUILD_MANIFEST = os.path.join(BUILD_DIR, "bloom_build.json")

STATIC_DIR = os.path.join(PLUGIN_DIR, "static", "bloom")

HOST_FONTS = os.path.join("host", "fonts")

HOST_FONT_URL = re.compile(r'url\("\./host/fonts/([^"]+)"\)')

BLOOMLIBRARY_URL = re.compile(r"(?:https?:)?//(?:[\w-]+\.)*bloomlibrary\.org[^\"'\s)]*")

ANDIKA_FILES = {
    ("normal", "normal"): "Andika-Regular.woff2",
    ("bold", "normal"): "Andika-Bold.woff2",
    ("normal", "italic"): "Andika-Italic.woff2",
    ("bold", "italic"): "Andika-BoldItalic.woff2",
}


def built_page_name():
    with open(BUILD_MANIFEST) as f:
        return json.load(f)["filename"]


def read_built_page():
    with open(os.path.join(STATIC_DIR, built_page_name())) as f:
        return f.read()


def read_built_player():
    (player,) = [
        name
        for name in os.listdir(STATIC_DIR)
        if name.startswith("bloomPlayer-") and name.endswith(".js")
    ]
    with open(os.path.join(STATIC_DIR, player), encoding="utf-8") as f:
        return f.read()


def read_static_files():
    return {
        os.path.relpath(os.path.join(folder, name), STATIC_DIR)
        for folder, _, names in os.walk(STATIC_DIR)
        for name in names
    }


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
        cls.player = read_built_player()
        cls.static_files = read_static_files()
        cls.host_fonts = {
            os.path.join(HOST_FONTS, name) for name in HOST_FONT_URL.findall(cls.player)
        }

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
            for name in self.static_files
            if name != built_page_name()
            and name not in self.referenced
            and name not in self.host_fonts
            and name != os.path.join(HOST_FONTS, "OFL.txt")
            and not name.endswith((".LICENSE.txt", ".gz", ".file_size"))
        }
        self.assertEqual(unreferenced, set())

    def test_host_font_urls_name_shipped_files(self):
        self.assertEqual(self.host_fonts - self.static_files, set())

    def test_andika_rules_load_the_shipped_fonts(self):
        rules = {}
        for rule in re.findall(r"@font-face\s*\{([^}]*)\}", self.player):
            (family,) = re.findall(r'font-family:\s*"([^"]+)"', rule)
            if family.startswith("Andika"):
                (weight,) = re.findall(r"font-weight:\s*(\w+)", rule)
                (style,) = re.findall(r"font-style:\s*(\w+)", rule)
                rules[family, weight, style] = HOST_FONT_URL.findall(rule)
        self.assertEqual(
            rules,
            {
                (family, weight, style): [name]
                for family in ("Andika New Basic", "Andika")
                for (weight, style), name in ANDIKA_FILES.items()
            },
        )

    def test_player_has_no_bloomlibrary_urls(self):
        urls = {}
        for name in self.static_files:
            if name.endswith((".js", ".css", ".htm")):
                with open(os.path.join(STATIC_DIR, name), encoding="utf-8") as f:
                    found = BLOOMLIBRARY_URL.findall(f.read())
                if found:
                    urls[name] = found
        self.assertEqual(urls, {})

    def test_andika_ships_its_license(self):
        with open(os.path.join(STATIC_DIR, HOST_FONTS, "OFL.txt")) as f:
            license_text = f.read()
        self.assertIn("SIL OPEN FONT LICENSE Version 1.1", license_text)
        self.assertIn('Reserved Font Names "Andika"', license_text)

    def test_license_file_keeps_third_party_notices(self):
        (license_file,) = [
            name for name in os.listdir(STATIC_DIR) if name.endswith(".LICENSE.txt")
        ]
        with open(os.path.join(STATIC_DIR, license_file)) as f:
            notices = f.read()
        self.assertIn("@license React", notices)
        self.assertIn("Copyright (c) 2014 Vladimir Kharlampidi", notices)
        self.assertIn("Copyright (c) 2011-2017 SIL International", notices)
        self.assertIn("@material-ui/core ", notices)
        self.assertIn("jquery.nicescroll ", notices)
        self.assertIn("Denis Pushkarev (zloirock.ru)", notices)
