from __future__ import absolute_import, print_function, unicode_literals

from django.conf import settings
from django.contrib.staticfiles.templatetags.staticfiles import static

# from django.conf.urls.static import static
from kolibri.core.hooks import ThemeHook
from urllib.parse import urljoin
from kolibri.plugins.base import KolibriPluginBase


class KolibriThemeTest(KolibriPluginBase):
    pass


class CustomTheme(ThemeHook):
    @property
    def theme(self):
        return {
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
            "signInBackground": static("background.jpg"),
        }
