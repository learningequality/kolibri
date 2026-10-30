import base64
import importlib
import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock

import wx

from kolibri_app.webview_location import LastPage

view = importlib.import_module("kolibri_app.view")

ORIGIN = "http://127.0.0.1:46655"


def _message_event(payload):
    event = MagicMock()
    event.GetString.return_value = payload
    return event


def _bare_view():
    """A KolibriView with none of the wx construction __init__ does."""
    instance = view.KolibriView.__new__(view.KolibriView)
    instance.view = MagicMock()
    instance.webview = MagicMock()
    instance.app = MagicMock()
    instance.is_showing_loader = False
    instance._print_pending = False
    instance._restore_location = None
    return instance


def _served_last_page(test):
    tmp = tempfile.TemporaryDirectory()
    test.addCleanup(tmp.cleanup)
    last_page = LastPage(os.path.join(tmp.name, "app_state.json"))
    last_page.served_at(f"{ORIGIN}/app/api/initialize/abc?next=%2F")
    return last_page


def _loaded_event(url):
    event = MagicMock()
    event.GetURL.return_value = url
    return event


class TestDownloadFilename(unittest.TestCase):
    def test_keeps_a_plain_name(self):
        self.assertEqual(view._download_filename("logs.csv"), "logs.csv")

    def test_strips_directory_components(self):
        self.assertEqual(view._download_filename("../../etc/passwd"), "passwd")
        self.assertEqual(view._download_filename(r"..\..\secrets.txt"), "secrets.txt")

    def test_falls_back_when_there_is_no_usable_name(self):
        for name in (None, "", "   ", ".", "..", "some/dir/"):
            self.assertEqual(view._download_filename(name), "download")


class TestBridgeScripts(unittest.TestCase):
    def test_the_download_script_is_readable_and_fully_substituted(self):
        # An unsubstituted placeholder is a silently dead bridge.
        self.assertIn(view.BRIDGE_NAME, view.DOWNLOAD_SCRIPT)
        self.assertNotIn("__BRIDGE__", view.DOWNLOAD_SCRIPT)
        self.assertNotIn("__TYPE__", view.DOWNLOAD_SCRIPT)

    def test_the_location_script_is_readable_and_fully_substituted(self):
        self.assertIn(view.BRIDGE_NAME, view.LOCATION_SCRIPT)
        self.assertNotIn("__BRIDGE__", view.LOCATION_SCRIPT)
        self.assertNotIn("__TYPE__", view.LOCATION_SCRIPT)


class TestScriptMessages(unittest.TestCase):
    def setUp(self):
        self.view = _bare_view()
        wx.CallAfter.reset_mock()

    def test_repeated_print_messages_enqueue_one_dialog(self):
        for _i in range(3):
            self.view.OnScriptMessage(_message_event(json.dumps({"type": "print"})))
        wx.CallAfter.assert_called_once_with(self.view.show_print_dialog)

    def test_download_message_defers_the_save(self):
        payload = {"type": "download", "filename": "logs.csv", "data": "aGk="}
        self.view.OnScriptMessage(_message_event(json.dumps(payload)))
        wx.CallAfter.assert_called_once_with(
            self.view.save_download, "logs.csv", "aGk="
        )

    def test_location_message_saves_its_url(self):
        self.view.app.last_page = _served_last_page(self)
        url = "http://127.0.0.1:46655/en/learn/#/topics/abc"
        self.view.OnScriptMessage(
            _message_event(json.dumps({"type": "location", "url": url}))
        )
        self.assertEqual(self.view.app.last_page.location, "/en/learn/#/topics/abc")

    def test_unparseable_message_is_ignored(self):
        self.view.OnScriptMessage(_message_event("not json"))
        wx.CallAfter.assert_not_called()

    def test_unknown_message_type_is_ignored(self):
        self.view.OnScriptMessage(_message_event(json.dumps({"type": "nope"})))
        wx.CallAfter.assert_not_called()


class TestLoadComplete(unittest.TestCase):
    def setUp(self):
        self.view = _bare_view()
        self.view.app.last_page = _served_last_page(self)
        self.view.app.last_page.location = "/en/learn/#/topics/abc"
        self.view.load_url(f"{ORIGIN}/app/api/initialize/abc?next=%2F")

    def test_a_load_off_the_kolibri_origin_keeps_the_pending_restore(self):
        self.view.OnLoadComplete(_loaded_event("about:blank"))
        self.view.OnLoadComplete(_loaded_event("http://127.0.0.1:46655/en/learn/"))
        self.view.webview.RunScriptAsync.assert_called_once()
        [script], _kwargs = self.view.webview.RunScriptAsync.call_args
        self.assertIn(json.dumps(ORIGIN + "/en/learn/#/topics/abc"), script)

    def test_the_restore_is_consumed_by_the_first_kolibri_load(self):
        self.view.OnLoadComplete(_loaded_event("http://127.0.0.1:46655/en/device/"))
        self.view.OnLoadComplete(_loaded_event("http://127.0.0.1:46655/en/learn/"))
        self.view.webview.RunScriptAsync.assert_not_called()
        self.assertEqual(self.view.app.last_page.location, "/en/learn/")


class TestSaveDownload(unittest.TestCase):
    def setUp(self):
        self.view = _bare_view()
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = os.path.join(self.tmp.name, "logs.csv")
        self.dialog = wx.FileDialog.return_value.__enter__.return_value
        self.dialog.GetPath.return_value = self.path
        self.dialog.ShowModal.return_value = "ok"

    def test_writes_the_decoded_content_to_the_chosen_path(self):
        self.view.save_download("logs.csv", base64.b64encode(b"a,b\r\n1,2").decode())
        with open(self.path, "rb") as f:
            self.assertEqual(f.read(), b"a,b\r\n1,2")

    def test_cancelling_the_dialog_writes_nothing(self):
        self.dialog.ShowModal.return_value = wx.ID_CANCEL
        self.view.save_download("logs.csv", base64.b64encode(b"x").decode())
        self.assertFalse(os.path.exists(self.path))

    def test_undecodable_content_never_opens_the_dialog(self):
        wx.FileDialog.reset_mock()
        self.view.save_download("logs.csv", "not base64!!")
        wx.FileDialog.assert_not_called()
