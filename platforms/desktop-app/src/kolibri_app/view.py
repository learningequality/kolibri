import os
import subprocess
import webbrowser
from importlib.resources import files

import wx
from django.utils.translation.trans_real import to_language
from wx import html2

from kolibri_app.constants import APP_NAME
from kolibri_app.constants import LINUX
from kolibri_app.constants import MAC
from kolibri_app.constants import TRAY_ICON_ICO
from kolibri_app.constants import WINDOWS
from kolibri_app.i18n import _
from kolibri_app.i18n import locale_info
from kolibri_app.logger import logging

if WINDOWS:
    from kolibri_app import webview2_native

LOADER_PAGE = "loading.html"

# JS->Python bridge for hijacking window.print() on Windows; see __init__.
BRIDGE_NAME = "kolibriBridge"
BRIDGE_MSG_PRINT = "print"

ZOOM_LEVELS = [
    html2.WEBVIEW_ZOOM_TINY,
    html2.WEBVIEW_ZOOM_SMALL,
    html2.WEBVIEW_ZOOM_MEDIUM,
    html2.WEBVIEW_ZOOM_LARGE,
    html2.WEBVIEW_ZOOM_LARGEST,
]


def get_loader_html():
    """
    Finds the correct localized loading.html file and returns its content.
    """
    lang_id = to_language(locale_info["language"])
    asset_files = files("kolibri_app") / "assets"
    loader_page = asset_files / lang_id / LOADER_PAGE
    if not loader_page.is_file():
        lang_id = lang_id.split("-")[0]
        loader_page = asset_files / lang_id / LOADER_PAGE
    if not loader_page.is_file():
        # if we can't find anything in the given language, default to the English loading page.
        loader_page = asset_files / "en" / LOADER_PAGE
    with loader_page.open("r", encoding="utf-8") as f:
        return f.read()


