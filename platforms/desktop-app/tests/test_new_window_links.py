import importlib
import unittest
from unittest.mock import MagicMock
from unittest.mock import patch

view = importlib.import_module("kolibri_app.view")


def _request_new_window(url):
    instance = view.KolibriView.__new__(view.KolibriView)
    event = MagicMock()
    event.GetURL.return_value = url
    with patch.object(view.webbrowser, "open") as browser_open:
        instance.OnNewWindow(event)
    return browser_open


class TestNewWindowLinks(unittest.TestCase):
    def test_opens_another_server_in_the_browser(self):
        url = "http://192.168.1.5:8080/"
        _request_new_window(url).assert_called_once_with(url)

    def test_opens_an_external_site_in_the_browser(self):
        url = "https://learningequality.org/kolibri-privacy-policy/"
        _request_new_window(url).assert_called_once_with(url)

    def test_ignores_a_blank_window(self):
        _request_new_window("about:blank").assert_not_called()
