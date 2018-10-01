import logging
import os
import sys

import pew
pew.set_app_name("Kolibri")

import pew.ui

logging.info("Entering main.py...")

try:
    from jnius import autoclass
    Environment = autoclass('android.os.Environment')
    File = autoclass('java.io.File')
    Timezone = autoclass('java.util.TimeZone')

except:
    pass

# TODO check for storage availibility
def get_home_folder():
    kolibri_home_file = File(Environment.getExternalStorageDirectory().toString(), ".kolibri")
    # prevents content from showing up in things like "gallery"
    kolibri_home_file.mkdirs()
    return kolibri_home_file.toString()


sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), "kolibri", "dist"))

os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri.deployment.default.settings.base"

if pew.ui.platform == "android":
    os.environ["KOLIBRI_HOME"] = get_home_folder()
    os.environ["TZ"] = Timezone.getDefault().toZoneId().toString()

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

        self.webview = pew.ui.WebUIView("Kolibri", 'http://localhost:5000', delegate=self)
        # make sure we show the UI before run completes, as otherwise
        # it is possible the run can complete before the UI is shown,
        # causing the app to shut down early
        self.webview.show()

        self.thread = pew.ui.PEWThread(target=start_django)
        self.thread.daemon = True
        self.thread.start()

        return 0

    def get_main_window(self):
        return self.webview

    def load_complete(self):
        self.webview.load_url("http://localhost:5000")

if __name__ == "__main__":
    app = Application()
    app.run()
