import json
import os
import webbrowser
from threading import Thread

import wx
from kolibri.main import initialize
from kolibri.plugins.app.utils import interface
from kolibri.plugins.app.utils import SHARE_FILE
from kolibri.utils.conf import KOLIBRI_HOME
from kolibri.utils.server import KolibriProcessBus
from kolibri_app.constants import APP_NAME
from kolibri_app.logger import logging
from kolibri_app.view import KolibriView
from magicbus.plugins import SimplePlugin


share_file = None

STATE_FILE = "app_state.json"

# State keys
URL = "URL"


class AppPlugin(SimplePlugin):
    def __init__(self, bus, callback):
        self.bus = bus
        self.callback = callback
        self.bus.subscribe("SERVING", self.SERVING)

    def SERVING(self, port):
        self.callback(port)


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

        self.windows = []
        self.create_kolibri_window()

        # start server
        self.server_thread = None
        self.kolibri_server = None
        self.kolibri_origin = None
        self.start_server()

        return True

    @property
    def view(self):
        if self.windows:
            return self.windows[0]
        return None

    def start_server(self):
        if self.server_thread:
            del self.server_thread

        logging.info("Preparing to start Kolibri server")
        self.server_thread = Thread(target=self.start_kolibri_server)
        self.server_thread.daemon = True
        self.server_thread.start()

    def start_kolibri_server(self):
        initialize()

        if callable(share_file):
            interface.register_capabilities(**{SHARE_FILE: share_file})
        self.kolibri_server = KolibriProcessBus()
        app_plugin = AppPlugin(self.kolibri_server, self.load_kolibri)
        app_plugin.subscribe()
        self.kolibri_server.run()

    def shutdown(self):
        if self.kolibri_server is not None:
            self.kolibri_server.transition("EXITED")

    def create_kolibri_window(self, url=None):
        window = KolibriView(self, url=url)

        self.windows.append(window)
        window.show()
        return window

    def should_load_url(self, url):
        if (
            url is not None
            and url.startswith("http")
            and self.kolibri_origin is None
            and not url.startswith(self.kolibri_origin)
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
            if view:
                state[URL] = view.get_url()
            with open(
                os.path.join(KOLIBRI_HOME, STATE_FILE), "w", encoding="utf-8"
            ) as f:
                return json.dump(state, f)
        except (IOError, ValueError):
            return {}

    def load_kolibri(self, listen_port):
        self.kolibri_origin = "http://localhost:{}".format(listen_port)

        # Check for saved URL, which exists when the app was put to sleep last time it ran
        saved_state = self.get_state()
        logging.debug("Persisted State: {}".format(saved_state))

        # activate app mode
        next_url = None
        if URL in saved_state and saved_state[URL].startswith(self.kolibri_origin):
            next_url = saved_state[URL]

        root_url = self.kolibri_origin + interface.get_initialize_url(next_url)
        logging.info("root_url = {}".format(root_url))

        wx.CallAfter(self.view.load_url, root_url)
