"""
Windows taskbar icon implementation for Kolibri App.

Windows-only: imports pywin32/Win32 APIs at import time. Only import this module
when ``kolibri_app.constants.WINDOWS`` is true.

Provides system tray functionality:
- Service and UI startup configuration
- Server status notifications
- Right-click context menu for common actions
- Integration with Windows registry for startup settings

The tray icon is driven directly through ``Shell_NotifyIcon`` rather than
``wx.adv.TaskBarIcon``. wxPython's ``ShowBalloon`` cannot pass a balloon icon,
so Windows falls back to XOR-drawing the tray ``HICON`` for the notification,
which inverts the colours in light theme and looks low-res. Owning the
``NOTIFYICONDATA`` lets us send ``NIIF_USER | NIIF_LARGE_ICON`` with a proper
alpha icon, which the shell alpha-blends at full resolution (see issue #184).
pywin32's ``Shell_NotifyIcon`` tuple stops at ``hIcon`` and cannot carry
``hBalloonIcon``, so the notification is sent through a ctypes struct.
"""

import ctypes
import os
import sys
import webbrowser
from ctypes import wintypes
from importlib.resources import files

import pywintypes
import win32api
import win32con
import win32gui
import win32service
import winerror
import wx

from kolibri_app.constants import APP_NAME
from kolibri_app.constants import APP_USER_MODEL_ID
from kolibri_app.constants import SERVICE_NAME
from kolibri_app.constants import TRAY_ICON_ICO
from kolibri_app.i18n import _
from kolibri_app.logger import logging
from kolibri_app.windows_registry import is_ui_startup_enabled
from kolibri_app.windows_registry import is_webview2_installed
from kolibri_app.windows_registry import register_app_user_model_id
from kolibri_app.windows_registry import set_ui_startup_enabled

DEFAULT_NOTIFICATION_TIMEOUT = 5

VERIFICATION_MAX_RETRIES = 15
VERIFICATION_RETRY_INTERVAL_MS = 1000

# Callback message the shell posts to our window for mouse events on the icon.
WM_TRAY_CALLBACK = win32con.WM_USER + 20
# Stable per-window identifier for our single tray icon.
TRAY_ICON_ID = 1
# Source size for the balloon icon; larger than the tray icon so the shell has a
# high-res source to alpha-blend into the notification.
BALLOON_ICON_SIZE = 128

# NOTIFYICONDATA.uFlags
NIF_MESSAGE = 0x01
NIF_ICON = 0x02
NIF_TIP = 0x04
NIF_INFO = 0x10

# Shell_NotifyIcon messages
NIM_ADD = 0x00
NIM_MODIFY = 0x01
NIM_DELETE = 0x02

# NOTIFYICONDATA.dwInfoFlags
NIIF_USER = 0x04
NIIF_LARGE_ICON = 0x20


class _NOTIFYICONDATAW(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.DWORD),
        ("hWnd", wintypes.HWND),
        ("uID", wintypes.UINT),
        ("uFlags", wintypes.UINT),
        ("uCallbackMessage", wintypes.UINT),
        ("hIcon", wintypes.HICON),
        ("szTip", wintypes.WCHAR * 128),
        ("dwState", wintypes.DWORD),
        ("dwStateMask", wintypes.DWORD),
        ("szInfo", wintypes.WCHAR * 256),
        ("uVersion", wintypes.UINT),
        ("szInfoTitle", wintypes.WCHAR * 64),
        ("dwInfoFlags", wintypes.DWORD),
        # guidItem is unused (icon is identified by uID); it only reserves the
        # 16 bytes so cbSize spans through hBalloonIcon, the field that carries
        # the Vista+ balloon icon.
        ("guidItem", ctypes.c_byte * 16),
        ("hBalloonIcon", wintypes.HICON),
    ]


