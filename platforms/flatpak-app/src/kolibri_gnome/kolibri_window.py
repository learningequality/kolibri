from __future__ import annotations

import subprocess
import typing
from gettext import gettext as _
from urllib.parse import urlsplit

import pew.ui
from gi.repository import GObject
from gi.repository import Gtk
from gi.repository import WebKit2
from kolibri_app.globals import KOLIBRI_APP_DEVELOPER_EXTRAS
from kolibri_app.globals import XDG_CURRENT_DESKTOP
from pew.pygobject_gtk.menus import PEWMenuItem
from pew.ui import PEWShortcut

from .kolibri_daemon_manager import KolibriDaemonManager


class _MenuEventHandler:
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


class _KolibriView(pew.ui.WebUIView, _MenuEventHandler):
    """
    PyEverywhere UIView subclass for Kolibri. This joins the provided URL with
    Kolibri's base URL, so `load_url` can be given a relative path. In addition,
    it will pin the URL to the application's `loader_url` depending on its
    status.
    """

    __target_url: typing.Optional[str] = None
    __was_target_url_ever_loaded: bool = False

    def __init__(self, name: str, url: typing.Optional[str] = None, **kwargs):
        self.__target_url = url
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
        self.load_url(self.__target_url)

    def on_kolibri_started(self):
        cookie_manager = self.gtk_webview.get_context().get_cookie_manager()
        cookie_manager.add_cookie(
            self.kolibri_daemon.get_app_key_cookie(), None, self.__on_cookie_ready
        )

    def __on_cookie_ready(self, cookie_manager, result):
        # TODO: Only finish loading after this has completed.
        pass

    def load_url(self, url: str):
        url_to_load = None
        if self.kolibri_daemon.is_error():
            url_to_load = self.delegate.get_loader_url("error")
        elif self.kolibri_daemon.is_loading():
            url_to_load = self.delegate.get_loader_url("loading")
        else:
            # Not loading means it's started:
            url_to_load = self.delegate.get_full_url(url)

        if self.current_url == url_to_load:
            return

        super().load_url(url_to_load)

        if self.kolibri_daemon.is_started() and not self.__was_target_url_ever_loaded:
            self.present_window()
            self.__was_target_url_ever_loaded = True
            self.on_kolibri_started()

    def open_window(self):
        self.delegate.open_window(None)

    def open_in_browser(self):
        self.delegate.open_in_browser(self.get_url())

    def open_kolibri_home(self):
        self.delegate.open_kolibri_home()


class KolibriWindow(_KolibriView):
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
            return

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
    __channel_id: str

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
