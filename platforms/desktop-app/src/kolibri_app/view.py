import os
import subprocess
import webbrowser

import wx

from wx import html2

from kolibri_app.i18n import _
from kolibri_app.constants import APP_NAME
from kolibri_app.constants import LINUX
from kolibri_app.constants import MAC
from kolibri_app.constants import WINDOWS


html2.WebView.MSWSetEmulationLevel(html2.WEBVIEWIE_EMU_IE11)


class KolibriView(object):
    def __init__(self, app, url=None, size=(1024, 768)):
        self.app = app

        self.current_url = None

        self.view = wx.Frame(None, -1, APP_NAME, size=size)

        backend = html2.WebViewBackendDefault

        if WINDOWS and html2.WebView.IsBackendAvailable(html2.WebViewBackendEdge):
            backend = html2.WebViewBackendEdge

        self.webview = html2.WebView.New(self.view, backend=backend, url=url)
        self.webview.Bind(html2.EVT_WEBVIEW_NAVIGATING, self.OnBeforeLoad)
        self.webview.Bind(html2.EVT_WEBVIEW_LOADED, self.OnLoadComplete)

        self.default_zoom = self.current_zoom = 4
        self.max_zoom = 2
        self.min_zoom = 0.5
        self.view.Bind(wx.EVT_CLOSE, self.OnClose)

        # create menu bar, we do this per-window for cross-platform purposes
        menu_bar = wx.MenuBar()

        file_menu = wx.Menu()
        self.add_menu_item(file_menu, _('New Window'), handler=self.on_new_window, item_id=wx.ID_NEW)
        self.add_menu_item(file_menu, _('Close Window'), handler=self.on_close_window, item_id=wx.ID_CLOSE)
        file_menu.AppendSeparator()
        self.add_menu_item(file_menu, _('Open Kolibri Home Folder'), handler=self.on_open_kolibri_home, item_id=wx.ID_OPEN)

        menu_bar.Append(file_menu, _('File'))

        edit_menu = wx.Menu()
        # FIXME: Remove these once the native menu handlers are restored
        self.add_menu_item(edit_menu, _('Undo\tCtrl+Z'), handler=self.on_undo, item_id=wx.ID_UNDO)
        self.add_menu_item(edit_menu, _('Redo\tCtrl+Shift+Z'), handler=self.on_redo, item_id=wx.ID_REDO)
        edit_menu.AppendSeparator()
        self.add_menu_item(edit_menu, _('Cut\tCtrl+X'), item_id=wx.ID_CUT)
        self.add_menu_item(edit_menu, _('Copy\tCtrl+C'), item_id=wx.ID_COPY)
        self.add_menu_item(edit_menu, _('Paste\tCtrl+V'), item_id=wx.ID_PASTE)
        self.add_menu_item(edit_menu, _('Select All\tCtrl+A'), item_id=wx.ID_SELECTALL)
        menu_bar.Append(edit_menu, _('Edit'))

        view_menu = wx.Menu()
        self.add_menu_item(view_menu, _('Reload'), handler=self.on_reload, item_id=wx.ID_REFRESH)
        self.add_menu_item(view_menu, _('Actual Size\tCtrl+0'), handler=self.on_actual_size, item_id=wx.ID_ZOOM_100)
        self.add_menu_item(view_menu, _('Zoom In\tCtrl++'), handler=self.on_zoom_in, item_id=wx.ID_ZOOM_IN)
        self.add_menu_item(view_menu, _('Zoom Out\tCtrl+-'), handler=self.on_zoom_out, item_id=wx.ID_ZOOM_OUT)
        view_menu.AppendSeparator()
        self.add_menu_item(view_menu, _('Open in Browser'), handler=self.on_open_in_browser)
        menu_bar.Append(view_menu, _('View'))

        history_menu = wx.Menu()
        self.add_menu_item(history_menu, _('Back\tCtrl+['), handler=self.on_back, item_id=wx.ID_BACKWARD)
        self.add_menu_item(history_menu, _('Forward\tCtrl+]'), handler=self.on_forward, item_id=wx.ID_FORWARD)
        menu_bar.Append(history_menu, _('History'))

        help_menu = wx.Menu()
        self.add_menu_item(help_menu, _('Documentation'), handler=self.on_documentation, item_id=wx.ID_HELP)
        self.add_menu_item(help_menu, _('Community Forums'), handler=self.on_forums, item_id=wx.ID_HELP_SEARCH)
        menu_bar.Append(help_menu, _('Help'))

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

    def get_zoom_level(self):
        return self.current_zoom

    def set_zoom_level(self, zoom):
        if zoom / 4 < self.min_zoom or zoom / 4 > self.max_zoom:
            return
        self.current_zoom = zoom
        self.evaluate_javascript('document.documentElement.style.zoom = {}'.format(zoom / 4))

    def get_url(self):
        return self.webview.GetCurrentURL()

    def clear_history(self):
        self.webview.ClearHistory()

    def evaluate_javascript(self, js):
        js = js.encode('utf8')
        wx.CallAfter(self.webview.RunScript, js)

    def OnClose(self, event):
        self.shutdown()
        event.Skip()

    def OnBeforeLoad(self, event):
        if not self.app.should_load_url(event.URL):
            event.Veto()

    def OnLoadComplete(self, event):
        if not self.current_zoom == self.default_zoom:
            self.set_zoom_level(self.current_zoom)
        url = event.URL

        # Make sure that any attempts to use back functionality don't take us back to the loading screen
        # For more info, see: https://stackoverflow.com/questions/8103532/how-to-clear-webview-history-in-android
        if self.current_url == self.app.loader_url and url != self.app.loader_url:
            self.clear_history()

        self.current_url = url

    def OnLoadStateChanged(self, event):
        if event.GetState() == wx.webkit.WEBKIT_STATE_STOP:
            return self.OnLoadComplete(event)
    
    def on_documentation(self, event):
        webbrowser.open('https://kolibri.readthedocs.io/en/latest/')

    def on_forums(self, event):
        webbrowser.open('https://community.learningequality.org/')

    def on_new_window(self, event):
        self.app.create_kolibri_window()

    def on_close_window(self, event):
        self.close()

    def on_open_in_browser(self, event):
        webbrowser.open(self.get_url())

    def on_open_kolibri_home(self, event):
        if WINDOWS:
            os.startfile(os.environ['KOLIBRI_HOME'])
        elif MAC:
            subprocess.call(['open', os.environ['KOLIBRI_HOME']])
        elif LINUX:
            subprocess.call(['xdg-open', os.environ['KOLIBRI_HOME']])

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
        self.set_zoom_level(self.default_zoom)

    def on_zoom_in(self, event):
        self.set_zoom_level(self.get_zoom_level() + 1)

    def on_zoom_out(self, event):
        self.set_zoom_level(self.get_zoom_level() - 1)

    def shutdown(self):
        if self in self.app.windows:
            self.app.windows.remove(self)
        if not self.app.windows:
            self.app.save_state(self)
            # No more open windows, run shutdown
            wx.CallAfter(self.app.shutdown)
