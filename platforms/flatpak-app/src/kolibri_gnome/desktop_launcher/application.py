import logging
import os
import subprocess
import threading
import time
from gettext import gettext as _
from urllib.parse import urlparse, urlunparse

import pew
import pew.ui
from pew.ui import PEWShortcut

from .. import config
from ..globals import KOLIBRI_HOME, KOLIBRI_URL, KOLIBRI_URL_PARSE
from ..kolibri_service.utils import get_is_kolibri_responding
from ..kolibri_service.kolibri_service import KolibriServiceThread


class MenuEventHandler:
    def on_documentation(self):
        subprocess.call(['xdg-open', 'https://kolibri.readthedocs.io/en/latest/'])

    def on_forums(self):
        subprocess.call(['xdg-open', 'https://community.learningequality.org/'])

    def on_new_window(self):
        self.open_window()

    def on_close_window(self):
        self.close()

    def on_open_in_browser(self):
        subprocess.call(['xdg-open', self.get_url()])

    def on_open_kolibri_home(self):
        subprocess.call(['xdg-open', KOLIBRI_HOME])

    def on_back(self):
        self.go_back()

    def on_forward(self):
        self.go_forward()

    def on_reload(self):
        self.reload()

    def on_actual_size(self):
        self.set_zoom_level(self.default_zoom)

    def on_zoom_in(self):
        self.set_zoom_level(self.get_zoom_level() + 1)

    def on_zoom_out(self):
        self.set_zoom_level(self.get_zoom_level() - 1)

    def get_url(self):
        raise NotImplementedError()

    def open_window(self):
        raise NotImplementedError()


class KolibriView(pew.ui.WebUIView, MenuEventHandler):
    def __init__(self, name, url, load_event=None, **kwargs):
        if load_event.is_set():
            super().__init__(name, url, **kwargs)
            self.__redirect_thread = None
        else:
            delegate = kwargs.get('delegate')
            super().__init__(name, delegate.loader_url, **kwargs)
            self.__redirect_thread = pew.ui.PEWThread(
                target=self.redirect_on_load,
                args=(load_event, url)
            )
            self.__redirect_thread.daemon = True
            self.__redirect_thread.start()

    def shutdown(self):
        """
        By default, WebUIView assumes a single window, to work the same on mobile and desktops.
        Since we allow for multiple windows, make sure we only really shutdown once all windows are
        closed.
        :return:
        """
        app = pew.ui.get_app()
        if app:
            app.shutdown()

    def redirect_on_load(self, event, url):
        if event.wait():
            self.load_url(url)

    def open_window(self):
        target_url = self.get_url()
        if target_url == self.delegate.loader_url:
            target_url = KOLIBRI_URL
        self.delegate.open_window(target_url)


class KolibriWindow(KolibriView):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # create menu bar, we do this per-window for cross-platform purposes
        menu_bar = pew.ui.PEWMenuBar()

        file_menu = pew.ui.PEWMenu(_('File'))
        file_menu.add(_('New Window'), handler=self.on_new_window, shortcut=PEWShortcut('N', modifiers=['CTRL']))
        file_menu.add(_('Close Window'), handler=self.on_close_window, shortcut=PEWShortcut('W', modifiers=['CTRL']))
        file_menu.add_separator()
        file_menu.add(_('Open Kolibri Home Folder'), handler=self.on_open_kolibri_home)

        menu_bar.add_menu(file_menu)

        view_menu = pew.ui.PEWMenu(_('View'))
        view_menu.add(_('Reload'), handler=self.on_reload)
        view_menu.add(_('Actual Size'), handler=self.on_actual_size, shortcut=PEWShortcut('0', modifiers=['CTRL']))
        view_menu.add(_('Zoom In'), handler=self.on_zoom_in, shortcut=PEWShortcut('+', modifiers=['CTRL']))
        view_menu.add(_('Zoom Out'), handler=self.on_zoom_out, shortcut=PEWShortcut('-', modifiers=['CTRL']))
        view_menu.add_separator()
        view_menu.add(_('Open in Browser'), handler=self.on_open_in_browser)
        menu_bar.add_menu(view_menu)

        history_menu = pew.ui.PEWMenu(_('History'))
        history_menu.add(_('Back'), handler=self.on_back, shortcut=PEWShortcut('[', modifiers=['CTRL']))
        history_menu.add(_('Forward'), handler=self.on_forward, shortcut=PEWShortcut(']', modifiers=['CTRL']))
        menu_bar.add_menu(history_menu)

        help_menu = pew.ui.PEWMenu(_('Help'))
        help_menu.add(_('Documentation'), handler=self.on_documentation, shortcut=PEWShortcut('F1'))
        help_menu.add(_('Community Forums'), handler=self.on_forums)
        menu_bar.add_menu(help_menu)

        self.set_menubar(menu_bar)


