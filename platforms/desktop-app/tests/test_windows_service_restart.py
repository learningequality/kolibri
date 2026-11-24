import ctypes
import sys
import unittest
from unittest.mock import MagicMock
from unittest.mock import patch

from windows_stubs import server_manager_windows
from windows_stubs import taskbar_icon
from windows_stubs import Win32Error as _Win32Error
from windows_stubs import win32service as _win32service
from windows_stubs import windows_utils
from windows_stubs import wx


class _FakeService:
    """A service that takes a while to stop and cannot start until it has.

    A local server shares the service's data directory, so the service must
    not start while one is running.
    """

    def __init__(
        self, state="running", stops=True, start_fails=False, local_server=False
    ):
        self.state = state
        self.stops = stops
        self.start_fails = start_fails
        self.starts = 0
        self.start_type = None
        self.local_server = local_server
        self.kolibri_stops = 0

    def ChangeServiceConfig(self, handle, service_type, start_type, *args):
        self.start_type = start_type

    def stop_kolibri_server(self):
        self.kolibri_stops += 1
        self.local_server = False

    def QueryServiceStatus(self, name):
        status = {
            "running": windows_utils.win32service.SERVICE_RUNNING,
            "stopping": windows_utils.win32service.SERVICE_STOP_PENDING,
            "stopped": windows_utils.win32service.SERVICE_STOPPED,
        }[self.state]
        return (0, status, 0, 0, 0, 0, 0)

    def StopService(self, name):
        if self.state != "running":
            raise _Win32Error(windows_utils.winerror.ERROR_SERVICE_NOT_ACTIVE)
        self.state = "stopping"

    def WaitForServiceStatus(self, name, status, wait_seconds):
        if self.state == "stopping" and not self.stops:
            raise _Win32Error(windows_utils.winerror.ERROR_SERVICE_REQUEST_TIMEOUT)
        self.state = "stopped"

    def StartService(self, name):
        if self.state != "stopped":
            raise _Win32Error(windows_utils.winerror.ERROR_SERVICE_ALREADY_RUNNING)
        if self.local_server:
            raise AssertionError("Started the service beside a local server")
        if self.start_fails:
            raise _Win32Error(windows_utils.winerror.ERROR_SERVICE_LOGON_FAILED)
        self.state = "running"
        self.starts += 1


class _ServiceCommandTestCase(unittest.TestCase):
    def _run_command(self, args, service):
        with (
            patch.object(sys, "argv", ["Kolibri.exe", *args]),
            patch.multiple(
                windows_utils.win32serviceutil,
                QueryServiceStatus=service.QueryServiceStatus,
                StopService=service.StopService,
                WaitForServiceStatus=service.WaitForServiceStatus,
                StartService=service.StartService,
            ),
            patch.object(
                windows_utils.win32service,
                "ChangeServiceConfig",
                service.ChangeServiceConfig,
            ),
            patch.object(
                windows_utils, "stop_kolibri_server", service.stop_kolibri_server
            ),
            self.assertRaises(SystemExit) as exit_info,
        ):
            windows_utils.handle_windows_commands()
        return exit_info.exception.code


class TestRestartServiceCommand(_ServiceCommandTestCase):
    def _run(self, service):
        return self._run_command(["--restart-service"], service)

    def test_starts_the_service_again_once_it_has_stopped(self):
        service = _FakeService()
        self.assertEqual(self._run(service), 0)
        self.assertEqual(service.starts, 1)

    def test_starts_a_service_that_was_not_running(self):
        service = _FakeService(state="stopped")
        self.assertEqual(self._run(service), 0)
        self.assertEqual(service.starts, 1)

    def test_exits_with_the_win32_error_code_when_the_service_does_not_stop(self):
        service = _FakeService(stops=False)
        self.assertEqual(
            self._run(service), windows_utils.winerror.ERROR_SERVICE_REQUEST_TIMEOUT
        )
        self.assertEqual(service.starts, 0)


