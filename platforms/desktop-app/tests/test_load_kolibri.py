import unittest
from unittest.mock import patch

from kolibri_app import application
from kolibri_app.application import KolibriApp

ORIGIN = "http://127.0.0.1:46655"


class TestServedOnLoopback(unittest.TestCase):
    def setUp(self):
        self.app = KolibriApp.__new__(KolibriApp)

    def test_kolibri_pages_load_in_the_window(self):
        with patch.object(application.webbrowser, "open") as browser_open:
            self.assertTrue(self.app.should_load_url(f"{ORIGIN}/en/learn/"))
        browser_open.assert_not_called()

    def test_other_hosts_open_in_the_browser(self):
        for url in ("http://localhost:46655/en/learn/", "https://example.org/"):
            with self.subTest(url=url):
                with patch.object(application.webbrowser, "open") as browser_open:
                    self.assertFalse(self.app.should_load_url(url))
                browser_open.assert_called_once_with(url)
