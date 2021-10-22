from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

import re
import subprocess
import sys
import typing

from gettext import gettext as _
from pathlib import Path
from urllib.parse import parse_qs
from urllib.parse import urlsplit

import pew
import pew.ui

from pew.pygobject_gtk.menus import PEWMenuItem
from pew.ui import PEWShortcut

from gi.repository import GObject
from gi.repository import Gtk
from gi.repository import WebKit2

from kolibri_app.config import DATA_DIR
from kolibri_app.globals import KOLIBRI_APP_DEVELOPER_EXTRAS
from kolibri_app.globals import KOLIBRI_HOME_PATH
from kolibri_app.globals import XDG_CURRENT_DESKTOP

from .kolibri_daemon_manager import KolibriDaemonManager
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

    def on_navigate_home(self):
        self.load_url(self.default_url)

    def on_navigate_back(self):
        self.go_back()

    def on_navigate_forward(self):
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

    __target_url: str = None
    __was_kolibri_started: bool = False

    def __init__(self, name: str, url: str = None, **kwargs):
        super().__init__(name, url, **kwargs)

    @property
    def default_url(self) -> str:
        return self.delegate.default_url

    @property
    def kolibri_daemon(self) -> KolibriDaemonManager:
        return self.delegate.kolibri_daemon

    def shutdown(self):
        self.delegate.remove_window(self)

    def kolibri_change_notify(self):
        if self.__target_url:
            self.load_url(self.__target_url)
        elif not self.kolibri_daemon.is_started():
            # Convert current URL to a new kolibri-app URL for deferred loading
            self.load_url(self.delegate.url_to_x_kolibri_app(self.get_url()))

        is_kolibri_started = self.kolibri_daemon.is_started()
        if is_kolibri_started and not self.__was_kolibri_started:
            self.on_kolibri_started()
        self.__was_kolibri_started = is_kolibri_started

    def on_kolibri_started(self):
        pass

    def load_url(self, url: str):
        if self.kolibri_daemon.is_error():
            self.__target_url = url
            self.__load_url_error()
        elif self.kolibri_daemon.is_loading():
            self.__target_url = url
            self.__load_url_loading()
        else:
            full_url = self.delegate.get_full_url(url)
            if self.get_url() != full_url:
                self.__target_url = None
                super().load_url(full_url)
                self.present_window()

    def __load_url_loading(self):
        loading_url = self.delegate.get_loader_url("loading")
        if self.current_url != loading_url:
            super().load_url(loading_url)

    def __load_url_error(self):
        error_url = self.delegate.get_loader_url("error")
        if self.current_url != error_url:
            super().load_url(error_url)

    def get_current_or_target_url(self) -> str:
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
    _open_in_browser_menu_item: PEWMenuItem
    _back_menu_item: PEWMenuItem
    _forward_menu_item: PEWMenuItem
    _home_menu_item: PEWMenuItem

    def __init__(self, *args, **kwargs):
        self._open_in_browser_menu_item = PEWMenuItem(
            _("Open in Browser"), handler=self.on_open_in_browser
        )
        self._open_in_browser_menu_item.gio_action.set_enabled(False)

        self._back_menu_item = PEWMenuItem(
            _("Back"),
            handler=self.on_navigate_back,
            shortcut=PEWShortcut("[", modifiers=["CTRL"]),
        )
        self._back_menu_item.gio_action.set_enabled(False)

        self._forward_menu_item = PEWMenuItem(
            _("Forward"),
            handler=self.on_navigate_forward,
            shortcut=PEWShortcut("]", modifiers=["CTRL"]),
        )
        self._forward_menu_item.gio_action.set_enabled(False)

        self._home_menu_item = PEWMenuItem(
            _("Home"),
            handler=self.on_navigate_home,
            shortcut=PEWShortcut("Home", modifiers=["ALT"]),
        )
        self._home_menu_item.gio_action.set_enabled(True)

        menu_bar = self.build_menu_bar()

        super().__init__(*args, **kwargs)

        self.set_menubar(menu_bar)

    def build_menu_bar(self):
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
        view_menu.add_item(self._open_in_browser_menu_item)
        menu_bar.add_menu(view_menu)

        history_menu = pew.ui.PEWMenu(_("History"))
        history_menu.add_item(self._back_menu_item)
        history_menu.add_item(self._forward_menu_item)
        history_menu.add_item(self._home_menu_item)
        menu_bar.add_menu(history_menu)

        help_menu = pew.ui.PEWMenu(_("Help"))
        help_menu.add(
            _("Documentation"),
            handler=self.on_documentation,
            shortcut=PEWShortcut("F1"),
        )
        help_menu.add(_("Community Forums"), handler=self.on_forums)
        menu_bar.add_menu(help_menu)

        return menu_bar

    def show(self):
        if hasattr(self, "gtk_window"):
            self._tweak_gtk_ui()

        # Maximize windows on Endless OS
        if hasattr(self, "gtk_window") and XDG_CURRENT_DESKTOP == "endless:GNOME":
            self.gtk_window.maximize()

        super().show()

    def _tweak_gtk_ui(self):
        # TODO: Implement this in pyeverywhere

        # Navigation buttons for the header bar

        navigation_box = Gtk.Box.new(Gtk.Orientation.HORIZONTAL, 0)
        navigation_box.get_style_context().add_class("linked")
        self._NativeWebView__gtk_header_bar.pack_start(navigation_box)

        back_button = Gtk.Button.new_from_icon_name(
            "go-previous-symbolic", Gtk.IconSize.BUTTON
        )
        back_button.set_action_name("win." + self._back_menu_item.gio_action.get_name())
        navigation_box.add(back_button)

        forward_button = Gtk.Button.new_from_icon_name(
            "go-next-symbolic", Gtk.IconSize.BUTTON
        )
        forward_button.set_action_name(
            "win." + self._forward_menu_item.gio_action.get_name()
        )
        navigation_box.add(forward_button)

        # Additional functionality for the webview

        if KOLIBRI_APP_DEVELOPER_EXTRAS:
            self.gtk_webview.get_settings().set_enable_developer_extras(True)

        self.gtk_webview.connect("create", self.__gtk_webview_on_create)
        self.gtk_webview.connect("notify::uri", self.__gtk_webview_on_notify_uri)
        self.gtk_webview.get_back_forward_list().connect(
            "changed", self.__gtk_webview_back_forward_list_on_changed
        )

        # Set WM_CLASS for improved window management
        # FIXME: GTK+ strongly discourages doing this:
        #        <https://docs.gtk.org/gtk3/method.Window.set_wmclass.html>
        #        However, our WM_CLASS becomes `"main.py", "Main.py"`, which
        #        causes GNOME Shell to treat unique instances of this
        #        application (with different application IDs) as the same.

        self.gtk_window.set_wmclass("Kolibri", self.delegate.application_id)

    def __gtk_webview_on_create(
        self, webview: WebKit2.WebView, navigation_action: WebKit2.NavigationAction
    ) -> WebKit2.WebView:
        # TODO: Implement this behaviour in pyeverywhere, and pass the related
        #       webview to the new window so it can use
        #       `WebKit2.WebView.new_with_related_view`

        target_url = navigation_action.get_request().get_uri()
        window = self.delegate.open_window(target_url)
        if window:
            return window.gtk_webview
        else:
            return None

    def __gtk_webview_on_notify_uri(
        self, webview: WebKit2.WebView, pspec: GObject.ParamSpec
    ):
        # PEWApp.should_load_url is not called when the URL fragment changes.
        # So, when the uri property changes, we may want to check if the URL
        # (including URL fragment) refers to content which belongs inside the
        # window.

        url = webview.get_uri()

        if not url:
            return

        if urlsplit(url).scheme in ("http", "https"):
            self._open_in_browser_menu_item.gio_action.set_enabled(True)
        else:
            self._open_in_browser_menu_item.gio_action.set_enabled(False)

        # It would be nice if we could replace this history item with the
        # previous one, but WebKitGtk doesn't allow for much in the way of
        # history tampering.

        if not self.delegate.should_load_url(url, fallback_to_external=True):
            self.load_url(self.default_url)

    def __gtk_webview_back_forward_list_on_changed(
        self, back_forward_list, item_added, items_removed
    ):
        can_go_back = back_forward_list.get_back_item() is not None
        can_go_forward = back_forward_list.get_forward_item() is not None

        self._back_menu_item.gio_action.set_enabled(can_go_back)
        self._forward_menu_item.gio_action.set_enabled(can_go_forward)


