from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.contrib.staticfiles.templatetags.staticfiles import static

from kolibri.core import theme_hook
from kolibri.core.hooks import FrontEndBaseSyncHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils.conf import OPTIONS


class ProfuturoPlugin(KolibriPluginBase):
    kolibri_option_defaults = "option_defaults"
    kolibri_options = "options"


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
                    theme_hook.COLOR_V50: "#f8eae8",
                    theme_hook.COLOR_V100: "#f9cdbf",
                    theme_hook.COLOR_V200: "#f6ad96",
                    theme_hook.COLOR_V300: "#f38e6d",
                    theme_hook.COLOR_V400: "#f2774e",
                    theme_hook.COLOR_V500: "#f16131",
                    theme_hook.COLOR_V600: "#e65b2d",
                    theme_hook.COLOR_V700: "#d85529",
                    theme_hook.COLOR_V800: "#ca4e25",
                    theme_hook.COLOR_V900: "#b04320",
                },
                theme_hook.SECONDARY: {
                    theme_hook.COLOR_V50: "#d8f2ff",
                    theme_hook.COLOR_V100: "#b7dbed",
                    theme_hook.COLOR_V200: "#98c0d5",
                    theme_hook.COLOR_V300: "#76a5bd",
                    theme_hook.COLOR_V400: "#5c90ab",
                    theme_hook.COLOR_V500: "#407d99",
                    theme_hook.COLOR_V600: "#336e88",
                    theme_hook.COLOR_V700: "#245a71",
                    theme_hook.COLOR_V800: "#16475c",
                    theme_hook.COLOR_V900: "#003244",
                },
            },
            theme_hook.TOKEN_MAPPING: {
                "primary": "brand.primary.v_600",
                "appBar": "brand.secondary.v_900",
                "appBarDark": "#001d27",
                "link": "brand.secondary.v_700",
                "linkDark": "brand.secondary.v_900",
            },
            theme_hook.SIGN_IN: {
                theme_hook.BACKGROUND: static("pf-bg.jpg"),
                theme_hook.SCRIM_OPACITY: 0,
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


@register_hook
class TrackingAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "track"
    inline = True


@register_hook
class TrackingInclusionHook(FrontEndBaseSyncHook):
    bundle_class = TrackingAsset

    @property
    def bundle_html(self):
        if OPTIONS["ProFuturo"]["HOTJAR"]:
            return super(TrackingInclusionHook, self).bundle_html
        return ""
