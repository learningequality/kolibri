import logging
import os
import sys
import time
import urllib2

# initialize logging before loading any third-party modules, as they may cause logging to get configured.
logging.basicConfig(level=logging.DEBUG)

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


script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(script_dir)
sys.path.append(os.path.join(script_dir, "kolibri", "dist"))

os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri.deployment.default.settings.base"

if pew.ui.platform == "android":
    os.environ["KOLIBRI_HOME"] = get_home_folder()
    os.environ["TZ"] = Timezone.getDefault().getDisplayName()

    logging.info("Home folder: {}".format(os.environ["KOLIBRI_HOME"]))
    logging.info("Timezone: {}".format(os.environ["TZ"]))


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
        loader_url = 'file://{}'.format(loader_page)
        self.webview = pew.ui.WebUIView("Kolibri", loader_url, delegate=self)

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
        self.webview.show()
        return 0

    def load_complete(self):
        """
        This is a PyEverywhere delegate method to let us know the WebView is ready to use. Just pass for now.
        """
        pass

    def wait_for_server(self):
        from kolibri.utils import server
        running = False
        saved_state = self.webview.get_view_state()
        home_url = 'http://localhost:5000'
        while not running:
            try:
                url = home_url
                if "URL" in saved_state and saved_state["URL"].startswith(home_url):
                    url = saved_state["URL"]
                result = urllib2.urlopen(url)
                running = True
                pew.ui.run_on_main_thread(self.webview.load_url(url))
            except Exception as e:
                import traceback
                logging.info('Kolibri server not yet started, checking again in one second...')
                time.sleep(2)

    def get_main_window(self):
        return self.webview

if __name__ == "__main__":
    app = Application()
    app.run()
