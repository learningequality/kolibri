from __future__ import annotations

import typing
from gettext import gettext as _

from gi.repository import Adw
from gi.repository import Gio
from gi.repository import GLib
from gi.repository import GObject
from gi.repository import Gtk
from gi.repository import WebKit
from kolibri_app.config import BUILD_PROFILE
from kolibri_app.globals import APP_DEVELOPER_EXTRAS

from .kolibri_context import KolibriContext
from .kolibri_webview import KolibriWebView
from .kolibri_webview import KolibriWebViewStack
from .utils import bubble_signal

DEFAULT_WIDTH = 1200
DEFAULT_HEIGHT = 800


class KolibriWindow(Adw.ApplicationWindow):
    """
    A window for the Kolibri application. Contains a KolibriWebViewStack and a
    header bar.
    """

    __context: KolibriContext

    __webview_stack: KolibriWebViewStack
    __header_bar: Adw.HeaderBar

    __present_on_main_webview_ready: bool = True

    __gsignals__ = {
        "open-in-browser": (GObject.SIGNAL_RUN_FIRST, None, (str,)),
        "open-new-window": (
            GObject.SIGNAL_RUN_FIRST,
            KolibriWebView,
            (
                str,
                WebKit.WebView,
            ),
        ),
        "auto-close": (GObject.SIGNAL_RUN_FIRST, None, ()),
    }

    def __init__(
        self,
        application: Adw.Application,
        context: KolibriContext,
        *args,
        related_webview: typing.Optional[WebKit.WebView] = None,
        **kwargs,
    ):
        super().__init__(application=application, *args, **kwargs)

        self.__context = context

        self.add_action_entries(
            [
                ("close", self.__on_close),
                ("open-in-browser", self.__on_open_in_browser),
                ("navigate-back", self.__on_navigate_back),
                ("navigate-forward", self.__on_navigate_forward),
                ("navigate-home", self.__on_navigate_home),
                ("reload", self.__on_reload),
                ("zoom-reset", self.__on_zoom_reset),
                ("zoom-in", self.__on_zoom_in),
                ("zoom-out", self.__on_zoom_out),
                ("show-web-inspector", None, None, "false", None),
            ]
        )

        self.set_default_size(DEFAULT_WIDTH, DEFAULT_HEIGHT)

        if BUILD_PROFILE == "development":
            self.add_css_class("devel")

        content_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        self.set_content(content_box)

        application.bind_property(
            "application-name",
            self,
            "title",
            GObject.BindingFlags.SYNC_CREATE,
        )

        self.__header_bar = Adw.HeaderBar()
        self.__header_bar.show()
        content_box.append(self.__header_bar)

        menu_button = Gtk.MenuButton(
            direction=Gtk.ArrowType.NONE,
            tooltip_text=_("Main Menu"),
            primary=True,
        )
        self.__header_bar.pack_end(menu_button)

        menu_popover = Gtk.PopoverMenu.new_from_model(
            _KolibriWindowMenu(is_confined=self.__context.is_confined)
        )
        menu_button.set_popover(menu_popover)

        navigation_revealer = Gtk.Revealer(
            transition_type=Gtk.RevealerTransitionType.CROSSFADE,
            transition_duration=300,
        )
        self.__header_bar.pack_start(navigation_revealer)

        navigation_box = Gtk.Box.new(Gtk.Orientation.HORIZONTAL, 0)
        navigation_box.get_style_context().add_class("linked")
        navigation_revealer.set_child(navigation_box)

        back_button = Gtk.Button.new_from_icon_name("go-previous-symbolic")
        back_button.set_action_name("win.navigate-back")
        navigation_box.append(back_button)

        forward_button = Gtk.Button.new_from_icon_name("go-next-symbolic")
        forward_button.set_action_name("win.navigate-forward")
        navigation_box.append(forward_button)

        home_revealer = Gtk.Revealer(
            transition_type=Gtk.RevealerTransitionType.CROSSFADE,
            transition_duration=300,
        )
        self.__header_bar.pack_start(home_revealer)

        home_button = Gtk.Button.new_from_icon_name("go-home-symbolic")
        home_button.set_action_name("win.navigate-home")
        home_revealer.set_child(home_button)

        self.__webview_stack = KolibriWebViewStack(
            self.__context,
            related_webview=related_webview,
            transition_type=Gtk.StackTransitionType.CROSSFADE,
            transition_duration=300,
            vexpand=True,
            hexpand=True,
            enable_developer_extras=APP_DEVELOPER_EXTRAS,
        )
        content_box.append(self.__webview_stack)

        self.__webview_stack.show()
        self.__header_bar.show()

        bubble_signal(self.__webview_stack, "open-new-window", self)
        bubble_signal(self.__webview_stack, "main-webview-blank", self, "auto-close")

        # These two properties are different types (GVariant and boolean), so we
        # need to convert between them. Unfortunately, Object.bind_property_full
        # isn't available with PyGObject, so we need two signal handlers.
        self.lookup_action("show-web-inspector").connect(
            "notify::state",
            self.__show_web_inspector_action_on_notify_show_web_inspector,
        )
        self.__webview_stack.connect(
            "notify::show-web-inspector",
            self.__webview_stack_on_notify_show_web_inspector,
        )

        self.__webview_stack.connect(
            "main-webview-ready", self.__webview_stack_on_main_webview_ready
        )

        self.__webview_stack.bind_property(
            "enable_developer_extras",
            self.lookup_action("show-web-inspector"),
            "enabled",
            GObject.BindingFlags.SYNC_CREATE,
        )

        self.__webview_stack.bind_property(
            "can_go_back",
            self.lookup_action("navigate-back"),
            "enabled",
            GObject.BindingFlags.SYNC_CREATE,
        )
        self.__webview_stack.bind_property(
            "can_go_forward",
            self.lookup_action("navigate-forward"),
            "enabled",
            GObject.BindingFlags.SYNC_CREATE,
        )
        self.__webview_stack.bind_property(
            "is_main_visible",
            self.lookup_action("navigate-home"),
            "enabled",
            GObject.BindingFlags.SYNC_CREATE,
        )
        self.__webview_stack.bind_property(
            "is_main_visible",
            self.lookup_action("reload"),
            "enabled",
            GObject.BindingFlags.SYNC_CREATE,
        )
        self.__webview_stack.bind_property(
            "is_main_visible",
            self.lookup_action("open-in-browser"),
            "enabled",
            GObject.BindingFlags.SYNC_CREATE,
        )
        self.__webview_stack.bind_property(
            "is_main_visible",
            navigation_revealer,
            "reveal_child",
            GObject.BindingFlags.SYNC_CREATE,
        )
        self.__webview_stack.bind_property(
            "is_main_visible",
            home_revealer,
            "reveal_child",
            GObject.BindingFlags.SYNC_CREATE,
        )

        self.__update_zoom_actions()

    @staticmethod
    def set_accels(application: Adw.Application):
        application.set_accels_for_action(
            "win.navigate-back", ["<Control>bracketleft", "<Alt>leftarrow"]
        )
        application.set_accels_for_action(
            "win.navigate-forward", ["<Control>bracketright", "<Alt>rightarrow"]
        )
        application.set_accels_for_action("win.navigate-home", ["<Alt>Home"])
        application.set_accels_for_action("win.zoom-reset", ["<Control>0"])
        application.set_accels_for_action("win.zoom-in", ["<Control>plus"])
        application.set_accels_for_action("win.zoom-out", ["<Control>minus"])
        application.set_accels_for_action("win.show-web-inspector", ["F12"])
        application.set_accels_for_action("win.close", ["<Control>w"])

    def load_kolibri_url(self, url: str, present=False):
        self.__present_on_main_webview_ready = present
        self.__webview_stack.load_kolibri_url(url)

    def get_main_webview(self):
        return self.__webview_stack.get_main_webview()

    def do_unmap(self):
        self.__present_on_main_webview_ready = False
        Adw.ApplicationWindow.do_unmap(self)

    def __on_close(self, action, *args):
        self.close()

    def __on_open_in_browser(self, action, *args):
        url = self.__webview_stack.get_uri()
        if url:
            self.emit("open-in-browser", url)

    def __on_open_in_kolibri(self, action, *args):
        url = self.__webview_stack.get_uri()
        if self.__context.is_url_for_kolibri_app(url):
            url = self.__context.url_to_x_kolibri_app(url)
        self.emit("open-in-browser", url)

    def __on_navigate_back(self, action, *args):
        self.__webview_stack.go_back()

    def __on_navigate_forward(self, action, *args):
        self.__webview_stack.go_forward()

    def __on_navigate_home(self, action, *args):
        self.load_kolibri_url(self.__context.default_url)

    def __on_reload(self, action, *args):
        self.__webview_stack.reload()

    def __on_zoom_reset(self, action, *args):
        self.__webview_stack.set_zoom_step(self.__webview_stack.default_zoom_step)
        self.__update_zoom_actions()

    def __on_zoom_in(self, action, *args):
        self.__webview_stack.set_zoom_step(self.__webview_stack.zoom_step + 1)
        self.__update_zoom_actions()

    def __on_zoom_out(self, action, *args):
        self.__webview_stack.set_zoom_step(self.__webview_stack.zoom_step - 1)
        self.__update_zoom_actions()

    def __webview_stack_on_notify_show_web_inspector(
        self, webview_stack: KolibriWebViewStack, pspec: GObject.ParamSpec
    ):
        self.lookup_action("show-web-inspector").set_state(
            GLib.Variant.new_boolean(webview_stack.show_web_inspector)
        )

    def __show_web_inspector_action_on_notify_show_web_inspector(
        self, action: Gio.Action, pspec: GObject.ParamSpec
    ):
        self.__webview_stack.show_web_inspector = action.get_state().get_boolean()

    def __update_zoom_actions(self):
        self.lookup_action("zoom-reset").set_enabled(
            self.__webview_stack.zoom_step != self.__webview_stack.default_zoom_step
        )
        self.lookup_action("zoom-in").set_enabled(
            self.__webview_stack.zoom_step < self.__webview_stack.max_zoom_step
        )
        self.lookup_action("zoom-out").set_enabled(self.__webview_stack.zoom_step > 0)

    def __webview_stack_on_open_new_window(
        self,
        webview_stack: KolibriWebViewStack,
        target_url: str,
        related_webview: WebKit.WebView,
    ) -> typing.Optional[KolibriWebViewStack]:
        window = self.emit("open-new-window", target_url, related_webview)
        return window.__webview_stack if window else None

    def __webview_stack_on_main_webview_ready(self, webview_stack: KolibriWebViewStack):
        if self.__present_on_main_webview_ready:
            self.__present_on_main_webview_ready = False
            self.present()


