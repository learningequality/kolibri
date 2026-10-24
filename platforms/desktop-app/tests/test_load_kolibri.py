import json
import os
import tempfile
import unittest
from types import SimpleNamespace
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

    def _restore_scripts(self):
        return [
            args[0]
            for args, kwargs in self.app.view.webview.AddUserScript.call_args_list
            if json.dumps(SAVED) in args[0]
            and json.dumps(ORIGIN) in args[0]
            and kwargs["injectionTime"] == html2.WEBVIEW_INJECT_AT_DOCUMENT_START
        ]

    def test_next_carries_the_saved_page_without_its_fragment(self):
        self.app.load_kolibri(46655, root_url=ROOT_URL)

        query = parse_qs(urlsplit(self.app.kolibri_url).query)
        self.assertEqual(query["next"], ["/en/learn/"])

    def test_a_built_initialize_url_carries_the_saved_page_without_its_fragment(self):
        self.app.server_manager = SimpleNamespace(auth_token="x")
        with patch.object(
            application,
            "app_initialize_url",
            autospec=True,
            return_value="/app/api/initialize/abc",
        ) as app_initialize_url:
            self.app.load_kolibri(46655)

        app_initialize_url.assert_called_once_with(
            auth_token="x", next_url="/en/learn/"
        )

    def test_a_window_opened_later_restores_the_fragment(self):
        self.app.load_kolibri(46655, root_url=ROOT_URL)
        self.app.show_or_create_ui()

        self.assertEqual(len(self._restore_scripts()), 1)

    def test_an_open_window_restores_the_fragment(self):
        self.app.create_kolibri_window(url=f"{ORIGIN}/en/")
        self.app.load_kolibri(46655, root_url=ROOT_URL)

        self.assertEqual(len(self._restore_scripts()), 1)


class TestServedOnLoopback(unittest.TestCase):
    def setUp(self):
        self.app = KolibriApp.__new__(KolibriApp)

    def test_kolibri_pages_load_in_the_window(self):
        with patch.object(application.webbrowser, "open") as browser_open:
            self.assertTrue(self.app.should_load_url(f"{ORIGIN}/en/learn/"))
        browser_open.assert_not_called()

    def test_other_hosts_open_in_the_browser(self):
        for url in (
            "http://localhost:46655/en/learn/",
            "http://127.0.0.1.example.org/",
            "https://example.org/",
        ):
            with self.subTest(url=url):
                with patch.object(application.webbrowser, "open") as browser_open:
                    self.assertFalse(self.app.should_load_url(url))
                browser_open.assert_called_once_with(url)
