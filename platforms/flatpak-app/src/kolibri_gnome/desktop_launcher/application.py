import logging
logger = logging.getLogger(__name__)

import os
import subprocess
import threading
import time

from gettext import gettext as _
from urllib.parse import urlsplit, urlunsplit

import pew
import pew.ui

from pew.ui import PEWShortcut

from .. import config

from ..globals import KOLIBRI_HOME, KOLIBRI_URL, KOLIBRI_URL_SPLIT, XDG_CURRENT_DESKTOP, is_kolibri_responding
from ..kolibri_service.kolibri_service import KolibriServiceThread
from .utils import get_localized_file


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
        subprocess.call(['xdg-open', self.get_current_or_target_url()])

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
    def __init__(self, name, url, **kwargs):
        self.__target_url = None
        self.__load_url_lock = threading.Lock()
        self.__redirect_thread = None

        super().__init__(name, url, **kwargs)

    def shutdown(self):
        self.delegate.remove_window(self)

    def load_url(self, url, with_redirect=True):
        with self.__load_url_lock:
            self.__target_url = url
            if with_redirect and self.delegate.is_kolibri_loading():
                self.__load_url_loading()
            elif with_redirect and not self.delegate.is_kolibri_alive():
                self.__load_url_error()
            else:
                super().load_url(url)
        self.present_window()

    def get_target_url(self):
        return self.__target_url

    def get_current_or_target_url(self):
        if self.current_url == self.delegate.loader_url:
            return self.__target_url
        else:
            return self.get_url()

    def is_showing_loading_screen(self):
        return self.current_url == self.delegate.loader_url

    def __load_url_loading(self):
        if self.current_url != self.delegate.loader_url:
            super().load_url(self.delegate.loader_url)

        if not self.__redirect_thread:
            self.__redirect_thread = pew.ui.PEWThread(
                target=self.__do_redirect_on_load,
                args=()
            )
            self.__redirect_thread.daemon = True
            self.__redirect_thread.start()

    def __load_url_error(self):
        if self.current_url == self.delegate.loader_url:
            pew.ui.run_on_main_thread(
                self.evaluate_javascript,
                'show_error()'
            )
        else:
            super().load_url(self.delegate.loader_url)
            pew.ui.run_on_main_thread(
                self.evaluate_javascript,
                'window.onload = function() { show_error() }'
            )

    def __do_redirect_on_load(self):
        if self.delegate.wait_for_kolibri():
            self.load_url(self.__target_url)

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

    def show(self):
        # Maximize windows on Endless OS
        if hasattr(self, 'gtk_window') and XDG_CURRENT_DESKTOP == 'endless:GNOME':
            self.gtk_window.maximize()
        super().show()


