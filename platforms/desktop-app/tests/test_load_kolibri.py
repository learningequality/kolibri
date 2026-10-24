import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock
from unittest.mock import patch
from urllib.parse import parse_qs
from urllib.parse import urlsplit

from wx import html2

from kolibri_app import application
from kolibri_app.application import KolibriApp
from kolibri_app.webview_location import LastPage

ORIGIN = "http://127.0.0.1:46655"
ROOT_URL = f"{ORIGIN}/app/api/initialize/abc?auth_token=x"
SAVED = "/en/learn/#/topics/abc"


def _loaded_event(url):
    event = MagicMock()
    event.GetURL.return_value = url
    return event


class TestLoadKolibri(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.state_path = os.path.join(tmp.name, "app_state.json")
        with open(self.state_path, "w", encoding="utf-8") as f:
            json.dump({"location": SAVED}, f)

        patcher = patch.object(
            application.wx, "CallAfter", side_effect=lambda f, *a: f(*a)
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        html2.WebView.New.reset_mock()

        self.app = KolibriApp.__new__(KolibriApp)
        self.app.tray_only = True
        self.app.server_start_timer = None
        self.app.windows = []
        self.app.kolibri_url = None
        self.app.last_page = LastPage(self.state_path)

    def _webview(self):
        return self.app.view.webview

    def test_next_carries_the_saved_page_without_its_fragment(self):
        self.app.load_kolibri(46655, root_url=ROOT_URL)

        query = parse_qs(urlsplit(self.app.kolibri_url).query)
        self.assertEqual(query["next"], ["/en/learn/"])

    def test_a_window_opened_later_restores_the_fragment(self):
        self.app.load_kolibri(46655, root_url=ROOT_URL)
        self.app.show_or_create_ui()

        self.app.view.OnLoadComplete(_loaded_event(f"{ORIGIN}/en/learn/"))

        [script], _kwargs = self._webview().RunScriptAsync.call_args
        self.assertIn(f"location.replace({json.dumps(ORIGIN + SAVED)})", script)

    def test_an_open_window_restores_the_fragment(self):
        self.app.create_kolibri_window(url=f"{ORIGIN}/en/")
        self.app.load_kolibri(46655, root_url=ROOT_URL)

        self.app.view.OnLoadComplete(_loaded_event(f"{ORIGIN}/en/learn/"))

        [script], _kwargs = self._webview().RunScriptAsync.call_args
        self.assertIn(f"location.replace({json.dumps(ORIGIN + SAVED)})", script)


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
