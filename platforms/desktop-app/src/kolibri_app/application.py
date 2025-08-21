import atexit
import json
import os
import webbrowser

import wx
from kolibri.main import enable_plugin
from kolibri.utils.conf import KOLIBRI_HOME

from kolibri_app.constants import APP_NAME
from kolibri_app.constants import WINDOWS
from kolibri_app.logger import logging
from kolibri_app.view import KolibriView

if WINDOWS:
    from kolibri_app.server_manager_windows import WindowsServerManager as ServerManager
    from kolibri_app.taskbar_icon import KolibriTaskBarIcon
    from kolibri_app.taskbar_icon import is_webview2_installed
    import win32con
    import win32gui
    import ctypes
else:
    from kolibri_app.server_manager_posix import PosixServerManager as ServerManager
    from kolibri.plugins.app.utils import interface

STATE_FILE = "app_state.json"

# State keys
URL = "URL"

# Custom Windows message for showing UI
WM_SHOW_KOLIBRI_UI = win32con.WM_USER + 1 if WINDOWS else None


class KolibriApp(wx.App):
    def __init__(self, tray_only=False):
        self.tray_only = tray_only
        self.hidden_window = None  # IPC window for single-instance messaging
        self.server_start_timer = None  # Timer to show "server starting" notifications
        super(KolibriApp, self).__init__()

    def OnInit(self):
        """
        Start your UI and app run loop here.
        """

        self.SetAppName(APP_NAME)

        if WINDOWS:
            self.task_bar_icon = KolibriTaskBarIcon(self)

        instance_name = "{}_{}".format(APP_NAME, wx.GetUserId())
        self._checker = wx.SingleInstanceChecker(instance_name)

        if self._checker.IsAnotherRunning():
            # Another instance is running
            if WINDOWS:
                # Find and send message to existing instance
                hwnd = win32gui.FindWindow(None, f"{APP_NAME}_IPC_Window")
                if hwnd:
                    win32gui.PostMessage(hwnd, WM_SHOW_KOLIBRI_UI, 0, 0)
                    logging.info("Sent show UI message to existing instance")
                else:
                    logging.error("Could not find existing instance window")

                # Clean up our taskbar icon if we created one
                if hasattr(self, "task_bar_icon"):
                    self.task_bar_icon.Destroy()
            return False  # Exit this instance

        # We are the first/only instance
        if WINDOWS:
            # Create a hidden window to receive messages
            self.create_hidden_window()

        enable_plugin("kolibri.plugins.app")
        enable_plugin("kolibri_app")

        self.windows = []
        self.kolibri_origin = None
        self.kolibri_url = None

        self.server_manager = ServerManager(self)

        # Only create main window if not in tray-only mode and WebView2 is available
        if not self.tray_only:
            if WINDOWS and not is_webview2_installed():
                logging.info(
                    "WebView2 not available, browser will open when server is ready"
                )
            else:
                self.create_kolibri_window()

        atexit.register(self.cleanup_on_exit)
        self.start_server()

        return True

    def create_hidden_window(self):
        """Create a hidden window to receive IPC messages on Windows."""
        # Create a hidden frame for IPC
        self.hidden_window = wx.Frame(None, -1, f"{APP_NAME}_IPC_Window")
        self.hidden_window.Show(False)

        # Allow lower-privilege processes to send WM_SHOW_KOLIBRI_UI to this window.
        # This is necessary to prevent "Access is denied" errors,
        # when the main process is running with elevated privileges.
        ctypes.windll.user32.ChangeWindowMessageFilterEx(
            self.hidden_window.GetHandle(), WM_SHOW_KOLIBRI_UI, 1, None
        )

        # Set up Windows message handling for inter-process communication
        # This allows new instances to signal the existing instance to show UI
        def wndproc(hwnd, msg, wparam, lparam):
            if msg == WM_SHOW_KOLIBRI_UI:
                wx.CallAfter(self.show_or_create_ui)
                return 0
            return win32gui.DefWindowProc(hwnd, msg, wparam, lparam)

        # Replace the window's default message handler with our custom one
        win32gui.SetWindowLong(
            self.hidden_window.GetHandle(), win32con.GWL_WNDPROC, wndproc
        )

    def show_or_create_ui(self):
        """Show existing UI window or create a new one."""
        if self.windows and self.windows[0]:
            # We have an existing window, show it
            main_window = self.windows[0]
            if not main_window.view.IsShown():
                main_window.view.Show()
            main_window.view.Raise()
            main_window.view.SetFocus()
        else:
            # No window exists, create one
            if self.kolibri_url:
                # Server is ready, create window with URL
                self.create_kolibri_window(url=self.kolibri_url)
            else:
                # Server not ready yet, create window with loading screen
                self.create_kolibri_window()

    @property
    def view(self):
        if self.windows:
            return self.windows[0]
        return None

    def start_server(self):
        """Start the server and show notification if on Windows."""
        if WINDOWS:
            # Show "server starting" notification immediately
            self.task_bar_icon.notify_server_starting()

            # Set up a timer to show the notification again if server takes too long
            self.server_start_timer = wx.Timer(self)
            self.Bind(wx.EVT_TIMER, self.on_server_start_timer, self.server_start_timer)
            self.server_start_timer.Start(5000)

        self.server_manager.start()

    def on_server_start_timer(self, event):
        """Called periodically while server is starting."""
        if WINDOWS:
            # Only show notification again if server is still not ready
            if not self.kolibri_url:
                self.task_bar_icon.notify_server_starting()

    def shutdown(self):
        """Shutdown the server."""
        if self.server_start_timer:
            self.server_start_timer.Stop()
            self.server_start_timer = None

        self.server_manager.shutdown()

    def cleanup_on_exit(self):
        """Cleanup function called on app exit."""
        self.shutdown()

    def create_kolibri_window(self, url=None):
        # On Windows, check if WebView2 is available
        if WINDOWS and not is_webview2_installed():
            # WebView2 not available, open in browser instead
            if url:
                webbrowser.open(url)
            elif self.kolibri_url:
                webbrowser.open(self.kolibri_url)
            else:
                logging.warning(
                    "Cannot open UI: WebView2 not available and no URL ready yet"
                )
            return None

        window = KolibriView(self, url=url)

        self.windows.append(window)
        window.show()
        return window

    def should_load_url(self, url):
        if (
            url is not None
            and url.startswith("http")
            and not url.startswith("http://localhost")
        ):
            webbrowser.open(url)
            return False

        return True

    def get_state(self):
        try:
            with open(
                os.path.join(KOLIBRI_HOME, STATE_FILE), "r", encoding="utf-8"
            ) as f:
                return json.load(f)
        except (IOError, PermissionError, ValueError):
            return {}

    def save_state(self, view=None):
        try:
            state = {}
            if view and view.get_url():
                state[URL] = view.get_url()
            with open(
                os.path.join(KOLIBRI_HOME, STATE_FILE), "w", encoding="utf-8"
            ) as f:
                return json.dump(state, f)
        except (IOError, ValueError):
            return {}

    def load_kolibri(self, listen_port, root_url=None):
        self.kolibri_origin = "http://localhost:{}".format(listen_port)

        if self.server_start_timer:
            self.server_start_timer.Stop()
            self.server_start_timer = None

        # Check for saved URL, which exists when the app was put to sleep last time it ran
        saved_state = self.get_state()
        logging.debug("Persisted State: {}".format(saved_state))

        # activate app mode
        next_url = None
        if URL in saved_state and saved_state[URL].startswith(self.kolibri_origin):
            next_url = saved_state[URL]

        if root_url:
            # On Windows, root_url is provided by the server process
            final_url = f"{root_url}?next={next_url}" if next_url else root_url
        else:
            # On other platforms, we construct the URL ourselves
            final_url = self.kolibri_origin + interface.get_initialize_url(
                next_url=next_url
            )
        self.kolibri_url = final_url
        logging.info(f"Loading Kolibri at: {final_url}")

        # Show notification that server is ready
        if WINDOWS:
            self.task_bar_icon.notify_server_ready(final_url)

        # Handle UI loading based on WebView2 availability
        if self.view:
            # We have a WebView window, load URL in it
            wx.CallAfter(self.view.load_url, final_url)
        elif not self.tray_only:
            # Not in tray-only mode but no view (likely WebView2 unavailable), open in browser
            if WINDOWS and not is_webview2_installed():
                logging.info("WebView2 not available, opening in browser")
                webbrowser.open(final_url)
            else:
                logging.info("No main window available to load URL")
        else:
            logging.info("Running in tray-only mode, URL ready for when UI is opened")

    def notify_server_failed(self):
        """Called when server fails to start."""
        if self.server_start_timer:
            self.server_start_timer.Stop()
            self.server_start_timer = None

        # Show failure notification
        if WINDOWS:
            self.task_bar_icon.notify_server_failed()
