from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.contrib.staticfiles.templatetags.staticfiles import static

from kolibri.core import theme_hook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class ProfuturoPlugin(KolibriPluginBase):
    kolibri_option_defaults = "option_defaults"


@register_hook
class ProfuturoThemeHook(theme_hook.ThemeHook):
    @property
    def theme(self):
        logo = static("pf-logo.png")
        return {
            # metadata
            theme_hook.THEME_NAME: "Profuturo theme",
            theme_hook.THEME_VERSION: 1,  # increment when changes are made
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
            theme_hook.SIGN_IN: {
                theme_hook.TOP_LOGO: {
                    theme_hook.IMG_SRC: logo,
                    theme_hook.IMG_STYLE: "",
                    theme_hook.IMG_ALT: "Pro Futuro",
                },
                theme_hook.SHOW_POWERED_BY: True,
                theme_hook.SHOW_TITLE: False,
                theme_hook.SHOW_K_FOOTER_LOGO: True,
            },
            theme_hook.SIDE_NAV: {
                theme_hook.TOP_LOGO: {
                    theme_hook.IMG_SRC: logo,
                    theme_hook.IMG_STYLE: "padding: 8px",
                },
                theme_hook.SHOW_K_FOOTER_LOGO: True,
            },
        }
