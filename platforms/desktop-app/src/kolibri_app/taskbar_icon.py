"""
Windows taskbar icon implementation for Kolibri App.

Provides system tray functionality:
- Service and UI startup configuration
- Server status notifications
- Right-click context menu for common actions
- Integration with Windows registry for startup settings
"""
import ctypes
import os
import sys
import webbrowser
from importlib.resources import files

import pywintypes
import win32service
import winerror
import wx
from wx.adv import TaskBarIcon

from kolibri_app.constants import APP_NAME
from kolibri_app.constants import SERVICE_NAME
from kolibri_app.constants import TRAY_ICON_ICO
from kolibri_app.i18n import _
from kolibri_app.logger import logging
from kolibri_app.windows_registry import is_ui_startup_enabled
from kolibri_app.windows_registry import is_webview2_installed
from kolibri_app.windows_registry import set_ui_startup_enabled

DEFAULT_NOTIFICATION_TIMEOUT = 5

VERIFICATION_MAX_RETRIES = 15
VERIFICATION_RETRY_INTERVAL_MS = 1000


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


class KolibriTaskBarIcon(TaskBarIcon):
    def __init__(self, app):
        super(KolibriTaskBarIcon, self).__init__()
        self.app = app
        self.server_starting_notified = (
            False  # Track if we've shown the starting notification
        )

        self.Bind(wx.adv.EVT_TASKBAR_LEFT_DOWN, self.on_left_click)

        self.set_icon(TRAY_ICON_ICO, f"{APP_NAME}")

    def set_icon(self, path, tooltip):
        """Sets the icon and tooltip for the taskbar icon."""

        # 'path' is expected to be 'icons/kolibri.ico'
        try:
            # We need the absolute path for wx.Icon, so resolve() is necessary
            icon_resource_path = files("kolibri_app") / path
            final_path = str(icon_resource_path.resolve())

            icon = wx.Icon(final_path, wx.BITMAP_TYPE_ICO)
            self.SetIcon(icon, tooltip)
        except (FileNotFoundError, wx.wxAssertionError, OSError) as e:
            logging.error(f"Error setting icon from path '{final_path}': {e}")

    def show_notification(self, title, message, timeout=DEFAULT_NOTIFICATION_TIMEOUT):
        """
        Show a Windows tray notification.

        Args:
            title: The notification title
            message: The notification message
            timeout: How long to show the notification (in seconds)
        """
        try:
            # Create notification
            self.ShowBalloon(title, message, timeout * 1000)

        except (ImportError, AttributeError, OSError) as e:
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

    def on_left_click(self, event):
        """
        Handles left-click on the taskbar icon.
        """
        main_window = self.app.view
        if main_window:
            view = main_window.view
            # If window is minimized, make it non-minimized.
            if view.IsIconized():
                view.Iconize(False)

            # If the window is closed, show it.
            if not view.IsShown():
                view.Show()

            # Always bring the window to the foreground.
            view.Raise()

    def CreatePopupMenu(self):
        """Create and return the right-click menu."""
        menu = wx.Menu()

        # 1. Open UI
        open_item = menu.Append(wx.ID_ANY, _("Open UI"))
        open_item.Enable(bool(self.app.kolibri_url))
        self.Bind(wx.EVT_MENU, self.on_open_ui, open_item)

        menu.AppendSeparator()

        # 2. Open kolibri UI on logon (Toggle) - Per-user setting
        startup_ui_item = menu.AppendCheckItem(wx.ID_ANY, _("Open Kolibri UI on logon"))
        startup_ui_item.Check(is_ui_startup_enabled())
        self.Bind(wx.EVT_MENU, self.on_toggle_startup_ui, startup_ui_item)

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
        self.Bind(wx.EVT_MENU, self.on_toggle_service_startup, self.run_on_start_item)

        menu.AppendSeparator()

        # 4. Exit
        exit_item = menu.Append(wx.ID_EXIT, _("Exit"))
        self.Bind(wx.EVT_MENU, self.on_exit, exit_item)

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
                view = main_window.view
                # If window is minimized, make it non-minimized.
                if view.IsIconized():
                    view.Iconize(False)

                # If the window is closed, show it.
                if not view.IsShown():
                    view.Show()

                # Always bring the window to the foreground.
                view.Raise()
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
