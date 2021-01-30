import logging

logger = logging.getLogger(__name__)

import subprocess

from gettext import gettext as _
from pathlib import Path
from urllib.parse import urlencode
from urllib.parse import urlsplit

import pew
import pew.ui

from pew.ui import PEWShortcut

import gi

from gi.repository import GLib

from .. import config

from ..globals import KOLIBRI_APP_DEVELOPER_EXTRAS
from ..globals import KOLIBRI_HOME_PATH
from ..globals import XDG_CURRENT_DESKTOP
from ..kolibri_daemon_proxy import KolibriDaemonProxy

from .utils import get_localized_file


class MenuEventHandler:
    def on_documentation(self):
        subprocess.call(["xdg-open", "https://kolibri.readthedocs.io/en/latest/"])

    def on_forums(self):
        subprocess.call(["xdg-open", "https://community.learningequality.org/"])

    def on_new_window(self):
        self.open_window()

    def on_close_window(self):
        self.close()

    def on_open_in_browser(self):
        self.open_in_browser()

    def on_open_kolibri_home(self):
        self.open_kolibri_home()

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

    def open_in_browser(self):
        raise NotImplementedError()

    def open_window(self):
        raise NotImplementedError()

    def open_kolibri_home(self):
        raise NotImplementedError()


class KolibriView(pew.ui.WebUIView, MenuEventHandler):
    """
    PyEverywhere UIView subclass for Kolibri. This joins the provided URL with
    Kolibri's base URL, so `load_url` can be given a relative path. In addition,
    it will pin the URL to the application's `loader_url` depending on its
    status.
    """

    def __init__(self, name, url=None, **kwargs):
        super().__init__(name, url, **kwargs)

    def shutdown(self):
        self.delegate.remove_window(self)

    def kolibri_change_notify(self):
        if self.__target_url:
            self.load_url(self.__target_url)
        else:
            self.load_url(self.current_url)

    def load_url(self, url):
        if self.delegate.is_error():
            self.__target_url = url
            self.__load_url_error()
        elif not self.delegate.is_started():
            self.__target_url = url
            self.__load_url_loading()
        else:
            full_url = self.delegate.parse_kolibri_url(url)
            if self.current_url != full_url:
                self.__target_url = None
                super().load_url(full_url)
                self.present_window()

    def __load_url_loading(self):
        if not self.__is_showing_loading_screen():
            super().load_url(self.delegate.loader_url)

    def __load_url_error(self):
        if self.__is_showing_loading_screen():
            pew.ui.run_on_main_thread(self.evaluate_javascript, "show_error()")
        else:
            super().load_url(self.delegate.loader_url)
            pew.ui.run_on_main_thread(
                self.evaluate_javascript, "window.onload = function() { show_error() }"
            )

    def __is_showing_loading_screen(self):
        return self.current_url == self.delegate.loader_url

    def get_current_or_target_url(self):
        if self.__target_url is None:
            return self.get_url()
        else:
            return self.__target_url

    def open_window(self):
        self.delegate.open_window(None)

    def open_in_browser(self):
        url = self.get_current_or_target_url()
        self.delegate.open_in_browser(url)

    def open_kolibri_home(self):
        self.delegate.open_kolibri_home()