class KolibriGenericWindow(KolibriWindow):
    def __init__(self, *args, **kwargs):
        super().__init__(_("Kolibri"), *args, **kwargs)


class KolibriChannelWindow(KolibriWindow):
    __channel_id: str = None
    __last_good_url: str = None

    def __init__(self, channel_id, *args, **kwargs):
        self.__channel_id = channel_id
        super().__init__(_("Kolibri"), *args, **kwargs)

    @property
    def channel_id(self) -> str:
        return self.__channel_id

    def _tweak_gtk_ui(self):
        super()._tweak_gtk_ui()

        home_button = Gtk.Button.new_from_icon_name(
            "go-home-symbolic", Gtk.IconSize.BUTTON
        )
        home_button.set_action_name("win." + self._home_menu_item.gio_action.get_name())
        self._NativeWebView__gtk_header_bar.pack_start(home_button)

    def on_kolibri_started(self):
        super().on_kolibri_started()

        # TODO: Add KolibriView.set_name in pyeverywhere

        response = self.kolibri_daemon.kolibri_api_get(
            "/api/content/channel/{channel_id}".format(channel_id=self.channel_id)
        )

        if not isinstance(response, dict):
            return

        channel_name = response.get("name")

        if channel_name:
            self._NativeWebView__gtk_header_bar.set_title(channel_name)


