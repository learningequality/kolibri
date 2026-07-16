import logging
from datetime import date
from importlib.resources import files

import kolibri
import wx
import wx.adv

from kolibri_app._version import __version__ as app_version
from kolibri_app.i18n import _

DOCS_URL = "https://kolibri.readthedocs.io/en/latest/"
FORUMS_URL = "https://community.learningequality.org/"


class AboutDialog(wx.Dialog):
    def __init__(self, parent):
        super().__init__(
            parent, title=_("About Kolibri"), style=wx.DEFAULT_DIALOG_STYLE
        )
        sizer = wx.BoxSizer(wx.VERTICAL)

        def add_centered_text(label, top):
            sizer.Add(
                wx.StaticText(self, label=label), 0, wx.ALIGN_CENTER | wx.TOP, top
            )

        try:
            icon_path = files("kolibri_app") / "icons" / "kolibri-icon.png"
            image = wx.Image(str(icon_path), wx.BITMAP_TYPE_PNG).Scale(
                64, 64, wx.IMAGE_QUALITY_HIGH
            )
            bitmap = wx.StaticBitmap(self, bitmap=wx.Bitmap(image))
            sizer.Add(bitmap, 0, wx.ALIGN_CENTER | wx.TOP, 16)
        except (FileNotFoundError, wx.wxAssertionError, OSError) as e:
            logging.error(f"Error loading About dialog icon: {e}")

        add_centered_text(_("App version: %(version)s") % {"version": app_version}, 8)
        add_centered_text(
            _("Kolibri version: %(version)s") % {"version": kolibri.__version__}, 4
        )

        docs_link = wx.adv.HyperlinkCtrl(self, label=_("Documentation"), url=DOCS_URL)
        forums_link = wx.adv.HyperlinkCtrl(
            self, label=_("Community Forum"), url=FORUMS_URL
        )
        # Visited links otherwise turn a low-contrast purple in macOS dark mode.
        for link in (docs_link, forums_link):
            link.SetVisitedColour(link.GetNormalColour())

        link_sizer = wx.BoxSizer(wx.HORIZONTAL)
        link_sizer.Add(docs_link, 0, wx.RIGHT, 8)
        link_sizer.Add(forums_link)
        sizer.Add(link_sizer, 0, wx.ALIGN_CENTER | wx.TOP, 12)

        add_centered_text(
            _("© %(year)s Learning Equality") % {"year": date.today().year}, 12
        )

        close_btn = wx.Button(self, wx.ID_OK, _("Close"))
        close_btn.SetDefault()
        sizer.Add(close_btn, 0, wx.ALIGN_RIGHT | wx.TOP | wx.BOTTOM, 16)

        outer_sizer = wx.BoxSizer(wx.VERTICAL)
        outer_sizer.Add(sizer, 1, wx.EXPAND | wx.LEFT | wx.RIGHT, 24)
        self.SetSizerAndFit(outer_sizer)
        self.CenterOnParent()
