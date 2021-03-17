import logging

logger = logging.getLogger(__name__)

import re
import subprocess

from gettext import gettext as _
from pathlib import Path
from urllib.parse import parse_qs
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


INACTIVITY_TIMEOUT_MS = 10 * 1000  # 10 seconds in milliseconds


class InvalidBaseURLError(ValueError):
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
        elif self.delegate.is_internal_url(self.get_url()):
            self.load_url(self.get_url())
        else:
            # Convert current URL to a new kolibri-app URL for deferred loading
            kolibri_app_url = (
                urlsplit(self.get_url())
                ._replace(scheme="x-kolibri-app", netloc="")
                .geturl()
            )
            self.load_url(kolibri_app_url)

    def load_url(self, url):
        if self.delegate.is_error():
            self.__target_url = url
            self.__load_url_error()
        elif not self.delegate.is_started():
            self.__target_url = url
            self.__load_url_loading()
        else:
            full_url = self.delegate.get_full_url(url)
            if self.get_url() != full_url:
                self.__target_url = None
                super().load_url(full_url)
                self.present_window()

    def __load_url_loading(self):
        loading_url = self.delegate.loader_url + "#loading"
        if self.current_url != loading_url:
            super().load_url(loading_url)

    def __load_url_error(self):
        error_url = self.delegate.loader_url + "#error"
        if self.current_url != error_url:
            super().load_url(error_url)

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


class KolibriWindowDelegate(object):
    # Quick hack to make certain application methods called by pew.ui.WebView
    # available per window, instead. This allows us to have `should_load_url`
    # behave differently for standalone windows.

    def __init__(self, window, delegate):
        self.__window = window
        self.__delegate = delegate

    def __getattr__(self, name):
        return getattr(self.__delegate, name)

    def should_load_url(self, url):
        return self.__delegate.should_load_url(url, window=self.__window)


class KolibriWindow(KolibriView):
    def __init__(self, *args, delegate=None, **kwargs):
        if delegate:
            delegate = KolibriWindowDelegate(self, delegate)
        super().__init__(*args, delegate=delegate, **kwargs)

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

    def accepts_url(self, url):
        return True


class KolibriWindow_Generic(KolibriWindow):
    def __init__(self, *args, **kwargs):
        super().__init__(_("Kolibri"), *args, **kwargs)


class KolibriWindow_Standalone(KolibriWindow):
    def __init__(self, url, *args, **kwargs):
        self.__base_url = url
        super().__init__(_("Kolibri Standalone"), url, *args, **kwargs)

    @property
    def standalone_channel_id(self):
        return ""

    def show(self):
        self.gtk_webview.connect("notify::uri", self.__gtk_webview_on_notify_uri)
        super().show()

    def is_fragment_in_channel(self, fragment):
        BAD_FRAGMENTS = ["/topics/e409b964366a59219c148f2aaa741f43"]
        return fragment not in BAD_FRAGMENTS

    def accepts_url(self, url):
        url_tuple = urlsplit(url)
        if not re.match(r"^\/(?P<lang>.+\/)?learn\/?", url_tuple.path):
            return False
        else:
            return self.is_fragment_in_channel(url_tuple.fragment)

    def __gtk_webview_on_notify_uri(self, webview, pspec):
        # KolibriWindowDelegate.should_load_url doesn't know about hash changes.
        # So, when the URL changes, we need to check if the URL fragment refers
        # to content inside the standalone window. This method should only
        # inspect the URL fragment. Changes to other parts of the URI will go
        # through the usual should_load_url code.

        url = webview.get_uri()
        if not self.accepts_url(url):
            webview.go_back()
            self.delegate.open_window(url, standalone=False)