class Application(pew.ui.PEWApp):
    handles_open_file_uris = True

    __application_id: str = None
    __kolibri_daemon: KolibriDaemonManager = None
    __loader_url: str = None
    __windows: typing.List[KolibriWindow] = None

    def __init__(self, application_id=None):
        self.__application_id = application_id

        self.__kolibri_daemon = KolibriDaemonManager(self.__on_kolibri_daemon_change)

        loader_path = get_localized_file(
            Path(DATA_DIR, "assets", "_load-{}.html").as_posix(),
            Path(DATA_DIR, "assets", "_load.html"),
        )
        self.__loader_url = loader_path.as_uri()

        self.__windows = []

        super().__init__()

        gtk_application = getattr(self, "gtk_application", None)
        if gtk_application:
            gtk_application.set_inactivity_timeout(INACTIVITY_TIMEOUT_MS)

    @property
    def application_id(self) -> str:
        return self.__application_id

    @property
    def default_url(self) -> str:
        return "x-kolibri-app:/"

    @property
    def kolibri_daemon(self) -> KolibriDaemonManager:
        return self.__kolibri_daemon

    def init_ui(self):
        self.kolibri_daemon.init_kolibri_daemon()
        if len(self.__windows) == 0:
            self.open_window()

    def shutdown(self):
        self.kolibri_daemon.stop_kolibri_daemon()
        super().shutdown()

    def __on_kolibri_daemon_change(self):
        for window in self.__windows:
            window.kolibri_change_notify()

    def open_window(self, target_url: str = None) -> KolibriWindow:
        target_url = target_url or self.default_url

        if not self.should_load_url(target_url, fallback_to_external=True):
            return None

        window = self._create_window(target_url)
        self.add_window(window)
        window.kolibri_change_notify()
        window.show()

        return window

    def _create_window(self, target_url: str) -> KolibriWindow:
        raise NotImplementedError()

    def add_window(self, window: KolibriWindow):
        self.__windows.append(window)

    def remove_window(self, window: KolibriWindow):
        self.__windows.remove(window)

    def handle_open_file_uris(self, urls: list):
        for url in urls:
            self.__handle_open_file_uri(url)

    def __handle_open_file_uri(self, url: str):
        valid_url_schemes = ("kolibri", "x-kolibri-app")

        url_tuple = urlsplit(url)

        if url_tuple.scheme not in valid_url_schemes:
            logger.info("Invalid URL scheme: %s", url)
            return

        last_window = next(reversed(self.__windows), None)

        if last_window:
            last_window.load_url(url)
        else:
            self.open_window(url)

    def open_url_in_external(self, url: str):
        self.open_in_browser(url)

    def should_load_url(self, url: str, fallback_to_external: bool = True) -> bool:
        is_loader_url = url.startswith(self.__loader_url)

        should_load = (
            url == self.default_url
            or urlsplit(url).scheme in ("kolibri", "x-kolibri-app", "about")
            or (is_loader_url and self.kolibri_daemon.is_loading())
            or self.is_kolibri_url(url)
        )

        if fallback_to_external and not (should_load or is_loader_url):
            self.open_url_in_external(url)

        return should_load

    def is_kolibri_url(self, url: str) -> bool:
        return self.kolibri_daemon.is_kolibri_url(url)

    def get_loader_url(self, state: str) -> str:
        return self.__loader_url + "#" + state

    def get_full_url(self, url: str) -> str:
        try:
            return self.parse_kolibri_url(url)
        except ValueError:
            pass

        try:
            return self.parse_x_kolibri_app_url(url)
        except ValueError:
            pass

        return url

    def parse_kolibri_url(self, url: str) -> str:
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
            item_fragment += "?searchTerm={search}".format(
                search=" ".join(url_query["searchTerm"])
            )

        target_url = "{path}#{fragment}".format(path=item_path, fragment=item_fragment)
        return self.kolibri_daemon.get_kolibri_initialize_url(target_url)

    def url_to_x_kolibri_app(self, url: str) -> str:
        return urlsplit(url)._replace(scheme="x-kolibri-app", netloc="").geturl()

    def parse_x_kolibri_app_url(self, url: str) -> str:
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
        return self.kolibri_daemon.get_kolibri_initialize_url(target_url)

    def open_in_browser(self, url: str):
        subprocess.call(["xdg-open", url])

    def open_kolibri_home(self):
        # TODO: It would be better to open self.__dbus_proxy.props.kolibri_home,
        #       but the Flatpak's OpenURI portal only allows us to open files
        #       that exist in our sandbox.
        subprocess.call(["xdg-open", KOLIBRI_HOME_PATH.as_uri()])

    def run(self, argv: list = None):
        self.gtk_application.run(argv or sys.argv)

    def quit(self):
        for window in self.__windows:
            window.close()


