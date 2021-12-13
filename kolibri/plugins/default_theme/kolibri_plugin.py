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
            # sign-in page config
            "signIn": {
                "background": static("background.jpg"),
                "backgroundImgCredit": "Thomas Van Den Driessche",
                "scrimOpacity": 0.7,
                "topLogo": {
                    "style": "padding-left: 64px; padding-right: 64px; margin-bottom: 8px; margin-top: 8px",
                },
                "showTitle": True,
            },
            # side-nav config
            "sideNav": {
                "showKolibriFooterLogo": True,
            },
        }
