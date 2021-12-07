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
            # specify primary and secondary brand colors
            theme_hook.BRAND_COLORS: {
                theme_hook.PRIMARY: {
                    theme_hook.COLOR_V50: "#f0e7ed",
                    theme_hook.COLOR_V100: "#dbc3d4",
                    theme_hook.COLOR_V200: "#c59db9",
                    theme_hook.COLOR_V300: "#ac799d",
                    theme_hook.COLOR_V400: "#996189",
                    theme_hook.COLOR_V500: "#874e77",
                    theme_hook.COLOR_V600: "#7c4870",
                    theme_hook.COLOR_V700: "#6e4167",
                    theme_hook.COLOR_V800: "#5f3b5c",
                    theme_hook.COLOR_V900: "#4b2e4d",
                },
                theme_hook.SECONDARY: {
                    theme_hook.COLOR_V50: "#e3f0ed",
                    theme_hook.COLOR_V100: "#badbd2",
                    theme_hook.COLOR_V200: "#8dc5b6",
                    theme_hook.COLOR_V300: "#62af9a",
                    theme_hook.COLOR_V400: "#479e86",
                    theme_hook.COLOR_V500: "#368d74",
                    theme_hook.COLOR_V600: "#328168",
                    theme_hook.COLOR_V700: "#2c715a",
                    theme_hook.COLOR_V800: "#26614d",
                    theme_hook.COLOR_V900: "#1b4634",
                },
            },
            # sign-in page config
            theme_hook.SIGN_IN: {
                theme_hook.BACKGROUND: static("background.jpg"),
                theme_hook.BACKGROUND_IMG_CREDIT: "Thomas Van Den Driessche",
                theme_hook.SCRIM_OPACITY: 0.7,
                theme_hook.TITLE: None,  # use default: "Kolibri"
                theme_hook.TOP_LOGO: {
                    theme_hook.IMG_SRC: None,  # use default Kolibri bird
                    theme_hook.IMG_STYLE: "padding-left: 64px; padding-right: 64px; margin-bottom: 8px; margin-top: 8px",
                    theme_hook.IMG_ALT: None,
                },
                theme_hook.SHOW_POWERED_BY: False,
                theme_hook.SHOW_TITLE: True,
                theme_hook.SHOW_K_FOOTER_LOGO: False,
            },
            # side-nav config
            theme_hook.SIDE_NAV: {
                theme_hook.TITLE: None,  # use default: "Kolibri"
                theme_hook.BRANDED_FOOTER: {},
                theme_hook.SHOW_K_FOOTER_LOGO: True,
            },
            # app bar config
            theme_hook.APP_BAR: {theme_hook.TOP_LOGO: None},
        }