class TestConfigureServiceCommand(_ServiceCommandTestCase):
    def _run(self, new_state, service):
        return self._run_command(["--configure-service", new_state], service)

    def test_disabling_stops_the_running_service(self):
        service = _FakeService()
        self.assertEqual(self._run("disabled", service), 0)
        self.assertEqual(service.state, "stopped")

    def test_disabling_a_stopped_service_succeeds(self):
        service = _FakeService(state="stopped")
        self.assertEqual(self._run("disabled", service), 0)
        self.assertEqual(service.state, "stopped")

    def test_disabling_exits_with_the_win32_error_code_when_the_service_does_not_stop(
        self,
    ):
        service = _FakeService(stops=False)
        self.assertEqual(
            self._run("disabled", service),
            windows_utils.winerror.ERROR_SERVICE_REQUEST_TIMEOUT,
        )

    def test_disabling_keeps_automatic_startup_when_the_service_does_not_stop(self):
        service = _FakeService(stops=False)
        self._run("disabled", service)
        self.assertEqual(service.start_type, _win32service.SERVICE_AUTO_START)

    def test_enabling_replaces_the_local_server_with_the_service(self):
        service = _FakeService(state="stopped", local_server=True)
        self.assertEqual(self._run("auto", service), 0)
        self.assertFalse(service.local_server)
        self.assertEqual(service.state, "running")
        self.assertEqual(service.start_type, _win32service.SERVICE_AUTO_START)

    def test_enabling_exits_with_the_win32_error_code_when_the_service_does_not_start(
        self,
    ):
        service = _FakeService(state="stopped", start_fails=True)
        self.assertEqual(
            self._run("auto", service),
            windows_utils.winerror.ERROR_SERVICE_LOGON_FAILED,
        )

    def test_enabling_keeps_the_service_disabled_when_it_does_not_start(self):
        service = _FakeService(state="stopped", start_fails=True)
        self._run("auto", service)
        self.assertEqual(service.start_type, _win32service.SERVICE_DISABLED)

    def test_enabling_leaves_a_running_service_alone(self):
        service = _FakeService()
        self.assertEqual(self._run("auto", service), 0)
        self.assertEqual(service.kolibri_stops, 0)
        self.assertEqual(service.starts, 0)


class TestIsServiceRunning(unittest.TestCase):
    def _is_running_in_state(self, state):
        _win32service.QueryServiceStatus.return_value = (0, state)
        return server_manager_windows.is_service_running("Kolibri")

    def test_counts_a_stopping_service_as_running(self):
        self.assertTrue(self._is_running_in_state(_win32service.SERVICE_STOP_PENDING))

    def test_does_not_count_a_stopped_service_as_running(self):
        self.assertFalse(self._is_running_in_state(_win32service.SERVICE_STOPPED))


def _falls_back_to_a_local_server(manager):
    """Fail every pipe connection attempt while the service is not running."""
    with (
        patch.object(server_manager_windows, "is_service_running", return_value=False),
        patch.object(wx, "CallAfter", lambda f, *args: f(*args)),
        patch.object(manager, "_launch_server_process") as launch,
    ):
        for _ in range(server_manager_windows.MAX_PIPE_RETRIES):
            manager._handle_service_pipe_error()
    return launch.called


def _service_manager():
    manager = server_manager_windows.WindowsServerManager(MagicMock())
    manager._server_mode = "service"
    return manager


def _local_server_manager():
    manager = server_manager_windows.WindowsServerManager(MagicMock())
    manager._server_mode = "local"
    return manager


class TestServiceFallback(unittest.TestCase):
    def test_falls_back_to_a_local_server_when_the_service_is_gone(self):
        self.assertTrue(_falls_back_to_a_local_server(_service_manager()))

    def test_waits_for_the_service_while_handing_over_to_it(self):
        manager = _local_server_manager()
        manager.use_service()
        self.assertFalse(_falls_back_to_a_local_server(manager))

    def test_falls_back_once_the_handover_has_finished(self):
        manager = _local_server_manager()
        manager.use_service()
        manager.finish_service_handover()
        self.assertTrue(_falls_back_to_a_local_server(manager))


class TestLocalServerShutdown(unittest.TestCase):
    def test_does_not_relaunch_the_server_it_is_stopping(self):
        manager = _local_server_manager()
        manager.pipe_reader_thread = MagicMock()
        manager.server_process = MagicMock()
        manager.server_process.poll.return_value = None

        def stop_server():
            manager.server_process.poll.return_value = 0
            manager._handle_pipe_error(
                _Win32Error(server_manager_windows.winerror.ERROR_BROKEN_PIPE)
            )

        with (
            patch.object(server_manager_windows, "kolibri_stop", stop_server),
            patch.object(wx, "CallAfter", lambda f, *args: f(*args)),
            patch.object(manager, "_launch_server_process") as launch,
        ):
            manager.shutdown()
        launch.assert_not_called()


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
    def test_does_not_offer_service_restart(self):
        self.assertNotIn("Restart Kolibri service", _menu_labels(uses_service=True))

    def test_labels_the_quit_item_close(self):
        labels = _menu_labels(uses_service=True)
        self.assertIn("Close", labels)
        self.assertNotIn("Exit", labels)


class _FakeWindows:
    """ShellExecuteExW starts the elevated command, which exits with exit_code."""

    def __init__(self, elevates=True, exit_code=0):
        self.launched = []
        self.windll = MagicMock()
        self.windll.shell32.ShellExecuteExW.side_effect = self._shell_execute_ex
        self.windll.kernel32.GetExitCodeProcess.side_effect = self._get_exit_code
        self.elevates = elevates
        self.exit_code = exit_code

    def _shell_execute_ex(self, info_ref):
        if not self.elevates:
            return False
        info = info_ref._obj
        self.launched.append((info.lpVerb, info.lpParameters))
        info.hProcess = 99
        return True

    def _get_exit_code(self, process, exit_code_ref):
        exit_code_ref._obj.value = self.exit_code
        return True


