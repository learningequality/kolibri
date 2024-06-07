from __future__ import annotations

from gettext import gettext as _

from gi.repository import Adw
from gi.repository import Gio
from gi.repository import GObject
from gi.repository import Gtk

from .kolibri_context import KolibriContext
from .kolibri_context import KolibriSetupContext
from .kolibri_webview import KolibriWebView
from .utils import bubble_signal


class KolibriSetupDialog(Adw.Dialog):
    __setup_context: KolibriSetupContext
    __webview: KolibriWebView

    __gsignals__ = {
        "setup-complete": (GObject.SIGNAL_RUN_FIRST, None, ()),
    }

    def __init__(
        self, application: Adw.Application, context: KolibriContext, *args, **kwargs
    ):
        GObject.GObject.__init__(
            self, *args, content_width=800, content_height=600, **kwargs
        )

        self.__setup_context = KolibriSetupContext(context)
        bubble_signal(self.__setup_context, "setup-complete", self)

        content_box = Adw.ToolbarView()
        self.set_child(content_box)

        header_bar = Adw.HeaderBar()
        header_bar.show()
        content_box.add_top_bar(header_bar)

        menu_button = Gtk.MenuButton(
            direction=Gtk.ArrowType.NONE,
            tooltip_text=_("Main Menu"),
            primary=True,
        )
        header_bar.pack_end(menu_button)

        menu_popover = Gtk.PopoverMenu.new_from_model(_KolibriSetupDialogMenu())
        menu_button.set_popover(menu_popover)

        self.__webview = KolibriWebView(self.__setup_context)
        content_box.set_content(self.__webview)

        self.__webview.bind_property(
            "title", self, "title", GObject.BindingFlags.SYNC_CREATE
        )
        application.bind_property(
            "zoom-level", self.__webview, "zoom-level", GObject.BindingFlags.SYNC_CREATE
        )

    def init(self):
        self.__setup_context.init()
        self.__webview.load_kolibri_url(self.__setup_context.default_url)

    def shutdown(self):
        self.__setup_context.shutdown()


class _KolibriSetupDialogMenu(Gio.Menu):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        view_section = Gio.Menu()
        view_section.append_item(Gio.MenuItem.new(_("Actual Size"), "app.zoom-reset"))
        view_section.append_item(Gio.MenuItem.new(_("Zoom In"), "app.zoom-in"))
        view_section.append_item(Gio.MenuItem.new(_("Zoom Out"), "app.zoom-out"))
        self.append_section(None, view_section)

        help_section = Gio.Menu()
        help_section.append_item(Gio.MenuItem.new(_("Help"), "app.open-documentation"))
        help_section.append_item(Gio.MenuItem.new(_("About"), "app.about"))
        self.append_section(None, help_section)