class GenericApplication(Application):
    def _create_window(self, target_url: str = None):
        return KolibriGenericWindow(target_url, delegate=self)


class ChannelApplication(Application):
    __channel_id: str = None

    def __init__(self, channel_id: str, *args, **kwargs):
        self.__channel_id = channel_id
        super().__init__(*args, **kwargs)

    @property
    def channel_id(self) -> str:
        return self.__channel_id

    @property
    def default_url(self) -> str:
        return "x-kolibri-app:/learn#topics/{channel_id}".format(
            channel_id=self.channel_id
        )

    def _create_window(self, target_url: str = None) -> KolibriWindow:
        return KolibriChannelWindow(self.channel_id, target_url, delegate=self)

    def open_url_in_external(self, url: str):
        if super().kolibri_daemon.is_kolibri_url(url):
            url = self.url_to_x_kolibri_app(url)
        self.open_in_browser(url)

    def is_kolibri_url(self, url: str) -> bool:
        return super().is_kolibri_url(url) and self.__is_url_in_channel(url)

    def __is_url_in_channel(self, url: str) -> bool:
        # Allow the user to navigate to login and account management pages, as
        # well as URLs related to file storage and general-purpose APIs, but not
        # to other channels or the channel listing page.

        # TODO: This is costly and complicated. Instead, we should be able to
        #       ask the Kolibri web frontend to avoid showing links outside of
        #       the channel, and any such links in a new window.

        url_tuple = urlsplit(url)

        if re.match(
            r"^\/(zipcontent|app|static|downloadcontent|content\/storage)\/?",
            url_tuple.path,
        ):
            return True
        elif re.match(
            r"^\/(?P<lang>[\w\-]+\/)?(user|logout|redirectuser|learn\/app)\/?",
            url_tuple.path,
        ):
            return True
        elif re.match(r"^\/(?P<lang>[\w\-]+\/)?learn\/?", url_tuple.path):
            return self.__is_learn_fragment_in_channel(url_tuple.fragment)
        else:
            return False

    def __is_learn_fragment_in_channel(self, fragment: str) -> bool:
        fragment = fragment.lstrip("/")

        if re.match(r"^(content-unavailable|search)", fragment):
            return True

        contentnode_id = self.__contentnode_id_for_learn_fragment(fragment)

        if contentnode_id is None:
            return False

        if contentnode_id == self.channel_id:
            return True

        response = self.kolibri_daemon.kolibri_api_get(
            "/api/content/contentnode/{contentnode_id}".format(
                contentnode_id=contentnode_id
            )
        )

        if not isinstance(response, dict):
            return False

        contentnode_channel = response.get("channel_id")

        return contentnode_channel == self.channel_id

    def __contentnode_id_for_learn_fragment(self, fragment: str) -> str:
        pattern = r"^topics\/([ct]\/)?(?P<node_id>\w+)"
        match = re.match(pattern, fragment)
        if match:
            return match.group("node_id")

        return None
