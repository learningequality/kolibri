import initialization  # keep this first, to ensure we're set up for other imports

import logging
import os
import threading

# initialize logging before loading any third-party modules, as they may cause logging to get configured.
logging.basicConfig(level=logging.DEBUG)

from config import KOLIBRI_PORT
from jnius import detach

from android_utils import get_home_folder, get_version_name
from webview import AndroidWebView

os.environ["KOLIBRI_HOME"] = get_home_folder()
os.environ["KOLIBRI_APK_VERSION_NAME"] = get_version_name()


class AndroidThread(threading.Thread):
    """
    AndroidThread is a subclass of the Python threading.Thread object that allows it
    to work with some native platforms that require additional handling when interacting
    with the GUI. The API for AndroidThread mimics threading.Thread exactly, so please refer
    to that for API documentation.
    """
    def __init__(self, group=None, target=None, name=None, args=(), kwargs={}):
        super(AndroidThread, self).__init__(group, target, name, args, kwargs)

    def run(self):
        try:
            super(AndroidThread, self).run()
        except Exception as e:
            import traceback
            if hasattr(self, "target"):
                logging.error("Error occurred in %r thread. Error details:" % self.target)
            logging.error(traceback.format_exc(e))
        finally:
            detach()



def get_init_url(next_url='/'):
    # we need to initialize Kolibri to allow us to access the app key
    from kolibri.utils.cli import initialize
    initialize(skip_update=True)

    from kolibri.plugins.app.utils import interface
    return interface.get_initialize_url(next_url=next_url)


def start_kolibri(port):

    os.environ["KOLIBRI_HTTP_PORT"] = str(port)

    logging.info("Starting kolibri server via Android service...")

    from android_utils import start_service
    start_service("kolibri", dict(os.environ))

class Application(object):

    def run(self):
        """
        Start your UI and app run loop here.
        """

        self.kolibri_loaded = False
        self.kolibri_origin = "http://localhost:{port}".format(port=KOLIBRI_PORT)
        self.view = AndroidWebView()

        # start kolibri server
        start_kolibri(KOLIBRI_PORT)

        self.wait_for_server()

        from remoteshell import launch_remoteshell
        self.remoteshell_thread = AndroidThread(target=launch_remoteshell)
        self.remoteshell_thread.daemon = True
        self.remoteshell_thread.start()

        return 0

    def wait_for_server(self):
        from kolibri.utils.server import wait_for_status
        from kolibri.utils.server import STATUS_RUNNING

        # Tie up this thread until the server is running
        while not wait_for_status(STATUS_RUNNING):
            logging.info("Kolibri server not yet started")

        # Check for saved URL, which exists when the app was put to sleep last time it ran
        saved_state = self.view.get_view_state()
        logging.debug("Persisted View State: {}".format(self.view.get_view_state()))

        next_url = '/'
        if "URL" in saved_state and saved_state["URL"].startswith(self.kolibri_origin):
            next_url = saved_state["URL"].replace(self.kolibri_origin, '')

        start_url = self.kolibri_origin + get_init_url(next_url)
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
