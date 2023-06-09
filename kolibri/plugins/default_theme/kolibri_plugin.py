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
            "signIn": {
                "background": static("background.jpg"),
                "backgroundImgCredit": "Thomas Van Den Driessche",
                "topLogo": {
                    "style": "padding-left: 64px; padding-right: 64px; margin-bottom: 8px; margin-top: 8px",
                },
            },
            "logos": [
                {
                    "src": static("assets/logo.ico"),
                    "content_type": "image/vnd.microsoft.icon",
                    "size": "32x32",
                },
                {
                    "src": static("kolibri-logo.svg"),
                    "content_type": "image/svg+xml",
                    # See https://web.dev/maskable-icon/ for details on what
                    # icons count as maskable. The default Kolibri logo is not,
                    # as the outer 'waves' circle gets cropped.
                    "maskable": False,
                    "size": "any",
                },
                {
                    "src": static("kolibri-logo-192.png"),
                    "content_type": "image/png",
                    "size": "192x192",
                },
                {
                    "src": static("kolibri-logo-512.png"),
                    "content_type": "image/png",
                    "size": "512x512",
                },
            ],
        }
