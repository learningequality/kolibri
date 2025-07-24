from threading import Thread

from kolibri.main import initialize
from kolibri.plugins.app.utils import interface
from kolibri.plugins.app.utils import SHARE_FILE
from kolibri.utils.conf import OPTIONS
from kolibri.utils.server import KolibriProcessBus
from magicbus.plugins import SimplePlugin

from kolibri_app.logger import logging

share_file = None


class AppPlugin(SimplePlugin):
    def __init__(self, bus, callback):
        self.bus = bus
        self.callback = callback
        self.bus.subscribe("SERVING", self.SERVING)

    def SERVING(self, port):
        self.callback(port, root_url=None)


class PosixServerManager:
    """
    Manages the Kolibri server for non-Windows platforms (macOS, Linux)
    by running it in a separate thread within the same process.
    """

    def __init__(self, app):
        self.app = app
        self.kolibri_server = None
        self.server_thread = None

    def start(self):
        if self.server_thread:
            return

        logging.info("Preparing to start Kolibri server thread")
        self.server_thread = Thread(target=self._run_kolibri_server)
        self.server_thread.daemon = True
        self.server_thread.start()

    def _run_kolibri_server(self):
        initialize()

        if callable(share_file):
            interface.register_capabilities(**{SHARE_FILE: share_file})
        self.kolibri_server = KolibriProcessBus(
            port=OPTIONS["Deployment"]["HTTP_PORT"],
            zip_port=OPTIONS["Deployment"]["ZIP_CONTENT_PORT"],
        )
        AppPlugin(self.kolibri_server, self.app.load_kolibri)
        self.kolibri_server.run()

    def shutdown(self):
        if self.kolibri_server is not None:
            self.kolibri_server.transition("EXITED")
