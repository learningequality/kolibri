import os
import subprocess
import webbrowser
from importlib.resources import files
from io import BytesIO

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

LOADER_PAGE = "loading.html"

ZOOM_LEVELS = [
    html2.WEBVIEW_ZOOM_TINY,
    html2.WEBVIEW_ZOOM_SMALL,
    html2.WEBVIEW_ZOOM_MEDIUM,
    html2.WEBVIEW_ZOOM_LARGE,
    html2.WEBVIEW_ZOOM_LARGEST,
]


class LoadingHandler(wx.html2.WebViewHandler):
    def __init__(self):
        wx.html2.WebViewHandler.__init__(self, "loading")
        lang_id = to_language(locale_info["language"])
        asset_files = files("kolibri_app") / "assets"
        loader_page = asset_files / lang_id / LOADER_PAGE
        if not loader_page.is_file():
            lang_id = lang_id.split("-")[0]
            loader_page = asset_files / lang_id / LOADER_PAGE
        if not loader_page.is_file():
            # if we can't find anything in the given language, default to the English loading page.
            loader_page = asset_files / "en" / LOADER_PAGE
        with loader_page.open("rb") as f:
            self.loader_page = f.read()

    def GetFile(self, uri):
        fsfile = wx.FSFile(
            BytesIO(self.loader_page), uri, "text/html", "", wx.DateTime.Now()
        )
        return fsfile


LOADER_URL = "loading://loader.html"


class KolibriView(object):
    def __init__(self, app, url=None, size=(1024, 768)):
        self.app = app

        self.current_url = None

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

        self.webview.RegisterHandler(LoadingHandler())

        if url is None:
            # Set loading screen
            url = LOADER_URL

        self.webview.LoadURL(url)

        self.view.Bind(wx.EVT_CLOSE, self.OnClose)

        # create menu bar, we do this per-window for cross-platform purposes
        menu_bar = wx.MenuBar()

        file_menu = wx.Menu()
        self.add_menu_item(
            file_menu, _("New Window"), handler=self.on_new_window, item_id=wx.ID_NEW
        )
        self.add_menu_item(
            file_menu,
            _("Close Window"),
            handler=self.on_close_window,
            item_id=wx.ID_CLOSE,
        )
        file_menu.AppendSeparator()
        self.add_menu_item(
            file_menu,
            _("Open Kolibri Home Folder"),
            handler=self.on_open_kolibri_home,
            item_id=wx.ID_OPEN,
        )

        menu_bar.Append(file_menu, _("File"))

        edit_menu = wx.Menu()
        # FIXME: Remove these once the native menu handlers are restored
        self.add_menu_item(
            edit_menu, _("Undo\tCtrl+Z"), handler=self.on_undo, item_id=wx.ID_UNDO
        )
        self.add_menu_item(
            edit_menu, _("Redo\tCtrl+Shift+Z"), handler=self.on_redo, item_id=wx.ID_REDO
        )
        edit_menu.AppendSeparator()
        self.add_menu_item(edit_menu, _("Cut\tCtrl+X"), item_id=wx.ID_CUT)
        self.add_menu_item(edit_menu, _("Copy\tCtrl+C"), item_id=wx.ID_COPY)
        self.add_menu_item(edit_menu, _("Paste\tCtrl+V"), item_id=wx.ID_PASTE)
        self.add_menu_item(edit_menu, _("Select All\tCtrl+A"), item_id=wx.ID_SELECTALL)
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

        history_menu = wx.Menu()
        self.add_menu_item(
            history_menu,
            _("Back\tCtrl+["),
            handler=self.on_back,
            item_id=wx.ID_BACKWARD,
        )
        self.add_menu_item(
            history_menu,
            _("Forward\tCtrl+]"),
            handler=self.on_forward,
            item_id=wx.ID_FORWARD,
        )
        menu_bar.Append(history_menu, _("History"))

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

    def OnLoadComplete(self, event):
        url = event.URL

        # Make sure that any attempts to use back functionality don't take us back to the loading screen
        # For more info, see: https://stackoverflow.com/questions/8103532/how-to-clear-webview-history-in-android
        if self.current_url == LOADER_URL and url != LOADER_URL:
            self.clear_history()

        self.current_url = url

    def OnLoadStateChanged(self, event):
        if event.GetState() == wx.webkit.WEBKIT_STATE_STOP:
            return self.OnLoadComplete(event)

    def on_documentation(self, event):
        webbrowser.open("https://kolibri.readthedocs.io/en/latest/")

    def on_forums(self, event):
        webbrowser.open("https://community.learningequality.org/")

    def on_new_window(self, event):
        self.app.create_kolibri_window(url=self.app.kolibri_origin)

    def on_close_window(self, event):
        self.close()

    def on_open_in_browser(self, event):
        webbrowser.open(self.get_url())

    def on_open_kolibri_home(self, event):
        if WINDOWS:
            os.startfile(os.environ["KOLIBRI_HOME"])
        elif MAC:
            subprocess.call(["open", os.environ["KOLIBRI_HOME"]])
        elif LINUX:
            subprocess.call(["xdg-open", os.environ["KOLIBRI_HOME"]])

    def on_back(self, event):
        self.webview.GoBack()

    def on_forward(self, event):
        self.webview.GoForward()

    def on_reload(self, event):
        self.webview.Reload()

    def on_undo(self, event):
        self.webview.Undo()

    def on_redo(self, event):
        self.webview.Redo()

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