_shell_notify_icon = ctypes.windll.shell32.Shell_NotifyIconW
_shell_notify_icon.argtypes = [wintypes.DWORD, ctypes.POINTER(_NOTIFYICONDATAW)]
_shell_notify_icon.restype = wintypes.BOOL


def _new_nid(hwnd):
    """Build a NOTIFYICONDATAW targeting our single icon."""
    nid = _NOTIFYICONDATAW()
    nid.cbSize = ctypes.sizeof(_NOTIFYICONDATAW)
    nid.hWnd = hwnd
    nid.uID = TRAY_ICON_ID
    return nid


def get_service_start_type():
    """Check the start type of the Kolibri Windows service."""
    service_name = SERVICE_NAME
    scm_handle = None
    service_handle = None

    try:
        scm_handle = win32service.OpenSCManager(
            None, None, win32service.SC_MANAGER_CONNECT
        )

        service_handle = win32service.OpenService(
            scm_handle, service_name, win32service.SERVICE_QUERY_CONFIG
        )

        config = win32service.QueryServiceConfig(service_handle)
        start_type = config[1]

        if start_type == win32service.SERVICE_AUTO_START:
            return "auto"
        elif start_type == win32service.SERVICE_DISABLED:
            return "disabled"
        else:
            return "unknown"

    except pywintypes.error as e:
        if e.winerror == winerror.ERROR_SERVICE_DOES_NOT_EXIST:
            logging.info(f"Service '{service_name}' not found.")
            return "not_found"
        else:
            logging.error(f"Failed to query service status for '{service_name}': {e}")
            return "unknown"

    finally:
        if service_handle:
            win32service.CloseServiceHandle(service_handle)
        if scm_handle:
            win32service.CloseServiceHandle(scm_handle)