class KolibriWindow(KolibriView):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # create menu bar, we do this per-window for cross-platform purposes
        menu_bar = pew.ui.PEWMenuBar()

        file_menu = pew.ui.PEWMenu(_("File"))
        file_menu.add(
            _("New Window"),
            handler=self.on_new_window,
            shortcut=PEWShortcut("N", modifiers=["CTRL"]),
        )
        file_menu.add(
            _("Close Window"),
            handler=self.on_close_window,
            shortcut=PEWShortcut("W", modifiers=["CTRL"]),
        )
        file_menu.add_separator()
        file_menu.add(_("Open Kolibri Home Folder"), handler=self.on_open_kolibri_home)

        menu_bar.add_menu(file_menu)

        view_menu = pew.ui.PEWMenu(_("View"))
        view_menu.add(_("Reload"), handler=self.on_reload)
        view_menu.add(
            _("Actual Size"),
            handler=self.on_actual_size,
            shortcut=PEWShortcut("0", modifiers=["CTRL"]),
        )
        view_menu.add(
            _("Zoom In"),
            handler=self.on_zoom_in,
            shortcut=PEWShortcut("+", modifiers=["CTRL"]),
        )
        view_menu.add(
            _("Zoom Out"),
            handler=self.on_zoom_out,
            shortcut=PEWShortcut("-", modifiers=["CTRL"]),
        )
        view_menu.add_separator()
        view_menu.add(_("Open in Browser"), handler=self.on_open_in_browser)
        menu_bar.add_menu(view_menu)

        history_menu = pew.ui.PEWMenu(_("History"))
        history_menu.add(
            _("Back"),
            handler=self.on_back,
            shortcut=PEWShortcut("[", modifiers=["CTRL"]),
        )
        history_menu.add(
            _("Forward"),
            handler=self.on_forward,
            shortcut=PEWShortcut("]", modifiers=["CTRL"]),
        )
        menu_bar.add_menu(history_menu)

        help_menu = pew.ui.PEWMenu(_("Help"))
        help_menu.add(
            _("Documentation"),
            handler=self.on_documentation,
            shortcut=PEWShortcut("F1"),
        )
        help_menu.add(_("Community Forums"), handler=self.on_forums)
        menu_bar.add_menu(help_menu)

        self.set_menubar(menu_bar)

    def show(self):
        # TODO: Implement this in pyeverywhere
        if KOLIBRI_APP_DEVELOPER_EXTRAS:
            self.gtk_webview.get_settings().set_enable_developer_extras(True)
        self.gtk_webview.connect("create", self.__gtk_webview_on_create)

        # Maximize windows on Endless OS
        if hasattr(self, "gtk_window") and XDG_CURRENT_DESKTOP == "endless:GNOME":
            self.gtk_window.maximize()

        super().show()

    def __gtk_webview_on_create(self, webview, navigation_action):
        # TODO: Implement this behaviour in pyeverywhere, and pass the related
        #       webview to the new window so it can use
        #       `WebKit2.WebView.new_with_related_view`
        target_uri = navigation_action.get_request().get_uri()
        window = self.delegate.open_window(target_uri)
        if window:
            return window.gtk_webview
        else:
            return None