class Application(pew.ui.PEWApp):
    application_id = config.APP_ID

    def __init__(self, *args, **kwargs):
        self.kolibri_service = None

        loader_page = os.path.abspath(os.path.join(config.DATA_DIR, 'assets', '_load.html'))
        self.loader_url = 'file://{}'.format(loader_page)

        self.kolibri_loaded = threading.Event()
        self.windows = []

        super().__init__(*args, **kwargs)

    def init_ui(self):
        # TODO: Generated translated loading screen, or detect language code
        #       and find the closest match like in kolibri-installer-mac.

        # start server
        self.kolibri_run_thread = pew.ui.PEWThread(target=self.run_server)
        self.kolibri_run_thread.daemon = False
        self.kolibri_run_thread.start()

        self.kolibri_wait_thread = pew.ui.PEWThread(target=self.wait_for_server)
        self.kolibri_wait_thread.daemon = True
        self.kolibri_wait_thread.start()

        # make sure we show the UI before run completes, as otherwise
        # it is possible the run can complete before the UI is shown,
        # causing the app to shut down early
        main_window = self.__open_window(KOLIBRI_URL)

        # Check for saved URL, which exists when the app was put to sleep last time it ran
        saved_state = main_window.get_view_state()
        logging.debug('Persisted View State: {}'.format(main_window.get_view_state()))

        if "URL" in saved_state and saved_state["URL"].startswith(KOLIBRI_URL):
            pew.ui.run_on_main_thread(main_window.load_url, saved_state["URL"])

        return 0

    def shutdown(self):
        # for window in self.windows:
        #     window.close(check_shutdown=False)

        if self.kolibri_service:
            shutdown_thread = pew.ui.PEWThread(target=self.kolibri_service.stop_kolibri)
            shutdown_thread.start()

        super().shutdown()

    def run_server(self):
        logging.info("Starting Kolibri server...")
        self.kolibri_service = KolibriServiceThread()
        self.kolibri_service.start()
        self.kolibri_service.join()
        self.kolibri_service = None

    def wait_for_server(self):
        while not get_is_kolibri_responding():
            # There is a corner case here where Kolibri may be running (lock
            # file is created), but responding at a different URL than we
            # expect. This is unlikely, so we are ignoring it here.
            time.sleep(1)
        logging.info("Kolibri server is responding")
        self.kolibri_loaded.set()

    def should_load_url(self, url):
        if url.startswith(KOLIBRI_URL):
            return True
        elif url == self.loader_url:
            return not self.kolibri_loaded.is_set()
        else:
            subprocess.call(['xdg-open', url])
            return False

        return True

    def open_window(self, target_url):
        self.__open_window(target_url)

    def __open_window(self, target_url):
        window = KolibriWindow(_("Kolibri"), target_url, load_event=self.kolibri_loaded, delegate=self)
        self.windows.append(window)
        window.show()
        return window

    def handle_open_file_uris(self, uris):
        for uri in uris:
            self.__open_window_for_kolibri_scheme_uri(uri)

    def __open_window_for_kolibri_scheme_uri(self, kolibri_uri):
        parse = urlparse(kolibri_uri)

        if parse.scheme != 'kolibri':
            logging.info("Invalid URI scheme", kolibri_uri)
            return

        if parse.path and parse.path != '/':
            item_path = '/learn/#/topics/{}'.format(parse.path)
        elif parse.query:
            item_path = '/learn/#/search'
        else:
            item_path = '/'

        target_url = KOLIBRI_URL_PARSE._replace(
            path=item_path,
            query=parse.query
        )

        self.__open_window(urlunparse(target_url))
