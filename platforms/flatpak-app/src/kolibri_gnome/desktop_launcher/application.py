import logging

logger = logging.getLogger(__name__)

import json
import os
import subprocess
import threading
import time

from functools import partial
from gettext import gettext as _
from urllib.parse import urljoin
from urllib.parse import urlsplit
from urllib.parse import urlunsplit

import pew
import pew.ui

from pew.ui import PEWShortcut

import gi

gi.require_version("WebKit2", "4.0")
from gi.repository import Gio
from gi.repository import GLib
from gi.repository import WebKit2

from .. import config

from ..globals import KOLIBRI_APP_DEVELOPER_EXTRAS
from ..globals import XDG_CURRENT_DESKTOP
from ..kolibri_daemon_proxy import KolibriDaemonProxy

from .utils import get_localized_file


class RedirectLoading(Exception):
    pass


class RedirectError(Exception):
    pass


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
    def __init__(
        self, name, url, loader_url=None, await_kolibri_fn=lambda: None, **kwargs
    ):
        self.__loader_url = loader_url
        self.__await_kolibri_fn = await_kolibri_fn
        self.__target_url = None
        self.__load_url_lock = threading.Lock()
        self.__redirect_thread = None

        super().__init__(name, url, **kwargs)

    @property
    def target_url(self):
        return self.__target_url

    def shutdown(self):
        self.delegate.remove_window(self)

    def load_url(self, url):
        with self.__load_url_lock:
            self.__target_url = url
            try:
                redirect_url = self.delegate.get_redirect_url(url)
            except RedirectLoading:
                self.__load_url_loading()
            except RedirectError:
                self.__load_url_error()
            else:
                super().load_url(redirect_url)
        self.present_window()

    def get_current_or_target_url(self):
        if self.current_url == self.__loader_url:
            return self.__target_url
        else:
            return self.get_url()

    def is_showing_loading_screen(self):
        return self.current_url == self.__loader_url

    def open_window(self):
        target_url = self.get_url()
        if target_url == self.__loader_url:
            self.delegate.open_window(None)
        else:
            self.delegate.open_window(target_url)

    def open_in_browser(self):
        url = self.get_current_or_target_url()
        self.delegate.open_in_browser(url)

    def open_kolibri_home(self):
        self.delegate.open_kolibri_home()

    def __load_url_loading(self):
        if self.current_url != self.__loader_url:
            super().load_url(self.__loader_url)

        if not self.__redirect_thread:
            self.__redirect_thread = pew.ui.PEWThread(
                target=self.__do_redirect_on_load, args=()
            )
            self.__redirect_thread.daemon = True
            self.__redirect_thread.start()

    def __load_url_error(self):
        if self.current_url == self.__loader_url:
            pew.ui.run_on_main_thread(self.evaluate_javascript, "show_error()")
        else:
            super().load_url(self.__loader_url)
            pew.ui.run_on_main_thread(
                self.evaluate_javascript, "window.onload = function() { show_error() }"
            )

    def __do_redirect_on_load(self):
        self.__await_kolibri_fn()
        self.load_url(self.__target_url)


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
        self.gtk_webview.connect("decide-policy", self.__gtk_webview_on_decide_policy)
        self.gtk_webview.connect("create", self.__gtk_webview_on_create)

        # Maximize windows on Endless OS
        if hasattr(self, "gtk_window") and XDG_CURRENT_DESKTOP == "endless:GNOME":
            self.gtk_window.maximize()

        super().show()

    def __gtk_webview_on_decide_policy(self, webview, decision, decision_type):
        if decision_type == WebKit2.PolicyDecisionType.NEW_WINDOW_ACTION:
            # Force internal _blank links to open in the same window
            target_uri = decision.get_request().get_uri()
            frame_name = decision.get_frame_name()
            if frame_name == "_blank" and self.delegate.is_kolibri_app_url(target_uri):
                decision.ignore()
                pew.ui.run_on_main_thread(self.load_url, target_uri)
                return True
        return False

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
        self.__is_ready_event = threading.Event()

        loader_path = get_localized_file(
            os.path.join(config.DATA_DIR, "assets", "_load-{}.html"),
            os.path.join(config.DATA_DIR, "assets", "_load.html"),
        )
        self.__loader_url = "file://{path}".format(path=os.path.abspath(loader_path))

        self.__kolibri_daemon = KolibriDaemonProxy()

        self.__windows = []

        super().__init__(*args, **kwargs)

    def init_ui(self):
        if len(self.__windows) > 0:
            return

        self.__kolibri_daemon.init_async(
            GLib.PRIORITY_DEFAULT, None, self.__kolibri_daemon_on_init
        )

        self.open_window()

    def shutdown(self):
        self.__kolibri_daemon.release()
        super().shutdown()

    def __kolibri_daemon_on_init(self, source, result):
        success = self.__kolibri_daemon.init_finish(result)
        if success:
            self.__kolibri_daemon.connect("notify", self.__kolibri_daemon_on_notify)
            self.__kolibri_daemon_on_notify(self.__kolibri_daemon, None)
            self.__kolibri_daemon.hold(
                result_handler=self.__kolibri_daemon_null_result_handler
            )
            self.__kolibri_daemon.start(
                result_handler=self.__kolibri_daemon_null_result_handler
            )
        else:
            logger.warning("Error initializing KolibriDaemonProxy")

    def __kolibri_daemon_null_result_handler(self, proxy, result, user_data):
        pass

    def __kolibri_daemon_on_notify(self, kolibri_daemon, param_spec):
        if self.__kolibri_daemon.is_started() or self.__kolibri_daemon.is_error():
            self.__is_ready_event.set()
        else:
            self.__is_ready_event.clear()

    def __await_kolibri_daemon_is_ready(self):
        self.__is_ready_event.wait()
        return self.__kolibri_daemon.is_started()

    def get_redirect_url(self, url):
        if self.__kolibri_daemon.is_error():
            raise RedirectError()
        elif self.__kolibri_daemon.is_loading():
            raise RedirectLoading()
        elif self.is_kolibri_app_url(url):
            return self.__kolibri_daemon.get_initialize_url(
                url() if callable(url) else url
            )
        else:
            return url

    def open_window(self, target_url=None):
        return self.__open_window(target_url)

    def __open_window(self, target_url=None):
        target_url = target_url or self.__get_kolibri_url

        if not self.__should_load_url(target_url):
            return None

        window = KolibriWindow(
            _("Kolibri"),
            target_url,
            delegate=self,
            loader_url=self.__loader_url,
            await_kolibri_fn=self.__await_kolibri_daemon_is_ready,
        )

        self.add_window(window)
        window.show()

        return window

    def __should_load_url(self, url):
        if self.is_kolibri_app_url(url):
            return True
        elif self.__is_loader_url(url):
            return not self.__kolibri_daemon.is_started()
        elif not url.startswith("about:"):
            subprocess.call(["xdg-open", url])
            return False
        return True

    def is_kolibri_app_url(self, url):
        return callable(url) or self.__kolibri_daemon.is_kolibri_app_url(url)

    def __is_loader_url(self, url):
        return url and not callable(url) and url.startswith(self.__loader_url)

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

        if parse.path and parse.path != "/":
            item_path = "/learn"
            if parse.path.startswith("/"):
                # Sometimes the path has a / prefix. We need to avoid double
                # slashes for Kolibri's JavaScript router.
                item_fragment = "/topics" + parse.path
            else:
                item_fragment = "/topics/" + parse.path
        elif parse.query:
            item_path = "/learn"
            item_fragment = "/search"
        else:
            item_path = "/"
            item_fragment = ""

        if parse.query:
            item_fragment += "?{}".format(parse.query)

        target_url = partial(
            self.__get_kolibri_url, path=item_path, fragment=item_fragment
        )

        try:
            last_window = self.__windows[-1]
        except IndexError:
            last_window = None

        if last_window:
            last_window.load_url(target_url)
        else:
            self.open_window(target_url)

    def __get_kolibri_url(self, **kwargs):
        base_url = urlsplit(self.__kolibri_daemon.base_url)
        if "path" in kwargs:
            kwargs["path"] = urljoin(base_url.path, kwargs["path"].lstrip("/"))
        target_url = base_url._replace(**kwargs)
        return urlunsplit(target_url)

    def open_in_browser(self, url):
        subprocess.call(["xdg-open", url])

    def open_kolibri_home(self):
        subprocess.call(["xdg-open", self.__kolibri_daemon.kolibri_home])
