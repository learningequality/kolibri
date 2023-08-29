from __future__ import annotations

import typing

from gi.repository import GObject
from gi.repository import Gtk
from gi.repository import WebKit
from kolibri_app.globals import APP_DEVELOPER_EXTRAS

from .kolibri_context import KolibriContext


MOUSE_BUTTON_BACK = 8
MOUSE_BUTTON_FORWARD = 9


class KolibriWebView(WebKit.WebView):
    """
    A WebView that is confined to showing Kolibri content from the provided
    KolibriContext. Use the load_kolibri_url method to load a x-kolibri-app URL.
    If Kolibri is not ready, the component will wait before attempting to load
    the provided URL. It will emit "kolibri-load-finished" after it has loaded.
    """

    __context: KolibriContext

    __deferred_load_kolibri_url: typing.Optional[str] = None

    __gsignals__ = {
        "kolibri-load-finished": (GObject.SIGNAL_RUN_FIRST, None, ()),
    }

    def __init__(self, context: KolibriContext, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.__context = context

        if APP_DEVELOPER_EXTRAS:
            self.get_settings().set_enable_developer_extras(True)

        self.__context.connect("kolibri-ready", self.__context_on_kolibri_ready)

        click_back_gesture = Gtk.GestureClick(
            button=MOUSE_BUTTON_BACK, propagation_phase=Gtk.PropagationPhase.CAPTURE
        )
        click_back_gesture.connect("pressed", self.__on_back_button_pressed)
        self.add_controller(click_back_gesture)

        click_forward_gesture = Gtk.GestureClick(
            button=MOUSE_BUTTON_FORWARD, propagation_phase=Gtk.PropagationPhase.CAPTURE
        )
        click_forward_gesture.connect("pressed", self.__on_forward_button_pressed)
        self.add_controller(click_forward_gesture)

        self.connect("decide-policy", self.__on_decide_policy)
        self.connect("notify::uri", self.__on_notify_uri)
        self.connect("load-changed", self.__on_load_changed)

    def load_kolibri_url(self, kolibri_url: str):
        if self.__context.session_status != KolibriContext.SESSION_STATUS_READY:
            self.__deferred_load_kolibri_url = kolibri_url
            return

        http_url = self.__context.get_absolute_url(kolibri_url)
        self.load_uri(http_url)
        self.__deferred_load_kolibri_url = None

    def __on_back_button_pressed(
        self, gesture: Gtk.GestureClick, n_press: int, x: int, y: int
    ) -> bool:
        self.go_back()
        gesture.set_state(Gtk.EventSequenceState.CLAIMED)
        return True

    def __on_forward_button_pressed(
        self, gesture: Gtk.GestureClick, n_press: int, x: int, y: int
    ) -> bool:
        self.go_forward()
        gesture.set_state(Gtk.EventSequenceState.CLAIMED)
        return True

    def __continue_load_kolibri_url(self):
        if self.__deferred_load_kolibri_url:
            self.load_kolibri_url(self.__deferred_load_kolibri_url)

    def __on_decide_policy(
        self,
        webview: WebKit.WebView,
        decision: WebKit.PolicyDecision,
        decision_type: WebKit.PolicyDecisionType,
    ):
        if decision_type == WebKit.PolicyDecisionType.NAVIGATION_ACTION:
            action = decision.get_navigation_action()
            target_url = action.get_request().get_uri()
            if not self.__context.should_open_url(target_url):
                self.__context.open_external_url(target_url)
                decision.ignore()
                return True
        return False

    def __on_notify_uri(self, webview: WebKit.WebView, pspec: GObject.ParamSpec):
        # KolibriContext.should_open_url is not called when the URL fragment
        # changes. So, when the URI property changes, we may want to check if
        # the URL (including URL fragment) refers to content which belongs
        # inside the window.

        target_url = webview.get_uri()

        if not target_url:
            return

        if self.__context.should_open_url(target_url):
            return

        # It would be nice if we could remove the not allowed items from the
        # back forward list, but WebKitGtk doesn't allow for much in the way of
        # history tampering.

        back_item = self.__get_allowed_back_item(webview)

        if back_item:
            webview.go_to_back_forward_list_item(back_item)
        else:
            webview.load_uri(self.__context.default_url)

        self.__context.open_external_url(target_url)

    def __on_load_changed(self, webview: WebKit.WebView, load_event: WebKit.LoadEvent):
        if load_event == WebKit.LoadEvent.FINISHED:
            self.emit("kolibri-load-finished")

    def __get_allowed_back_item(self, webview: WebKit.WebView):
        for back_item in webview.get_back_forward_list().get_back_list():
            back_uri = back_item.get_uri()
            if back_uri and self.__context.should_open_url(back_uri):
                return back_item
        return None

    def __context_on_kolibri_ready(self, context: KolibriContext):
        current_url = self.get_uri()
        if self.__deferred_load_kolibri_url:
            self.__continue_load_kolibri_url()
        elif current_url and self.__context.should_open_url(current_url):
            self.emit("kolibri-load-finished")
        else:
            self.load_kolibri_url(self.__context.default_url)


class KolibriWebViewStack(Gtk.Stack):
    """
    A stack that switches between a KolibriWebView and a loading screen
    depending on whether Kolibri is available.
    """

    __context: KolibriContext

    __main_webview: KolibriWebView
    __loading_webview: WebKit.WebView

    __default_zoom_step: int = 2
    __current_zoom_step: int = 2

    __deferred_load_kolibri_url: typing.Optional[str] = None

    ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5]

    is_main_visible = GObject.Property(type=bool, default=False)
    can_go_back = GObject.Property(type=bool, default=False)
    can_go_forward = GObject.Property(type=bool, default=False)

    __gsignals__ = {
        "open-new-window": (
            GObject.SIGNAL_RUN_FIRST,
            KolibriWebView,
            (
                str,
                WebKit.WebView,
            ),
        ),
        "main-webview-blank": (GObject.SIGNAL_RUN_FIRST, None, ()),
        "main-webview-ready": (GObject.SIGNAL_RUN_FIRST, None, ()),
    }

    def __init__(
        self,
        context: KolibriContext,
        related_webview: typing.Optional[WebKit.WebView] = None,
        *args,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)

        self.__context = context

        if related_webview:
            self.__main_webview = KolibriWebView(
                self.__context, related_view=related_webview
            )
        else:
            self.__main_webview = KolibriWebView(
                self.__context, web_context=self.__context.webkit_web_context
            )
        self.add_child(self.__main_webview)

        self.__loading_webview = WebKit.WebView(
            web_context=self.__context.webkit_web_context
        )
        self.add_child(self.__loading_webview)

        self.__main_webview.show()
        self.__loading_webview.show()

        self.__context.connect(
            "notify::session-status", self.__context_on_notify_session_status
        )
        self.__context_on_notify_session_status(self.__context)

        self.__main_webview.connect(
            "kolibri-load-finished", self.__main_webview_on_kolibri_load_finished
        )
        self.__main_webview.connect("create", self.__main_webview_on_create)
        self.__main_webview.get_back_forward_list().connect(
            "changed", self.__main_webview_back_forward_list_on_changed
        )

        self.show_loading()

    @property
    def max_zoom_step(self) -> int:
        return len(self.ZOOM_STEPS) - 1

    @property
    def default_zoom_step(self) -> int:
        return self.__default_zoom_step

    @property
    def zoom_step(self) -> int:
        return self.__current_zoom_step

    def get_uri(self) -> str:
        return self.__main_webview.get_uri()

    def set_zoom_step(self, zoom_step: int):
        zoom_step = min(max(0, zoom_step), self.max_zoom_step)
        self.__current_zoom_step = zoom_step
        zoom_level = self.ZOOM_STEPS[zoom_step]
        self.__main_webview.set_zoom_level(zoom_level)
        self.__loading_webview.set_zoom_level(zoom_level)

    def show_loading(self):
        self.is_main_visible = False
        loader_url = self.__context.get_loader_url("loading")
        self.__loading_webview.load_uri(loader_url)
        self.set_visible_child(self.__loading_webview)

    def show_error(self):
        self.is_main_visible = False
        loader_url = self.__context.get_loader_url("error")
        self.__loading_webview.load_uri(loader_url)
        self.set_visible_child(self.__loading_webview)

    def show_main(self):
        self.is_main_visible = True
        self.set_visible_child(self.__main_webview)

    def load_kolibri_url(self, kolibri_url: str):
        self.__main_webview.load_kolibri_url(kolibri_url)

    def go_back(self):
        self.__main_webview.go_back()

    def go_forward(self):
        self.__main_webview.go_forward()

    def reload(self):
        self.__main_webview.reload()

    def get_main_webview(self) -> KolibriWebView:
        return self.__main_webview

    def __context_on_notify_session_status(
        self, context: KolibriContext, pspec: GObject.ParamSpec = None
    ):
        if context.session_status == KolibriContext.SESSION_STATUS_ERROR:
            self.show_error()
        elif context.session_status == KolibriContext.SESSION_STATUS_READY:
            pass
        else:
            self.show_loading()

    def __main_webview_on_kolibri_load_finished(self, webview: WebKit.WebView):
        if not webview.get_uri():
            self.emit("main-webview-blank")
        else:
            self.show_main()
            self.emit("main-webview-ready")

    def __main_webview_on_create(
        self, webview: WebKit.WebView, navigation_action: WebKit.NavigationAction
    ) -> typing.Optional[WebKit.WebView]:
        target_url = navigation_action.get_request().get_uri()
        new_webview = self.emit("open-new-window", target_url, self.__main_webview)
        return new_webview

    def __main_webview_back_forward_list_on_changed(
        self, back_forward_list: WebKit.BackForwardList, *args
    ):
        self.can_go_back = back_forward_list.get_back_item() is not None
        self.can_go_forward = back_forward_list.get_forward_item() is not None