class Application(pew.ui.PEWApp):
    application_id = config.FRONTEND_APPLICATION_ID

    handles_open_file_uris = True

    def __init__(self, *args, **kwargs):
        self.__did_init = False
        self.__starting_kolibri = False

        loader_path = get_localized_file(
            Path(config.DATA_DIR, "assets", "_load-{}.html").as_posix(),
            Path(config.DATA_DIR, "assets", "_load.html"),
        )
        self.__loader_url = loader_path.as_uri()

        self.__kolibri_daemon = KolibriDaemonProxy.create_default()
        self.__kolibri_daemon_has_error = None
        self.__kolibri_daemon_owner = None

        self.__windows = []

        super().__init__(*args, **kwargs)

        gtk_application = getattr(self, "gtk_application", None)
        if gtk_application:
            gtk_application.set_inactivity_timeout(INACTIVITY_TIMEOUT_MS)

    @property
    def loader_url(self):
        return self.__loader_url

    def init_ui(self):
        if len(self.__windows) > 0:
            return

        if not self.__did_init:
            self.__kolibri_daemon.init_async(
                GLib.PRIORITY_DEFAULT, None, self.__kolibri_daemon_on_init
            )

            self.__did_init = True

        self.open_window()

    def shutdown(self):
        if self.__kolibri_daemon.get_name_owner():
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
            self.__kolibri_daemon_has_error = True
            self.__notify_all_windows()
        else:
            self.__kolibri_daemon_has_error = False
            self.__kolibri_daemon.connect("notify", self.__kolibri_daemon_on_notify)
            self.__kolibri_daemon_on_notify(self.__kolibri_daemon, None)

    def __kolibri_daemon_on_notify(self, kolibri_daemon, param_spec):
        if self.__kolibri_daemon_has_error:
            return

        kolibri_daemon_owner = kolibri_daemon.get_name_owner()
        kolibri_daemon_owner_changed = bool(
            self.__kolibri_daemon_owner != kolibri_daemon_owner
        )
        self.__kolibri_daemon_owner = kolibri_daemon_owner

        if kolibri_daemon_owner_changed:
            self.__starting_kolibri = False
            self.__kolibri_daemon.hold(
                result_handler=self.__kolibri_daemon_null_result_handler
            )

        if self.__starting_kolibri and kolibri_daemon.is_started():
            self.__starting_kolibri = False
        elif self.__starting_kolibri:
            pass
        elif not kolibri_daemon.is_error() or kolibri_daemon_owner_changed:
            self.__starting_kolibri = True
            self.__kolibri_daemon.start(
                result_handler=self.__kolibri_daemon_null_result_handler
            )

        self.__notify_all_windows()

    def __kolibri_daemon_null_result_handler(self, proxy, result, user_data):
        if isinstance(result, Exception):
            logging.warning(
                "Error communicating with KolibriDaemonProxy: {}".format(result)
            )
            self.__kolibri_daemon_has_error = True
        else:
            self.__kolibri_daemon_has_error = False
        self.__notify_all_windows()

    def __notify_all_windows(self):
        for window in self.__windows:
            window.kolibri_change_notify()

    def is_started(self):
        return self.__kolibri_daemon.is_started()

    def is_error(self):
        return self.__kolibri_daemon_has_error or self.__kolibri_daemon.is_error()

    def __kolibri_daemon_hold(self):
        return GLib.SOURCE_REMOVE

    def __kolibri_daemon_start(self):
        return GLib.SOURCE_REMOVE

    def open_window(self, target_url=None, standalone=False):
        target_url = target_url or "x-kolibri-app:/"

        if not self.should_load_url(target_url):
            if not target_url.startswith("about:"):
                self.open_in_browser(target_url)
                return None

        try:
            if standalone:
                window = KolibriWindow_Standalone(target_url, delegate=self)
            else:
                window = KolibriWindow_Generic(target_url, delegate=self)
        except InvalidBaseURLError:
            window = None
        else:
            self.add_window(window)
            window.show()

        return window

    def load_url_in_current_window(self, target_url):
        last_window = next(
            (
                window
                for window in reversed(self.__windows)
                if isinstance(window, KolibriWindow_Generic)
            ),
            None,
        )

        if last_window:
            last_window.load_url(target_url)
        else:
            self.open_window(target_url)

    def is_internal_url(self, url):
        if url.startswith("kolibri:") or url.startswith("x-kolibri-app:"):
            return True
        elif self.__kolibri_daemon.is_kolibri_app_url(url):
            return True
        elif url.startswith(self.loader_url):
            return not self.is_started()
        else:
            return False

    def should_load_url(self, url, window=None):
        if self.is_internal_url(url):
            return True
        elif not url.startswith("about:") and not url.startswith(self.loader_url):
            return False
        elif window:
            return window.accepts_url(url)
        else:
            return True

    def add_window(self, window):
        self.__windows.append(window)

    def remove_window(self, window):
        self.__windows.remove(window)

    def handle_open_file_uris(self, uris):
        for uri in uris:
            self.__open_window_for_kolibri_scheme_uri(uri)

    def __open_window_for_kolibri_scheme_uri(self, kolibri_scheme_uri):
        url_tuple = urlsplit(kolibri_scheme_uri)
        url_query = parse_qs(url_tuple.query, keep_blank_values=True)

        if url_tuple.scheme != "kolibri":
            logger.info("Invalid URI scheme: %s", kolibri_scheme_uri)
            return

        standalone = bool("standalone" in url_query)

        # TODO:
        # If standalone, get existing standalone window, or new window
        # Otherwise, get last generic window

        if standalone:
            self.open_window(kolibri_scheme_uri, standalone=True)
        else:
            self.load_url_in_current_window(kolibri_scheme_uri)

    def get_full_url(self, url):
        try:
            return self.parse_kolibri_url(url)
        except ValueError:
            pass

        try:
            return self.parse_x_kolibri_app_url(url)
        except ValueError:
            pass

        return url

    def parse_kolibri_url(self, url):
        """
        Parse a URL according to the public Kolibri URL format. This format uses
        a single-character identifier for a node type - "t" for topic or "c"
        for content, followed by its unique identifier. It is constrained to
        opening content nodes or search pages.

        Examples:

        - kolibri:t/TOPIC_NODE_ID?searchTerm=addition
        - kolibri:c/CONTENT_NODE_ID
        - kolibri:?searchTerm=addition
        """

        url_tuple = urlsplit(url)
        url_query = parse_qs(url_tuple.query, keep_blank_values=True)

        if url_tuple.scheme != "kolibri":
            raise ValueError()

        if url_tuple.path and url_tuple.path != "/":
            item_path = "/learn"
            item_fragment = "/topics/" + url_tuple.path.lstrip("/")
        elif url_tuple.query:
            item_path = "/learn"
            item_fragment = "/search"
        else:
            item_path = "/"
            item_fragment = ""

        if "searchTerm" in url_query:
            item_fragment += "?searchTerm={}".format(url_query["searchTerm"])

        target_url = "{}#{}".format(item_path, item_fragment)
        return self.__kolibri_daemon.get_kolibri_initialize_url(target_url)

    def parse_x_kolibri_app_url(self, url):
        """
        Parse a URL according to the internal Kolibri app URL format. This
        format is the same as Kolibri's URLs, but without the hostname or port
        number.

        - x-kolibri-app:/device
        """

        url_tuple = urlsplit(url)

        if url_tuple.scheme != "x-kolibri-app":
            raise ValueError()

        target_url = url_tuple._replace(scheme="", netloc="").geturl()
        return self.__kolibri_daemon.get_kolibri_initialize_url(target_url)

    def open_in_browser(self, url):
        subprocess.call(["xdg-open", url])

    def open_kolibri_home(self):
        # TODO: It would be better to open self.__kolibri_daemon.kolibri_home,
        #       but the Flatpak's OpenURI portal only allows us to open files
        #       that exist in our sandbox.
        subprocess.call(["xdg-open", KOLIBRI_HOME_PATH.as_uri()])

    def quit(self):
        for window in self.__windows:
            window.close()
