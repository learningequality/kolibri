from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.contrib.staticfiles.templatetags.staticfiles import static

from kolibri.core import theme_hook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class NewBrandingPlugin(KolibriPluginBase):
    pass


@register_hook
class NewBrandingPluginThemeHook(theme_hook.ThemeHook):
    @property
    def theme(self):

        """
        See themeSpec.js for information about what this object should return
        """

        logo_file = static("logo.png")
        organization = "Pigeons, LLC"

        return {
            # Primary and secondary brand colors
            # Use this tool to help generate your brand colors: https://materialpalettes.com/
            "brandColors": {
                "primary": {
                    "v_50": "#ededed",
                    "v_100": "#d0d0d0",
                    "v_200": "#D9E1FD",
                    "v_300": "#98908f",
                    "v_400": "#B4C3FB",
                    "v_500": "#755d5b",
                    "v_600": "#8EA4F9",
                    "v_700": "#574847",
                    "v_800": "#6986F7",
                    "v_900": "#372f30",
                    "v_1000": "#4368F5",
                    "v_1100": "#2547F3",
                },
                "secondary": {
                    "v_50": "#f6eae7",
                    "v_100": "#f3cebc",
                    "v_200": "#FFF5CC",
                    "v_300": "#e59267",
                    "v_400": "#FFEA99",
                    "v_500": "#dd6a26",
                    "v_600": "#FFE066",
                    "v_700": "#c65d1f",
                    "v_800": "#FFD533",
                    "v_900": "#9e4b1b",
                    "v_1000": "#FFCB00",
                    "v_1100": "#E5B700",
                },
                "red": {
                    "v_200": "#D9E1FD",
                    "v_400": "#B4C3FB",
                    "v_600": "#8EA4F9",
                    "v_800": "#6986F7",
                    "v_1000": "#4368F5",
                    "v_1100": "#2547F3",
                },
                "green": {
                    "v_200": "#D9E1FD",
                    "v_400": "#B4C3FB",
                    "v_600": "#8EA4F9",
                    "v_800": "#6986F7",
                    "v_1000": "#4368F5",
                    "v_1100": "#2547F3",
                },
                "orange": {
                    "v_200": "#D9E1FD",
                    "v_400": "#B4C3FB",
                    "v_600": "#8EA4F9",
                    "v_800": "#6986F7",
                    "v_1000": "#4368F5",
                    "v_1100": "#2547F3",
                },
                "pink": {
                    "v_200": "#D9E1FD",
                    "v_400": "#B4C3FB",
                    "v_600": "#8EA4F9",
                    "v_800": "#6986F7",
                    "v_1000": "#4368F5",
                    "v_1100": "#2547F3",
                },
                "dark_green": {
                    "v_200": "#D9E1FD",
                    "v_400": "#B4C3FB",
                    "v_600": "#8EA4F9",
                    "v_800": "#6986F7",
                    "v_1000": "#4368F5",
                    "v_1100": "#2547F3",
                },
                "light_blue": {
                    "v_200": "#D9E1FD",
                    "v_400": "#B4C3FB",
                    "v_600": "#8EA4F9",
                    "v_800": "#6986F7",
                    "v_1000": "#4368F5",
                    "v_1100": "#2547F3",
                },
            },
            # assign key colors
            "tokenMapping": {
                "primary": "brand.primary.v_1000",
                "primaryDark": "brand.primary.v_1100",
                "appBar": "brand.primary.v_1000",
                "appBarDark": "brand.primary.v_1000",
                "appBarFullscreen": "palette.grey.v_900",
                "appBarFullscreenDark": "black",
                "link": "brand.primary.v_1000",
                "linkDark": "brand.primary.v_1100",
                "loading": "brand.secondary.v_1100",
                "focusOutline": "brand.secondary.v_1100",
                "incorrect": "brand.red.v_1100",
                "success": "brand.green.v_1100",
                "correct": "brand.green.v_1100",
                "progress": "brand.light_blue.v_1000",
                "mastered": "brand.secondary.v_1000",
                "warning": "brand.secondary.v_1000",
                "incomplete": "brand.secondary.v_1000",
                "coachContent": "brand.light_blue.v_1100",
                "superAdmin": "brand.secondary.v_1100",
                "fineLine": "palette.grey.v_200",
            },
            # sign-in page config
            "signIn": {
                "background": static("bg-image.png"),
                "backgroundImgCredit": "Creative Commons",
                "scrimOpacity": 0.7,
                "topLogo": {
                    "src": logo_file,
                    "style": "width: 100px; margin: 16px;",
                    "alt": organization,
                },
                "poweredByStyle": None,
                "showTitle": True,
                "showKolibriFooterLogo": True,
                "showPoweredBy": True,
                "title": None,  # default internationalized Kolibri
            },
            # side-nav config
            "sideNav": {
                "title": None,  # default internationalized Kolibri
                "topLogo": {
                    "src": logo_file,
                    "style": "width: 100px; margin: 16px",
                    "alt": organization,
                },
                "showKolibriFooterLogo": True,
                "showPoweredBy": True,
                "brandedFooter": None,
            },
            # side-nav config
            "appBar": {
                "topLogo": None,
            },
        }
