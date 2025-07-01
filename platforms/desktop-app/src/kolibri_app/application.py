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
else:
    from kolibri_app.server_manager_posix import PosixServerManager as ServerManager
    from kolibri.plugins.app.utils import interface


STATE_FILE = "app_state.json"

# State keys
URL = "URL"


class KolibriApp(wx.App):
    def OnInit(self):
        """
        Start your UI and app run loop here.
        """

        self.SetAppName(APP_NAME)

        instance_name = "{}_{}".format(APP_NAME, wx.GetUserId())
        self._checker = wx.SingleInstanceChecker(instance_name)
        if self._checker.IsAnotherRunning():
            return True

        enable_plugin("kolibri.plugins.app")
        enable_plugin("kolibri_app")

        self.windows = []
        self.kolibri_origin = None

        self.server_manager = ServerManager(self)

        self.create_kolibri_window()

        atexit.register(self.cleanup_on_exit)
        self.start_server()

        return True

    @property
    def view(self):
        if self.windows:
            return self.windows[0]
        return None

    def start_server(self):
        self.server_manager.start()

    def shutdown(self):
        self.server_manager.shutdown()

    def cleanup_on_exit(self):
        """Cleanup function called on app exit."""
        self.shutdown()

    def create_kolibri_window(self, url=None):
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
        logging.info(f"Loading Kolibri at: {final_url}")

        wx.CallAfter(self.view.load_url, final_url)