class _KolibriWindowMenu(Gio.Menu):
    def __init__(self, *args, is_confined=False, **kwargs):
        super().__init__(*args, **kwargs)

        main_section = Gio.Menu()
        main_section.append_item(Gio.MenuItem.new(_("New Window"), "app.new-window"))
        main_section.append_item(
            Gio.MenuItem.new(_("Open Kolibri Home Folder"), "app.open-kolibri-home")
        )
        # TODO: Once we have the capacity to add new strings, show this instead of "Open in Browser"
        # main_section.append_item(Gio.MenuItem.new(_("Open in Kolibri"), "win.open-in-kolibri"))
        self.append_section(None, main_section)

        view_section = Gio.Menu()
        view_section.append_item(Gio.MenuItem.new(_("Reload"), "win.reload"))
        view_section.append_item(Gio.MenuItem.new(_("Actual Size"), "win.zoom-reset"))
        view_section.append_item(Gio.MenuItem.new(_("Zoom In"), "win.zoom-in"))
        view_section.append_item(Gio.MenuItem.new(_("Zoom Out"), "win.zoom-out"))
        view_section.append_item(
            Gio.MenuItem.new(
                _("Open in Browser"),
                "win.open-in-kolibri" if is_confined else "win.open-in-browser",
            )
        )
        self.append_section(None, view_section)

        if APP_DEVELOPER_EXTRAS:
            dev_section = Gio.Menu()
            dev_section.append_item(
                Gio.MenuItem.new(_("Show Developer Tools"), "win.show-web-inspector")
            )
            self.append_section(None, dev_section)

        help_section = Gio.Menu()
        help_section.append_item(Gio.MenuItem.new(_("Help"), "app.open-documentation"))
        help_section.append_item(Gio.MenuItem.new(_("About"), "app.about"))
        self.append_section(None, help_section)
