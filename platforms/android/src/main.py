import logging
import os
import sys
import time
import pew
import pew.ui

logging.basicConfig(level=logging.DEBUG)
pew.set_app_name("Kolibri")
logging.info("Entering main.py...")


if True:  # pew.ui.platform == "android":
    from jnius import autoclass
    Environment = autoclass('android.os.Environment')
    File = autoclass('java.io.File')
    Timezone = autoclass('java.util.TimeZone')


# TODO check for storage availibility
def get_home_folder():
    kolibri_home_file = File(Environment.getExternalStorageDirectory().toString(), ".kolibri")
    # prevents content from showing up in things like "gallery"
    kolibri_home_file.mkdirs()
    return kolibri_home_file.toString()


sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), "kolibri", "dist"))

os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri.deployment.default.settings.base"

if True:  # pew.ui.platform == "android":
    os.environ["KOLIBRI_HOME"] = get_home_folder()
    # os.environ["TZ"] = Timezone.getDisplayName()

    logging.info("Home folder: {}".format(os.environ["KOLIBRI_HOME"]))
    # logging.info("Timezone: {}".format(os.environ["TZ"]))


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
        self.webview = pew.ui.WebUIView("Kolibri", '_load.html', delegate=self)
        self.webview.show()

        # start thread
        self.thread = pew.ui.PEWThread(target=start_django)
        self.thread.daemon = True
        self.thread.start()

        def serverNotRunning():
            from kolibri.utils import server
            status = True
            try:
                server.get_status()
                status = False

            except:
                logging.basicConfig(level=logging.DEBUG)
                logging.info('get_status failed')

            return status

        while serverNotRunning():
            # seems to be refresh value in get_status code
            time.sleep(3)

        self.webview.load_url("http://localhost:5000")
        self.webview.show()
        # make sure we show the UI before run completes, as otherwise
        # it is possible the run can complete before the UI is shown,
        # causing the app to shut down early

        return 0

    def get_main_window(self):
        return self.webview

if __name__ == "__main__":
    app = Application()
    app.run()
