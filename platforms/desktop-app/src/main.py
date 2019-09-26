import logging
import os
import subprocess
import sys
import time
import webbrowser

try:
    from urllib2 import urlopen, URLError
except ModuleNotFoundError:
    from urllib.error import URLError
    from urllib.request import urlopen

# initialize logging before loading any third-party modules, as they may cause logging to get configured.
logging.basicConfig(level=logging.DEBUG)

# make sure we add Kolibri's dist folder to the path early on so that we avoid import errors
root_dir = os.path.dirname(os.path.abspath(__file__))
if getattr(sys, 'frozen', False) and sys.platform == 'darwin':
    # On Mac, included Python packages go into the lib/python3.6
    root_dir = os.path.join(root_dir, "lib", "python3.6")

kolibri_package_dir = os.path.join(root_dir, "kolibri", "dist")
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

KOLIBRI_ROOT_URL = 'http://localhost:5000'
os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri.deployment.default.settings.base"

app_data_dir = pew.get_app_files_dir()
os.makedirs(app_data_dir, exist_ok=True)

if pew.ui.platform == "android":
    os.environ["KOLIBRI_HOME"] = get_home_folder()
    os.environ["TZ"] = Timezone.getDefault().getDisplayName()

    logging.info("Home folder: {}".format(os.environ["KOLIBRI_HOME"]))
    logging.info("Timezone: {}".format(os.environ["TZ"]))
else:
    os.environ["KOLIBRI_HOME"] = os.path.join(app_data_dir, "kolibri_data")


def start_django():
    from kolibri.utils.cli import main

    logging.info("Starting server...")
    main(["start", "--foreground", "--port=5000"])


class MenuEventHandler:
    def on_documentation(self):
        webbrowser.open('https://kolibri.readthedocs.io/en/latest/')

    def on_forums(self):
        webbrowser.open('https://community.learningequality.org/')

    def on_new_window(self):
        app = pew.ui.get_app()
        if app:
            window = app.create_kolibri_window(KOLIBRI_ROOT_URL)
            app.windows.append(window)
            window.show()

    def on_close_window(self):
        self.close()

    def on_open_kolibri_home(self):
        subprocess.call(['open', os.environ['KOLIBRI_HOME']])

    def on_back(self):
        self.go_back()

    def on_forward(self):
        self.go_forward()

    def on_reload(self):
        self.reload()

    # FIXME: Remove these once the native menu handlers are restored
    def on_redo(self):
        self.webview.Redo()

    def on_undo(self):
        self.webview.Undo()


class KolibriView(pew.ui.WebUIView, MenuEventHandler):
    def __init__(self, *args, **kwargs):
        super(KolibriView, self).__init__(*args, **kwargs)
        MenuEventHandler.__init__(self)

    def shutdown(self):
        """
        By default, WebUIView assumes a single window, to work the same on mobile and desktops.
        Since we allow for multiple windows, make sure we only really shutdown once all windows are
        closed.
        :return:
        """
        app = pew.ui.get_app()
        if app:
            app.windows.remove(self)
            if len(app.windows) > 0:
                # if we still have open windows, don't run shutdown
                return

        super(KolibriView, self).shutdown()


class Application(pew.ui.PEWApp):
    def setUp(self):
        """
        Start your UI and app run loop here.
        """

        # Set loading screen
        loader_page = os.path.abspath(os.path.join('assets', '_load.html'))
        self.loader_url = 'file://{}'.format(loader_page)
        self.kolibri_loaded = False

        self.view = self.create_kolibri_window(self.loader_url)

        self.windows = [self.view]

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

    def create_kolibri_window(self, url):
        window = KolibriView("Kolibri", url, delegate=self)

        # create menu bar, we do this per-window for cross-platform purposes
        menu_bar = pew.ui.PEWMenuBar()

        file_menu = pew.ui.PEWMenu('File')
        file_menu.add('New Window', handler=window.on_new_window)
        file_menu.add('Close Window', handler=window.on_close_window)
        file_menu.add_separator()
        file_menu.add('Open Kolibri Home Folder', handler=window.on_open_kolibri_home)

        menu_bar.add_menu(file_menu)

        edit_menu = pew.ui.PEWMenu('Edit')
        edit_menu.add('Undo', handler=window.on_undo, shortcut='CTRL+Z')
        edit_menu.add('Redo', handler=window.on_redo, shortcut='CTRL+SHIFT+Z')
        edit_menu.add_separator()
        edit_menu.add('Cut', command='cut', shortcut='CTRL+X')
        edit_menu.add('Copy', command='copy', shortcut='CTRL+C')
        edit_menu.add('Paste', command='paste', shortcut='CTRL+V')
        edit_menu.add('Select All', command='select-all', shortcut='CTRL+A')
        menu_bar.add_menu(edit_menu)

        view_menu = pew.ui.PEWMenu('View')
        view_menu.add('Reload', handler=window.on_reload)
        menu_bar.add_menu(view_menu)

        history_menu = pew.ui.PEWMenu('History')
        history_menu.add('Back', handler=window.on_back, shortcut='CTRL+[')
        history_menu.add('Forward', handler=window.on_forward, shortcut='CTRL+]')
        menu_bar.add_menu(history_menu)

        help_menu = pew.ui.PEWMenu('Help')
        help_menu.add('Documentation', handler=window.on_documentation)
        help_menu.add('Community Forums', handler=window.on_forums)
        menu_bar.add_menu(help_menu)

        window.set_menubar(menu_bar)

        return window

    def page_loaded(self, url):
        """
        This is a PyEverywhere delegate method to let us know the WebView is ready to use.
        """

        # Make sure that any attempts to use back functionality don't take us back to the loading screen
        # For more info, see: https://stackoverflow.com/questions/8103532/how-to-clear-webview-history-in-android
        if not self.kolibri_loaded and url != self.loader_url:
            # FIXME: Change pew to reference the native webview as webview.native_webview rather than webview.webview
            # for clarity.
            self.kolibri_loaded = True
            self.view.clear_history()

    def wait_for_server(self):
        from kolibri.utils import server

        home_url = KOLIBRI_ROOT_URL

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
            pew.ui.run_on_main_thread(self.view.load_url, saved_state["URL"])
            return

        pew.ui.run_on_main_thread(self.view.load_url(home_url))

    def get_main_window(self):
        return self.view

if __name__ == "__main__":
    app = Application()
    app.run()
