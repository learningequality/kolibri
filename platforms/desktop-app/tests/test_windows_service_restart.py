import ctypes
import sys
import unittest
from unittest.mock import MagicMock
from unittest.mock import patch

from windows_stubs import server_manager_windows
from windows_stubs import taskbar_icon
from windows_stubs import Win32Error as _Win32Error
from windows_stubs import win32service as _win32service
from windows_stubs import win32serviceutil as _win32serviceutil
from windows_stubs import windows_utils
from windows_stubs import wx


class TestRestartServiceCommand(unittest.TestCase):
    def setUp(self):
        _win32serviceutil.RestartService.reset_mock(side_effect=True)

    def _run(self):
        with patch.object(sys, "argv", ["Kolibri.exe", "--restart-service"]):
            with self.assertRaises(SystemExit) as exit_info:
                windows_utils.handle_windows_commands()
        return exit_info.exception.code

    def test_restarts_the_kolibri_service(self):
        self.assertEqual(self._run(), 0)
        _win32serviceutil.RestartService.assert_called_once_with("Kolibri")

    def test_exits_with_the_win32_error_code_on_failure(self):
        _win32serviceutil.RestartService.side_effect = _Win32Error(1062)
        self.assertEqual(self._run(), 1062)


class TestIsServiceRunning(unittest.TestCase):
    def _is_running_in_state(self, state):
        _win32service.QueryServiceStatus.return_value = (0, state)
        return server_manager_windows.is_service_running("Kolibri")

    def test_counts_a_stopping_service_as_running(self):
        self.assertTrue(self._is_running_in_state(_win32service.SERVICE_STOP_PENDING))

    def test_does_not_count_a_stopped_service_as_running(self):
        self.assertFalse(self._is_running_in_state(_win32service.SERVICE_STOPPED))


def _tray(uses_service):
    tray = object.__new__(taskbar_icon.KolibriTaskBarIcon)
    tray.app = MagicMock()
    tray.app.server_manager.uses_service = uses_service
    tray.frame = MagicMock()
    return tray


def _menu_labels(uses_service):
    menu = MagicMock()
    with patch.object(wx, "Menu", return_value=menu):
        with patch.object(taskbar_icon, "get_service_start_type", return_value="auto"):
            _tray(uses_service).CreatePopupMenu()
    return [c.args[1] for c in menu.Append.call_args_list]


class TestTrayMenu(unittest.TestCase):
    def test_offers_service_restart_when_connected_to_the_service(self):
        self.assertIn("Restart Kolibri service", _menu_labels(uses_service=True))

    def test_does_not_offer_service_restart_for_a_local_server(self):
        self.assertNotIn("Restart Kolibri service", _menu_labels(uses_service=False))

    def test_labels_the_quit_item_close(self):
        labels = _menu_labels(uses_service=True)
        self.assertIn("Close", labels)
        self.assertNotIn("Exit", labels)


class TestTrayRestartService(unittest.TestCase):
    def _restart(self, dialog_answer, shell_execute_result=42):
        windll = MagicMock()
        windll.shell32.ShellExecuteW.return_value = shell_execute_result
        with patch.object(ctypes, "windll", windll, create=True):
            with patch.object(wx, "MessageBox", return_value=dialog_answer) as box:
                _tray(uses_service=True).on_restart_service(None)
        return windll.shell32.ShellExecuteW, box

    def test_launches_an_elevated_restart_when_confirmed(self):
        shell_execute, _ = self._restart(wx.OK)
        shell_execute.assert_called_once()
        verb, params = shell_execute.call_args.args[1], shell_execute.call_args.args[3]
        self.assertEqual(verb, "runas")
        self.assertTrue(params.endswith("--restart-service"))

    def test_does_nothing_when_cancelled(self):
        shell_execute, _ = self._restart(wx.CANCEL)
        shell_execute.assert_not_called()

    def test_reports_missing_admin_rights_when_elevation_fails(self):
        _, box = self._restart(wx.OK, shell_execute_result=5)
        self.assertEqual(
            box.call_args.args[0],
            "Administrator permissions are required to change this setting.",
        )
