from __future__ import annotations

import logging
import subprocess
import typing
from gettext import gettext as _
from urllib.parse import urlsplit

from gi.repository import Gio
from gi.repository import GObject
from gi.repository import Gtk
from gi.repository import WebKit2
from kolibri_app.config import BASE_APPLICATION_ID
from kolibri_app.config import PROJECT_VERSION
from kolibri_app.globals import KOLIBRI_HOME_PATH
from kolibri_app.globals import XDG_CURRENT_DESKTOP

from .kolibri_context import KolibriChannelContext
from .kolibri_context import KolibriContext
from .kolibri_webview import KolibriWebView
from .kolibri_window import KolibriWindow

logger = logging.getLogger(__name__)


class Application(Gtk.Application):
    __context: KolibriContext

    application_name = GObject.Property(type=str, default=_("Kolibri"))

    def __init__(self, *args, context: KolibriContext = None, **kwargs):
        super().__init__(*args, flags=Gio.ApplicationFlags.HANDLES_OPEN, **kwargs)

        self.__context = context or KolibriContext()

        action = Gio.SimpleAction.new("open-documentation", None)
        action.connect("activate", self.__on_open_documentation)
        self.add_action(action)

        action = Gio.SimpleAction.new("open-forums", None)
        action.connect("activate", self.__on_open_forums)
        self.add_action(action)

        action = Gio.SimpleAction.new("new-window", None)
        action.connect("activate", self.__on_new_window)
        self.add_action(action)

        action = Gio.SimpleAction.new("open-kolibri-home", None)
        action.connect("activate", self.__on_open_kolibri_home)
        self.add_action(action)

        action = Gio.SimpleAction.new("about", None)
        action.connect("activate", self.__on_about)
        self.add_action(action)

        action = Gio.SimpleAction.new("quit", None)
        action.connect("activate", self.__on_quit)
        self.add_action(action)

        self.set_accels_for_action("app.open-documentation", ["F1"])
        self.set_accels_for_action("app.new-window", ["<Control>n"])
        self.set_accels_for_action("app.quit", ["<Control>q"])

        KolibriWindow.set_accels(self)

    @property
    def context(self):
        return self.__context

    def do_startup(self):
        Gtk.Application.do_startup(self)

        self.__context.init()

    def do_activate(self):
        Gtk.Application.do_activate(self)

        if not self.get_windows():
            self.open_kolibri_window()

    def do_open(self, files: typing.List[Gio.File], files_count: int, hint: str):
        for file in files:
            self.__handle_open_file_url(file.get_uri())

    def do_shutdown(self):
        Gtk.Application.do_shutdown(self)

        self.__context.shutdown()

    def __on_open_documentation(self, action, *args):
        self.open_url_in_external_application(
            "https://kolibri.readthedocs.io/en/latest/"
        )

    def __on_open_forums(self, action, *args):
        self.open_url_in_external_application("https://community.learningequality.org/")

    def __on_new_window(self, action, *args):
        self.open_kolibri_window()

    def __on_open_kolibri_home(self, action, *args):
        # TODO: It would be better to open self.__dbus_proxy.props.kolibri_home,
        #       but the Flatpak's OpenURI portal only allows us to open files
        #       that exist in our sandbox.
        self.open_url_in_external_application(KOLIBRI_HOME_PATH.as_uri())

    def __on_about(self, action, *args):
        about_dialog = Gtk.AboutDialog(
            transient_for=self.get_active_window(),
            modal=True,
            copyright=_("Copyright (c) 2022 Learning Equality"),
            program_name=_("Kolibri"),
            version=_(
                "{version}\n<small>Server version {kolibri_version}</small>"
            ).format(
                version=PROJECT_VERSION, kolibri_version=self.__context.kolibri_version
            ),
            license_type=Gtk.License.MIT_X11,
            logo_icon_name=BASE_APPLICATION_ID,
            website="https://learningequality.org",
        )
        about_dialog.present()

    def __on_quit(self, action, *args):
        self.quit()

    def open_url_in_external_application(self, url: str):
        subprocess.call(["xdg-open", url])

    def open_kolibri_window(
        self, target_url: str = None, **kwargs
    ) -> typing.Optional[KolibriWindow]:
        target_url = target_url or self.__context.default_url

        if not self.__context.should_load_url(target_url):
            self.open_url_in_external_application(target_url)
            return None

        window = KolibriWindow(application=self, context=self.__context, **kwargs)

        window.connect("open-new-window", self.__window_on_open_new_window)
        window.connect("external-url", self.__window_on_external_url)

        # Set WM_CLASS for improved window management
        # FIXME: GTK+ strongly discourages doing this:
        #        <https://docs.gtk.org/gtk3/method.Window.set_wmclass.html>
        #        However, our WM_CLASS becomes `"main.py", "Main.py"`, which
        #        causes GNOME Shell to treat unique instances of this
        #        application (with different application IDs) as the same.
        window.set_wmclass("Kolibri", self.get_application_id())

        window.load_kolibri_url(target_url, present=True)

        # Maximize windows on Endless OS
        if XDG_CURRENT_DESKTOP == "endless:GNOME":
            window.maximize()

        window.show()

        return window

    def __window_on_open_new_window(
        self, window: KolibriWindow, target_url: str, related_webview: WebKit2.WebView
    ) -> typing.Optional[KolibriWebView]:
        new_window = self.open_kolibri_window(
            target_url, related_webview=related_webview
        )
        return new_window.get_main_webview() if new_window else None

    def __window_on_external_url(self, window: KolibriWindow, external_url: str):
        self.open_url_in_external_application(external_url)

    def __handle_open_file_url(self, url: str):
        valid_url_schemes = ("kolibri", "x-kolibri-app")

        url_tuple = urlsplit(url)

        if url_tuple.scheme not in valid_url_schemes:
            logger.info("Invalid URL scheme: %s", url)
            return

        active_window = self.get_active_window()

        if isinstance(active_window, KolibriWindow):
            active_window.load_kolibri_url(url, present=True)
        else:
            self.open_kolibri_window(url)


class ChannelApplication(Application):
    __channel_id: str

    def __init__(self, channel_id: str, *args, **kwargs):
        self.__channel_id = channel_id

        context = KolibriChannelContext(channel_id)
        context.connect("kolibri-ready", self.__context_on_kolibri_ready)

        super().__init__(*args, context=context, **kwargs)

    def __context_on_kolibri_ready(self, context: KolibriContext):
        context.kolibri_api_get_async(
            "/api/content/channel/{channel_id}".format(channel_id=self.__channel_id),
            result_cb=self.__on_kolibri_api_channel_response,
        )

    def __on_kolibri_api_channel_response(self, data: typing.Any):
        if not isinstance(data, dict):
            return

        channel_name = data.get("name")

        if channel_name:
            self.props.application_name = channel_name
