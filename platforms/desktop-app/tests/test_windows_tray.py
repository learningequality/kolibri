import os
import tempfile
import unittest
from unittest.mock import call
from unittest.mock import MagicMock
from unittest.mock import patch

from windows_stubs import application
from windows_stubs import taskbar_icon
from windows_stubs import wx
from wx import html2

from kolibri_app.webview_location import LastPage

KOLIBRI_URL = "http://localhost:8080/app/api/initialize/token"
TASKBAR_CREATED = 0xC123
_STATE_DIR = tempfile.TemporaryDirectory()


class _FakeShell:
    """The notification area: icons keyed by (hWnd, uID)."""

    def __init__(self):
        self.icons = set()

    def __call__(self, message, nid_ref):
        nid = nid_ref._obj
        key = (nid.hWnd, nid.uID)
        if message == taskbar_icon.NIM_ADD:
            if key in self.icons:
                return False
            self.icons.add(key)
            return True
        if message == taskbar_icon.NIM_MODIFY:
            return key in self.icons
        if message == taskbar_icon.NIM_DELETE:
            self.icons.discard(key)
            return True
        return False


def _tray(app=None):
    tray = object.__new__(taskbar_icon.KolibriTaskBarIcon)
    tray.app = app or MagicMock()
    tray.frame = MagicMock()
    tray.hwnd = 1234
    tray._added = False
    tray._tray_hicon = None
    tray._balloon_hicon = None
    tray._old_wndproc = None
    tray._taskbar_created_msg = TASKBAR_CREATED
    return tray


class _ShellTestCase(unittest.TestCase):
    def setUp(self):
        self.shell = _FakeShell()
        patcher = patch.object(taskbar_icon, "_shell_notify_icon", self.shell)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.tray = _tray()
        self.tray._add_icon()

    def _shell_drops_the_icon(self):
        self.shell.icons.clear()

    def _icon_shown(self):
        return (self.tray.hwnd, taskbar_icon.TRAY_ICON_ID) in self.shell.icons


class TestTrayIconRecovery(_ShellTestCase):
    def test_adds_the_icon_back_when_explorer_restarts(self):
        self._shell_drops_the_icon()
        self.tray._wndproc(self.tray.hwnd, TASKBAR_CREATED, 0, 0)
        self.assertTrue(self._icon_shown())

    def test_adds_the_icon_back_before_showing_a_notification(self):
        self._shell_drops_the_icon()
        with patch.object(wx, "CallAfter") as call_after:
            self.tray.show_notification("Kolibri is ready", "Kolibri is running")
        self.assertTrue(self._icon_shown())
        call_after.assert_not_called()

    def test_restoring_a_shown_icon_keeps_it(self):
        self.tray.restore_icon()
        self.assertTrue(self._icon_shown())


def _app(**attributes):
    app = application.KolibriApp.__new__(application.KolibriApp)
    app.windows = []
    app.kolibri_url = None
    app.tray_only = True
    app.last_page = LastPage(os.path.join(_STATE_DIR.name, "app_state.json"))
    for name, value in attributes.items():
        setattr(app, name, value)
    return app


class TestRelaunch(_ShellTestCase):
    def test_relaunching_brings_back_a_lost_tray_icon(self):
        app = _app(task_bar_icon=self.tray, kolibri_url=KOLIBRI_URL)
        self._shell_drops_the_icon()
        with patch.object(app, "create_kolibri_window"):
            app.on_relaunch()
        self.assertTrue(self._icon_shown())

    def test_relaunching_opens_the_kolibri_window(self):
        app = _app(task_bar_icon=self.tray, kolibri_url=KOLIBRI_URL)
        html2.WebView.New.reset_mock()
        app.on_relaunch()
        self.assertEqual(app.view.webview.LoadURL.call_args_list, [call(KOLIBRI_URL)])


class TestSecondInstance(unittest.TestCase):
    def test_does_not_create_a_tray_icon(self):
        checker = MagicMock()
        checker.IsAnotherRunning.return_value = True
        with (
            patch.object(wx, "SingleInstanceChecker", return_value=checker),
            patch.object(application, "KolibriTaskBarIcon", create=True) as tray,
            patch.object(application, "WINDOWS", True),
        ):
            self.assertFalse(_app().OnInit())
        tray.assert_not_called()


class TestOpenFromTray(unittest.TestCase):
    def test_the_window_opened_from_the_tray_loads_kolibri(self):
        app = _app(kolibri_url=KOLIBRI_URL)
        html2.WebView.New.reset_mock()
        with patch.object(taskbar_icon, "is_webview2_installed", return_value=True):
            _tray(app).on_open_ui(None)
        self.assertEqual(app.view.webview.LoadURL.call_args_list, [call(KOLIBRI_URL)])