class KolibriTaskBarIcon:
    def __init__(self, app):
        self.app = app
        self.server_starting_notified = (
            False  # Track if we've shown the starting notification
        )
        self._added = False
        self._old_wndproc = None
        self._tray_hicon = None
        self._balloon_hicon = None

        # Give the process an explicit, registered AppUserModelID before the
        # tray icon exists, so notification toasts are attributed to "Kolibri"
        # with the icon rendered from the .ico file. The shell's fallback — an
        # auto-generated identity with an icon extracted from the tray HICON —
        # titles toasts "KolibriApp.exe" and can render the cached icon with
        # swapped colours (issue #184).
        self._icon_path = self._resolve_icon_path()
        self._set_app_identity()

        # Hidden window that owns the tray icon and receives its callback
        # messages. Never shown; FRAME_NO_TASKBAR keeps it off the taskbar.
        self.frame = wx.Frame(None, title=f"{APP_NAME}_Tray", style=wx.FRAME_NO_TASKBAR)
        self.hwnd = self.frame.GetHandle()

        # Subclass the frame's window proc to intercept tray callbacks, chaining
        # to wx's original proc so menus and other wx messages keep working.
        self._old_wndproc = win32gui.SetWindowLong(
            self.hwnd, win32con.GWL_WNDPROC, self._wndproc
        )

        self._load_icons()
        self._add_icon()

    def _resolve_icon_path(self):
        """Return the absolute path of the app icon, or None if unavailable."""
        try:
            return str((files("kolibri_app") / TRAY_ICON_ICO).resolve())
        except OSError as e:
            logging.error(f"Error resolving tray icon path: {e}")
            return None

    def _set_app_identity(self):
        """Register and adopt the explicit AppUserModelID for this process."""
        if not self._icon_path:
            return
        if not register_app_user_model_id(self._icon_path):
            return
        result = ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(
            APP_USER_MODEL_ID
        )
        if result != 0:
            logging.error(
                f"SetCurrentProcessExplicitAppUserModelID failed with HRESULT {result:#x}"
            )

    def _load_icon(self, path, size):
        """Load the app icon from `path` at the requested pixel size."""
        return win32gui.LoadImage(
            0, path, win32con.IMAGE_ICON, size, size, win32con.LR_LOADFROMFILE
        )

    def _load_icons(self):
        """Load the small tray icon and the larger balloon icon."""
        if not self._icon_path:
            return
        try:
            small = win32api.GetSystemMetrics(win32con.SM_CXSMICON)
            self._tray_hicon = self._load_icon(self._icon_path, small)
            self._balloon_hicon = self._load_icon(self._icon_path, BALLOON_ICON_SIZE)
        except (OSError, pywintypes.error) as e:
            logging.error(f"Error loading tray icons: {e}")

    def _add_icon(self):
        """Register the tray icon with the shell."""
        nid = _new_nid(self.hwnd)
        nid.uFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP
        nid.uCallbackMessage = WM_TRAY_CALLBACK
        nid.hIcon = self._tray_hicon or 0
        nid.szTip = APP_NAME
        if _shell_notify_icon(NIM_ADD, ctypes.byref(nid)):
            self._added = True
        else:
            logging.error("Shell_NotifyIcon NIM_ADD failed for the tray icon.")

    def _remove_icon(self):
        """Remove the tray icon from the shell."""
        if not self._added:
            return
        _shell_notify_icon(NIM_DELETE, ctypes.byref(_new_nid(self.hwnd)))
        self._added = False

    def _wndproc(self, hwnd, msg, wparam, lparam):
        """Window proc for the hidden tray window."""
        if msg == WM_TRAY_CALLBACK:
            # In classic (non-versioned) mode lParam is the mouse message.
            if lparam == win32con.WM_LBUTTONUP:
                wx.CallAfter(self.on_left_click)
            elif lparam == win32con.WM_RBUTTONUP:
                self._show_menu()
            return 0
        if msg == win32con.WM_DESTROY:
            self._remove_icon()
        return win32gui.CallWindowProc(self._old_wndproc, hwnd, msg, wparam, lparam)

    def _show_menu(self):
        """Show the right-click context menu at the cursor."""
        # SetForegroundWindow is required so the menu dismisses when the user
        # clicks elsewhere (see the TrackPopupMenu docs).
        win32gui.SetForegroundWindow(self.hwnd)
        menu = self.CreatePopupMenu()
        self.frame.PopupMenu(menu)
        menu.Destroy()

    def show_notification(self, title, message, timeout=DEFAULT_NOTIFICATION_TIMEOUT):
        """
        Show a Windows tray notification.

        Args:
            title: The notification title
            message: The notification message
            timeout: How long to show the notification (in seconds)
        """
        try:
            nid = _new_nid(self.hwnd)
            nid.uFlags = NIF_INFO
            # szInfo/szInfoTitle are fixed WCHAR buffers (256/64); an over-long
            # string raises ValueError, which the except below doesn't catch.
            nid.szInfo = message[:255]
            nid.szInfoTitle = title[:63]
            nid.uVersion = timeout * 1000  # Ignored on Vista+, harmless to set.
            # NIIF_USER + hBalloonIcon makes the shell alpha-blend our icon
            # instead of XOR-drawing the tray icon (which inverts in light
            # theme); NIIF_LARGE_ICON renders it at full resolution.
            if self._balloon_hicon:
                nid.dwInfoFlags = NIIF_USER | NIIF_LARGE_ICON
                nid.hBalloonIcon = self._balloon_hicon
            if not _shell_notify_icon(NIM_MODIFY, ctypes.byref(nid)):
                raise OSError("Shell_NotifyIcon NIM_MODIFY failed")
        except (OSError, pywintypes.error) as e:
            logging.error(f"Failed to show notification: {e}")
            # Fallback to a simple message box if notifications fail
            wx.CallAfter(wx.MessageBox, message, title, wx.OK | wx.ICON_INFORMATION)

    def notify_server_starting(self):
        """Show notification that server is starting."""
        if not self.server_starting_notified:
            self.show_notification(
                _("Kolibri"), _("Kolibri is starting... Please wait."), timeout=3
            )
            self.server_starting_notified = True

    def notify_server_ready(self, url):
        """Show notification that server is ready."""
        self.server_starting_notified = False  # Reset for next time
        message = _("Kolibri is running.")
        self.show_notification(_("Kolibri Ready"), message)

    def notify_server_failed(self):
        """Show notification that server failed to start."""
        self.server_starting_notified = False  # Reset for next time
        home_path = os.environ.get("KOLIBRI_HOME", "")
        log_path = os.path.join(home_path, "logs")
        message = _("Kolibri failed to start.\nCheck logs at: {}").format(log_path)
        self.show_notification(_("Kolibri Error"), message, timeout=10)

    def _show_window(self, main_window):
        """Un-minimize, show, and raise the given main window."""
        view = main_window.view
        # If window is minimized, make it non-minimized.
        if view.IsIconized():
            view.Iconize(False)
        # If the window is closed, show it.
        if not view.IsShown():
            view.Show()
        # Always bring the window to the foreground.
        view.Raise()

    def on_left_click(self):
        """
        Handles left-click on the taskbar icon.
        """
        main_window = self.app.view
        if main_window:
            self._show_window(main_window)

    def CreatePopupMenu(self):
        """Create and return the right-click menu."""
        menu = wx.Menu()

        # 1. Open UI
        open_item = menu.Append(wx.ID_ANY, _("Open UI"))
        open_item.Enable(bool(self.app.kolibri_url))
        self.frame.Bind(wx.EVT_MENU, self.on_open_ui, open_item)

        menu.AppendSeparator()

        # 2. Open kolibri UI on logon (Toggle) - Per-user setting
        startup_ui_item = menu.AppendCheckItem(wx.ID_ANY, _("Open Kolibri UI on logon"))
        startup_ui_item.Check(is_ui_startup_enabled())
        self.frame.Bind(wx.EVT_MENU, self.on_toggle_startup_ui, startup_ui_item)

        # 3. Run Kolibri service on start (Toggle) - System-wide setting
        self.run_on_start_item = menu.AppendCheckItem(
            wx.ID_ANY, _("Run Kolibri service on start")
        )
        start_type = get_service_start_type()
        if start_type in ["auto", "disabled"]:
            self.run_on_start_item.Check(start_type == "auto")
        else:
            self.run_on_start_item.Enable(False)
            self.run_on_start_item.SetItemLabel(
                _("Run Kolibri service on start (Unavailable)")
            )
        self.frame.Bind(
            wx.EVT_MENU, self.on_toggle_service_startup, self.run_on_start_item
        )

        menu.AppendSeparator()

        # 4. Exit
        exit_item = menu.Append(wx.ID_EXIT, _("Exit"))
        self.frame.Bind(wx.EVT_MENU, self.on_exit, exit_item)

        return menu

    def on_open_ui(self, event):
        """Open UI - either in WebView2 or browser depending on availability."""
        if not self.app.kolibri_url:
            wx.MessageBox(
                _("Kolibri server is not ready yet."),
                _("Info"),
                wx.OK | wx.ICON_INFORMATION,
            )
            return

        if is_webview2_installed():
            # WebView2 is available, show/create the main window
            main_window = self.app.view
            if main_window:
                self._show_window(main_window)
            else:
                # Create new window
                self.app.create_kolibri_window()
        else:
            # WebView2 not available, open in default browser
            webbrowser.open(self.app.kolibri_url)

    def on_toggle_startup_ui(self, event):
        """Toggle the 'Open kolibri UI on logon' setting."""
        enabled = event.IsChecked()
        if set_ui_startup_enabled(enabled):
            status_translated = _("enabled") if enabled else _("disabled")
            self.show_notification(
                _("Kolibri UI Startup Updated"),
                _("Opening the UI on logon has been {}.").format(status_translated),
            )
        else:
            # Revert checkbox state if operation failed
            event.GetEventObject().Check(not enabled)
            self.show_notification(
                _("Kolibri UI Startup Error"),
                _("Failed to change the UI startup setting."),
            )

    def on_toggle_service_startup(self, event):
        """Handle toggling the service start type with a UAC prompt."""
        is_auto_start_enabled = event.IsChecked()
        new_state = "auto" if is_auto_start_enabled else "disabled"

        try:
            exe_path = sys.executable
            if getattr(sys, "frozen", False):
                params = f"--configure-service {new_state}"
                exe_to_run = exe_path
            else:
                params = f"-m kolibri_app --configure-service {new_state}"
                exe_to_run = exe_path

            shell_execute_result = ctypes.windll.shell32.ShellExecuteW(
                None, "runas", exe_to_run, params, None, 1
            )

            if shell_execute_result <= 32:
                logging.error(
                    f"Failed to elevate for service configuration. Code: {shell_execute_result}"
                )
                self.run_on_start_item.Check(not is_auto_start_enabled)
                wx.MessageBox(
                    _("Administrator rights are required to change this setting."),
                    _("Error"),
                    wx.OK | wx.ICON_ERROR,
                )
                return

            # Schedule verification and tray icon configuration
            wx.CallLater(
                VERIFICATION_RETRY_INTERVAL_MS,
                self.verify_service_change,
                is_auto_start_enabled,
            )

        except (OSError, PermissionError) as e:
            logging.error(f"Error trying to change service startup: {e}")
            self.run_on_start_item.Check(not is_auto_start_enabled)
            wx.MessageBox(
                _("An error occurred while changing the service setting: {}").format(e),
                _("Error"),
                wx.OK | wx.ICON_ERROR,
            )

    def verify_service_change(self, is_auto_start_enabled, retries=0):
        """
        Periodically check if the service start type was updated and notify the user.
        """
        expected_state = "auto" if is_auto_start_enabled else "disabled"
        current_state = get_service_start_type()

        if current_state == expected_state:
            status_translated = _("enabled") if is_auto_start_enabled else _("disabled")
            self.show_notification(
                _("Kolibri Service Updated"),
                _("Automatic startup has been {}.").format(status_translated),
            )
        elif retries < VERIFICATION_MAX_RETRIES:
            wx.CallLater(
                VERIFICATION_RETRY_INTERVAL_MS,
                self.verify_service_change,
                is_auto_start_enabled,
                retries=retries + 1,
            )
        else:
            # Revert the checkbox if the operation failed
            self.run_on_start_item.Check(not is_auto_start_enabled)
            self.show_notification(
                _("Kolibri Service Error"),
                _("Failed to update the service startup setting."),
            )

    def on_exit(self, event):
        """
        Handles the exit menu item.
        - When running with background service: Does not stop the service
        - When running local server: Stops the local server
        """
        server_manager = self.app.server_manager

        if (
            hasattr(server_manager, "_server_mode")
            and server_manager._server_mode == "service"
        ):
            # Running with service - don't stop the service, just exit the UI
            logging.info("Exiting tray icon (service will continue running)")
            # Don't call app.shutdown() to avoid stopping the service
        else:
            # Running local server - stop the server
            logging.info("Exiting and stopping local server")
            self.app.shutdown()

        # Destroy the tray icon
        wx.CallAfter(self.Destroy)

        # Exit the main loop
        self.app.ExitMainLoop()

    def Destroy(self):
        """Remove the tray icon, restore the window proc, and destroy the frame."""
        self._remove_icon()
        for hicon in (self._tray_hicon, self._balloon_hicon):
            if hicon:
                win32gui.DestroyIcon(hicon)
        self._tray_hicon = self._balloon_hicon = None
        if self._old_wndproc is not None:
            try:
                win32gui.SetWindowLong(
                    self.hwnd, win32con.GWL_WNDPROC, self._old_wndproc
                )
            except pywintypes.error:
                pass
            self._old_wndproc = None
        if self.frame:
            self.frame.Destroy()
            self.frame = None