class _ImmediateThread:
    def __init__(self, target, args=(), daemon=None):
        self.target = target
        self.args = args

    def start(self):
        self.target(*self.args)


ADMIN_REQUIRED = "Administrator rights are required to change this setting."
RESTART_FAILED = "The Kolibri service could not be restarted."


class TestTrayRestartService(unittest.TestCase):
    def _restart(self, dialog_answer, windows):
        with (
            patch.object(ctypes, "windll", windows.windll, create=True),
            patch.object(taskbar_icon, "Thread", _ImmediateThread),
            patch.object(wx, "CallAfter", lambda f, *args: f(*args)),
            patch.object(wx, "MessageBox", return_value=dialog_answer) as box,
        ):
            _tray(uses_service=True).on_restart_service(None)
        # The first message box is the confirmation.
        return [c.args[0] for c in box.call_args_list[1:]]

    def test_launches_an_elevated_restart_when_confirmed(self):
        windows = _FakeWindows()
        self._restart(wx.OK, windows)
        [(verb, params)] = windows.launched
        self.assertEqual(verb, "runas")
        self.assertTrue(params.endswith("--restart-service"))

    def test_does_nothing_when_cancelled(self):
        windows = _FakeWindows()
        self.assertEqual(self._restart(wx.CANCEL, windows), [])
        self.assertEqual(windows.launched, [])

    def test_reports_missing_admin_rights_when_elevation_fails(self):
        errors = self._restart(wx.OK, _FakeWindows(elevates=False))
        self.assertEqual(errors, [ADMIN_REQUIRED])

    def test_reports_a_failed_restart(self):
        errors = self._restart(wx.OK, _FakeWindows(exit_code=1053))
        self.assertEqual(errors, [RESTART_FAILED])

    def test_reports_nothing_when_the_restart_succeeds(self):
        self.assertEqual(self._restart(wx.OK, _FakeWindows()), [])


SERVICE_UPDATED = ("Kolibri Service Updated", "Automatic startup has been enabled.")
SERVICE_UPDATE_FAILED = (
    "Kolibri Service Error",
    "Failed to update the service startup setting.",
)


class TestTrayServiceStartup(unittest.TestCase):
    def _toggle(self, windows, server_manager=None):
        tray = _tray(uses_service=True)
        if server_manager:
            tray.app.server_manager = server_manager
        tray.run_on_start_item = MagicMock()
        tray.show_notification = MagicMock()
        event = MagicMock()
        event.IsChecked.return_value = True
        with (
            patch.object(ctypes, "windll", windows.windll, create=True),
            patch.object(taskbar_icon, "Thread", _ImmediateThread),
            patch.object(wx, "CallAfter", lambda f, *args: f(*args)),
            patch.object(wx, "MessageBox") as box,
        ):
            tray.on_toggle_service_startup(event)
        self.notifications = [c.args for c in tray.show_notification.call_args_list]
        return [c.args[0] for c in box.call_args_list]

    def test_launches_an_elevated_configure_command(self):
        windows = _FakeWindows()
        self.assertEqual(self._toggle(windows), [])
        [(verb, params)] = windows.launched
        self.assertEqual(verb, "runas")
        self.assertTrue(params.endswith("--configure-service auto"))

    def test_reports_missing_admin_rights_when_elevation_fails(self):
        self.assertEqual(self._toggle(_FakeWindows(elevates=False)), [ADMIN_REQUIRED])

    def test_reports_the_change_once_the_command_succeeds(self):
        self._toggle(_FakeWindows())
        self.assertEqual(self.notifications, [SERVICE_UPDATED])

    def test_reports_a_failed_command(self):
        self._toggle(_FakeWindows(exit_code=1069))
        self.assertEqual(self.notifications, [SERVICE_UPDATE_FAILED])

    def test_hands_a_local_server_over_to_the_service(self):
        manager = _local_server_manager()
        self._toggle(_FakeWindows(), manager)
        self.assertTrue(manager.uses_service)

    def test_falls_back_to_a_local_server_when_the_service_does_not_start(self):
        manager = _local_server_manager()
        self._toggle(_FakeWindows(exit_code=1069), manager)
        self.assertTrue(_falls_back_to_a_local_server(manager))

    def test_keeps_the_local_server_when_elevation_fails(self):
        manager = _local_server_manager()
        self._toggle(_FakeWindows(elevates=False), manager)
        self.assertFalse(manager.uses_service)