class Application(pew.ui.PEWApp):
    application_id = config.APP_ID

    handles_open_file_uris = True

    def __init__(self, *args, **kwargs):
        self.kolibri_service = None

        loader_path = get_localized_file(
            os.path.join(config.DATA_DIR, 'assets', '_load-{}.html'),
            os.path.join(config.DATA_DIR, 'assets', '_load.html'),
        )
        self.loader_url = 'file://{path}'.format(
            path=os.path.abspath(loader_path)
        )

        self.__kolibri_loaded = threading.Event()
        self.__kolibri_loaded_success = None
        self.__kolibri_service = None

        self.__kolibri_run_thread = None
        self.__kolibri_wait_thread = None

        self.__windows = []
        self.__did_init_service = False

        super().__init__(*args, **kwargs)

    def init_ui(self):
        self.__init_service()

        if len(self.__windows) > 0:
            return

        main_window = self.__open_window(KOLIBRI_URL)

        # Check for saved URL, which exists when the app was put to sleep last time it ran
        saved_state = main_window.get_view_state()
        logger.debug("Persisted View State: %s", saved_state)

        if "URL" in saved_state and saved_state["URL"].startswith(KOLIBRI_URL):
            pew.ui.run_on_main_thread(main_window.load_url, saved_state["URL"])

    def __init_service(self):
        if self.__did_init_service:
            return

        self.__did_init_service = True

        # start server
        self.__kolibri_run_thread = pew.ui.PEWThread(target=self.run_server)
        self.__kolibri_run_thread.daemon = False
        self.__kolibri_run_thread.start()

        self.__kolibri_wait_thread = pew.ui.PEWThread(target=self.wait_for_server)
        self.__kolibri_wait_thread.daemon = True
        self.__kolibri_wait_thread.start()

    def shutdown(self):
        if self.__kolibri_service and self.__kolibri_service.is_alive():
            logger.info("Stopping Kolibri service...")
            self.__kolibri_service.stop_kolibri()

        super().shutdown()

    def run_server(self):
        logger.info("Starting Kolibri service...")
        self.__kolibri_service = KolibriServiceThread(retry_timeout_secs=10)
        self.__kolibri_service.start()
        self.__kolibri_service.join()

    def wait_for_server(self):
        while not is_kolibri_responding():
            # There is a corner case here where Kolibri may be running (lock
            # file is created), but responding at a different URL than we
            # expect. This is unlikely, so we are ignoring it here.
            if not self.__kolibri_service:
                logger.warning("Kolibri service was not started")
                self.__kolibri_loaded_success = False
                self.__kolibri_loaded.set()
                return
            elif not self.__kolibri_service.is_alive():
                logger.warning("Kolibri service has died")
                self.__kolibri_loaded_success = False
                self.__kolibri_loaded.set()
                return
            time.sleep(1)

        logger.info("Kolibri service is responding")
        self.__kolibri_loaded_success = True
        self.__kolibri_loaded.set()

    def is_kolibri_loading(self):
        return not self.__kolibri_loaded.is_set()

    def wait_for_kolibri(self):
        return self.__kolibri_loaded.wait()

    def is_kolibri_alive(self):
        return self.__kolibri_loaded.is_set() and self.__kolibri_loaded_success

    def join(self):
        if self.__kolibri_run_thread:
            self.__kolibri_run_thread.join()

    def should_load_url(self, url):
        if url.startswith(KOLIBRI_URL):
            return True
        elif url == self.loader_url:
            return self.is_kolibri_loading() or not self.is_kolibri_alive()
        elif not url.startswith('about:'):
            subprocess.call(['xdg-open', url])
            return False

        return True

    def open_window(self, target_url):
        self.__open_window(target_url)

    def add_window(self, window):
        self.__windows.append(window)

    def remove_window(self, window):
        self.__windows.remove(window)

    def __open_window(self, target_url):
        window = KolibriWindow(_("Kolibri"), target_url, delegate=self)
        self.add_window(window)
        window.show()
        return window

    def handle_open_file_uris(self, uris):
        for uri in uris:
            self.__open_window_for_kolibri_scheme_uri(uri)

    def __open_window_for_kolibri_scheme_uri(self, kolibri_scheme_uri):
        parse = urlsplit(kolibri_scheme_uri)

        if parse.scheme != 'kolibri':
            logger.info("Invalid URI scheme: %s", kolibri_scheme_uri)
            return

        if parse.path and parse.path != '/':
            item_path = '/learn'
            if parse.path.startswith('/'):
                # Sometimes the path has a / prefix. We need to avoid double
                # slashes for Kolibri's JavaScript router.
                item_fragment = '/topics' + parse.path
            else:
                item_fragment = '/topics/' + parse.path
        elif parse.query:
            item_path = '/learn'
            item_fragment = '/search'
        else:
            item_path = '/'
            item_fragment = ''

        if parse.query:
            item_fragment += '?{}'.format(parse.query)

        target_url = KOLIBRI_URL_SPLIT._replace(
            path=item_path,
            fragment=item_fragment
        )

        blank_window = self.__find_blank_window()

        if blank_window:
            blank_window.load_url(urlunsplit(target_url))
        else:
            self.__open_window(urlunsplit(target_url))

    def __find_blank_window(self):
        # If a window hasn't navigated away from the landing page, we will
        # treat it as a "blank" window which can be reused to show content
        # from handle_open_file_uris.
        for window in reversed(self.__windows):
            if window.get_target_url() == KOLIBRI_URL:
                return window
        return None

