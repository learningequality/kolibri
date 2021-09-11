import initialization  # keep this first, to ensure we're set up for other imports

import logging
import os

# initialize logging before loading any third-party modules, as they may cause logging to get configured.
logging.basicConfig(level=logging.DEBUG)

import pew
import pew.ui

from config import KOLIBRI_PORT

pew.set_app_name("Kolibri")
logging.info("Entering main.py...")


if pew.ui.platform == "android":

    from android_utils import get_home_folder, get_version_name

    os.environ["KOLIBRI_HOME"] = get_home_folder()
    os.environ["KOLIBRI_APK_VERSION_NAME"] = get_version_name()
    # We can't use symlinks as at least some Android devices have the user storage
    # and app data directories on different mount points.
    os.environ['KOLIBRI_STATIC_USE_SYMLINKS'] = "False"


def get_init_url(next_url='/'):
    # we need to initialize Kolibri to allow us to access the app key
    from kolibri.utils.cli import initialize
    initialize(skip_update=True)

    from kolibri.plugins.app.utils import interface
    return interface.get_initialize_url(next_url=next_url)


def start_kolibri(port):

    os.environ["KOLIBRI_HTTP_PORT"] = str(port)

    if pew.ui.platform == "android":

        logging.info("Starting kolibri server via Android service...")

        from android_utils import start_service
        start_service("kolibri", dict(os.environ))

    else:

        logging.info("Starting kolibri server directly as thread...")

        from kolibri_utils import start_kolibri_server

        thread = pew.ui.PEWThread(target=start_kolibri_server)
        thread.daemon = True
        thread.start()


class Application(pew.ui.PEWApp):

    def setUp(self):
        """
        Start your UI and app run loop here.
        """

        # Set loading screen
        self.loader_url = "file:///android_asset/_load.html"
        self.kolibri_loaded = False
        self.view = pew.ui.WebUIView("Kolibri", self.loader_url, delegate=self)

        # start kolibri server
        start_kolibri(KOLIBRI_PORT)

        self.load_thread = pew.ui.PEWThread(target=self.wait_for_server)
        self.load_thread.daemon = True
        self.load_thread.start()

        # make sure we show the UI before run completes, as otherwise
        # it is possible the run can complete before the UI is shown,
        # causing the app to shut down early
        self.view.show()
        return 0

    def page_loaded(self, url):
        """
        This is a PyEverywhere delegate method to let us know the WebView is ready to use.
        """

        # On Android, there is a system back button, that works like the browser back button. Make sure we clear the
        # history after first load so that the user cannot go back to the loading screen. We cannot clear the history
        # during load, so we do it here.
        # For more info, see: https://stackoverflow.com/questions/8103532/how-to-clear-webview-history-in-android
        if (
            pew.ui.platform == "android"
            and not self.kolibri_loaded
            and url != self.loader_url
        ):
            # FIXME: Change pew to reference the native webview as webview.native_webview rather than webview.webview
            # for clarity.
            self.kolibri_loaded = True
            self.view.webview.webview.clearHistory()

    def wait_for_server(self):
        from kolibri.utils.server import wait_for_status
        from kolibri.utils.server import STATUS_RUNNING
        home_url = "http://localhost:{port}".format(port=KOLIBRI_PORT)

        # Tie up this thread until the server is running
        while not wait_for_status(STATUS_RUNNING):
            logging.info("Kolibri server not yet started")

        # Check for saved URL, which exists when the app was put to sleep last time it ran
        saved_state = self.view.get_view_state()
        logging.debug("Persisted View State: {}".format(self.view.get_view_state()))

        next_url = '/'
        if "URL" in saved_state and saved_state["URL"].startswith(home_url):
            next_url = saved_state["URL"].replace(home_url, '')

        start_url = home_url + get_init_url(next_url)
        pew.ui.run_on_main_thread(self.view.load_url, start_url)

        if pew.ui.platform == "android":
            from remoteshell import launch_remoteshell
            self.remoteshell_thread = pew.ui.PEWThread(target=launch_remoteshell)
            self.remoteshell_thread.daemon = True
            self.remoteshell_thread.start()

    def get_main_window(self):
        return self.view


if __name__ == "__main__":
    app = Application()
    app.run()
