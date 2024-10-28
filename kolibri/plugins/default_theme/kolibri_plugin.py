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
                "background": static("assets/default_theme/background.jpg"),
                "backgroundImgCredit": "Lewa Wildlife Conservancy",
                "topLogo": {
                    "style": "padding-left: 64px; padding-right: 64px; margin-bottom: 8px; margin-top: 8px",
                },
            },
            "logos": [
                {
                    "src": static("assets/favicons/logo.ico"),
                    "content_type": "image/vnd.microsoft.icon",
                    "size": "32x32",
                },
                {
                    "src": static("assets/default_theme/kolibri-logo.svg"),
                    "content_type": "image/svg+xml",
                    # See https://web.dev/maskable-icon/ for details on what
                    # icons count as maskable. The default Kolibri logo is not,
                    # as the outer 'waves' circle gets cropped.
                    "maskable": False,
                    "size": "any",
                },
                {
                    "src": static("assets/default_theme/kolibri-logo-192.png"),
                    "content_type": "image/png",
                    "size": "192x192",
                },
                {
                    "src": static("assets/default_theme/kolibri-logo-512.png"),
                    "content_type": "image/png",
                    "size": "512x512",
                },
            ],
        }
