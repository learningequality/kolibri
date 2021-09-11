import initialization  # keep this first, to ensure we're set up for other imports

import logging

from config import KOLIBRI_PORT

from android_utils import start_service
from webview import AndroidWebView

# we need to initialize Kolibri to allow us to access the app key
from kolibri.utils.cli import initialize
from kolibri.plugins.app.utils import interface
from kolibri.utils.server import wait_for_status
from kolibri.utils.server import STATUS_RUNNING


class Application(object):

    def run(self):
        """
        Start your UI and app run loop here.
        """

        self.kolibri_loaded = False
        self.kolibri_origin = "http://127.0.0.1:{port}".format(port=KOLIBRI_PORT)
        self.view = AndroidWebView()

        logging.info("Initializing Kolibri and running any upgrade routines")
        initialize()

        # start kolibri server
        logging.info("Starting kolibri server via Android service...")
        start_service("server")
        start_service("remoteshell")

        self.wait_for_server()

        return 0
    
    def wait_for_server(self):
        # Tie up this thread until the server is running
        while not wait_for_status(STATUS_RUNNING):
            logging.info("Kolibri server not yet started")

        # Check for saved URL, which exists when the app was put to sleep last time it ran
        saved_state = self.view.get_view_state()
        logging.debug("Persisted View State: {}".format(self.view.get_view_state()))

        next_url = None
        if "URL" in saved_state and saved_state["URL"].startswith(self.kolibri_origin):
            next_url = saved_state["URL"].replace(self.kolibri_origin, '')

        start_url = self.kolibri_origin + interface.get_initialize_url(next_url=next_url)
        self.view.load_url(start_url)

    def should_load_url(self, url):
        if (
            url is not None
            and url.startswith("http")
            and not url.startswith(self.kolibri_origin)
        ):
            return False

        return True


if __name__ == "__main__":
    app = Application()
    app.run()