class Application(pew.ui.PEWApp):
    application_id = config.FRONTEND_APPLICATION_ID

    handles_open_file_uris = True

    def __init__(self, *args, **kwargs):
        self.__starting_kolibri = False

        loader_path = get_localized_file(
            Path(config.DATA_DIR, "assets", "_load-{}.html").as_posix(),
            Path(config.DATA_DIR, "assets", "_load.html"),
        )
        self.__loader_url = loader_path.as_uri()

        self.__kolibri_daemon = KolibriDaemonProxy.create_default()
        self.__kolibri_daemon_init_success = None

        self.__windows = []

        super().__init__(*args, **kwargs)

    @property
    def loader_url(self):
        return self.__loader_url

    def init_ui(self):
        if len(self.__windows) > 0:
            return

        self.__kolibri_daemon.init_async(
            GLib.PRIORITY_DEFAULT, None, self.__kolibri_daemon_on_init
        )

        self.open_window()

    def shutdown(self):
        if self.__kolibri_daemon_init_success:
            try:
                self.__kolibri_daemon.release()
            except GLib.Error as error:
                logger.warning(
                    "Error calling KolibriDaemonProxy.release: {}".format(error)
                )
        super().shutdown()

    def __kolibri_daemon_on_init(self, source, result):
        try:
            self.__kolibri_daemon.init_finish(result)
        except GLib.Error as error:
            logger.warning("Error initializing KolibriDaemonProxy: {}".format(error))
            self.__kolibri_daemon_init_success = False
        else:
            self.__kolibri_daemon_init_success = True
            self.__kolibri_daemon.connect("notify", self.__kolibri_daemon_on_notify)
            self.__kolibri_daemon_on_notify(self.__kolibri_daemon, None)

    def __kolibri_daemon_on_notify(self, kolibri_daemon, param_spec):
        if kolibri_daemon.is_stopped():
            if not self.__starting_kolibri:
                GLib.idle_add(self.__start_kolibri)
                self.__starting_kolibri = True
        else:
            self.__starting_kolibri = False

        for window in self.__windows:
            window.kolibri_change_notify()

    def is_started(self):
        return self.__kolibri_daemon.is_started()

    def is_error(self):
        return self.__kolibri_daemon.is_error()

    def __start_kolibri(self):
        self.__kolibri_daemon.hold(
            result_handler=self.__kolibri_daemon_null_result_handler
        )
        self.__kolibri_daemon.start(
            result_handler=self.__kolibri_daemon_null_result_handler
        )
        return GLib.SOURCE_REMOVE

    def __kolibri_daemon_null_result_handler(self, proxy, result, user_data):
        pass

    def open_window(self, target_url=None):
        return self.__open_window(target_url)

    def __open_window(self, target_url=None):
        target_url = target_url or "kolibri:/"

        if not self.should_load_url(target_url):
            return

        window = KolibriWindow(_("Kolibri"), target_url, delegate=self)

        self.add_window(window)
        window.show()

        return window

    def should_load_url(self, url):
        # full_url = self.__kolibri_daemon.get_kolibri_url(url)
        if url.startswith("kolibri:"):
            return True
        elif self.__kolibri_daemon.is_kolibri_app_url(url):
            return True
        elif url == self.loader_url:
            return not self.is_started()
        elif not url.startswith("about:"):
            self.open_in_browser(url)
            return False
        return True

    def add_window(self, window):
        self.__windows.append(window)

    def remove_window(self, window):
        self.__windows.remove(window)

    def handle_open_file_uris(self, uris):
        for uri in uris:
            self.__open_window_for_kolibri_scheme_uri(uri)

    def __open_window_for_kolibri_scheme_uri(self, kolibri_scheme_uri):
        parse = urlsplit(kolibri_scheme_uri)

        if parse.scheme != "kolibri":
            logger.info("Invalid URI scheme: %s", kolibri_scheme_uri)
            return

        try:
            last_window = self.__windows[-1]
        except IndexError:
            last_window = None

        if last_window:
            last_window.load_url(kolibri_scheme_uri)
        else:
            self.open_window(kolibri_scheme_uri)

    def parse_kolibri_url(self, url):
        parse = urlsplit(url)

        if parse.scheme != "kolibri":
            return url

        if parse.path and parse.path != "/":
            item_path = "/learn"
            item_fragment = "/topics/" + parse.path.lstrip("/")
        elif parse.query:
            item_path = "/learn"
            item_fragment = "/search"
        else:
            item_path = "/"
            item_fragment = ""

        if parse.query:
            item_fragment += "?{}".format(parse.query)

        target_url = "{}#{}".format(item_path, item_fragment)

        return self.__kolibri_daemon.get_kolibri_initialize_url(target_url)

    def get_kolibri_url(self, url):
        if self.__kolibri_daemon.is_kolibri_app_url(url):
            return self.__kolibri_daemon.get_kolibri_url(url)
        else:
            initialize_url = "app/api/initialize/{key}?{query}".format(
                key=self.__kolibri_daemon.app_key, query=urlencode({"next": url})
            )
            return self.__kolibri_daemon.get_kolibri_url(initialize_url)

    def open_in_browser(self, url):
        subprocess.call(["xdg-open", url])

    def open_kolibri_home(self):
        # TODO: It would be better to open self.__kolibri_daemon.kolibri_home,
        #       but the Flatpak's OpenURI portal only allows us to open files
        #       that exist in our sandbox.
        subprocess.call(["xdg-open", KOLIBRI_HOME_PATH.as_uri()])
