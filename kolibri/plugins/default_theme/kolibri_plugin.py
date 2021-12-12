from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.templatetags.static import static

from kolibri.core import theme_hook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class DefaultThemePlugin(KolibriPluginBase):
    pass


@register_hook
class DefaultThemeHook(theme_hook.ThemeHook):
    @property
    def theme(self):
        return {
            # primary and secondary brand colors
            "brandColors": {
                "primary": {
                    "v_50": "#f0e7ed",
                    "v_100": "#dbc3d4",
                    "v_200": "#c59db9",
                    "v_300": "#ac799d",
                    "v_400": "#996189",
                    "v_500": "#874e77",
                    "v_600": "#7c4870",
                    "v_700": "#6e4167",
                    "v_800": "#5f3b5c",
                    "v_900": "#4b2e4d",
                },
                "secondary": {
                    "v_50": "#e3f0ed",
                    "v_100": "#badbd2",
                    "v_200": "#8dc5b6",
                    "v_300": "#62af9a",
                    "v_400": "#479e86",
                    "v_500": "#368d74",
                    "v_600": "#328168",
                    "v_700": "#2c715a",
                    "v_800": "#26614d",
                    "v_900": "#1b4634",
                },
            },
            # sign-in page config
            "signIn": {
                "background": static("background.jpg"),
                "backgroundImgCredit": "Thomas Van Den Driessche",
                "scrimOpacity": 0.7,
                "title": None,  # use default: "Kolibri"
                "topLogo": {
                    "src": None,  # use default Kolibri bird
                    "style": "padding-left: 64px; padding-right: 64px; margin-bottom: 8px; margin-top: 8px",
                    "alt": None,
                },
                "showPoweredBy": False,
                "showTitle": True,
                "showKolibriFooterLogo": False,
            },
            # side-nav config
            "sideNav": {
                "title": None,  # use default: "Kolibri"
                "brandedFooter": {},
                "showKolibriFooterLogo": True,
            },
            # app bar config
            "appBar": {
                "topLogo": None,
            },
        }
