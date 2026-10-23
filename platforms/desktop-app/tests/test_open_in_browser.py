import importlib
import unittest
from unittest.mock import MagicMock
from unittest.mock import patch

view = importlib.import_module("kolibri_app.view")

KOLIBRI_URL = "http://localhost:8080/app/api/initialize/token"


def _view_showing(url, kolibri_url=KOLIBRI_URL):
    instance = view.KolibriView.__new__(view.KolibriView)
    instance.app = MagicMock()
    instance.app.kolibri_url = kolibri_url
    instance.webview = MagicMock()
    instance.webview.GetCurrentURL.return_value = url
    return instance


def _open_in_browser(instance):
    with patch.object(view.webbrowser, "open") as browser_open:
        instance.on_open_in_browser(None)
    return browser_open


class TestOpenInBrowser(unittest.TestCase):
    def test_opens_the_current_kolibri_page(self):
        page = "http://localhost:8080/en/learn/"
        _open_in_browser(_view_showing(page)).assert_called_once_with(page)

    def test_opens_kolibri_from_the_loading_screen(self):
        browser_open = _open_in_browser(_view_showing("about:blank"))
        browser_open.assert_called_once_with(KOLIBRI_URL)

    def test_does_nothing_before_kolibri_is_ready(self):
        browser_open = _open_in_browser(_view_showing("about:blank", None))
        browser_open.assert_not_called()
