from __future__ import annotations

from gi.repository import Adw
from gi.repository import GObject

from .kolibri_context import KolibriContext
from .kolibri_context import KolibriSetupContext
from .kolibri_webview import KolibriWebView
from .utils import bubble_signal


class KolibriSetupDialog(Adw.Dialog):
    __setup_context: KolibriSetupContext

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

        content_box.add_top_bar(Adw.HeaderBar())

        webview = KolibriWebView(self.__setup_context, vexpand=True, hexpand=True)
        webview.load_kolibri_url(self.__setup_context.default_url)
        content_box.set_content(webview)
