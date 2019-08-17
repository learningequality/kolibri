import logging
import os
import sys
import time
try:
    from urllib2 import urlopen, URLError
except ModuleNotFoundError:
    from urllib.error import URLError
    from urllib.request import urlopen

# initialize logging before loading any third-party modules, as they may cause logging to get configured.
logging.basicConfig(level=logging.DEBUG)

# make sure we add Kolibri's dist folder to the path early on so that we avoid import errors
script_dir = os.path.dirname(os.path.abspath(__file__))
kolibri_package_dir = os.path.join(script_dir, "kolibri", "dist")
print("Kolibri package dir = {}".format(kolibri_package_dir))
sys.path.append(script_dir)
sys.path.append(kolibri_package_dir)


import pew
import pew.ui

pew.set_app_name("Kolibri")
logging.info("Entering main.py...")


if pew.ui.platform == "android":
    from jnius import autoclass
    PythonActivity = autoclass('org.kivy.android.PythonActivity')
    File = autoclass('java.io.File')
    Timezone = autoclass('java.util.TimeZone')


    # TODO check for storage availibility, allow user to chose sd card or internal
    def get_home_folder():
        kolibri_home_file = PythonActivity.getExternalFilesDir(None)
        return kolibri_home_file.toString()


os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri.deployment.default.settings.base"

if pew.ui.platform == "android":
    os.environ["KOLIBRI_HOME"] = get_home_folder()
    os.environ["TZ"] = Timezone.getDefault().getDisplayName()

    logging.info("Home folder: {}".format(os.environ["KOLIBRI_HOME"]))
    logging.info("Timezone: {}".format(os.environ["TZ"]))
else:
    os.environ["KOLIBRI_HOME"] = pew.get_app_files_dir()


def start_django():
    import django
    django.setup()

    from django.conf import settings
    settings.DEBUG = False

    logging.info("Preparing Kolibri for launch...")
    from django.core.management import call_command
    call_command("migrate", interactive=False, database="default")

    call_command("collectstatic", interactive=False)

    # remove this after Kolibri no longer needs it
    if sys.version[0] == '2':
        reload(sys)
        sys.setdefaultencoding('utf8')

    logging.info("Starting server...")
    from kolibri.utils.server import run_server
    run_server(5000)


class Application(pew.ui.PEWApp):
    def setUp(self):
        """
        Start your UI and app run loop here.
        """

        # Set loading screen
        loader_page = os.path.abspath(os.path.join('assets', '_load.html'))
        self.loader_url = 'file://{}'.format(loader_page)
        self.kolibri_loaded = False
        self.view = pew.ui.WebUIView("Kolibri", self.loader_url, delegate=self)

        # start thread
        self.thread = pew.ui.PEWThread(target=start_django)
        self.thread.daemon = True
        self.thread.start()

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
        if pew.ui.platform == 'android' and not self.kolibri_loaded and url != self.loader_url:
            # FIXME: Change pew to reference the native webview as webview.native_webview rather than webview.webview
            # for clarity.
            self.kolibri_loaded = True
            self.view.webview.webview.clearHistory()

    def wait_for_server(self):
        from kolibri.utils import server

        home_url = 'http://localhost:5000'

        # test url to see if servr has started
        def running():
            try:
                urlopen(home_url)
                return True
            except URLError:
                return False

        # Tie up this thread until the server is running
        while not running():
            logging.info('Kolibri server not yet started, checking again in one second...')
            time.sleep(1)

        # Check for saved URL, which exists when the app was put to sleep last time it ran
        saved_state = self.view.get_view_state()
        logging.debug('Persisted View State: {}'.format(self.view.get_view_state()))

        if "URL" in saved_state and saved_state["URL"].startswith(home_url):
            pew.ui.run_on_main_thread(self.view.load_url(saved_state["URL"]))
            return

        pew.ui.run_on_main_thread(self.view.load_url(home_url))

    def get_main_window(self):
        return self.view

if __name__ == "__main__":
    app = Application()
    app.run()