class KolibriView(object):
    def __init__(self, app, url=None, size=(1024, 768)):
        self.app = app

        self.is_showing_loader = False

        self.view = wx.Frame(None, -1, APP_NAME, size=size)
        self.view.SetMinSize((350, 400))

        # Set the window icon
        if WINDOWS:
            try:
                icon_path = files("kolibri_app") / TRAY_ICON_ICO
                self.view.SetIcon(wx.Icon(str(icon_path), wx.BITMAP_TYPE_ICO))
            except (FileNotFoundError, wx.wxAssertionError, OSError) as e:
                logging.warning(f"Failed to set window icon: {e}")

        if WINDOWS:
            backend = html2.WebViewBackendEdge
        else:
            backend = html2.WebViewBackendDefault

        self.webview = html2.WebView.New(self.view, backend=backend)
        self.webview.Bind(html2.EVT_WEBVIEW_NAVIGATING, self.OnBeforeLoad)
        self.webview.Bind(html2.EVT_WEBVIEW_LOADED, self.OnLoadComplete)

        self._print_pending = False

        self._setup_printing()

        if url is None:
            # If no URL is provided, show the loading screen directly.
            self.webview.SetPage(get_loader_html(), "")
            self.is_showing_loader = True
        else:
            # Otherwise, load the given URL.
            self.webview.LoadURL(url)

        self.view.Bind(wx.EVT_CLOSE, self.OnClose)

        # create menu bar, we do this per-window for cross-platform purposes
        menu_bar = wx.MenuBar()

        file_menu = wx.Menu()
        self.add_menu_item(
            file_menu,
            _("Open Kolibri Home Folder"),
            handler=self.on_open_kolibri_home,
            item_id=wx.ID_OPEN,
        )

        menu_bar.Append(file_menu, _("File"))

        # manually adding menu items only needed on macOS
        # windows and linux handle this already
        # see https://github.com/learningequality/kolibri-app/issues/236
        if MAC:
            edit_menu = wx.Menu()
            self.add_menu_item(edit_menu, _("Cut\tCtrl+X"), item_id=wx.ID_CUT)
            self.add_menu_item(edit_menu, _("Copy\tCtrl+C"), item_id=wx.ID_COPY)
            self.add_menu_item(edit_menu, _("Paste\tCtrl+V"), item_id=wx.ID_PASTE)
            self.add_menu_item(
                edit_menu, _("Select All\tCtrl+A"), item_id=wx.ID_SELECTALL
            )
            menu_bar.Append(edit_menu, _("Edit"))

        view_menu = wx.Menu()
        self.add_menu_item(
            view_menu, _("Reload"), handler=self.on_reload, item_id=wx.ID_REFRESH
        )
        self.add_menu_item(
            view_menu,
            _("Actual Size\tCtrl+0"),
            handler=self.on_actual_size,
            item_id=wx.ID_ZOOM_100,
        )
        self.add_menu_item(
            view_menu,
            _("Zoom In\tCtrl++"),
            handler=self.on_zoom_in,
            item_id=wx.ID_ZOOM_IN,
        )
        self.add_menu_item(
            view_menu,
            _("Zoom Out\tCtrl+-"),
            handler=self.on_zoom_out,
            item_id=wx.ID_ZOOM_OUT,
        )
        view_menu.AppendSeparator()
        self.add_menu_item(
            view_menu, _("Open in Browser"), handler=self.on_open_in_browser
        )
        menu_bar.Append(view_menu, _("View"))

        help_menu = wx.Menu()
        self.add_menu_item(
            help_menu,
            _("Documentation"),
            handler=self.on_documentation,
            item_id=wx.ID_HELP,
        )
        self.add_menu_item(
            help_menu,
            _("Community Forums"),
            handler=self.on_forums,
            item_id=wx.ID_HELP_SEARCH,
        )
        menu_bar.Append(help_menu, _("Help"))

        self.view.SetMenuBar(menu_bar)

    def _setup_printing(self):
        if WINDOWS:
            # JS-initiated window.print() is a no-op in WebView2 hosted via
            # wxPython's html2 backend; intercept and route to
            # ICoreWebView2_16::ShowPrintUI via webview2_native. Other backends
            # surface window.print() to a real dialog without help.
            if self.webview.AddScriptMessageHandler(BRIDGE_NAME):
                self.webview.AddUserScript(
                    f"window.print = function () {{"
                    f" window.{BRIDGE_NAME}.postMessage('{BRIDGE_MSG_PRINT}');"
                    f"}};",
                    injectionTime=html2.WEBVIEW_INJECT_AT_DOCUMENT_START,
                )
                self.webview.Bind(
                    html2.EVT_WEBVIEW_SCRIPT_MESSAGE_RECEIVED,
                    self.OnScriptMessage,
                )
            else:
                logging.warning(f"Failed to register {BRIDGE_NAME} script handler")

    def add_menu_item(self, menu, title, handler=None, item_id=None):
        item_id = item_id or wx.NewId()
        item = menu.Append(item_id, title)
        if handler:
            self.view.Bind(wx.EVT_MENU, handler, item)
        return item

    def show(self):
        self.view.Show()

    def close(self):
        self.view.Close()

    def set_fullscreen(self, enable=True):
        self.view.ShowFullScreen(enable)

    def load_url(self, url):
        wx.CallAfter(self.webview.LoadURL, url)

    def zoom(self, zoom_in):
        index_change = 1 if zoom_in else -1
        current_zoom = self.webview.GetZoom()
        current_index = ZOOM_LEVELS.index(current_zoom)
        new_index = current_index + index_change
        if new_index < 0 or new_index >= len(ZOOM_LEVELS):
            return
        self.webview.SetZoom(ZOOM_LEVELS[new_index])

    def get_url(self):
        return self.webview.GetCurrentURL()

    def clear_history(self):
        self.webview.ClearHistory()

    def OnClose(self, event):
        if WINDOWS:
            # On Windows, just hide the window.
            self.view.Hide()
        else:
            self.shutdown()
            event.Skip()

    def OnBeforeLoad(self, event):
        if not self.app.should_load_url(event.URL):
            event.Veto()

    def OnScriptMessage(self, event):
        message = event.GetString()
        if message == BRIDGE_MSG_PRINT:
            # Defer so we leave the WebView2 message callback before re-entering
            # the COM object. Coalesce rapid-fire calls (e.g. JS in a loop) so
            # we only enqueue one dialog.
            if self._print_pending:
                return
            self._print_pending = True
            wx.CallAfter(self.show_print_dialog)
        else:
            logging.warning(f"Unhandled {BRIDGE_NAME} message: {message!r}")

    def show_print_dialog(self):
        self._print_pending = False
        if WINDOWS:
            try:
                webview2_native.show_print_ui(
                    self.webview.GetNativeBackend(),
                    webview2_native.PRINT_DIALOG_KIND_BROWSER,
                )
            except OSError as e:
                logging.warning(f"Native ShowPrintUI failed: {e}")
        else:
            self.webview.Print()

    def OnLoadComplete(self, event):
        # Make sure that any attempts to use back functionality don't take us back to the loading screen
        # For more info, see: https://stackoverflow.com/questions/8103532/how-to-clear-webview-history-in-android
        if self.is_showing_loader:
            self.clear_history()
            self.is_showing_loader = False

    def on_documentation(self, event):
        webbrowser.open("https://kolibri.readthedocs.io/en/latest/")

    def on_forums(self, event):
        webbrowser.open("https://community.learningequality.org/")

    def on_open_in_browser(self, event):
        webbrowser.open(self.get_url())

    def on_open_kolibri_home(self, event):
        if WINDOWS:
            os.startfile(os.environ["KOLIBRI_HOME"])
        elif MAC:
            subprocess.call(["open", os.environ["KOLIBRI_HOME"]])
        elif LINUX:
            subprocess.call(["xdg-open", os.environ["KOLIBRI_HOME"]])

    def on_reload(self, event):
        self.webview.Reload()

    def on_actual_size(self, event):
        self.webview.SetZoom(html2.WEBVIEW_ZOOM_MEDIUM)

    def on_zoom_in(self, event):
        self.zoom(True)

    def on_zoom_out(self, event):
        self.zoom(False)

    def shutdown(self):
        if self in self.app.windows:
            self.app.windows.remove(self)
        if not self.app.windows:
            self.app.save_state(self)
            # No more open windows, run shutdown
            wx.CallAfter(self.app.shutdown)
